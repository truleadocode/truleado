/**
 * File Download API Route
 * 
 * Generates signed URLs for private files in Supabase Storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyIdToken } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    try {
      await verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get parameters
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket');
    const path = searchParams.get('path');

    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'Missing required parameters: bucket, path' },
        { status: 400 }
      );
    }

    // Validate bucket
    const allowedBuckets = ['campaign-attachments', 'deliverables'];
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json(
        { error: 'Invalid bucket' },
        { status: 400 }
      );
    }

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (error) {
      console.error('Signed URL error:', error);
      return NextResponse.json(
        { error: `Failed to generate download URL: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: data.signedUrl,
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
