// src/reports/financial/interfaces/financial-reports.interfaces.ts
import { Prisma, PaymentMethod, PaymentStatus } from '@prisma/client';

export interface GroupedData {
  total: number;
  count: number;
}

export interface AggregatedResult {
  key: string;
  total: number;
  count: number;
}

export interface TopPsychologistData {
  psychologist: {
    id: number;
    user: {
      name: string;
      email: string;
    };
  };
  total: number;
  count: number;
}

export interface OverviewResponse {
  totalRevenue: number;
  totalReceived: number;
  totalPending: number;
  revenueByPeriod: Array<{ date: Date; amount: number }>;
  metrics: {
    receiptRate: number;
    avgTicket: number;
  };
}

export interface RevenueByMethodResponse {
  method: PaymentMethod;
  _sum: {
    amount: Prisma.Decimal;
  };
  _count: {
    _all: number;
  };
}

export interface RevenueByStatusResponse {
  status: PaymentStatus;
  _sum: {
    amount: Prisma.Decimal;
  };
  _count: {
    _all: number;
  };
}

export interface DashboardResponse {
  overview: OverviewResponse;
  revenueByMethod: RevenueByMethodResponse[];
  revenueByStatus: RevenueByStatusResponse[];
  topPsychologists: TopPsychologistData[];
}
