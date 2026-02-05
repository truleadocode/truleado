-- Add user_id to creators table (link to Firebase users)
ALTER TABLE creators ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_creators_user_id ON creators(user_id);

-- Prevent duplicate creator records per agency per user
CREATE UNIQUE INDEX idx_creators_agency_user
  ON creators(agency_id, user_id)
  WHERE user_id IS NOT NULL;

-- Helper function: Check if user is a creator in agency
CREATE OR REPLACE FUNCTION public.is_creator_for_agency(p_agency_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM creators c
    WHERE c.agency_id = p_agency_id
      AND c.user_id = public.get_current_user_id()
      AND c.is_active = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function: Get creator_id for current user in agency
CREATE OR REPLACE FUNCTION public.get_creator_id_for_user(p_agency_id UUID)
RETURNS UUID AS $$
  SELECT c.id
  FROM creators c
  WHERE c.agency_id = p_agency_id
    AND c.user_id = public.get_current_user_id()
    AND c.is_active = true
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
