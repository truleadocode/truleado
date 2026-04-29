# Influencers Club API — Creator Content
# Load this document when the task involves fetching posts or analyzing specific content.

## Endpoints in This Document
- `POST /public/v1/creators/content/posts/` — Fetch recent posts for a creator
- `POST /public/v1/creators/content/details/` — Deep dive on a specific post

---

## Supported Platforms
Both endpoints support: **Instagram, TikTok, YouTube only**
Twitter and Twitch are NOT supported for content endpoints.

---

## 1. Creator Posts
### `POST /public/v1/creators/content/posts/`
**Credits:** 0.03 per page/request (0 if no data returned)

**Request:**
```json
{
  "platform": "instagram|tiktok|youtube",
  "handle": "username | profile URL | YouTube channel ID (UC...)",
  "count": 12,
  "pagination_token": "cursor_from_previous_response"
}
```

**Platform page size rules:**
| Platform | Default | Max | Configurable? |
|---|---|---|---|
| Instagram | 12 | 12 | ❌ Fixed — do not send different value |
| TikTok | 30 | 35 | ✅ |
| YouTube | 30 | 50 | ✅ |

**Response 200:**
```json
{
  "credits_cost": 0.03,
  "result": {
    "num_results": 12,
    "more_available": true,
    "next_token": "string (null if no more pages)",
    "status": "string",
    "items": [
      {
        "pk": "string",
        "taken_at": 1700000000,
        "device_timestamp": 1700000000,
        "url": "string",
        "media_url": "string",
        "media_id": "string",
        "media_type": 1,
        "caption": "string",
        "thumbnails": {},
        "image_versions": {
          "candidates": [
            {
              "url": "string",
              "width": 1080,
              "height": 1080
            }
          ]
        },
        "engagement": {
          "likes": 1200,
          "comments": 45,
          "views": 15000
        },
        "user": {
          "pk": "string",
          "username": "string",
          "full_name": "string",
          "profile_pic_url": "string (expires 24hrs)"
        }
      }
    ]
  }
}
```

### Key Fields
- `items[].pk` → this is the `post_id` to pass to Post Details endpoint
- `result.more_available` → check this to decide whether to paginate
- `result.next_token` → pass as `pagination_token` in next request
- `items[].engagement` → `likes`, `comments`, `views` per post
- `items[].caption` → post caption text
- `items[].media_type` → integer representing media type (image, video, carousel)

### Pagination Flow
```
1. First request: omit pagination_token
2. Check result.more_available
3. If true AND next_token is not null → send next request with pagination_token = next_token
4. Repeat until more_available = false OR next_token = null
5. Each page = 0.03 credits — set a max-pages limit in Truleado
```

---

## 2. Post Details
### `POST /public/v1/creators/content/details/`
**Credits:** 0.03 per request (0 if no data returned)

**Request:**
```json
{
  "platform": "instagram|tiktok|youtube",
  "content_type": "data|comments|transcript|audio",
  "post_id": "3702042988674165349_1541770582",
  "pagination_token": "cursor_string (optional, for comments only)"
}
```

### Supported `content_type` Per Platform
| content_type | Instagram | TikTok | YouTube |
|---|---|---|---|
| `data` | ✅ | ✅ | ✅ |
| `comments` | ✅ | ✅ | ✅ |
| `transcript` | ✅ | ✅ | ✅ |
| `audio` | ✅ | ✅ | ❌ |

> ⚠️ Never request `audio` for YouTube — not supported

**Response 200:**
```json
{
  "credits_cost": 0.03,
  "result": {
    // Dynamic structure — varies by platform AND content_type
    // data      → post metadata + engagement stats (likes, views, shares)
    // comments  → paginated comment list
    // transcript → spoken text extracted from video
    // audio     → audio resource reference (Instagram & TikTok only)
  }
}
```

> ⚠️ `result` is a dynamic key-value object — structure varies by platform and content_type. Handle each combination separately in Truleado.

### content_type Use Cases
| content_type | Use Case in Truleado |
|---|---|
| `data` | Post engagement deep-dive, performance analytics |
| `comments` | Brand safety review, sentiment analysis, community health |
| `transcript` | Content analysis, keyword extraction, brand mention detection |
| `audio` | Audio content reference (Instagram/TikTok only) |

### Comments Pagination
- `comments` content_type supports pagination via `pagination_token`
- Same cursor pattern as Creator Posts — pass token from response into next request
- Each page = 0.03 credits

---

## Credit Planning for Content Operations
Each `content_type` is a **separate request** (0.03 each). Example costs for one post:

| What You Need | Requests | Credits |
|---|---|---|
| Post data only | 1 | 0.03 |
| Data + comments | 2 | 0.06 |
| Data + transcript | 2 | 0.06 |
| Full analysis (data + comments + transcript) | 3 | 0.09 |
| Full analysis + audio (Instagram/TikTok) | 4 | 0.12 |

---

## Agent Rules — Creator Content
1. **Get `post_id` from Creator Posts first** — `items[].pk` is the ID to pass to Post Details
2. **Instagram page size is fixed at 12** — never send a different `count` value
3. **Pagination is cursor-based** — use `next_token`, NOT page numbers like Discovery
4. **Always check `more_available` before paginating** — stop when `false` or `next_token` is null
5. **Set a max-pages limit** — each page costs 0.03, runaway pagination can be expensive
6. **Never request `audio` for YouTube** — unsupported, will fail or return empty
7. **`result` in Post Details is dynamic** — parse each `content_type` response separately in Truleado
8. **`profile_pic_url` in post items expires 24hrs** — download to storage if persisting
9. **Each `content_type` = one request = 0.03 credits** — only request what is actually needed
10. **Twitter and Twitch not supported** for any content endpoints — reject such requests early
