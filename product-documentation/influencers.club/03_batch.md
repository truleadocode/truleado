# Influencers Club API — Batch Enrichment
# Load this document when the task involves processing a list/CSV of creators in bulk.

## Endpoints in This Document
- `POST /public/v1/enrichment/batch/` — Create batch job
- `GET /public/v1/enrichment/batch/{batch_id}/status/` — Check status
- `POST /public/v1/enrichment/batch/{batch_id}/resume/` — Resume paused job
- `GET /public/v1/enrichment/batch/{batch_id}/download/` — Download results (recommended)
- `GET /public/v1/enrichment/batch/{batch_id}/` — Download results (direct, JSON support)

---

## How Batch Enrichment Works
1. Upload a CSV file (single column: handles or emails)
2. Choose enrichment mode
3. Receive a `batch_id`
4. Poll `/status/` every 30–60 seconds
5. When status is `finished` → download results
6. **No webhooks exist** — polling is the only way to track progress

---

## Credit Costs
Credits deducted per successfully enriched record — same rates as single enrichment:
| Mode | Credits per Record |
|---|---|
| Raw | 0.03 |
| Full | 1.00 |
| Basic (email) | 0.05 |

If no data returned for a record → 0 credits for that record.
Always check `/public/v1/accounts/credits/` before submitting large batches.

---

## 1. Create Batch Enrichment
### `POST /public/v1/enrichment/batch/`
**Content-Type:** multipart/form-data
**Credits:** 0 to create (credits deducted per enriched record)

**Request fields:**
```
file (binary, required)
  CSV file, max 10MB, single column of handles or emails

enrichment_mode (string, required)
  "raw" | "full" | "basic"

platform (string)
  Required for handle modes (raw/full)
  instagram | youtube | tiktok | twitter | twitch
  NOT required for email mode (basic)

metadata (object, optional)
  Tag the batch for tracking, e.g. {"campaign": "Q4 Outreach", "client": "Nike"}

email_required (string)
  "must_have" | "preferred"
  Default: "preferred"

include_lookalikes (boolean)
  Default: false
  Only applies to full handle enrichment

include_audience_data (boolean)
  Default: true  ← NOTE: defaults TRUE in batch (opposite of single enrichment)
  Set false explicitly to save credits if audience data not needed

exclude_platforms (string)
  Platforms to exclude from results

min_followers (integer)
  Minimum follower threshold filter
```

**Response 200:**
```json
{
  "batch_id": "abc-123",
  "status": "queued|processing|validating",
  "created_at": "2025-01-15T10:00:00Z",
  "platform": "string",
  "metadata": {},
  "og_input_number": 500,
  "type_report": "ENRICH_BY_HANDLE|ENRICH_BY_EMAIL",
  "enrichment_mode": "raw|full|basic",
  "message": "string"
}
```
Store `batch_id` immediately — it's needed for all subsequent calls.

---

## 2. Get Batch Status
### `GET /public/v1/enrichment/batch/{batch_id}/status/`
**Credits:** 0

**Path param:** `batch_id` (string, required)

**Response 200:**
```json
{
  "batch_id": "string",
  "status": "queued|processing|finished|failed|paused_insufficient_credits",
  "total_rows": 500,
  "processed_rows": 320,
  "success_count": 310,
  "failed_count": 10,
  "started_at": "2025-01-15T10:00:00Z",
  "metadata": {},
  "credits_used": "string",
  "estimated_completion": "2025-01-15T10:30:00Z",
  "status_message": "string (only present when paused)"
}
```

### All 5 Status States — Agent Must Handle Each
| Status | Meaning | Action |
|---|---|---|
| `queued` | Waiting to start | Keep polling |
| `processing` | Actively enriching | Keep polling |
| `finished` | All records done | Proceed to download |
| `failed` | Job failed | Surface error to user, do not retry automatically |
| `paused_insufficient_credits` | Ran out of credits mid-run | Top up credits, then call resume endpoint |

**Polling interval:** Every 30–60 seconds. Never poll faster than 30s.

---

## 3. Resume Batch
### `POST /public/v1/enrichment/batch/{batch_id}/resume/`
**Credits:** 0

**Path param:** `batch_id` (string, required)
**No request body required.**

Use only when status is `paused_insufficient_credits`. Ensure credits have been topped up before calling.

---

## 4. Download Results — Recommended (CSV)
### `GET /public/v1/enrichment/batch/{batch_id}/download/`
**Credits:** 0 | **Format:** CSV only

**Path param:** `batch_id` (string, required)
**Requires:** Batch must be in `finished` status

**Response 200:**
```json
{
  "download_url": "string (presigned S3 URL — temporary)",
  "filename": "string",
  "expires_in": 3600,
  "expires_at": "2025-01-15T11:00:00Z",
  "batch_id": "string",
  "total_results": 500,
  "invalid_records": 12
}
```

Download the file immediately from `download_url` before it expires.

**Error responses:**
- `400` — batch not completed yet, or no results file available
- `404` — invalid batch ID or batch does not belong to this account

---

## 5. Download Results — Direct (CSV or JSON)
### `GET /public/v1/enrichment/batch/{batch_id}/`
**Credits:** 0

**Path param:** `batch_id` (string, required)
**Query param:** `?format=csv` (default) or `?format=json`
**Requires:** Batch must be in `finished` status

**JSON format response:**
```json
[
  {
    "input_value": "original handle or email",
    "status": "string",
    "enrichment_data": { ... }
  }
]
```

Use this endpoint when JSON output is needed. For CSV, prefer the `/download/` endpoint (presigned URL is faster and more reliable for large files).

---

## Complete Batch Workflow (Agent Implementation)

```
1. CHECK CREDITS
   GET /public/v1/accounts/credits/
   Abort if credits_available < estimated cost

2. CREATE BATCH
   POST /public/v1/enrichment/batch/
   Store batch_id from response

3. POLL STATUS (every 30-60s)
   GET /public/v1/enrichment/batch/{batch_id}/status/
   
   Handle each status:
   - queued/processing → continue polling
   - finished → go to step 4
   - failed → surface error, stop
   - paused_insufficient_credits → notify user to top up, then resume

4. (IF PAUSED) RESUME
   POST /public/v1/enrichment/batch/{batch_id}/resume/
   Then return to step 3

5. DOWNLOAD RESULTS
   CSV → GET /public/v1/enrichment/batch/{batch_id}/download/
          then fetch the presigned download_url
   JSON → GET /public/v1/enrichment/batch/{batch_id}/?format=json
```

---

## Agent Rules — Batch Enrichment
1. **Always check credits before submitting** — large batches can drain credits entirely
2. **`include_audience_data` defaults to `true` in batch** — explicitly set `false` to save credits if not needed
3. **Platform is required for raw/full handle modes** — omit only for email (basic) mode
4. **Use `metadata` to tag batches** — helps Truleado track which campaign/workflow triggered the job
5. **Poll every 30–60 seconds** — never faster, never assume instant completion
6. **Handle all 5 status states** — especially `paused_insufficient_credits`, which requires user action
7. **Use `/download/` (presigned URL) for CSV** — faster and more reliable than direct endpoint for large files
8. **`download_url` is temporary** — download immediately after receiving it, before it expires
9. **`invalid_records` in download response** — surface this count to Truleado user so they know how many records failed
10. **No webhooks** — polling is the only mechanism, build it robustly
