import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FolderModel, FamilyMemberModel, ItemModel, UserModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  
  const user = await UserModel.findById(session.userId).lean();
  const activeVaultOwner = user?.joinedVaultId || session.userId;
  const isJoinedVault = !!user?.joinedVaultId;

  // 1. If in a joined vault, check member role
  if (isJoinedVault) {
    const member = await FamilyMemberModel.findOne({ 
      userId: activeVaultOwner, 
      memberUserId: session.userId 
    });
    
    if (!member) {
      return NextResponse.json({ ok: true, data: [] });
    }

    const myRole = member.role || 'viewer';
    const myMemberId = member._id.toString();

    // Admins see everything
    if (myRole !== 'admin') {
      const visibleFolderIdsSet = new Set<string>();

      // 1. Find all items explicitly shared with me
      const explicitlyVisibleItems = await ItemModel.find({ 
        userId: activeVaultOwner,
        'accessControl.restrictedTo': myMemberId
      }).lean();
      
      for (const item of explicitlyVisibleItems) {
        if (item.folderId) visibleFolderIdsSet.add(item.folderId.toString());
      }

      // 2. Find all folders explicitly shared with me
      const explicitlyVisibleFolders = await FolderModel.find({
        userId: activeVaultOwner,
        'accessControl.restrictedTo': myMemberId
      }).lean();
      
      explicitlyVisibleFolders.forEach(f => visibleFolderIdsSet.add(f._id.toString()));

      // 3. Resolve all ancestors AND descendants for all folders already in the set
      if (visibleFolderIdsSet.size > 0) {
        // Fetch all parent paths for folders in set
        const currentFolders = await FolderModel.find({
          userId: activeVaultOwner,
          _id: { $in: Array.from(visibleFolderIdsSet) }
        }).lean();
        
        currentFolders.forEach(f => {
          if (f.path) f.path.forEach(pid => visibleFolderIdsSet.add(pid.toString()));
        });

        // Fetch all descendants for shared folders (folders that inherit parent's share)
        const sharedFolderIds = explicitlyVisibleFolders.map(f => f._id.toString());
        if (sharedFolderIds.length > 0) {
          const descendants = await FolderModel.find({
            userId: activeVaultOwner,
            path: { $in: sharedFolderIds },
            $or: [
              { 'accessControl.restrictedTo': { $size: 0 } },
              { 'accessControl.restrictedTo': { $exists: false } },
              { 'accessControl.restrictedTo': myMemberId }
            ]
          }).lean();
          descendants.forEach(d => visibleFolderIdsSet.add(d._id.toString()));
        }
      }

      if (visibleFolderIdsSet.size === 0) {
        return NextResponse.json({ ok: true, data: [] });
      }

      const folders = await FolderModel.find({ 
        userId: activeVaultOwner,
        _id: { $in: Array.from(visibleFolderIdsSet) } 
      }).sort({ name: 1 }).lean();
      
      return NextResponse.json({ ok: true, data: folders.map(f => ({ ...f, _id: f._id!.toString() })) });
    }
  }

  // 2. Default: Owner or Admin sees everything in the active vault
  const folders = await FolderModel.find({ userId: activeVaultOwner }).sort({ name: 1 }).lean();
  return NextResponse.json({ ok: true, data: folders.map(f => ({ ...f, _id: f._id!.toString() })) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const user = await UserModel.findById(session.userId).lean();
  const activeVaultOwner = user?.joinedVaultId || session.userId;
  const isJoinedVault = !!user?.joinedVaultId;

  if (isJoinedVault) {
    const member = await FamilyMemberModel.findOne({ userId: activeVaultOwner, memberUserId: session.userId });
    if (!member || (member.role !== 'admin' && member.role !== 'editor')) {
      return NextResponse.json({ ok: false, error: 'Permission denied' }, { status: 403 });
    }
  }

  const { name, parentId, icon } = await req.json();
  let path: string[] = [];
  if (parentId) {
    const parent = await FolderModel.findOne({ _id: parentId, userId: activeVaultOwner }).lean();
    if (parent) path = [...((parent as { path?: string[] }).path || []), parentId];
  }
  const folder = await FolderModel.create({ userId: activeVaultOwner, name, parentId: parentId || null, path, icon });
  return NextResponse.json({ ok: true, data: { ...folder.toObject(), _id: folder._id!.toString() } }, { status: 201 });
}
