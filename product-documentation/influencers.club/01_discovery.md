# Influencers Club API — Discovery
# Load this document when the task involves searching or finding creators.

## Endpoints in This Document
- `POST /public/v1/discovery/` — Search creators by filters
- `POST /public/v1/discovery/creators/similar/` — Find lookalike creators
- All `GET /public/v1/discovery/classifier/*` — Dictionary endpoints (free)

---

## 1. Creator Discovery
### `POST /public/v1/discovery/`
**Credits:** 0.01 per creator returned (0 if no results)

### Required Parameters (every platform)
```json
{
  "platform": "instagram|youtube|tiktok|twitch|twitter",
  "paging": { "limit": 1-50, "page": 1 }
}
```

### Response 200
```json
{
  "total": 500,
  "limit": 50,
  "credits_left": "99.5",
  "accounts": [
    {
      "user_id": "string",
      "profile": {
        "full_name": "string",
        "username": "string",
        "picture": "string (URL expires 24hrs — download to own storage)",
        "followers": 50000,
        "engagement_percent": 3.2
      }
    }
  ]
}
```

### Limits
- Max 10,000 results per query — if `total` > 10,000, narrow filters
- Credits consumed on every request returning creators, even with identical filters
- Discovery has a separate credit pool = 10% of plan total

### Pagination
- Increment `paging.page` each call
- Stop when fetched count matches `total` or page limit reached
- Always set a configurable max-pages safety limit in Truleado

---

### Platform Filters

#### 📸 Instagram — `platform: "instagram"`
```
Required: paging
Optional filters:
- location (string[])                          → use /classifier/locations/instagram/
- type (string)
- gender (string)
- profile_language (string[])                  → use /classifier/languages/
- ai_search (string, 3–150 chars)
- creator_has (object)
- exclude_role_based_emails (boolean)
- exclude_handles (string[], max 10,000)
- number_of_followers ({min, max})
- posting_frequency (number)
- follower_growth ({growth_percentage, time_range_months})
- average_likes ({min, max})
- average_comments ({min, max})
- exclude_private_profile (boolean)
- is_verified (boolean)
- has_link_in_bio (boolean)
- has_done_brand_deals (boolean)
- promotes_affiliate_links (boolean)
- does_live_streaming (boolean)
- keywords_in_bio (string[])
- last_post (number): days since last post
- income ({min, max})
- exclude_keywords_in_bio (string[])
- keywords_in_captions (string[])
- link_in_bio (string[])
- hashtags (string[])
- not_hashtags (string[])
- brands (string[])                            → use /classifier/brands/
- has_videos (boolean)
- has_merch (boolean)
- number_of_posts ({min, max})
- reels_percent ({min, max})
- average_views_for_reels ({min, max})
- engagement_percent ({min, max})
- audience (object) ← INSTAGRAM 10k+ FOLLOWERS ONLY
    audience.brand_categories                  → use /classifier/audience-brand-categories/
    audience.brands                            → use /classifier/audience-brand-names/
    audience.interests                         → use /classifier/audience-interests/
    audience.location                          → use /classifier/audience-locations/
```

