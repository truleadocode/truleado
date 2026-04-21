# Influencers Club API — Enrichment
# Load this document when the task involves enriching a specific creator profile.

## Endpoints in This Document
- `POST /public/v1/creators/socials/` — Connected social accounts
- `POST /public/v1/creators/enrich/handle/full/` — Full enrichment by handle
- `POST /public/v1/creators/enrich/handle/raw/` — Raw enrichment by handle
- `POST /public/v1/creators/enrich/email/` — Basic enrichment by email

---

## Choosing the Right Enrichment Mode
| Scenario | Endpoint | Credits |
|---|---|---|
| Check if creator exists / basic data only | Raw | 0.03 |
| Find all platforms for a known creator | Connected Socials | 0.50 |
| Quick lookup from email address | Enrich by Email | 0.05 |
| Full profile for a shortlisted creator | Enrich by Handle Full | 1.00 |

**Rule:** Never run Full enrichment on unfiltered bulk lists. Use Discovery first, then enrich only qualified candidates.

---

## 1. Connected Socials
### `POST /public/v1/creators/socials/`
**Credits:** 0.5/successful request (0 if no data returned)

**Request:**
```json
{
  "platform": "instagram|youtube|tiktok|twitter|snapchat|discord|pinterest|facebook|linkedin|twitch",
  "handle": "username | profile URL | YouTube channel ID (UC...)"
}
```

**Response 200:**
```json
{
  "credits_cost": 0.5,
  "response_meta": {},
  "result": [
    {
      "platform": "string",
      "user_id": "string",
      "url": "string",
      "username": "string",
      "fullname": "string",
      "picture": "string (expires 24hrs)",
      "followers": 250000
    }
  ]
}
```
Returns array of ALL verified connected accounts across platforms.

---

## 2. Enrich by Handle — Full
### `POST /public/v1/creators/enrich/handle/full/`
**Credits:** 1.00/successful request (0 if no data returned)

**Request:**
```json
{
  "handle": "username | profile URL | YouTube channel ID (UC...)",
  "platform": "instagram|youtube|tiktok|twitter|snapchat|discord|pinterest|facebook|linkedin|twitch",
  "email_required": "must_have|preferred",
  "include_lookalikes": false,
  "include_audience_data": false
}
```

**Notes on optional fields:**
- `email_required: "must_have"` → returns no result if no email found. Use `"preferred"` unless email is strictly needed
- `include_audience_data: true` → adds demographic breakdown (followers, commenters, likers). Same 1 credit cost but significantly more data — use intentionally
- `include_lookalikes: true` → adds similar creator recommendations

**Response 200 — Top-level:**
```json
{
  "credits_cost": 1,
  "result": {
    "email": "string",
    "email_type": "string",
    "location": "string",
    "speaking_language": "string",
    "first_name": "string",
    "gender": "string",
    "has_link_in_bio": true,
    "has_brand_deals": true,
    "is_business": false,
    "is_creator": true,
    "creator_has": {},
    "other_links": [],
    "links_in_bio": [],
    "instagram": {},
    "youtube": {},
    "tiktok": {},
    "twitter": {},
    "twitch": {},
    "linkedin": {}
  }
}
```

**Per-platform fields in `result` (Truleado platforms):**

**`result.instagram`:**
```
userid, username, full_name, follower_count, engagement_percent,
biography, niche_class (array), niche_sub_class, hashtags (array),
creator_follower_growth (object), posting_frequency_recent_months,
profile_picture (expires 24hrs), income (object), post_data (object)

audience (only if include_audience_data: true):
  audience_followers: geo, languages, ages, genders, interests,
                      brand affinities, credibility score, reachability
  audience_commenters: same structure as audience_followers
  audience_likers: credibility score, credibility class
  audience_credibility_followers_histogram (array)
  audience_credibility_likers_histogram (array)
```

**`result.youtube`:**
```
id, custom_url, first_name, subscriber_count, engagement_percent,
title, description, niche_class (array), niche_sub_class (array),
video_count, view_count, avg_views, video_hashtags (array),
posting_frequency_recent_months, is_monetization_enabled,
has_community_posts, uses_link_in_bio,
profile_picture (expires 24hrs), income (object), post_data (object)

audience (only if include_audience_data: true):
  same structure as Instagram audience
```

**`result.tiktok`:**
```
user_id, username, full_name, follower_count, engagement_percent,
biography, category, niche_class, niche_sub_class, avg_likes,
hashtags (array), creator_follower_growth, posting_frequency_recent_months,
has_merch, uses_link_in_bio,
profile_picture (expires 24hrs), post_data (object)

audience (only if include_audience_data: true):
  same structure as Instagram audience
```

