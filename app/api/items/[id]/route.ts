import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ItemModel } from '@/lib/models';
import { encryptFields, decryptFields } from '@/lib/crypto';
import { cookies } from 'next/headers';

function isUnlocked() {
  const cookieStore = cookies();
  return (cookieStore as unknown as { get: (name: string) => { value: string } | undefined }).get('vault_session')?.value === 'unlocked';
}

// GET /api/items/[id]
export async function GET(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: 'Locked' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  const item = await ItemModel.findById(id).lean();
  if (!item) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const raw = item.fields instanceof Map ? Object.fromEntries(item.fields) : (item.fields as Record<string, string>);
  const decryptedFields = await decryptFields(raw);
  return NextResponse.json({ ok: true, data: { ...item, _id: item._id!.toString(), fields: decryptedFields } });
}

// PUT /api/items/[id]
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: 'Locked' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  const body = await req.json();
  const { title, tags, folderId, fields, fileData, fileName, fileMimeType, isFavourite } = body;
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (tags !== undefined) update.tags = tags;
  if (folderId !== undefined) update.folderId = folderId;
  if (fields !== undefined) update.fields = await encryptFields(fields);
  if (fileData !== undefined) update.fileData = fileData;
  if (fileName !== undefined) update.fileName = fileName;
  if (fileMimeType !== undefined) update.fileMimeType = fileMimeType;
  if (isFavourite !== undefined) update.isFavourite = isFavourite;

  const updated = await ItemModel.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!updated) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: { ...updated, _id: updated._id!.toString() } });
}

// DELETE /api/items/[id]
export async function DELETE(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: 'Locked' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  await ItemModel.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