#### 📺 YouTube — `platform: "youtube"`
```
Required: paging
Optional filters:
- location (string[])                          → use /classifier/locations/youtube/
- type (string)
- gender (string)
- profile_language (string[])                  → use /classifier/languages/
- ai_search (string)
- creator_has (object)
- exclude_role_based_emails (boolean)
- exclude_handles (string[], max 10,000)
- posting_frequency (number)
- is_verified (boolean)
- has_link_in_bio (boolean)
- has_done_brand_deals (boolean)
- promotes_affiliate_links (boolean)
- does_live_streaming (boolean)
- last_upload_long_video (number): days since
- last_upload_short_video (number): days since
- income ({min, max})
- number_of_subscribers ({min, max})
- topics (string[])                            → use /classifier/yt-topics/
- keywords_in_video_titles (string[])
- keywords_in_description (string[])
- keywords_not_in_description (string[])
- keywords_in_video_description (string[])
- keywords_not_in_video_description (string[])
- links_from_description (string[])
- links_from_video_description (string[])
- hashtags (string[])
- not_hashtags (string[])
- brands (string[])                            → use /classifier/brands/
- subscriber_growth ({growth_percentage, time_range_months})
- has_shorts (boolean)
- has_podcast (boolean)
- has_courses (boolean)
- has_membership (boolean)
- shorts_percentage ({min, max})
- has_community_posts (boolean)
- streams_live (boolean)
- has_merch (boolean)
- average_views_on_long_videos ({min, max})
- average_views_on_shorts ({min, max})
- number_of_videos ({min, max})
- is_monetizing (boolean)
- long_video_duration ({min, max})
- average_stream_views ({min, max})
- average_stream_duration ({min, max})
- last_stream_upload (number): days since
- engagement_percent ({min, max})
```

#### 🎵 TikTok — `platform: "tiktok"`
```
Required: paging
Optional filters:
- location (string[])                          → use /classifier/locations/tiktok/
- type (string)
- gender (string)
- profile_language (string[])                  → use /classifier/languages/
- ai_search (string)
- creator_has (object)
- exclude_role_based_emails (boolean)
- exclude_handles (string[], max 10,000)
- number_of_followers ({min, max})
- posting_frequency (number)
- follower_growth ({growth_percentage, time_range_months})
- average_likes ({min, max})
- average_comments ({min, max})
- average_views ({min, max})
- average_video_downloads ({min, max})
- has_tik_tok_shop (boolean)
- exclude_private_profile (boolean)
- is_verified (boolean)
- has_link_in_bio (boolean)
- has_done_brand_deals (boolean)
- promotes_affiliate_links (boolean)
- does_live_streaming (boolean)
- keywords_in_bio (string[])
- last_post (number): days since
- exclude_keywords_in_bio (string[])
- link_in_bio (string[])
- hashtags (string[])
- not_hashtags (string[])
- not_video_description (string[])
- video_description (string[])
- brands (string[])                            → use /classifier/brands/
- has_merch (boolean)
- video_count ({min, max})
- engagement_percent ({min, max})
```

#### 🎮 Twitch — `platform: "twitch"`
```
Required: paging
Optional filters:
- location (string[])                          → use /classifier/locations/twitch/
- gender (string)
- profile_language (string[])                  → use /classifier/languages/
- ai_search (string)
- creator_has (object)
- exclude_role_based_emails (boolean)
- exclude_handles (string[], max 10,000)
- is_verified (boolean)
- has_link_in_bio (boolean)
- has_done_brand_deals (boolean)
- promotes_affiliate_links (boolean)
- does_live_streaming (boolean)
- most_recent_stream_date (number): days since
- keywords_in_description (string[])
- link_in_bio (string[])
- brands (string[])                            → use /classifier/brands/
- has_merch (boolean)
- followers ({min, max})
- active_subscribers ({min, max})
- streamed_hours_last_30_days ({min, max})
- total_hours_streamed ({min, max})
- maximum_views_count ({min, max})
- avg_views_last_30_days ({min, max})
- streams_count_last_30_days ({min, max})
- games_played (string[])                      → use /classifier/games/
- is_twitch_partner (boolean)
```

#### 🐦 Twitter/X — `platform: "twitter"`
```
Required: paging
Optional filters:
- location (string[])                          → use /classifier/locations/twitter/
- type (string)
- gender (string)
- profile_language (string[])                  → use /classifier/languages/
- ai_search (string)
- creator_has (object)
- exclude_role_based_emails (boolean)
- exclude_handles (string[], max 10,000)
- number_of_followers ({min, max})
- average_likes ({min, max})
- is_verified (boolean)
- has_link_in_bio (boolean)
- has_done_brand_deals (boolean)
- promotes_affiliate_links (boolean)
- does_live_streaming (boolean)
- keywords_in_bio (string[])
- keywords_in_tweets (string[])
- last_post (number): days since
- exclude_keywords_in_bio (string[])
- link_in_bio (string[])
- hashtags (string[])
- not_hashtags (string[])
- brands (string[])                            → use /classifier/brands/
- has_merch (boolean)
- tweets_count ({min, max})
- engagement_percent ({min, max})
```

