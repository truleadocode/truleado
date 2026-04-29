# Creator Intelligence Dashboard — Claude Code Handoff

5 standalone platform pages designed to be ported into a Next.js + Tailwind app.

## What's in this delivery

| File | Purpose |
|------|---------|
| `instagram.html` / `tiktok.html` / `twitter.html` / `youtube.html` / `twitch.html` | Standalone preview pages — open any one to see the design rendered. |
| `styles.css` | Complete light-theme design system (tokens + components). |
| `shared.jsx` | Cross-platform helpers: `<TopNav>`, `<ProfileHead>`, `<AudienceBlock>`, charts (`<Donut>`, `<Sparkline>`, `<ScatterPlot>`, `<PostingHeatmap>`, `<AgePyramid>`, `<BarsList>`, `<CountryList>`, `<CredibilityMeter>`, `<ReachFlow>`, `<Histogram>`, `<NotableUsers>`), and formatters (`formatNum`, `formatPct`, `formatDate`, `flagEmoji`, `fmtDuration`). |
| `page-instagram.jsx`, `page-tiktok.jsx`, `page-twitter.jsx`, `page-youtube.jsx`, `page-twitch.jsx` | One file per platform — the entire page composition lives here. |
| `data-full.json` | Compact, deduplicated copy of the 5 source JSONs from `uploads/`. |

## Light theme tokens (port to `tailwind.config.js`)

```js
// extend.colors
ink:        { DEFAULT: '#1a1a17', 2: '#45463f', 3: '#777970', 4: '#a3a59c' },
surface:    { DEFAULT: '#ffffff', 2: '#f5f5f0' },
bg:         '#fafaf7',
line:       { DEFAULT: '#e7e5dc', 2: '#d8d6cb' },
accent:     { DEFAULT: '#2f6b3a', 2: '#b1d96a', 3: '#355bff' },
warn:       '#d97300',
bad:        '#c43050',
good:       '#2f6b3a',
// fonts
sans: ['Inter', 'system-ui', 'sans-serif'],
mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
// radius
rounded:    { DEFAULT: '10px', sm: '6px', xl: '14px' }
```

## Suggested Next.js folder layout

```
app/
  (creators)/
    instagram/[username]/page.tsx        ← uses InstagramPage component
    tiktok/[username]/page.tsx
    twitter/[username]/page.tsx
    youtube/[id]/page.tsx
    twitch/[username]/page.tsx
components/
  creator/
    TopNav.tsx
    ProfileHead.tsx
    AudienceBlock.tsx
    charts/
      Donut.tsx
      Sparkline.tsx
      ScatterPlot.tsx
      PostingHeatmap.tsx
      AgePyramid.tsx
      BarsList.tsx
      CountryList.tsx
      CredibilityMeter.tsx
      ReachFlow.tsx
      Histogram.tsx
      NotableUsers.tsx
    instagram/InstagramPage.tsx
    tiktok/TikTokPage.tsx
    twitter/TwitterPage.tsx
    youtube/YouTubePage.tsx
    twitch/TwitchPage.tsx
lib/
  format.ts                              ← formatNum, formatPct, formatDate, flagEmoji, fmtDuration
  types/
    instagram.ts
    tiktok.ts
    twitter.ts
    youtube.ts
    twitch.ts
```

## Page anatomy (every platform follows this)

1. **TopNav** — logo + cross-platform tabs + actions
2. **ProfileHead** — avatar, name, verified badge, handle, bio, status tags, KPI strip (4 metrics)
3. **Profile Snapshot** — full identity dump (every flag/field from the JSON in a definition list)
4. **Performance Overview** — content mix donut, format-specific stats, scatter plots, posting heatmap
5. **Recent Posts/Videos/Tweets** — top performers grid + detailed feed with all engagement fields
6. **Tags & Discovery** — hashtags, mentions, tagged users, brands, niche
7. **Audience Intelligence** — credibility meter, gender split, age pyramid, audience types, reachability, languages, geo, ethnicities, brand affinity, interests, notable users, lookalikes, credibility histogram

Twitch is the exception (no audience demographics in API) — replaced with **Channel Panels** + **Connected Accounts** + **API Metadata** sections.

## JSON field coverage map

Every field from the 5 sample JSONs is rendered. Quick reference:

