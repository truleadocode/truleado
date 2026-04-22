/**
 * Image mirroring service.
 *
 * IC returns temporary (24h) profile-picture URLs. For any creator whose
 * profile we persist in creator_profiles, we download the picture to our own
 * public Supabase Storage bucket (creator-assets) so the URL doesn't rot.
 *
 * Contract:
 *   mirrorCreatorPicture(args) => { storagePath, publicUrl } | null
 *
 * Called on enrich SUCCESS — not on discovery (too expensive). Failures are
 * swallowed + logged; the caller's flow continues with a null picture URL
 * and the frontend falls back to initials.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

const BUCKET = 'creator-assets';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 10_000;

type Platform = 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'twitch';

export interface MirrorPictureArgs {
  provider: string;
  platform: Platform;
  providerUserId: string;
  pictureUrl: string;
}

export interface MirrorPictureResult {
  storagePath: string;
  publicUrl: string;
}

function extFromContentType(contentType: string | null): string {
  if (!contentType) return 'jpg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch the IC picture URL and upload it to creator-assets.
 * Returns { storagePath, publicUrl } on success, null on any failure.
 */
export async function mirrorCreatorPicture(
  args: MirrorPictureArgs
): Promise<MirrorPictureResult | null> {
  try {
    const response = await fetchWithTimeout(args.pictureUrl, FETCH_TIMEOUT_MS);
    if (!response.ok) {
      console.warn('[ic/image-mirror] non-OK response:', response.status, args.pictureUrl);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.startsWith('image/')) {
      console.warn('[ic/image-mirror] rejected non-image content-type:', contentType);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      console.warn(
        '[ic/image-mirror] rejected oversize image:',
        arrayBuffer.byteLength,
        'bytes'
      );
      return null;
    }

    const ext = extFromContentType(contentType);
    const storagePath = `profiles/${args.provider}/${args.platform}/${args.providerUserId}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: contentType ?? `image/${ext}`,
        upsert: true,
      });
    if (uploadError) {
      console.warn('[ic/image-mirror] upload failed:', uploadError.message);
      return null;
    }

    const { data: publicData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);

    return { storagePath, publicUrl: publicData.publicUrl };
  } catch (err) {
    console.warn('[ic/image-mirror] unexpected error:', (err as Error).message);
    return null;
  }
}

/**
 * Convenience: mirror + write result back to creator_profiles in one call.
 * Also fire-and-forget. Safe to await or ignore.
 */
export async function mirrorAndPersist(
  args: MirrorPictureArgs & { creatorProfileId: string }
): Promise<MirrorPictureResult | null> {
  const mirrored = await mirrorCreatorPicture(args);
  if (!mirrored) return null;
  try {
    await supabaseAdmin
      .from('creator_profiles')
      .update({
        profile_picture_storage_path: mirrored.storagePath,
        profile_picture_public_url: mirrored.publicUrl,
        profile_picture_mirrored_at: new Date().toISOString(),
      })
      .eq('id', args.creatorProfileId);
  } catch (err) {
    console.warn('[ic/image-mirror] persist failed:', (err as Error).message);
  }
  return mirrored;
}
