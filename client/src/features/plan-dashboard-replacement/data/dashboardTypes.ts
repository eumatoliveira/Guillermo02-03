// Shared types for the new 32-KPI dashboard modules

export interface WeekBucket {
  label: string;
  weekKey: string;
  total: number;
  realized: number;
  noShows: number;
  canceled: number;
  confirmed: number;
  noShowRate: number;
  occupancyRate: number;
  confirmationRate: number;
  cancelNoticeRate: number;
  weeklyTarget: number;
  leadTimeDays: number;
}

export interface FinanceWeek {
  label: string;
  gross: number;
  net: number;
  cancelLoss: number;
  delinquency: number;
  chargebacks: number;
  conventionGlosas: number;
  netPctGross: number;
  marginPct: number;
  ticketAvg: number;
  ticketBenchmark: number;
  delinquencyPct: number;
  fixedPct: number;
  receiptsCount: number;
  consultations: number;
  d20ProgressPct: number;
  d20ThresholdPct: number;
}

export interface ChannelStats {
  name: string;
  total: number;
  realized: number;
  noShows: number;
  noShowRate: number;
  grossRevenue: number;
  leads: number;
  cpl: number;
  avgCAC: number;
  totalAdSpend: number;
}

export interface ProfessionalStats {
  name: string;
  total: number;
  realized: number;
  noShowRate: number;
  grossRevenue: number;
  avgTicket: number;
  avgNPS: number;
  avgWait: number;
  margin: number;
}

export type Priority = 'P1' | 'P2' | 'P3' | 'OK';

export interface KPISummary {
  total: number;
  realized: number;
  noShows: number;
  canceled: number;
  grossRevenue: number;
  netRevenue: number;
  totalCost: number;
  fixedExpenses: number;
  margin: number;
  ebitda: number;
  avgTicket: number;
  noShowRate: number;
  occupancyRate: number;
  confirmationRate: number;
  lostCapacityRate: number;
  noShowEstimatedCost: number;
  leadTimeDays: number;
  inadimplenciaRate: number;
  fixedExpenseRatio: number;
  breakEven: number;
  avgNPS: number;
  avgWait: number;
  returnRate: number;
  avgCAC: number;
  leads: number;
  cpl: number;
  slaLeadHours: number;
  totalAdSpend: number;
  cancellationLoss: number;
  inadimplenciaLoss: number;
}