### Instagram (`result.instagram`)
- ✅ Identity: `username`, `userid`, `full_name`, `account_type`, `is_private/verified/business_account`, `has_profile_pic`, `exists`, `language_code`
- ✅ Bio: `biography` (object), `links_in_bio`, `uses_link_in_bio`
- ✅ Counts: `media_count`, `follower_count`, `following_count`
- ✅ Behavior flags: `video_content_creator`, `streamer`, `has_merch`, `promotes_affiliate_links`
- ✅ Metrics: `engagement_percent`, `avg_likes`, `avg_comments`, `likes_median`, `comments_median`, `most_recent_post_date`, `reels_percentage_last_12_posts`
- ✅ Reels: `reels.{avg_like_count, avg_view_count, comments_count, median_like_count, median_view_count}`
- ✅ Discovery: `tagged`, `hashtags`, `hashtags_count`, `locations`
- ✅ Posts: full `post_data[]` with caption, media, hashtags, tagged_users, engagement, is_carousel, media_type, product_type, post_url, created_at
- ✅ Audience: `audience.audience_followers/likers/commenters` — credibility, types, reachability, genders, ages, genders_per_age, ethnicities, languages, brand_affinity, interests, geo (countries/cities/states), lookalikes, notable_users, accounts_created_at
- ✅ Histograms: `audience_credibility_followers/likers_histogram`

### TikTok (`result.tiktok`)
- ✅ Identity: `username`, `user_id`, `sec_user_id`, `full_name`, `region`, `language_code`, `category`, `mention_status`, `tt_seller`
- ✅ Flags: `is_verified/private/ad/commerce`, `duet_setting`, `paid_partnership`, `has_paid_partnership`, `promotes_affiliate_links`, `uses_link_in_bio`, `has_merch`, `streamer`
- ✅ Counts: `follower_count`, `following_count`, `video_count`
- ✅ Engagement: `avg_likes`, `engagement_percent`, `likes_median`, `comment_count_avg`, `comments_median`, `duration_avg`, `play_count_avg/median`, `reach_score`, `total_likes/shares/saves`, `shares_median`, `saves_median`
- ✅ Trend: `creator_follower_growth.{3,6,9,12}_months_ago`, `saves_count_list`, `reach_score_list`
- ✅ Cadence: `posting_frequency`, `posting_frequency_recent_months`, `most_recent_post_date`
- ✅ Discovery: `hashtags`, `niche_class`, `niche_sub_class`, `tagged`, `challenges_list`, `brands_found`, `links_in_bio`
- ✅ Posts: `post_data[]` with caption, hashtags, mentions, sound, engagement (like/comment/view/share/download_count), media (duration), post_url
- ✅ Audience (followers only — likers/commenters return `empty_audience`)

### Twitter (`result.twitter`)
- ✅ Identity: `userid`, `username`, `full_name`, `join_date`, `biography`, `language_code`, `most_recent_post_date`
- ✅ Flags: `is_verified`, `direct_messaging`, `subscriber_button`, `super_followed_by`, `exists`, `streamer`, `has_merch`, `has_paid_partnership`, `promotes_affiliate_links`, `uses_link_in_bio`
- ✅ Counts: `follower_count`, `following_count`, `media_count`, `tweets_count`, `creator_favorite_count`
- ✅ Metrics: `avg_likes`, `avg_views`, `avg_quotes`, `avg_reply`, `avg_retweet`, `engagement_percent`
- ✅ Mix: `tweets_type.{ordinary, retweeted, conversation, quoted}`, `languages_tweet[]`
- ✅ Network: `platforms` (cross-platform), `tagged`, `tagged_usernames`, `recommended_users`, `retweet_users`, `retweets_count`, `other_links`, `links_in_bio`, `hashtags`, `hashtags_count`
- ✅ Tweets: `post_data[]` with tweet_id, created_at, text, lang, engagement (like/retweet/reply/quote/view_count), media, tweet_url, hashtags, mentions, is_pinned

### YouTube (`result.youtube`)
- ✅ Channel: `id`, `custom_url`, `title`, `first_name`, `description`, `country`, `location`, `speaking_language`, `published_at`, `privacy_status`, `made_for_kids`, `is_monetization_enabled`, `is_verified`, `has_shorts`, `has_community_posts`, `moderate_comments`, `unsubscribed_trailer_id`, `related_playlist_id`, `link`, `streamer`
- ✅ Counts: `subscriber_count`, `view_count`, `video_count`
- ✅ Metrics: `engagement_percent`, `avg_views`, `avg_likes`, `avg_comments`, `total_comments_last_50`, `least_views`, `median_views_long`, `avg_views_long/shorts`
- ✅ Format-specific ER: `engagement_percent_long/shorts`, `engagement_by_likes_and_views_long/shorts`, `engagement_by_comments_and_views_long/shorts`, `engagement_by_views_and_subs_long/shorts`, `shorts_percentage`
- ✅ Cadence: `posting_frequency`, `posting_frequency_long/shorts/recent_months`, `last_long/short_video_upload_date`, `most_recent_post_date`, `posts_per_month` (year × month calendar heatmap)
- ✅ Income: `income.{min, max, currency}`
- ✅ Discovery: `keywords`, `niche_class`, `niche_sub_class`, `topic_details`, `video_categories`, `video_topics`, `video_hashtags`, `hashtags_count`, `email_from_video_desc`, `language_code`
- ✅ Videos: `post_data[]` with video_id, title, description, published_at, category_id, default_language/audio_language, engagement (view/like/comment/favorite_count), media (thumbnails 5 sizes, duration ISO-8601, definition, embed_html), topic_categories, post_url
- ✅ Audience: followers + commenters tabs; likers `empty_audience`

