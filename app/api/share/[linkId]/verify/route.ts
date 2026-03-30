import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ShareLinkModel } from '@/lib/models';
import { verifySecret } from '@/lib/crypto-secret';

// POST /api/share/[linkId]/verify - Verify PIN or email
export async function POST(req: NextRequest) {
    await connectDB();
    const pathSegments = req.nextUrl.pathname.split('/').filter(Boolean);
    const shareIndex = pathSegments.findIndex((segment) => segment === 'share');
    const linkId = shareIndex >= 0 ? pathSegments[shareIndex + 1] : undefined;
    if (!linkId) {
        return NextResponse.json({ ok: false, error: 'Missing linkId' }, { status: 400 });
    }
    const { pin, email } = await req.json();

    const shareLink = await ShareLinkModel.findOne({ linkId });
    if (!shareLink) {
        return NextResponse.json({ ok: false, error: 'Link not found' }, { status: 404 });
    }

    // Check if expired
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
        return NextResponse.json({ ok: false, error: 'Link has expired' }, { status: 410 });
    }

    // Verify based on type
    if (shareLink.type === 'semi-encrypted') {
        if (!pin) {
            return NextResponse.json({ ok: false, error: 'PIN required' }, { status: 400 });
        }
        const pinMatches = await verifySecret(pin, shareLink.pinHash || '');
        if (!pinMatches) {
            return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 });
        }
    } else if (shareLink.type === 'fully-encrypted') {
        if (!email) {
            return NextResponse.json({ ok: false, error: 'Email required' }, { status: 400 });
        }
        // Check if email is in allowed list
        if (shareLink.allowedEmails?.length && !shareLink.allowedEmails.includes(email.toLowerCase())) {
            return NextResponse.json({ ok: false, error: 'Unauthorized email' }, { status: 401 });
        }
    }

    // Log access
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    await ShareLinkModel.updateOne({ linkId }, {
        $push: {
            accessLog: {
                ip: clientIp,
                email: email || undefined,
                accessedAt: new Date(),
            },
        },
    });

    // Generate a temporary access token (valid for 1 hour)
    const accessToken = Buffer.from(JSON.stringify({
        linkId,
        verified: true,
        timestamp: Date.now(),
    })).toString('base64');

    return NextResponse.json({
        ok: true,
        data: { accessToken },
    });
}
