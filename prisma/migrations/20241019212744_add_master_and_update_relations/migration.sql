/*
  Warnings:

  - The values [ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdAt` on the `Clinic` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Clinic` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `license` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specialty` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `clinicId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Clinic` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cpf]` on the table `Psychologist` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[crp]` on the table `Psychologist` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Clinic` table without a default value. This is not possible if the table is not empty.
  - Made the column `address` on table `Clinic` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `Clinic` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `address` to the `Psychologist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cpf` to the `Psychologist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `crp` to the `Psychologist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `Psychologist` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('MASTER', 'CLINIC', 'PSYCHOLOGIST', 'PATIENT');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_clinicId_fkey";

-- DropIndex
DROP INDEX "Psychologist_license_key";

-- AlterTable
ALTER TABLE "Clinic" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

-- AlterTable
ALTER TABLE "Psychologist" DROP COLUMN "createdAt",
DROP COLUMN "license",
DROP COLUMN "specialty",
DROP COLUMN "updatedAt",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "cpf" TEXT NOT NULL,
ADD COLUMN     "crp" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "clinicId",
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "role" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Master" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cpf" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "psychologistId" INTEGER,
    "clinicId" INTEGER,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "psychologistId" INTEGER NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "AppointmentStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodDiary" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mood" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodDiary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Master_userId_key" ON "Master"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_cpf_key" ON "Patient"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_userId_key" ON "Clinic"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Psychologist_cpf_key" ON "Psychologist"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Psychologist_crp_key" ON "Psychologist"("crp");

-- AddForeignKey
ALTER TABLE "Master" ADD CONSTRAINT "Master_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "Psychologist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "Psychologist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodDiary" ADD CONSTRAINT "MoodDiary_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
