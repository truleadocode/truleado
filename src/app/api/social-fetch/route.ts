/**
 * Social Data Fetch API Route (Background Job Execution)
 *
 * POST /api/social-fetch
 *
 * Executes the actual social media data fetching for a pending job.
 * Called fire-and-forget from the triggerSocialFetch GraphQL mutation.
 *
 * Auth: INTERNAL_API_SECRET header (server-to-server)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchInstagramProfile } from '@/lib/social/apify';
import { fetchYouTubeChannel } from '@/lib/social/youtube';

export const runtime = 'nodejs';
export const maxDuration = 60;

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify internal auth
    const secret = request.headers.get('x-internal-secret');
    if (!INTERNAL_API_SECRET || secret !== INTERNAL_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // Load job record
    const { data: job, error: jobError } = await supabaseAdmin
      .from('social_data_jobs')
      .select('*, creators!inner(id, instagram_handle, youtube_handle, tiktok_handle)')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'pending') {
      return NextResponse.json({ error: 'Job already processed' }, { status: 400 });
    }

    // Mark as processing
    await supabaseAdmin
      .from('social_data_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobId);

    const creator = job.creators as {
      id: string;
      instagram_handle: string | null;
      youtube_handle: string | null;
      tiktok_handle: string | null;
    };

    try {
      console.log(`[social-fetch] Processing job ${jobId}: platform=${job.platform}, handle=${job.platform === 'instagram' ? creator.instagram_handle : creator.youtube_handle}`);

      if (job.platform === 'instagram') {
        await processInstagram(jobId, job.creator_id, creator.instagram_handle!);
      } else if (job.platform === 'youtube') {
        await processYouTube(jobId, job.creator_id, creator.youtube_handle!);
      } else {
        throw new Error(`Unsupported platform: ${job.platform}`);
      }

      console.log(`[social-fetch] Job ${jobId} completed successfully`);

      // Mark completed
      await supabaseAdmin
        .from('social_data_jobs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', jobId);
    } catch (err) {
      // Mark failed — log so errors are visible in dev console
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[social-fetch] Job ${jobId} FAILED:`, err);
      await supabaseAdmin
        .from('social_data_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('social-fetch route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function processInstagram(jobId: string, creatorId: string, handle: string) {
  const result = await fetchInstagramProfile(handle);
  const { profile, posts, rawData } = result;

  // Compute engagement metrics
  const validPosts = posts.filter((p) => p.likesCount > 0 || p.commentsCount > 0);
  const totalLikes = validPosts.reduce((sum, p) => sum + p.likesCount, 0);
  const totalComments = validPosts.reduce((sum, p) => sum + p.commentsCount, 0);
  const avgLikes = validPosts.length > 0 ? totalLikes / validPosts.length : 0;
  const avgComments = validPosts.length > 0 ? totalComments / validPosts.length : 0;
  const engagementRate =
    profile.followersCount > 0
      ? ((avgLikes + avgComments) / profile.followersCount) * 100
      : 0;

  // Upsert social profile
  await supabaseAdmin.from('creator_social_profiles').upsert(
    {
      creator_id: creatorId,
      platform: 'instagram',
      platform_username: profile.username,
      platform_display_name: profile.fullName,
      profile_pic_url: profile.profilePicUrlHD || profile.profilePicUrl,
      bio: profile.biography,
      followers_count: profile.followersCount,
      following_count: profile.followsCount,
      posts_count: profile.postsCount,
      is_verified: profile.isVerified,
      is_business_account: profile.isBusinessAccount,
      external_url: profile.externalUrl,
      avg_likes: avgLikes,
      avg_comments: avgComments,
      engagement_rate: engagementRate,
      raw_profile_data: rawData,
      raw_posts_data: posts,
      last_fetched_at: new Date().toISOString(),
      last_job_id: jobId,
    },
    { onConflict: 'creator_id,platform' }
  );

  // Upsert individual posts
  for (const post of posts) {
    await supabaseAdmin.from('creator_social_posts').upsert(
      {
        creator_id: creatorId,
        platform: 'instagram',
        platform_post_id: post.shortCode || post.id,
        post_type: post.type,
        caption: post.caption,
        url: post.url,
        thumbnail_url: post.displayUrl,
        likes_count: post.likesCount,
        comments_count: post.commentsCount,
        views_count: post.videoViewCount,
        hashtags: post.hashtags,
        mentions: post.mentions,
        published_at: post.timestamp || null,
        raw_data: post as unknown as Record<string, unknown>,
        last_fetched_at: new Date().toISOString(),
      },
      { onConflict: 'creator_id,platform,platform_post_id' }
    );
  }
}

async function processYouTube(jobId: string, creatorId: string, handle: string) {
  const result = await fetchYouTubeChannel(handle);
  const { channel, videos, rawData } = result;

  // Compute engagement metrics
  const validVideos = videos.filter((v) => v.viewCount > 0);
  const totalViews = validVideos.reduce((sum, v) => sum + v.viewCount, 0);
  const totalLikes = validVideos.reduce((sum, v) => sum + v.likeCount, 0);
  const totalComments = validVideos.reduce((sum, v) => sum + v.commentCount, 0);
  const avgViews = validVideos.length > 0 ? totalViews / validVideos.length : 0;
  const avgLikes = validVideos.length > 0 ? totalLikes / validVideos.length : 0;
  const avgComments = validVideos.length > 0 ? totalComments / validVideos.length : 0;
  const engagementRate =
    avgViews > 0 ? ((avgLikes + avgComments) / avgViews) * 100 : 0;

  // Upsert social profile
  await supabaseAdmin.from('creator_social_profiles').upsert(
    {
      creator_id: creatorId,
      platform: 'youtube',
      platform_username: channel.customUrl,
      platform_display_name: channel.title,
      profile_pic_url: channel.thumbnailUrl,
      bio: channel.description,
      followers_count: channel.subscriberCount,
      posts_count: channel.videoCount,
      is_verified: false,
      subscribers_count: channel.subscriberCount,
      total_views: channel.viewCount,
      channel_id: channel.channelId,
      avg_likes: avgLikes,
      avg_comments: avgComments,
      avg_views: avgViews,
      engagement_rate: engagementRate,
      raw_profile_data: rawData,
      raw_posts_data: videos,
      last_fetched_at: new Date().toISOString(),
      last_job_id: jobId,
    },
    { onConflict: 'creator_id,platform' }
  );

  // Upsert individual videos
  for (const video of videos) {
    await supabaseAdmin.from('creator_social_posts').upsert(
      {
        creator_id: creatorId,
        platform: 'youtube',
        platform_post_id: video.videoId,
        post_type: 'Video',
        caption: video.title,
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
        thumbnail_url: video.thumbnailUrl,
        likes_count: video.likeCount,
        comments_count: video.commentCount,
        views_count: video.viewCount,
        published_at: video.publishedAt || null,
        raw_data: video as unknown as Record<string, unknown>,
        last_fetched_at: new Date().toISOString(),
      },
      { onConflict: 'creator_id,platform,platform_post_id' }
    );
  }
}
