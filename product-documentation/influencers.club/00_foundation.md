# Influencers Club API — Foundation
# Always include this document in every agent session.

## Project Context
- App: **Truleado** (Next.js)
- API: Influencers Club Public API
- Supported platforms: **Instagram, YouTube, TikTok, Twitch, Twitter/X**
- Excluded everywhere: **OnlyFans** — never use, never reference

---

## Base URL
```
https://api-dashboard.influencers.club
```

---

## Authentication
Every single request must include:
```
Authorization: Bearer YOUR_API_KEY
```
- Load API key from environment variable — never hardcode
- Missing or invalid key returns `401 Unauthorized`
- Auth scheme: HTTP Bearer (JWT format)

---

## Error Codes — Handle on Every Endpoint
| Code | Meaning | Required Action |
|---|---|---|
| `400` | Bad request | Check required fields, or batch not finished yet |
| `401` | Invalid/missing API key | Surface clear error to Truleado user |
| `404` | Not found | Invalid batch ID or handle does not exist |
| `422` | Validation error | Check request body structure and field types |
| `429` | Rate limit exceeded | Exponential backoff + retry — see rate limits below |

---

## Rate Limits
| Scope | Limit | On Exceed |
|---|---|---|
| All endpoints, all accounts | **300 requests/minute** | `429` |

- **Always implement exponential backoff on `429`** — applies to every endpoint without exception
- Trial accounts: maximum **10 credits total**

---

## Credit System — Core Rules
- Credits are deducted **only when data is successfully returned**
- If a request returns no data → **0 credits deducted**
- Exception: Discovery deducts credits on every request that returns creators, **even if filters are identical to a previous request**
- It is Truleado's responsibility to track credit usage — never assume credits are available
- Check credits via `GET /public/v1/accounts/credits/` before large or batch operations

### Credit Costs at a Glance
| Operation | Credits |
|---|---|
| Discovery / Similar Creators | 0.01 per creator returned |
| Enrich by handle — Raw | 0.03 |
| Enrich by handle — Full | 1.00 |
| Enrich by email | 0.05 |
| Connected Socials | 0.50 |
| Creator Posts (per page) | 0.03 |
| Post Details (per request) | 0.03 |
| Audience Overlap (flat) | 1.00 |
| All Dictionary endpoints | 0.00 |
| Account credits check | 0.00 |
| Batch status / resume / download | 0.00 |

### Discovery Credit Limit
- Discovery API has a **separate credit limit = 10% of the plan's total credits**
- Track Discovery credits independently from enrichment credits

---

## Profile Image Expiry — Critical
Every `profile_picture`, `profile_picture_hd`, `picture`, and `profile_pic_url` field across ALL endpoints returns a **temporary URL that expires after 24 hours**.
- If Truleado needs to persist any profile image, **download it to own storage immediately**
- Never store the URL alone and assume it will be valid later

---

## Pagination — Two Different Systems
Different endpoints use different pagination — do not mix them up:

| Endpoint Group | Pagination Type | Field |
|---|---|---|
| Discovery, Similar Creators | Page number | `paging: { page: N, limit: 1-50 }` |
| Creator Posts, Post Details comments | Cursor-based | `next_token` / `pagination_token` |

---

## Two-Stage Recommended Workflow
1. **Discovery first** — search and filter creators at scale (cheap: 0.01/creator)
2. **Enrich second** — get full data only on qualified, shortlisted creators (1.00/creator)
- Never run full enrichment on unfiltered bulk lists — it will drain credits fast

---

## Platform Reference (Truleado Scope)
| Platform | Discovery | Similar | Enrich Full | Enrich Raw | Posts | Audience Overlap |
|---|---|---|---|---|---|---|
| Instagram | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| YouTube | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| TikTok | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Twitch | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Twitter/X | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

---

## Account Credits Endpoint
### `GET /public/v1/accounts/credits/`
**Credits:** 0

**Response:**
```json
{
  "credits_available": 99.5,
  "credits_used": 0.5
}
```
Call this before any large discovery query or batch enrichment job to confirm sufficient credits.
