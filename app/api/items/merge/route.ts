import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ItemModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { targetId, sourceIds } = body;

  if (!targetId || !sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
    return NextResponse.json({ ok: false, error: 'Target and sources are required' }, { status: 400 });
  }

  await connectDB();

  try {
    // 1. Fetch target item
    const target = await ItemModel.findOne({ _id: targetId, userId: session.userId });
    if (!target) return NextResponse.json({ ok: false, error: 'Target item not found' }, { status: 404 });

    // 2. Fetch all source items
    const sources = await ItemModel.find({ _id: { $in: sourceIds }, userId: session.userId });
    if (sources.length === 0) return NextResponse.json({ ok: false, error: 'No source items found' }, { status: 404 });

    // 3. Collect all attachments from target and sources
    const combinedAttachments = [...(target.attachments || [])];

    for (const source of sources) {
      // If the source has a primary file, add it as an attachment to the target
      if (source.fileData && source.fileResourceType) {
        combinedAttachments.push({
          data: source.fileData,
          name: source.fileName || source.title || 'Attached File',
          mimeType: source.fileMimeType || 'application/octet-stream',
          publicId: source.filePublicId,
          resourceType: source.fileResourceType,
          label: source.title || 'Merged File'
        });
      }

      // Add all existing attachments from the source
      if (source.attachments && source.attachments.length > 0) {
        combinedAttachments.push(...source.attachments);
      }
    }

    // 4. Update target item with combined attachments
    target.attachments = combinedAttachments;
    // We update the title/category etc if they are missing on target? 
    // Usually target is the "good" one, so we just keep its metadata.
    await target.save();

    // 5. Delete source items DIRECTLY from DB (bypass Cloudinary cleanup)
    await ItemModel.deleteMany({ _id: { $in: sourceIds }, userId: session.userId });

    return NextResponse.json({ 
      ok: true, 
      data: { ...target.toObject(), _id: target._id.toString() } 
    });

  } catch (error) {
    console.error('Merge failed', error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Merge failed' }, { status: 500 });
  }
}
