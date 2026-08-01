ALTER TABLE "User"
ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'branch';

UPDATE "User"
SET "scope" = 'global'
WHERE "branchId" IS NULL AND "roleId" IN (
  SELECT "id" FROM "Role" WHERE "name" = 'super_admin'
);

CREATE INDEX "User_scope_idx" ON "User"("scope");