---

## 2. Similar Creators
### `POST /public/v1/discovery/creators/similar/`
**Credits:** 0.01 per creator returned (0 if no results)

### Required Parameters (every platform)
```json
{
  "platform": "instagram|youtube|tiktok|twitch|twitter",
  "filter_key": "url|username|id",
  "filter_value": "the reference creator identifier",
  "paging": { "limit": 1-50, "page": 1 }
}
```

### Optional Parameters
```json
{
  "filters": { /* same platform-specific filters as Discovery above */ }
}
```

### Response 200
Identical shape to Discovery response — same `total`, `limit`, `credits_left`, `accounts` array.

### Key Differences vs Discovery
- **`filter_key` + `filter_value` are required** — always identify the reference creator
- `filter_key` must be exactly one of: `url`, `username`, `id`
- `filters` object is optional — use to narrow similarity results further
- Same pagination, same credit rules, same 10,000 result cap
- Same response shape — Truleado can reuse the same response parser

---

## 3. Dictionary Endpoints (all free — 0 credits)
Always fetch filter values from these endpoints — never hardcode. Values evolve over time.

| Endpoint | Returns | Use In Filter |
|---|---|---|
| `GET /public/v1/discovery/classifier/languages/` | `[{language, abbreviation}]` | `profile_language` |
| `GET /public/v1/discovery/classifier/locations/{platform}/` | location strings | `location` |
| `GET /public/v1/discovery/classifier/brands/` | `[{full_name, cleaned, username}]` | `brands` |
| `GET /public/v1/discovery/classifier/yt-topics/` | `[{topic_details, sub_topic_details[]}]` | `topics` (YouTube only) |
| `GET /public/v1/discovery/classifier/games/` | `[{topic_details, sub_topic_details[]}]` | `games_played` (Twitch only) |
| `GET /public/v1/discovery/classifier/audience-brand-categories/` | `[{full_name, cleaned, username}]` | `audience.brand_categories` (Instagram 10k+ only) |
| `GET /public/v1/discovery/classifier/audience-brand-names/` | `[{full_name, cleaned, username}]` | `audience.brands` (Instagram 10k+ only) |
| `GET /public/v1/discovery/classifier/audience-interests/` | `[{full_name, cleaned, username}]` | `audience.interests` (Instagram 10k+ only) |
| `GET /public/v1/discovery/classifier/audience-locations/` | `[{full_name, cleaned, username}]` | `audience.location` (Instagram 10k+ only) |

### Dictionary Pagination (audience endpoints)
`audience-brand-categories`, `audience-brand-names`, `audience-interests`, `audience-locations` support:
- `search` (string) — filter results
- `offset` (integer) — pagination cursor

### Path Parameter for Locations
`/classifier/locations/{platform}/` — replace `{platform}` with: `instagram`, `youtube`, `tiktok`, `twitch`, `twitter`

---

## Agent Rules — Discovery
1. **`platform` + `paging` always required** on every discovery request
2. **`audience.*` filters are Instagram 10k+ only** — never apply to other platforms
3. **`ai_search` must be 3–150 chars on Instagram** — validate before sending
4. **Always use `cleaned` field** from dictionary responses as the filter value to send
5. **Fetch dictionary values programmatically** — never hardcode locations, languages, topics, games
6. **Repeated identical requests still cost credits** — build deduplication/caching in Truleado
7. **`picture` in response expires 24hrs** — download immediately if persisting
8. **`filter_key` on Similar Creators** must be exactly `url`, `username`, or `id` — validate strictly
