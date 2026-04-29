# Enrich (Full + Audience) — Live Sample Payloads

Captured **2026-04-29** by hitting `POST /public/v1/creators/enrich/handle/full/`
with `include_audience_data: true` (where supported) for one top creator on
each Truleado-supported platform. Cost: **5 credits total** (1 per call).

These are the raw-as-IC-returned payloads — useful as:
- Reference for what fields are actually populated (vs documented).
- Test fixtures for the normalize / mapper paths.
- Source-of-truth when designing UI sections that depend on FULL data.

## Files

| Platform | Handle | File | Payload size | Has audience block |
|---|---|---|---|---|
| Instagram | `cristiano` | `instagram-cristiano.json` | 173 KB | ✅ |
| YouTube | `UCX6OQ3DkcsbYNE6H8uQQuVA` (MrBeast) | `youtube-mrbeast.json` | 221 KB | ✅ |
| TikTok | `khaby.lame` | `tiktok-khaby.lame.json` | 98 KB | ✅ |
| Twitter | `elonmusk` | `twitter-elonmusk.json` | 16 KB | ❌ (IC doesn't expose) |
| Twitch | `kaicenat` | `twitch-kaicenat.json` | 30 KB | ❌ (IC doesn't expose) |

## How to refresh

```bash
set -a && source .env.local && set +a

curl -sS --max-time 120 -X POST \
  "https://api-dashboard.influencers.club/public/v1/creators/enrich/handle/full/" \
  -H "Authorization: Bearer $INFLUENCERS_CLUB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"handle":"cristiano","platform":"instagram","email_required":"preferred","include_audience_data":true}' \
  -o instagram-cristiano.json
```

Pricing reminder: `cost = 1 credit / call` regardless of `include_audience_data`.
The audience block is free upgrade — always set `true` when refreshing these
fixtures so the audience-rendering UI has data to render against.

> **Note on YouTube `handle`**: passing `MrBeast` (the `@`-style handle) to IC
> regularly 504s; passing `MrBeast6000` (legacy username) returns
> `"No data found"`. Use the **channel ID** (`UCX6OQ3DkcsbYNE6H8uQQuVA`) for
> reliable refreshes. This matters because our `enrichCreator` resolver
> normally passes whatever `username` we extracted from discovery — for YT
> creators that's `custom_url`, which works in practice but isn't 100%.

## Top-level `result` shape — what's actually populated

The docs at [02_enrichment.md](../../../../../../product-documentation/influencers.club/02_enrichment.md)
list 13+ top-level fields (`creator_has`, `gender`, `is_business`, etc.).
**They are not uniformly populated across platforms.** This was the biggest
surprise in the captured data:

| Top-level field | IG | YT | TT | X | Twitch |
|---|---|---|---|---|---|
| `email`, `email_type` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `creator_has` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `first_name`, `gender`, `speaking_language`, `location` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `is_business`, `is_creator`, `has_brand_deals`, `has_link_in_bio` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `links_in_bio`, `other_links` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `ai_niches`, `ai_subniches`, `ai_brand_collaborations` | ❌ | ✅ | ❌ | ❌ | ❌ |
| Cross-platform blocks (e.g. result.instagram on a YouTube call) | ❌ | ✅ | ❌ | ❌ | ❌ |

**UI implication**: don't render top-level enrichment data uniformly.
For Instagram / Twitter / Twitch, only the platform sub-block is reliable
— bury or hide the `gender`/`is_business` etc. fields in those panels.

## Per-platform sub-block highlights (`result.<platform>`)

Selected fields likely to drive UI; see source JSON for the full shape.

### `result.instagram` (36 fields)
- **Engagement**: `engagement_percent`, `avg_likes`, `avg_comments`, `comments_median`, `likes_median`
- **Reels-specific**: `reels` (object), `reels_percentage_last_12_posts`
- **Posts**: `post_data[12]` — caption, engagement, hashtags, is_carousel, media[], post_url, tagged_users
- **Tagged accounts**: `tagged[5]` — for collaboration discovery
- **Verified flags**: `is_verified`, `is_business_account`, `has_merch`, `streamer`, `video_content_creator`, `promotes_affiliate_links`
- **Languages spoken**: `language_code[]` (multi)
- **Most-recent post date**: `most_recent_post_date`

### `result.youtube` (68 fields — by far the richest)
- **Engagement variants**: `engagement_percent`, `engagement_percent_long`, `engagement_percent_shorts`, plus 6 `engagement_by_*` flavors split long/shorts
- **View metrics**: `avg_views`, `avg_views_long`, `avg_views_shorts`, `median_views_long`, `least_views`
- **Posting cadence**: `posting_frequency`, `posting_frequency_long`, `posting_frequency_shorts`, `posting_frequency_recent_months`, `posts_per_month` (object), `last_long_video_upload_date`, `last_short_video_upload_date`
- **Shorts %**: `shorts_percentage`
- **Posts**: `post_data[50]` — title, description, video_id, engagement, media, topic_categories
- **Topics**: `video_topics[58]`, `video_categories[2]`, `topic_details[2]`, `keywords[5]`
- **Niche**: `niche_sub_class[8]` (top-level `ai_niches`/`ai_subniches` are richer)
- **Income**: `income` object (3 keys) — only YT exposes this for FULL, IG didn't on Cristiano
- **Email signals**: `email_from_video_desc[11]` — emails harvested from video descriptions
- **Misc flags**: `made_for_kids`, `is_monetization_enabled`, `has_community_posts`, `has_shorts`, `has_paid_partnership`

### `result.tiktok` (56 fields)
- **Engagement**: `engagement_percent`, `avg_likes`, `comment_count_avg`, `play_count_avg`, `play_count_median`, `comments_median`, `likes_median`, `shares_median`, `saves_median`, `total_likes`, `total_saves`, `total_shares`
- **Growth**: `creator_follower_growth` (object, 4 keys) — IC's growth-curve data
- **Reach**: `reach_score`, `reach_score_list[33]`
- **Saves over time**: `saves_count_list[33]` — per-post save counts (good for sparkline)
- **Posts**: `post_data[33]` — caption, created_at, engagement, hashtags, mentions, sound
- **Tags found**: `brands_found[2]`
- **Niche**: `niche_class[3]`, `niche_sub_class[2]`
- **Region**: `region` (string)
- **Misc flags**: `is_verified`, `is_private`, `is_commerce`, `is_ad`, `tt_seller`, `streamer`

### `result.twitter` (44 fields)
- **Engagement metrics**: `engagement_percent`, `avg_likes`, `avg_quotes`, `avg_reply`, `avg_retweet`, `avg_views`, `creator_favorite_count`
- **Tweet history**: `tweets[20]` (text), `retweets_count[20]`, `tweets_type` (object — original/reply/retweet/quote split)
- **Languages of tweets**: `languages_tweet[20]`
- **Posts**: `post_data[20]` — text, engagement, hashtags, mentions, is_pinned, lang, tweet_url
- **Recommended users / retweet network**: `recommended_users[3]`, `retweet_users[16]`, `tagged_usernames[18]`
- **Platform connections**: `platforms` (object, 1 key)
- **Account metadata**: `join_date`, `subscriber_button`, `super_followed_by`, `direct_messaging`

### `result.twitch` (26 fields — leanest)
- **Streaming activity**: `streamed_hours_last_30_days`, `streams_count_last_30_days`, `last_streamed`, `last_broadcast_id`, `last_broadcast_game`, `avg_views`
- **Partner status**: `isPartner` (note: **camelCase** — IC's Twitch normaliser is inconsistent with snake_case elsewhere)
- **Display info**: `displayName` (camelCase), `profileImageURL` (also camelCase)
- **Channel panels**: `panels_titles[6]`, `panels_descriptions[6]`, `panels_image[6]`, `panels_urls[6]`, `panels_type[6]` — these are Twitch's profile sidebar widgets
- **Social links**: `social_media` (object, 4 keys)
- **Posts**: `post_data[1]` (only one — Twitch posts data is sparse via IC)

## Audience block — `result.<platform>.audience` (IG / YT / TT only)

Same five top-level keys across all three:

```
audience_followers      → { success, data?, is_hidden?, error? }
audience_commenters     → same shape — often `success: false, error: "..."`
audience_likers         → same shape
audience_credibility_followers_histogram   → list (bucketed credibility scores)
audience_credibility_likers_histogram      → list
```

When `success: true` and `data` is present, the inside contains:

```
audience_ages                    → { "13-17": 0.025, "18-24": 0.331, ... }
audience_genders                 → { "male": 0.78, "female": 0.21, "other": 0.01 }
audience_genders_per_age         → cross-tab (age bucket × gender)
audience_geo                     → { country: pct }
audience_languages               → { language: pct }
audience_interests               → { topic: pct }
audience_brand_affinity          → list of similar brand mentions
audience_ethnicities             → { ethnicity: pct } (US only typically)
audience_credibility             → float, "real audience %"
audience_reachability            → { "0-500": pct, "500-1000": pct, ... } (avg follower's following count)
audience_types                   → { "real": pct, "influencers": pct, "mass_followers": pct, "suspicious": pct }
audience_lookalikes              → list of similar-creator handles
notable_users                    → list of high-follower followers
notable_users_ratio              → float
credibility_class                → enum-ish string
```

**`success: false` on `audience_commenters` / `audience_likers` is common.**
On Cristiano IG, only `audience_followers` returned data and `audience_likers`
returned `{ success: true, data: ... }` with credibility-only fields. The
`audience_commenters` block returned an error.
**Always check `success` before reaching into `data`** — it's the difference
between a populated panel and a Sentry exception.

## Caveats

1. **`profile_picture` and `profile_picture_hd` URLs expire after 24 hours.**
   These fixtures will return broken URLs after a day. Use them to verify URL
   shape only; don't rely on them for visual debugging in tests.

2. **Twitter `super_followed_by` / `subscriber_button`** — these are X
   Premium-tier flags. Possibly stale field names from pre-rebrand schema.

3. **Twitch camelCase fields** (`displayName`, `profileImageURL`, `isPartner`)
   are an inconsistency in IC's Twitch normaliser. Our `normalize.ts` has to
   handle both naming conventions.

4. **Cross-platform blocks on YouTube** — IC also returned `result.instagram`
   and `result.twitter` blocks alongside `result.youtube` for MrBeast. Those
   blocks are **partial** (most fields are `null` or empty arrays) — they're
   handle pointers, not full enrichments. Don't treat them as if they were
   the result of a separate FULL call.

5. **Top-level `result.email` / `email_type`** are the most reliable
   pan-platform fields. If `email_type === "harvested"` it's likely from a
   webpage scrape; `"verified"` is from the platform itself (rare).
