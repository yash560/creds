import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ItemModel } from '@/lib/models';
import { encryptFields, decryptFields } from '@/lib/crypto';
import { cookies } from 'next/headers';

function isUnlocked() {
  const cookieStore = cookies();
  return (cookieStore as unknown as { get: (name: string) => { value: string } | undefined }).get('vault_session')?.value === 'unlocked';
}

// GET /api/items
export async function GET(req: NextRequest) {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: 'Locked' }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const folderId = searchParams.get('folderId');
  const q = searchParams.get('q');

  const filter: Record<string, unknown> = {};
  if (type) filter.type = type;
  if (folderId !== null) filter.folderId = folderId === 'null' ? null : folderId;

  let items = await ItemModel.find(filter).sort({ updatedAt: -1 }).lean();

  // Decrypt fields
  const decrypted = await Promise.all(
    items.map(async (item) => {
      const raw = item.fields instanceof Map
        ? Object.fromEntries(item.fields)
        : (item.fields as Record<string, string>);
      const decryptedFields = await decryptFields(raw);
      return { ...item, _id: item._id!.toString(), fields: decryptedFields };
    })
  );

  // Client-side search filter
  if (q) {
    const lower = q.toLowerCase();
    const filtered = decrypted.filter((item) => {
      if (item.title.toLowerCase().includes(lower)) return true;
      if (item.tags?.some((t: string) => t.toLowerCase().includes(lower))) return true;
      return Object.values(item.fields).some((v) =>
        typeof v === 'string' && v.toLowerCase().includes(lower)
      );
    });
    return NextResponse.json({ ok: true, data: filtered });
  }

  return NextResponse.json({ ok: true, data: decrypted });
}

// POST /api/items
export async function POST(req: NextRequest) {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: 'Locked' }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const { type, title, tags, folderId, fields, fileData, fileName, fileMimeType } = body;

  const encrypted = await encryptFields(fields || {});
  const item = await ItemModel.create({
    type,
    title,
    tags: tags || [],
    folderId: folderId || null,
    fields: encrypted,
    fileData,
    fileName,
    fileMimeType,
  });

  return NextResponse.json({ ok: true, data: { ...item.toObject(), _id: item._id!.toString() } }, { status: 201 });
}