**`result.twitter`:**
```
userid, username, full_name, follower_count, engagement_percent,
biography, avg_likes, hashtags (array),
tweets_frequency_recent_months,
profile_picture (expires 24hrs), post_data (object)
```

**`result.twitch`:**
```
user_id, username, first_name, total_followers, avg_views,
posting_frequency_recent_months,
profile_picture (expires 24hrs), post_data (object)
```

**`result.linkedin`:**
```
username, user_id, first_name, full_name, biography,
connections, follower_count, hashtags (array), gender,
full_name_and_organization_job_title,
profile_picture (expires 24hrs), post_data (object)
```

---

## 3. Enrich by Handle — Raw
### `POST /public/v1/creators/enrich/handle/raw/`
**Credits:** 0.03/successful request (0 if no data returned)

**Request:**
```json
{
  "handle": "username | profile URL | YouTube channel ID (UC...)",
  "platform": "instagram|youtube|tiktok|twitter|snapchat|discord|pinterest|facebook|linkedin"
}
```
> ⚠️ Twitch is NOT in the raw endpoint platform enum — use Full enrichment for Twitch

**Response 200 — Per platform (Truleado platforms):**

**`result.instagram`:**
```
userid, exists, username, has_profile_pic,
profile_picture, profile_picture_hd (both expire 24hrs),
biography, full_name, category, media_count,
follower_count, following_count, is_private,
is_business_account, is_verified, video_content_creator,
uses_link_in_bio, links_in_bio (array), post_data (array)
```

**`result.youtube`:**
```
id, exists, link, profile_picture, profile_picture_hd (both expire 24hrs),
related_playlist_id, custom_url, title, description, published_at,
subscriber_count, video_count, view_count, country,
has_shorts, has_community_posts, made_for_kids, privacy_status,
moderate_comments, unsubscribed_trailer_id,
total_comments_last_50, topic_details (array), post_data (array)
```

**`result.tiktok`:**
```
user_id, sec_user_id, exists, username,
profile_picture, profile_picture_hd (both expire 24hrs),
full_name, biography, follower_count, following_count,
video_count, total_likes, total_shares, total_saves,
links_in_bio (array), tt_seller, is_ad, is_verified,
is_commerce, duet_setting, is_private,
saves_count_list (array), post_data (array)
```

**`result.twitter`:**
```
userid, exists, username, full_name, biography,
profile_picture, profile_picture_hd (both expire 24hrs),
join_date, links_in_bio (array), location,
follower_count, following_count, media_count, tweets_count,
creator_favorite_count, is_verified, direct_messaging,
subscriber_button, super_followed_by,
tweets_type (object), post_data (array)
```

**`result.linkedin`:**
```
id, connection, followers, username, first_name, last_name,
is_creator, is_premium, profile_picture, profile_pictures (array),
background_image, summary, headline, geo (object),
position (object), full_positions (array), skills (array),
projects (array), supported_locales (array),
multi_locale_first_name/last_name/headline (objects)
```

---

## 4. Enrich by Email
### `POST /public/v1/creators/enrich/email/`
**Credits:** 0.05/successful request (0 if no data returned)

**Request:**
```json
{
  "email": "creator@example.com"
}
```

**Response 200:**
```json
{
  "credits_cost": 0.05,
  "result": {
    "platform": "string (strongest platform by follower count — only one returned)",
    "userId": "string",
    "url": "string",
    "username": "string",
    "fullname": "string",
    "picture": "string (expires 24hrs)",
    "followers": 0
  }
}
```
> ⚠️ Returns **only one platform** — the one with the highest follower count. Use handle enrichment if full cross-platform data is needed.

---

## Agent Rules — Enrichment
1. **`handle` accepts 3 formats** — username, profile URL, or YouTube channel ID (`UC...`) — validate before sending
2. **Raw is 33x cheaper than Full** (0.03 vs 1.00) — always use Raw for existence checks or basic validation
3. **Full enrichment only on qualified candidates** — never bulk enrich without Discovery filtering first
4. **`include_audience_data` is false by default** on single enrichment — set `true` only when demographic data is specifically needed
5. **`email_required: "must_have"`** will return empty if no email — use `"preferred"` as default
6. **All profile images expire in 24hrs** — download to Truleado storage immediately if persisting
7. **Twitch raw enrichment is not supported** — use Full enrichment for Twitch creators
8. **Email enrichment returns one platform only** — never rely on it for cross-platform data
9. **`exists` field in Raw responses** — check this before processing the rest of the data
