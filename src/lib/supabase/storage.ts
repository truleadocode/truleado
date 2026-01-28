/**
 * Supabase Storage Utilities
 * 
 * Handles file uploads to Supabase Storage buckets.
 */

import { createSupabaseClient } from './client';
import { getIdToken } from '@/lib/firebase/client';

export type StorageBucket = 'campaign-attachments' | 'deliverables';

interface UploadResult {
  path: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Generate a unique file path for storage
 */
function generateFilePath(
  bucket: StorageBucket,
  entityId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  switch (bucket) {
    case 'campaign-attachments':
      return `campaigns/${entityId}/${timestamp}_${sanitizedFileName}`;
    case 'deliverables':
      return `deliverables/${entityId}/${timestamp}_${sanitizedFileName}`;
    default:
      return `${entityId}/${timestamp}_${sanitizedFileName}`;
  }
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: StorageBucket,
  entityId: string,
  file: File
): Promise<UploadResult> {
  // Get Firebase token for authenticated upload
  const token = await getIdToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  const supabase = createSupabaseClient(token);
  const filePath = generateFilePath(bucket, entityId, file.name);
  
  // Upload the file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
  
  // Get public URL (for signed URLs, use getSignedUrl instead)
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
  
  return {
    path: data.path,
    url: urlData.publicUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };
}

/**
 * Get a signed URL for private file access
 */
export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const token = await getIdToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  const supabase = createSupabaseClient(token);
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }
  
  return data.signedUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  bucket: StorageBucket,
  path: string
): Promise<void> {
  const token = await getIdToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  const supabase = createSupabaseClient(token);
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  
  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Get file info from a storage URL
 */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (pathMatch) {
      return {
        bucket: pathMatch[1],
        path: pathMatch[2],
      };
    }
    return null;
  } catch {
    return null;
  }
}
