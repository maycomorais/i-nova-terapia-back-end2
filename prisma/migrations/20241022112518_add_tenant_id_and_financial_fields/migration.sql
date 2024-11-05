/*
  Warnings:

  - Added the required column `tenantId` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `AvailableSlot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Clinic` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Holiday` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Master` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `MoodDiary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Psychologist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "value" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "AvailableSlot" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Holiday" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Master" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MoodDiary" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Psychologist" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tenantId" TEXT NOT NULL;
