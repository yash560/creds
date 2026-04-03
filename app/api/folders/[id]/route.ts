import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FolderModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  const body: { name?: string; icon?: string; parentId?: string | null } = await req.json();
  const { name, icon, parentId } = body;

  interface FolderUpdate {
    name?: string;
    icon?: string;
    parentId?: string | null;
    path?: string[];
  }
  const update: FolderUpdate = {};
  if (name !== undefined) update.name = name;
  if (icon !== undefined) update.icon = icon;
  
  if (parentId !== undefined) {
    if (parentId === id) return NextResponse.json({ ok: false, error: 'Cannot move folder into itself' }, { status: 400 });
    
    // Check if new parent is a descendant to avoid cycles
    if (parentId) {
      const parent = await FolderModel.findOne({ _id: parentId, userId: session.userId }).lean();
      if (parent?.path.includes(id)) {
        return NextResponse.json({ ok: false, error: 'Cannot move folder into its own descendant' }, { status: 400 });
      }
      update.parentId = parentId;
      update.path = [...(parent?.path || []), parentId];
    } else {
      update.parentId = null;
      update.path = [];
    }
  }

  const folder = await FolderModel.findOneAndUpdate(
    { _id: id, userId: session.userId }, 
    update, 
    { new: true }
  ).lean();

  if (!folder) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  // If path changed, update all descendants recursively
  if (parentId !== undefined) {
    const descendants = await FolderModel.find({ path: id, userId: session.userId }).lean();
    for (const d of descendants) {
      const idx = d.path.indexOf(id);
      const newPath = [...(folder.path as string[]), id, ...d.path.slice(idx + 1)];
      await FolderModel.updateOne({ _id: d._id }, { path: newPath });
    }
  }

  return NextResponse.json({ ok: true, data: { ...folder, _id: folder._id!.toString() } });
}

export async function DELETE(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();

  // Find all descendant folders to delete
  const descendants = await FolderModel.find({ path: id, userId: session.userId }).lean();
  const folderIds = [id, ...descendants.map(d => d._id!.toString())];

  // 1. Gather all items to delete to clean up Cloudinary assets
  const { ItemModel } = await import('@/lib/models');
  const itemsToDelete = await ItemModel.find({ folderId: { $in: folderIds }, userId: session.userId }).lean();
  
  // 2. Perform Cloudinary clean-up for each item
  const { deleteCloudinaryAsset } = await import('@/lib/cloudinary');
  for (const item of itemsToDelete) {
    // Delete primary file if exists
    if (item.filePublicId) {
      await deleteCloudinaryAsset(item.filePublicId, item.fileResourceType || 'image');
    }
    // Delete all attachments
    if (item.attachments && item.attachments.length > 0) {
      for (const att of item.attachments) {
        if (att.publicId) {
          await deleteCloudinaryAsset(att.publicId, att.resourceType || 'image');
        }
      }
    }
  }

  // 3. Delete all items from database
  await ItemModel.deleteMany({ folderId: { $in: folderIds }, userId: session.userId });

  // 4. Delete all these folders
  await FolderModel.deleteMany({ _id: { $in: folderIds }, userId: session.userId });

  return NextResponse.json({ ok: true });
}
