-- prisma/migrations/[timestamp]_add_end_time_to_appointments.sql
-- AlterTable
ALTER TABLE "Appointment" 
ADD COLUMN "endTime" TIMESTAMP(3);

-- UpdateData
UPDATE "Appointment"
SET "endTime" = "dateTime" + ("duration" * INTERVAL '1 minute');

-- MakeRequired
ALTER TABLE "Appointment" 
ALTER COLUMN "endTime" SET NOT NULL;