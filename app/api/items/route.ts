import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ItemModel, UserModel, FamilyMemberModel, FolderModel } from '@/lib/models';
import { encryptFields, decryptFields } from '@/lib/crypto';
import { getSession } from '@/lib/session';
import { normalizeAttachments } from '@/lib/attachments';
import crypto from 'crypto';

async function auth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

// Generate a hash for duplicate detection
function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// GET /api/items
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const folderId = searchParams.get('folderId');
  const q = searchParams.get('q');

  // Determine active vault owner
  const user = await UserModel.findById(session.userId).lean();
  const activeVaultOwnerId = user?.joinedVaultId || session.userId;
  
  // 1. Get current user's member info in this vault
  let member: any = null;
  if (activeVaultOwnerId !== session.userId) {
    member = await FamilyMemberModel.findOne({ 
      userId: activeVaultOwnerId, 
      memberUserId: session.userId 
    }).lean();
  }

  const filter: any = { userId: activeVaultOwnerId };
  if (type) filter.type = type;
  if (folderId !== null) filter.folderId = folderId === 'null' ? null : folderId;

  // 2. Access Control Logic for non-admins
  if (member && member.role !== 'admin') {
    const memberId = member._id.toString();

    // a. Get all folders this member has access to (direct or inherited)
    // We already have this logic in folders/route.ts, but we need it here to filter items.
    
    // Find explicitly shared folders
    const explicitlySharedFolders = await FolderModel.find({
      userId: activeVaultOwnerId,
      'accessControl.restrictedTo': memberId
    }).lean();
    const sharedFolderIds = explicitlySharedFolders.map(f => f._id.toString());

    // Find all descendants of shared folders
    const allVisibleFolderIds = [...sharedFolderIds];
    if (sharedFolderIds.length > 0) {
      const descendants = await FolderModel.find({
        userId: activeVaultOwnerId,
        path: { $in: sharedFolderIds },
        $or: [
          { 'accessControl.restrictedTo': { $size: 0 } },
          { 'accessControl.restrictedTo': { $exists: false } },
          { 'accessControl.restrictedTo': memberId }
        ]
      }).lean();
      allVisibleFolderIds.push(...descendants.map(d => d._id.toString()));
    }

    // b. Items are visible if:
    //    - Explicitly shared with member Id
    //    - OR inside a visible folder AND NOT restricted to someone else
    filter.$or = [
      { 'accessControl.restrictedTo': memberId },
      { 
        folderId: { $in: allVisibleFolderIds },
        $or: [
          { 'accessControl.restrictedTo': { $size: 0 } },
          { 'accessControl.restrictedTo': { $exists: false } },
          { 'accessControl.restrictedTo': memberId }
        ]
      }
    ];
  }

  const items = await ItemModel.find(filter).sort({ updatedAt: -1 }).lean();

  const decrypted = await Promise.all(
    items.map(async (item) => {
      const raw = item.fields instanceof Map
        ? Object.fromEntries(item.fields)
        : (item.fields as Record<string, string>);
      const fields = await decryptFields(raw);
      return { ...item, _id: item._id!.toString(), fields };
    })
  );

  if (q) {
    const lower = q.toLowerCase();
    const filtered = decrypted.filter((item) =>
      item.title.toLowerCase().includes(lower) ||
      item.tags?.some((t: string) => t.toLowerCase().includes(lower)) ||
      Object.values(item.fields).some((v) => typeof v === 'string' && v.toLowerCase().includes(lower))
    );
    return NextResponse.json({ ok: true, data: filtered });
  }

  return NextResponse.json({ ok: true, data: decrypted });
}

// POST /api/items
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    
    // Determine active vault owner and permissions
    const user = await UserModel.findById(session.userId).lean();
    const activeVaultOwnerId = user?.joinedVaultId || session.userId;
    
    if (activeVaultOwnerId !== session.userId) {
      const member = await FamilyMemberModel.findOne({ 
        userId: activeVaultOwnerId, 
        memberUserId: session.userId 
      }).lean();
      
      if (!member || (member.role !== 'admin' && member.role !== 'editor')) {
        return NextResponse.json({ ok: false, error: 'You do not have permission to add items to this vault' }, { status: 403 });
      }
    }

    const body = await req.json();
    const { 
      type, title, tags, folderId, fields, 
      fileData, fileName, fileMimeType, 
      filePublicId, fileResourceType, attachments,
      memberId 
    } = body;
    let { dedupeKey } = body;

    const encrypted = await encryptFields(fields || {});

    // Generate dedupeKey if not provided or if fileData exists (for files)
    if (!dedupeKey) {
      if (fileData) {
        // For file-based items (documents, scans), hash the file data
        dedupeKey = `file_${type}_${hashContent(fileData)}`;
      } else if (type === 'password' && fields?.username && fields?.url) {
        // For passwords without explicit dedupeKey, use username+url
        dedupeKey = `pass_${hashContent(`${fields.url}|${fields.username}`)}`;
      } else if (type === 'card' && fields?.cardNumber) {
        // For cards, use the card number
        dedupeKey = `card_${hashContent(fields.cardNumber)}`;
      } else {
        // For other items, use title+type+fields hash
        const fieldStr = Object.entries(fields || {})
          .map(([k, v]) => `${k}=${v}`)
          .join('&');
        dedupeKey = `item_${type}_${hashContent(`${title}|${fieldStr}`)}`;
      }
    }

    // Duplicate check - return existing item if found
    const existing = await ItemModel.findOne({ userId: activeVaultOwnerId, dedupeKey }).lean();
    if (existing) {
      const raw = existing.fields instanceof Map
        ? Object.fromEntries(existing.fields)
        : (existing.fields as Record<string, string>);
      const decryptedFields = await decryptFields(raw);
      return NextResponse.json({
        ok: true,
        data: { ...existing, _id: existing._id!.toString(), fields: decryptedFields },
        isDuplicate: true
      });
    }

    const item = await ItemModel.create({
      userId: activeVaultOwnerId,
      type, title,
      tags: tags || [],
      folderId: folderId || null,
      fields: encrypted,
      attachments: normalizeAttachments(attachments) || [],
      fileData,
      filePublicId,
      fileResourceType,
      fileName,
      fileMimeType,
      dedupeKey,
      memberId: memberId || null,
    });

    return NextResponse.json({ ok: true, data: { ...item.toObject(), _id: item._id!.toString() } }, { status: 201 });
  } catch (error) {
    console.error('Items POST failed', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
