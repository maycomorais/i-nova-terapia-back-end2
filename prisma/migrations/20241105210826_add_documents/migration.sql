-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PATIENT_LIST', 'CLINIC_LIST', 'PSYCHOLOGIST_LIST', 'FINANCIAL_REPORT', 'MOOD_DIARY_REPORT', 'APPOINTMENT_HISTORY', 'PATIENT_CARD', 'PAYMENT_RECEIPT', 'DECLARATION_OF_SERVICE');

-- CreateEnum
CREATE TYPE "DocumentFormat" AS ENUM ('PDF', 'XML', 'HTML');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "DocumentPermission" AS ENUM ('PRIVATE', 'RESTRICTED', 'PUBLIC');

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "type" "DocumentType" NOT NULL,
    "format" "DocumentFormat" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "permission" "DocumentPermission" NOT NULL DEFAULT 'PRIVATE',
    "url" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
