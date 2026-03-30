import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ShareLinkModel, ItemModel } from '@/lib/models';
import { decryptFields } from '@/lib/crypto';
import type { Attachment } from '@/lib/types';

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
  const pathSegments = req.nextUrl.pathname.split('/').filter(Boolean);
  const shareIndex = pathSegments.findIndex((segment) => segment === 'share');
  const linkId = shareIndex >= 0 ? pathSegments[shareIndex + 1] : undefined;
  if (!linkId) {
    return NextResponse.json({ ok: false, error: 'Missing linkId' }, { status: 400 });
  }
  const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ ok: false, error: 'Access token required' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    let tokenData: TokenData;

    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        tokenData = JSON.parse(decoded) as TokenData;
    } catch (e: unknown) {
        return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 });
    }

    if (!tokenData.verified || tokenData.linkId !== linkId) {
        return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 });
    }

    // Check token age (1 hour expiry)
    if (Date.now() - tokenData.timestamp > 60 * 60 * 1000) {
        return NextResponse.json({ ok: false, error: 'Token expired' }, { status: 401 });
    }

    const shareLink = await ShareLinkModel.findOne({ linkId }).lean();
    if (!shareLink) {
        return NextResponse.json({ ok: false, error: 'Link not found' }, { status: 404 });
    }

    // Check if expired
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
        return NextResponse.json({ ok: false, error: 'Link has expired' }, { status: 410 });
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

    // Apply role-based restrictions
    const accessibleItem: AccessibleItem = {
        _id: item._id?.toString(),
        type: item.type,
        title: item.title,
        fields,
    };

    // Check role permissions
    if (shareLink.role === 'read') {
        // Read-only: can see everything but shouldn't modify
        accessibleItem.readonly = true;
    } else if (shareLink.role === 'download') {
        // Download: can download files
        if (item.fileData) {
            accessibleItem.fileData = item.fileData;
            accessibleItem.fileName = item.fileName;
            accessibleItem.fileMimeType = item.fileMimeType;
        }
        if (item.attachments?.length) {
            accessibleItem.attachments = item.attachments;
        }
    } else if (shareLink.role === 'edit') {
        // Edit: full access (but still can't delete or re-share)
        accessibleItem.fileData = item.fileData;
        accessibleItem.fileName = item.fileName;
        accessibleItem.fileMimeType = item.fileMimeType;
        accessibleItem.attachments = item.attachments;
        accessibleItem.editable = true;
    }

    return NextResponse.json({
        ok: true,
        data: accessibleItem,
        role: shareLink.role,
    });
}
