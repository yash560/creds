import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { uploadCloudinaryAsset } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { data, fileName } = body;

  if (!data || typeof data !== 'string') {
    return NextResponse.json({ ok: false, error: 'Missing file data' }, { status: 400 });
  }

  try {
    const upload = await uploadCloudinaryAsset({ dataUrl: data, fileName: fileName || undefined });
    return NextResponse.json({
      ok: true,
      data: {
        url: upload.url,
        publicId: upload.publicId,
        resourceType: upload.resourceType,
        bytes: upload.bytes,
        format: upload.format,
      },
    });
  } catch (error) {
    console.error('Cloudinary upload failed', error);
    return NextResponse.json({ ok: false, error: 'Upload failed' }, { status: 500 });
  }
}
