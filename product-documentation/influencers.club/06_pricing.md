# Influencers Club API — Pricing, Credits & Limits
# Load this document when the task involves estimating costs, checking usage, or planning credit spend.

---

## Account Credits Endpoint
### `GET /public/v1/accounts/credits/`
**Credits:** 0 (always free)

**Response:**
```json
{
  "credits_available": 99.5,
  "credits_used": 0.5
}
```

Call this:
- Before any large Discovery query
- Before submitting a batch enrichment job
- Whenever Truleado user asks about remaining balance
- Proactively at the start of any multi-step workflow

---

## Full Credit Cost Reference

### Discovery
| Endpoint | Cost | Notes |
|---|---|---|
| `POST /public/v1/discovery/` | **0.01 per creator returned** | 0 if no results |
| `POST /public/v1/discovery/creators/similar/` | **0.01 per creator returned** | 0 if no results |

### Enrichment
| Endpoint | Mode | Cost | Notes |
|---|---|---|---|
| `POST /creators/enrich/handle/raw/` | Raw | **0.03** | 0 if no data |
| `POST /creators/enrich/handle/full/` | Full | **1.00** | 0 if no data |
| `POST /creators/enrich/email/` | — | **0.05** | 0 if no data |
| `POST /creators/socials/` | — | **0.50** | 0 if no data |

### Batch Enrichment
Same per-record rates as single enrichment:
| Mode | Cost per Record |
|---|---|
| Raw | **0.03** |
| Full | **1.00** |
| Basic (email) | **0.05** |

### Content
| Endpoint | Cost | Notes |
|---|---|---|
| `POST /creators/content/posts/` | **0.03 per page** | 0 if no data |
| `POST /creators/content/details/` | **0.03 per request** | 0 if no data |

### Other
| Endpoint | Cost |
|---|---|
| `POST /creators/audience/overlap/` | **1.00 flat per request** |
| All Dictionary endpoints (9 total) | **0.00** |
| `GET /public/v1/accounts/credits/` | **0.00** |
| Batch status, resume, download | **0.00** |

---

## Credit Deduction Rules
- Credits deducted **only on successful data returned**
- **Exception:** Discovery deducts on every request returning creators, even with identical repeat filters
- Batch enrichment: credits deducted per successfully enriched record, not per batch submission
- 0 credits deducted for any request that returns empty/no data

---

## Limits

### Discovery Limits
- Max **10,000 results** per query — cannot fetch beyond result #10,000
- **Separate credit pool** for Discovery = 10% of plan's total credits
- Track Discovery credits independently from enrichment credits

### Batch Enrichment Limits
- CSV file max size: **10MB**
- Single column only (handles or emails)

### Audience Overlap Limits
- Min **2 creators**, max **10 creators** per request

### Rate Limit
| Scope | Limit | On Exceed |
|---|---|---|
| All endpoints, all accounts | **300 requests/minute** | `429 Too Many Requests` |

### Trial Plan
- Maximum **10 credits total** on trial accounts

---

## Cost Estimation Guide

### Estimating a Discovery + Enrich Workflow
```
Example: Find and enrich 100 Instagram fitness creators

Step 1 - Discovery (find 500 candidates):
  500 creators × 0.01 = 5.00 credits

Step 2 - Raw enrichment (validate top 200):
  200 creators × 0.03 = 6.00 credits

Step 3 - Full enrichment (shortlisted 100):
  100 creators × 1.00 = 100.00 credits

Total estimated: ~111 credits
```

### Estimating a Batch Job
```
Example: Full enrich 500 handles

500 records × 1.00 (full mode) = 500.00 credits

Always check credits_available before submitting.
```

### Estimating Content Analysis
```
Example: Analyze 10 posts with data + transcript per post

10 posts × 2 requests (data + transcript) × 0.03 = 0.60 credits
```

---

## Credit Optimization Tips for Truleado
1. **Discovery before Enrichment** — always filter down first (0.01/creator) before enriching (1.00/creator)
2. **Raw before Full** — use Raw (0.03) to validate handles exist before running Full (1.00)
3. **Audience data on demand** — `include_audience_data` in batch defaults to `true` — set `false` if not needed
4. **Batch over single** — for large lists, batch enrichment is the same cost per record but operationally more efficient
5. **Max creators per Audience Overlap** — always use up to 10 in one request (flat 1 credit regardless)
6. **Cache Dictionary results** — all 9 dictionary endpoints are free but can be cached to reduce request volume
7. **Deduplicate Discovery results** — same filters on repeat requests cost credits again — cache results in Truleado
8. **Set Discovery page limits** — don't fetch all 10,000 results unless truly needed
