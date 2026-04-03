import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ShareLinkModel, ItemModel } from '@/lib/models';
import { decryptFields } from '@/lib/crypto';

interface TokenData {
    linkId: string;
    verified: boolean;
    timestamp: number;
}

type ShareAttachment = {
    data: string;
    name: string;
    mimeType: string;
    label?: string;
    publicId?: string;
    resourceType?: string;
};

interface AccessibleItem {
    _id?: string;
    type: string;
    title: string;
    fields: Record<string, string>;
    readonly?: boolean;
    fileData?: string;
    fileName?: string;
    fileMimeType?: string;
    attachments?: ShareAttachment[];
    editable?: boolean;
}

// GET /api/share/[linkId]/access - Get shared item content (requires verification token)
export async function GET(req: NextRequest) {
    await connectDB();
    const path = req.nextUrl.pathname;
    const parts = path.split('/');
    const shareIdx = parts.lastIndexOf('share');
    const linkId = shareIdx !== -1 && parts[shareIdx + 1] ? parts[shareIdx + 1] : undefined;
    if (!linkId) {
        return NextResponse.json({ ok: false, error: 'Missing linkId' }, { status: 400 });
    }
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ ok: false, error: 'Access token required' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const shareLink = await ShareLinkModel.findOne({ linkId }).lean();
    if (!shareLink) {
        return NextResponse.json({ ok: false, error: 'Link not found' }, { status: 404 });
    }

    // Check if expired
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
        return NextResponse.json({ ok: false, error: 'Link has expired' }, { status: 410 });
    }

    let tokenData: TokenData;

    if (token === 'open') {
        if (shareLink.type !== 'open') {
            return NextResponse.json({ ok: false, error: 'Verification required' }, { status: 401 });
        }
        // Create dummy token data for open access
        tokenData = { linkId, verified: true, timestamp: Date.now() };
    } else {
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            tokenData = JSON.parse(decoded) as TokenData;
        } catch {
            return NextResponse.json({ ok: false, error: 'Invalid token format' }, { status: 401 });
        }

        if (!tokenData.verified || tokenData.linkId !== linkId) {
            return NextResponse.json({ ok: false, error: 'Invalid token content' }, { status: 401 });
        }

        // Check token age (1 hour expiry)
        if (Date.now() - tokenData.timestamp > 60 * 60 * 1000) {
            return NextResponse.json({ ok: false, error: 'Token expired' }, { status: 401 });
        }
    }

    // Get item
    const item = await ItemModel.findById(shareLink.itemId).lean();
    if (!item) {
        return NextResponse.json({ ok: false, error: 'Item not found' }, { status: 404 });
    }

    // Decrypt fields
    const raw = item.fields instanceof Map
        ? Object.fromEntries(item.fields)
        : (item.fields as Record<string, string>);
    const fields = await decryptFields(raw);

    // Apply shared fields filtering
    let filteredFields = fields;
    if (shareLink.sharedFields && shareLink.sharedFields.length > 0) {
        filteredFields = Object.keys(fields)
            .filter((key) => shareLink.sharedFields!.includes(key))
            .reduce((obj, key) => {
                obj[key] = fields[key];
                return obj;
            }, {} as Record<string, string>);
    }

    // Apply role-based restrictions
    const accessibleItem: AccessibleItem = {
        _id: item._id?.toString(),
        type: item.type,
        title: item.title,
        fields: filteredFields,
        fileData: item.fileData,
        fileName: item.fileName,
        fileMimeType: item.fileMimeType,
        attachments: item.attachments,
    };

    // Check role permissions
    if (shareLink.role === 'read') {
        // Read-only: can see everything but shouldn't modify
        accessibleItem.readonly = true;
    } else if (shareLink.role === 'download') {
        // Download: can download files
    } else if (shareLink.role === 'edit') {
        // Edit: full access (but still can't delete or re-share)
        accessibleItem.editable = true;
    }

    return NextResponse.json({
        ok: true,
        data: accessibleItem,
        role: shareLink.role,
    });
}