### Twitch (`result.twitch`)
- ✅ Identity: `username`, `displayName`, `user_id`, `isPartner`, `language_code`
- ✅ Activity: `total_followers`, `avg_views`, `streamed_hours_last_30_days`, `streams_count_last_30_days`, `last_streamed`, `last_broadcast_game`, `last_broadcast_id`
- ✅ Flags: `has_merch`, `has_paid_partnership`, `promotes_affiliate_links`
- ✅ Cross-platform: `social_media.{twitch, twitter, instagram, youtube}`
- ✅ Channel panels: `panels_titles[]`, `panels_descriptions[]`, `panels_urls[]`, `panels_type[]`, `panels_image[]`
- ✅ Links: `links_in_bio`, `other_links`
- ✅ GraphQL meta: `post_data[0].data.channel.{id, login, displayName, primaryColorHex, videoShelves, __typename}`, `post_data[0].extensions.{operationName, durationMilliseconds, requestID}`
- ✅ Featured clips & VODs from `videoShelves.featuredClipShelf.items` and `videoShelves.recentVideoShelf.items`
- ⚠️ No audience demographics — Twitch API doesn't expose; use linked Twitter/IG/YouTube for audience.

## Component contracts (TypeScript shapes for porting)

```ts
// shared.jsx → TS
type WeightedItem = { code?: string; name?: string; weight: number };
type AudienceData = {
  notable_users_ratio?: number;
  audience_credibility?: number;
  credibility_class?: 'good'|'normal'|'bad';
  audience_types?: WeightedItem[];        // real, suspicious, influencers, mass_followers
  audience_reachability?: WeightedItem[]; // -500, 500-1000, 1000-1500, 1500-
  audience_genders?: WeightedItem[];      // MALE, FEMALE
  audience_ages?: WeightedItem[];         // 13-17, 18-24, 25-34, 35-44, 45-64, 65-
  audience_genders_per_age?: { code: string; male: number; female: number }[];
  audience_ethnicities?: WeightedItem[];
  audience_languages?: WeightedItem[];
  audience_brand_affinity?: WeightedItem[];
  audience_interests?: WeightedItem[];
  audience_geo?: { countries?: WeightedItem[]; cities?: WeightedItem[]; states?: WeightedItem[] };
  audience_lookalikes?: NotableUser[];
  notable_users?: NotableUser[];
  audience_accounts_created_at?: WeightedItem[];
};
type NotableUser = { username?: string; full_name?: string; user_id?: string; followers?: number; is_verified?: boolean };
```

## Notes for porting

- **Empty / null guards already in place** — `<AudienceBlock>` and every card check before rendering. If `audience_credibility` is null, the credibility card is hidden. Same for hashtags, brands, etc.
- **Twitch credibility histogram** is `{}` (object) not array — guarded.
- **JetBrains Mono** is used for every numeric value — keep this; it's load-bearing for the rhythm of the design.
- **Heatmap** infers day-of-week × hour from `created_at` / `published_at` strings — port the `PostingHeatmap` component as-is.
- **Year calendar** in YouTube reads `posts_per_month[year][monthName]` — keep month names lowercase (`january`, `february`, …).
- All IDs, URLs and raw values are exposed in definition lists — `<dl>` style — so nothing in the JSON is hidden.
- Avatar uses initials over a platform-themed gradient. Swap in `profile_picture_hd` when porting if you want real photos.
- The 2-column `.grid` becomes `grid grid-cols-1 lg:grid-cols-2 gap-4` in Tailwind. `.span-2` → `lg:col-span-2`.

## Run locally (preview pages)

The preview pages need `data-full.json` served alongside (any static server works):

```bash
npx serve .
# then open http://localhost:3000/instagram.html etc.
```

In production Next.js, replace the `fetch('data-full.json')` with the real API call returning the platform-specific JSON, and pass it as a prop to the page component (no async wrapper needed when using server components).
