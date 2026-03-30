import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ItemModel } from '@/lib/models';
import { encryptFields, decryptFields } from '@/lib/crypto';
import { getSession } from '@/lib/session';

async function auth() {
  const session = await getSession();
  if (!session) return null;
  return session;
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

  const filter: Record<string, unknown> = { userId: session.userId };
  if (type) filter.type = type;
  if (folderId !== null) filter.folderId = folderId === 'null' ? null : folderId;

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

  await connectDB();
  const body = await req.json();
  const { type, title, tags, folderId, fields, fileData, fileName, fileMimeType } = body;

  const encrypted = await encryptFields(fields || {});
  const item = await ItemModel.create({
    userId: session.userId,
    type, title,
    tags: tags || [],
    folderId: folderId || null,
    fields: encrypted,
    fileData, fileName, fileMimeType,
  });

  return NextResponse.json({ ok: true, data: { ...item.toObject(), _id: item._id!.toString() } }, { status: 201 });
}
