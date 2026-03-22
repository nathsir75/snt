-- CreateTable
CREATE TABLE "EnquiryFollowUp" (
    "id" SERIAL NOT NULL,
    "enquiryId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "remarks" TEXT NOT NULL,
    "nextFollowUpDate" TIMESTAMP(3),
    "statusAfterAction" TEXT,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnquiryFollowUp_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EnquiryFollowUp" ADD CONSTRAINT "EnquiryFollowUp_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryFollowUp" ADD CONSTRAINT "EnquiryFollowUp_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryFollowUp" ADD CONSTRAINT "EnquiryFollowUp_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
