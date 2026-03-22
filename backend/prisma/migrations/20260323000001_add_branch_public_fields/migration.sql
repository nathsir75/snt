-- Add public website control fields to Branch
ALTER TABLE "Branch"
  ADD COLUMN IF NOT EXISTS "isPublic"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "websiteEnabled"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "publicPriority"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "publicPhone"      TEXT,
  ADD COLUMN IF NOT EXISTS "publicEmail"      TEXT,
  ADD COLUMN IF NOT EXISTS "publicMapLink"    TEXT,
  ADD COLUMN IF NOT EXISTS "shortDescription" TEXT;
