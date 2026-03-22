-- CreateTable
CREATE TABLE "FinalExamResult" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "marksObtained" DOUBLE PRECISION NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "resultStatus" TEXT NOT NULL,
    "remarks" TEXT,
    "publishedByUserId" INTEGER,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinalExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateIssue" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "resultId" INTEGER NOT NULL,
    "certificateNo" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "pdfPath" TEXT,
    "issuedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinalExamResult_registrationId_key" ON "FinalExamResult"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateIssue_resultId_key" ON "CertificateIssue"("resultId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateIssue_certificateNo_key" ON "CertificateIssue"("certificateNo");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateIssue_verificationCode_key" ON "CertificateIssue"("verificationCode");

-- AddForeignKey
ALTER TABLE "FinalExamResult" ADD CONSTRAINT "FinalExamResult_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "FinalExamRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalExamResult" ADD CONSTRAINT "FinalExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalExamResult" ADD CONSTRAINT "FinalExamResult_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalExamResult" ADD CONSTRAINT "FinalExamResult_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateIssue" ADD CONSTRAINT "CertificateIssue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateIssue" ADD CONSTRAINT "CertificateIssue_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateIssue" ADD CONSTRAINT "CertificateIssue_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "FinalExamResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateIssue" ADD CONSTRAINT "CertificateIssue_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
