import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';

function ensureCloudinaryConfig() {
  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'Cloudinary credentials are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment.',
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const DEFAULT_FOLDER = 'creds-hub/uploads';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  resourceType: string;
  bytes: number;
  format?: string;
}

export async function uploadCloudinaryAsset({
  dataUrl,
  fileName,
}: {
  dataUrl: string;
  fileName?: string;
}): Promise<CloudinaryUploadResult> {
  ensureCloudinaryConfig();
  if (!dataUrl?.startsWith('data:')) {
    throw new Error('Only data URLs are supported for Cloudinary uploads.');
  }

  const uploadOptions = {
    folder: DEFAULT_FOLDER,
    resource_type: 'auto' as const,
    use_filename: true,
    unique_filename: true,
    filename_override: fileName,
  };

  const result: UploadApiResponse = await cloudinary.uploader.upload(dataUrl, uploadOptions);
  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    bytes: result.bytes,
    format: result.format,
  };
}

export async function deleteCloudinaryAsset(publicId: string, resourceType: string = 'image'): Promise<boolean> {
  if (!publicId) return false;
  ensureCloudinaryConfig();
  try {
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return res.result === 'ok' || res.result === 'not found';
  } catch (error) {
    console.error('Cloudinary delete failed', error);
    return false;
  }
}

export function resolveResourceType(resourceType?: string, mimeType?: string): string {
  if (resourceType) return resourceType;
  if (!mimeType) return 'image';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'raw';
}
