# Influencers Club API — Audience Overlap
# Load this document when the task involves comparing audiences between multiple creators.

## Endpoints in This Document
- `POST /public/v1/creators/audience/overlap/` — Compare audience overlap between 2–10 creators

---

## Audience Overlap
### `POST /public/v1/creators/audience/overlap/`
**Credits:** 1.00 flat per request (regardless of how many creators are compared)

**Request:**
```json
{
  "platform": "instagram|youtube|tiktok|twitch|twitter",
  "creators": ["handle1", "handle2", "handle3"]
}
```

**Rules:**
- Minimum **2 creators**, maximum **10 creators**
- All creators must be on the **same platform** — never mix platforms
- `creators` is an array of handle strings

**Response 200:**
```json
{
  "credits_cost": 1,
  "credits_left": 99.0,
  "status": true,
  "success": true,
  "basics": {
    "total_followers": 2500000,
    "total_unique_followers": 1800000
  },
  "details": [
    {
      "user_id": "string",
      "username": "string",
      "followers": 1500000,
      "unique_percentage": 72.5,
      "overlapping_percentage": 27.5,
      "user": {
        "user_id": "string",
        "username": "string",
        "followers": 1500000,
        "fullname": "string",
        "url": "string",
        "is_verified": true,
        "engagements": 45000,
        "stats": [
          {
            "post_type": "string",
            "engagements": 15000
          }
        ]
      }
    }
  ]
}
```

---

## Understanding the Response

### Report-Level (`basics`)
| Field | Meaning |
|---|---|
| `basics.total_followers` | Sum of ALL compared creators' followers (includes overlaps) |
| `basics.total_unique_followers` | True deduplicated reach across all creators — use this for campaign reach planning |

### Per-Creator (`details[]`)
| Field | Meaning |
|---|---|
| `unique_percentage` | % of this creator's audience NOT shared with any other compared creator |
| `overlapping_percentage` | % of this creator's audience shared with at least one other creator |
| `user.engagements` | Total engagements for this creator |
| `user.stats[].post_type` | Engagement breakdown by content type |

> `unique_percentage` + `overlapping_percentage` = 100% for each creator

---

## How to Use This Data in Truleado

**For campaign reach planning:**
- Use `basics.total_unique_followers` as the true unduplicated campaign reach
- A high `overlapping_percentage` across creators means diminishing returns on adding more of them

**For creator selection:**
- Prefer creators with high `unique_percentage` — they add incremental reach
- Creators with high `overlapping_percentage` share audiences — consider replacing one with a more distinct creator

**For partnership evaluation:**
- Compare 2 creators to see if a co-promotion makes sense
- Low overlap = complementary audiences = good partnership fit
- High overlap = redundant audiences = pick one or find a different partner

---

## Credit Optimization
- Cost is **flat 1 credit per request regardless of creator count**
- Always compare as many creators as needed (up to 10) in a **single request**
- Never split into multiple smaller requests — it wastes credits

**Example:**
```
Comparing 5 creators in one request = 1 credit ✅
Comparing them in 5 separate 2-creator requests = 5 credits ❌
```

---

## Agent Rules — Audience Overlap
1. **Validate array length** — reject if fewer than 2 or more than 10 creators
2. **All handles must be on the same platform** — validate before sending, never mix
3. **Flat 1 credit regardless of count** — always use one request with all creators, never split
4. **`basics.total_unique_followers` is the true reach number** — use this, not the sum of `followers`
5. **No pagination** — single response, all data returned at once
6. **`details[].user.stats`** contains engagement breakdown by post type — surface this in Truleado UI
7. **`unique_percentage` + `overlapping_percentage` = 100%** per creator — validate this in Truleado if needed
