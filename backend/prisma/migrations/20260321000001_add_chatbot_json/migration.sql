-- Add chatbotJson column to SiteSettings
-- This column stores chatbot configuration as a JSON blob.
-- Uses IF NOT EXISTS guard so it is safe to re-run.

ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "chatbotJson" JSONB NOT NULL DEFAULT '{}';
