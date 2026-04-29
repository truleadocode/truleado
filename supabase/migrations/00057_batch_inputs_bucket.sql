-- =============================================================================
-- Migration 00057: batch-inputs storage bucket
-- =============================================================================
-- Private bucket for CSV files uploaded by agencies when they submit a batch
-- enrichment job. The browser uploads here (service-role signed URL or
-- agency-scoped RLS), then passes the object key to createEnrichmentBatchJob.
-- Backend service role reads the file and forwards it to IC via multipart.
--
-- Path convention:
--   batch-inputs/{agency_id}/{job_id}.csv
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'batch-inputs',
  'batch-inputs',
  false,
  10485760,                                          -- 10 MB (IC's limit)
  ARRAY['text/csv','application/csv','application/vnd.ms-excel','text/plain']
)
ON CONFLICT (id) DO NOTHING;
