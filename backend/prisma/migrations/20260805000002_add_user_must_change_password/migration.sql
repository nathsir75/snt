ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "User_mustChangePassword_idx" ON "User"("mustChangePassword");
