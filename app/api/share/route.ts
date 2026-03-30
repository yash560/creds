import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { connectDB } from '@/lib/mongodb';
import { ShareLinkModel, ItemModel } from '@/lib/models';
import { hashSecret } from '@/lib/crypto-secret';
import crypto from 'crypto';

async function auth() {
    const session = await getSession();
    if (!session) return null;
    return session;
}

function generateLinkId(): string {
    // Generate a short, URL-safe ID
    return crypto.randomBytes(6).toString('hex');
}

// GET /api/share - List all share links for current user
export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const links = await ShareLinkModel.find({ userId: session.userId })
        .select('linkId itemId type role expiresAt createdAt')
        .sort({ createdAt: -1 })
        .lean();

    // Get item titles for each link
    const linksWithItems = await Promise.all(
        links.map(async (link) => {
            const item = await ItemModel.findById(link.itemId as string).select('title type').lean();
            return {
                ...link,
                itemTitle: item?.title || 'Unknown Item',
                itemType: item?.type || 'unknown',
                isExpired: link.expiresAt ? link.expiresAt < new Date() : false,
            };
        })
    );

    return NextResponse.json({ ok: true, data: linksWithItems });
}

// POST /api/share - Create a new share link
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { itemId, type, role, pin, allowedEmails, expiresInDays } = await req.json();

    // Verify item ownership
    const item = await ItemModel.findOne({ _id: itemId, userId: session.userId });
    if (!item) {
        return NextResponse.json({ ok: false, error: 'Item not found or not owned by you' }, { status: 404 });
    }

    const linkId = generateLinkId();
    let pinHash: string | undefined;

    if (type === 'semi-encrypted' && pin) {
        pinHash = await hashSecret(pin);
    }

    const shareLink = await ShareLinkModel.create({
        linkId,
        itemId,
        userId: session.userId,
        type,
        role,
        pinHash,
        allowedEmails: allowedEmails || [],
        expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined,
    });

    const origin = (new URL(req.url)).origin;
    const shareUrl = `${origin}/share/${linkId}`;

    return NextResponse.json({
        ok: true,
        data: {
            linkId,
            shareUrl,
            type,
            role,
            expiresAt: shareLink.expiresAt,
            createdAt: shareLink.createdAt,
        },
    });
}

// DELETE /api/share/:linkId - Revoke a share link
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get('linkId');

    if (!linkId) {
        return NextResponse.json({ ok: false, error: 'linkId required' }, { status: 400 });
    }

    const shareLink = await ShareLinkModel.findOne({ linkId, userId: session.userId });
    if (!shareLink) {
        return NextResponse.json({ ok: false, error: 'Link not found' }, { status: 404 });
    }

    await ShareLinkModel.deleteOne({ linkId });
    return NextResponse.json({ ok: true });
}
