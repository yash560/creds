import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FolderModel, ItemModel, FamilyMemberModel, UserModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const { id } = await params;
    const { restrictedTo } = await req.json();

    // 1. Determine active vault owner and check permissions
    const user = await UserModel.findById(session.userId).lean();
    const activeVaultOwner = user?.joinedVaultId || session.userId;
    const isJoinedVault = !!user?.joinedVaultId;
    
    if (isJoinedVault) {
      const member = await FamilyMemberModel.findOne({ userId: activeVaultOwner, memberUserId: session.userId });
      if (!member || member.role !== 'admin') {
        return NextResponse.json({ ok: false, error: 'Only admins can manage access' }, { status: 403 });
      }
    }

    const folder = await FolderModel.findOne({ _id: id, userId: activeVaultOwner });
    if (!folder) {
      return NextResponse.json({ ok: false, error: 'Folder not found or unauthorized' }, { status: 404 });
    }

    // 2. Update the folder's access control
    folder.accessControl = { restrictedTo };
    await folder.save();

    // 3. Update all descendants (folders)
    // Find all folders whose path includes the current folder ID
    await FolderModel.updateMany(
      { path: id, userId: activeVaultOwner },
      { 'accessControl.restrictedTo': restrictedTo }
    );

    // 4. Update all items in these folders
    const descendantFolders = await FolderModel.find({ 
      $or: [{ _id: id }, { path: id }], 
      userId: activeVaultOwner 
    }, '_id');
    const folderIds = descendantFolders.map(f => f._id.toString());

    await ItemModel.updateMany(
      { folderId: { $in: folderIds }, userId: activeVaultOwner },
      { 'accessControl.restrictedTo': restrictedTo }
    );

    return NextResponse.json({ ok: true, message: 'Access updated successfully' });
  } catch (error) {
    console.error('Update folder access error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
