import { Injectable, Logger } from '@nestjs/common';
import { Appointment, User, NotificationSettings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  /**
   * Envia uma notificação sobre um agendamento
   * @param appointment O agendamento para o qual enviar a notificação
   */
  async sendAppointmentNotification(appointment: Appointment): Promise<void> {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: appointment.patientId },
        include: {
          user: {
            include: {
              notificationSettings: true,
            },
          },
        },
      });

      const psychologist = await this.prisma.psychologist.findUnique({
        where: { id: appointment.psychologistId },
        include: {
          user: {
            include: {
              notificationSettings: true,
            },
          },
        },
      });

      if (patient?.user && psychologist?.user) {
        await this.sendNotificationToUser(
          patient.user,
          'Nova consulta agendada',
          this.formatAppointmentMessage(appointment, 'patient'),
        );
        await this.sendNotificationToUser(
          psychologist.user,
          'Nova consulta agendada',
          this.formatAppointmentMessage(appointment, 'psychologist'),
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de agendamento: ${error.message}`,
      );
    }
  }

  /**
   * Envia um lembrete sobre um agendamento próximo
   * @param appointment O agendamento para o qual enviar o lembrete
   */
  async sendAppointmentReminder(appointment: Appointment): Promise<void> {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: appointment.patientId },
        include: {
          user: {
            include: {
              notificationSettings: true,
            },
          },
        },
      });

      const psychologist = await this.prisma.psychologist.findUnique({
        where: { id: appointment.psychologistId },
        include: {
          user: {
            include: {
              notificationSettings: true,
            },
          },
        },
      });

      if (patient?.user && psychologist?.user) {
        await this.sendNotificationToUser(
          patient.user,
          'Lembrete de consulta',
          this.formatAppointmentMessage(appointment, 'patient'),
        );
        await this.sendNotificationToUser(
          psychologist.user,
          'Lembrete de consulta',
          this.formatAppointmentMessage(appointment, 'psychologist'),
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao enviar lembrete de agendamento: ${error.message}`,
      );
    }
  }

  /**
   * Envia uma notificação para um usuário com base em suas preferências
   * @param user O usuário para quem enviar a notificação
   * @param subject O assunto da notificação
   * @param message O corpo da mensagem
   */
  private async sendNotificationToUser(
    user: User & { notificationSettings?: NotificationSettings },
    subject: string,
    message: string,
  ): Promise<void> {
    if (user.notificationSettings) {
      if (user.notificationSettings.emailNotifications) {
        await this.sendEmail(user.email, subject, message);
      }

      if (user.notificationSettings.smsNotifications && user.phone) {
        await this.sendSMS(user.phone, message);
      }

      if (user.notificationSettings.pushNotifications) {
        await this.sendPushNotification(user.id, subject, message);
      }
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({ to, subject, text });
      this.logger.log(`E-mail enviado para ${to}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail para ${to}: ${error.message}`);
    }
  }

  /**
   * Envia uma mensagem SMS
   * @param phoneNumber Número de telefone do destinatário
   * @param message Mensagem a ser enviada
   */
  private async sendSMS(phoneNumber: string, message: string): Promise<void> {
    // Implemente a lógica de envio de SMS aqui
    // Por exemplo, usando um serviço como Twilio
    this.logger.log(`SMS enviado para ${phoneNumber}: ${message}`);
  }

  /**
   * Envia uma notificação push
   * @param userId ID do usuário
   * @param title Título da notificação
   * @param body Corpo da notificação
   */
  private async sendPushNotification(
    userId: number,
    title: string,
    body: string,
  ): Promise<void> {
    // Implemente a lógica de envio de notificação push aqui
    // Por exemplo, usando Firebase Cloud Messaging
    this.logger.log(
      `Notificação push enviada para o usuário ${userId}: ${title} - ${body}`,
    );
  }

  /**
   * Formata a mensagem de agendamento
   * @param appointment O agendamento
   * @param userType O tipo de usuário (paciente ou psicólogo)
   */
  private formatAppointmentMessage(
    appointment: Appointment,
    userType: 'patient' | 'psychologist',
  ): string {
    const date = appointment.dateTime.toLocaleDateString();
    const time = appointment.dateTime.toLocaleTimeString();
    return userType === 'patient'
      ? `Você tem uma consulta agendada para ${date} às ${time} com seu psicólogo.`
      : `Você tem uma consulta agendada para ${date} às ${time} com seu paciente.`;
  }
}
