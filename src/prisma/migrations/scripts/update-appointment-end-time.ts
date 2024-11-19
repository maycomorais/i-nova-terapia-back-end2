// src/prisma/migrations/scripts/update-appointment-end-times.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAppointmentEndTimes() {
  const appointments = await prisma.appointment.findMany();

  for (const appointment of appointments) {
    const endTime = new Date(
      appointment.dateTime.getTime() + appointment.duration * 60000,
    );

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { endTime },
    });
  }
}

updateAppointmentEndTimes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
