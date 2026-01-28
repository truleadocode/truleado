/**
 * Supabase Storage Utilities
 * 
 * Handles file uploads to Supabase Storage buckets via API route.
 * We use an API route because Firebase JWTs aren't compatible with
 * Supabase Storage's direct authentication.
 */

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
 * Upload a file to Supabase Storage via API route
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
  
  // Create form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  formData.append('entityId', entityId);
  
  // Upload via API route
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Upload failed');
  }
  
  return {
    path: data.path,
    url: data.url,
    fileName: data.fileName,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
  };
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
