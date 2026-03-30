import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ItemModel } from '@/lib/models';
import { encryptFields, decryptFields } from '@/lib/crypto';
import { getSession } from '@/lib/session';
import { deleteCloudinaryAsset, resolveResourceType } from '@/lib/cloudinary';

async function getAuthedItem(id: string) {
  const session = await getSession();
  if (!session) return { session: null, item: null };
  await connectDB();
  const item = await ItemModel.findOne({ _id: id, userId: session.userId }).lean();
  return { session, item };
}

type CloudAttachment = {
  publicId?: string;
  resourceType?: string;
  mimeType?: string;
};

async function deleteRemovedAttachments(prev: CloudAttachment[] = [], next: CloudAttachment[] = []) {
  const nextIds = new Set(next.filter((att) => typeof att.publicId === 'string').map((att) => att.publicId));
  const removed = prev.filter((att) => att.publicId && !nextIds.has(att.publicId));
  await Promise.all(
    removed.map((att) => {
      if (!att.publicId) return Promise.resolve(false);
      return deleteCloudinaryAsset(
        att.publicId,
        resolveResourceType(att.resourceType, att.mimeType),
      );
    }),
  );
}

async function deleteReplacedFile(prevPublicId?: string, prevResourceType?: string, prevMimeType?: string, nextPublicId?: string | null) {
  if (!prevPublicId) return;
  if (!nextPublicId || nextPublicId !== prevPublicId) {
    await deleteCloudinaryAsset(prevPublicId, resolveResourceType(prevResourceType, prevMimeType));
  }
}

export async function GET(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { session, item } = await getAuthedItem(id);
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!item) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const raw = item.fields instanceof Map ? Object.fromEntries(item.fields) : (item.fields as Record<string, string>);
  return NextResponse.json({ ok: true, data: { ...item, _id: item._id!.toString(), fields: await decryptFields(raw) } });
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const existing = await ItemModel.findOne({ _id: id, userId: session.userId }).lean();
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = body.title;
  if (body.tags !== undefined) update.tags = body.tags;
  if (body.folderId !== undefined) update.folderId = body.folderId;
  if (body.fields !== undefined) update.fields = await encryptFields(body.fields);
  if (body.fileData !== undefined) update.fileData = body.fileData;
  if (body.fileName !== undefined) update.fileName = body.fileName;
  if (body.fileMimeType !== undefined) update.fileMimeType = body.fileMimeType;
  if (body.filePublicId !== undefined) update.filePublicId = body.filePublicId;
  if (body.fileResourceType !== undefined) update.fileResourceType = body.fileResourceType;
  if (body.attachments !== undefined) update.attachments = body.attachments;
  if (body.isFavourite !== undefined) update.isFavourite = body.isFavourite;

  const updated = await ItemModel.findOneAndUpdate({ _id: id, userId: session.userId }, update, { new: true }).lean();
  if (!updated) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  try {
    await deleteRemovedAttachments(existing.attachments ?? [], updated.attachments ?? []);
    await deleteReplacedFile(existing.filePublicId, existing.fileResourceType, existing.fileMimeType, updated.filePublicId);
  } catch (error) {
    console.error('Cloudinary cleanup failed', error);
  }

  return NextResponse.json({ ok: true, data: { ...updated, _id: updated._id!.toString() } });
}

export async function DELETE(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const existing = await ItemModel.findOne({ _id: id, userId: session.userId }).lean();
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  try {
    await deleteRemovedAttachments(existing.attachments ?? [], []);
    await deleteReplacedFile(existing.filePublicId, existing.fileResourceType, existing.fileMimeType, null);
  } catch (error) {
    console.error('Cloudinary cleanup failed', error);
  }
  await ItemModel.findOneAndDelete({ _id: id, userId: session.userId });
  return NextResponse.json({ ok: true });
}
