-- CreateTable
CREATE TABLE "ExamEligibilityRequest" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "requestedByUserId" INTEGER NOT NULL,
    "attendancePercentSnapshot" DOUBLE PRECISION NOT NULL,
    "remainingDueSnapshot" DOUBLE PRECISION NOT NULL,
    "internalRemarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decisionRemarks" TEXT,
    "decidedByUserId" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamEligibilityRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalExamRegistration" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "eligibilityRequestId" INTEGER NOT NULL,
    "examDate" TIMESTAMP(3),
    "hallTicketNo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinalExamRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinalExamRegistration_eligibilityRequestId_key" ON "FinalExamRegistration"("eligibilityRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalExamRegistration_hallTicketNo_key" ON "FinalExamRegistration"("hallTicketNo");

-- AddForeignKey
ALTER TABLE "ExamEligibilityRequest" ADD CONSTRAINT "ExamEligibilityRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamEligibilityRequest" ADD CONSTRAINT "ExamEligibilityRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamEligibilityRequest" ADD CONSTRAINT "ExamEligibilityRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamEligibilityRequest" ADD CONSTRAINT "ExamEligibilityRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalExamRegistration" ADD CONSTRAINT "FinalExamRegistration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalExamRegistration" ADD CONSTRAINT "FinalExamRegistration_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalExamRegistration" ADD CONSTRAINT "FinalExamRegistration_eligibilityRequestId_fkey" FOREIGN KEY ("eligibilityRequestId") REFERENCES "ExamEligibilityRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
