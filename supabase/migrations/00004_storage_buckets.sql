-- Migration: Create storage buckets for file uploads
-- Date: 2026-01-28
-- 
-- NOTE: Storage bucket creation and policies are done via Supabase Storage API
-- This script creates the RLS helper functions and documents the bucket setup
--
-- IMPORTANT: After running this migration, you must also:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Create bucket: "campaign-attachments" (private)
-- 3. Create bucket: "deliverables" (private)
-- 4. Apply the policies below via the Supabase Dashboard or CLI

-- ============================================================================
-- BUCKET SETUP INSTRUCTIONS (Manual in Supabase Dashboard)
-- ============================================================================
-- 
-- Bucket 1: campaign-attachments
-- - Name: campaign-attachments
-- - Public: false (private)
-- - File size limit: 50MB
-- - Allowed MIME types: (leave empty for all)
--
-- Bucket 2: deliverables
-- - Name: deliverables  
-- - Public: false (private)
-- - File size limit: 100MB
-- - Allowed MIME types: (leave empty for all)
--
-- ============================================================================
-- STORAGE POLICIES (Apply via Dashboard → Storage → Policies)
-- ============================================================================

-- For campaign-attachments bucket:
-- 
-- Policy 1: SELECT (Download)
-- Name: "Agency members can download campaign attachments"
-- Allowed operation: SELECT
-- Policy definition:
/*
CREATE POLICY "Agency members can download campaign attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'campaign-attachments'
  AND EXISTS (
    SELECT 1 FROM campaign_attachments ca
    JOIN campaigns c ON ca.campaign_id = c.id
    JOIN projects p ON c.project_id = p.id
    JOIN clients cl ON p.client_id = cl.id
    JOIN agency_users au ON cl.agency_id = au.agency_id
    JOIN auth_identities ai ON au.user_id = ai.user_id
    WHERE ca.file_url LIKE '%' || storage.objects.name
      AND ai.provider_uid = auth.uid()::text
  )
);
*/

-- Policy 2: INSERT (Upload)
-- Name: "Agency members can upload campaign attachments"
-- Allowed operation: INSERT
-- Policy definition:
/*
CREATE POLICY "Agency members can upload campaign attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-attachments'
  AND EXISTS (
    SELECT 1 FROM agency_users au
    JOIN auth_identities ai ON au.user_id = ai.user_id
    WHERE ai.provider_uid = auth.uid()::text
      AND au.role IN ('agency_admin', 'account_manager', 'operator')
  )
);
*/

-- Policy 3: DELETE
-- Name: "Agency admins can delete campaign attachments"
-- Allowed operation: DELETE
-- Policy definition:
/*
CREATE POLICY "Agency admins can delete campaign attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-attachments'
  AND EXISTS (
    SELECT 1 FROM agency_users au
    JOIN auth_identities ai ON au.user_id = ai.user_id
    WHERE ai.provider_uid = auth.uid()::text
      AND au.role IN ('agency_admin', 'account_manager')
  )
);
*/

-- ============================================================================
-- Similar policies for deliverables bucket
-- ============================================================================

-- Helper function to get storage path for a campaign
CREATE OR REPLACE FUNCTION public.get_campaign_storage_path(campaign_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT 'campaigns/' || campaign_uuid::text || '/';
$$;

-- Helper function to get storage path for a deliverable
CREATE OR REPLACE FUNCTION public.get_deliverable_storage_path(deliverable_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT 'deliverables/' || deliverable_uuid::text || '/';
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_campaign_storage_path IS 'Returns the storage path prefix for campaign attachments';
COMMENT ON FUNCTION public.get_deliverable_storage_path IS 'Returns the storage path prefix for deliverable files';
