import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ShareLinkModel, ItemModel } from '@/lib/models';
import { decryptFields } from '@/lib/crypto';
import { comparePassword } from '@/lib/crypto-secret';

// GET /api/share/[linkId] - Get share link info (NO content yet)
export async function GET(req: NextRequest, { params }: { params: { linkId: string } }) {
    await connectDB();
    const { linkId } = params;

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
