-- Add displayControlJson column to SiteSettings
-- Stores all HO Website Display Control values as a single JSON blob
ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "displayControlJson" JSONB NOT NULL DEFAULT '{}';
