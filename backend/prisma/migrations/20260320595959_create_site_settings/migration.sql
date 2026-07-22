-- Create SiteSettings before later migrations add chatbot/display-control JSON fields.
CREATE TABLE IF NOT EXISTS "SiteSettings" (
  "id" SERIAL NOT NULL,
  "siteName" TEXT NOT NULL DEFAULT 'SNT Education',
  "tagline" TEXT NOT NULL DEFAULT 'Empowering Careers',
  "logoText" TEXT NOT NULL DEFAULT 'SNT',
  "logoUrl" TEXT,
  "supportEmail" TEXT,
  "supportPhone" TEXT,
  "whatsapp" TEXT,
  "address" TEXT,
  "mapLink" TEXT,
  "workingHours" TEXT,
  "footerDesc" TEXT,
  "footerCopyright" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#6366f1',
  "socialLinks" JSONB NOT NULL DEFAULT '[]',
  "navItems" JSONB NOT NULL DEFAULT '[]',
  "announcementBar" JSONB NOT NULL DEFAULT '{}',
  "seoDefaults" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT,

  CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
