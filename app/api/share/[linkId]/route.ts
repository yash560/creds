import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ShareLinkModel, ItemModel } from '@/lib/models';
// GET /api/share/[linkId] - Get share link info (NO content yet)
export async function GET(req: NextRequest) {
    await connectDB();
    const path = req.nextUrl.pathname;
    const parts = path.split('/');
    const shareIdx = parts.lastIndexOf('share');
    const linkId = shareIdx !== -1 && parts[shareIdx + 1] ? parts[shareIdx + 1] : undefined;
    if (!linkId) {
        return NextResponse.json({ ok: false, error: 'Missing linkId' }, { status: 400 });
    }

    const shareLink = await ShareLinkModel.findOne({ linkId }).lean();
    if (!shareLink) {
        return NextResponse.json({ ok: false, error: 'Link not found' }, { status: 404 });
    }

    // Check if expired
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
        return NextResponse.json({ ok: false, error: 'Link has expired' }, { status: 410 });
    }

    // Get item info (but not the full encrypted content yet)
    const item = await ItemModel.findById(shareLink.itemId).select('title type').lean();
    if (!item) {
        return NextResponse.json({ ok: false, error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
        ok: true,
        data: {
            linkId,
            itemTitle: item.title,
            itemType: item.type,
            shareType: shareLink.type,
            role: shareLink.role,
            requiresPin: shareLink.type === 'semi-encrypted' && !!shareLink.pinHash,
            requiresEmail: shareLink.type === 'fully-encrypted',
        },
    });
}
