// src/health/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Registry, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;

  // Métricas HTTP
  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestsInProgress: Gauge;

  // Métricas de Negócio
  private readonly appointmentsTotal: Counter;
  private readonly appointmentsDuration: Histogram;
  private readonly activePatients: Gauge;
  private readonly activePsychologists: Gauge;

  constructor() {
    this.registry = new Registry();

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total de requisições HTTP',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duração das requisições HTTP em segundos',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });

    this.httpRequestsInProgress = new Gauge({
      name: 'http_requests_in_progress',
      help: 'Número de requisições HTTP em andamento',
      labelNames: ['method', 'route'],
    });

    // Business Metrics
    this.appointmentsTotal = new Counter({
      name: 'appointments_total',
      help: 'Total de consultas realizadas',
      labelNames: ['status', 'psychologist_id'],
    });

    this.appointmentsDuration = new Histogram({
      name: 'appointments_duration_minutes',
      help: 'Duração das consultas em minutos',
      labelNames: ['psychologist_id'],
      buckets: [30, 45, 60, 90, 120],
    });

    this.activePatients = new Gauge({
      name: 'active_patients',
      help: 'Número de pacientes ativos',
      labelNames: ['clinic_id'],
    });

    this.activePsychologists = new Gauge({
      name: 'active_psychologists',
      help: 'Número de psicólogos ativos',
      labelNames: ['clinic_id'],
    });

    // Registrar todas as métricas
    [
      this.httpRequestsTotal,
      this.httpRequestDuration,
      this.httpRequestsInProgress,
      this.appointmentsTotal,
      this.appointmentsDuration,
      this.activePatients,
      this.activePsychologists,
    ].forEach((metric) => this.registry.registerMetric(metric));
  }

  // Métodos para HTTP Metrics
  incrementHttpRequests(
    method: string,
    route: string,
    statusCode: number,
  ): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
  }

  observeHttpRequestDuration(
    method: string,
    route: string,
    duration: number,
  ): void {
    this.httpRequestDuration.observe({ method, route }, duration);
  }

  incrementHttpRequestsInProgress(method: string, route: string): void {
    this.httpRequestsInProgress.inc({ method, route });
  }

  decrementHttpRequestsInProgress(method: string, route: string): void {
    this.httpRequestsInProgress.dec({ method, route });
  }

  // Métodos para Business Metrics
  incrementAppointments(status: string, psychologistId: string): void {
    this.appointmentsTotal.inc({ status, psychologist_id: psychologistId });
  }

  observeAppointmentDuration(psychologistId: string, duration: number): void {
    this.appointmentsDuration.observe(
      { psychologist_id: psychologistId },
      duration,
    );
  }

  setActivePatients(clinicId: string, count: number): void {
    this.activePatients.set({ clinic_id: clinicId }, count);
  }

  setActivePsychologists(clinicId: string, count: number): void {
    this.activePsychologists.set({ clinic_id: clinicId }, count);
  }

  // Método para obter todas as métricas
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
