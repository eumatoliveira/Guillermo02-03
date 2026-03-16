export type DashboardViewId = "pipeline" | "operacao";
export type KPIStatus = "green" | "yellow" | "red";
export type KpiFrequency = "daily" | "weekly" | "monthly";

export interface KPIThreshold {
  green: string;
  yellow: string;
  red: string;
}

export interface DashboardKPI {
  id: string;
  name: string;
  currentValue: string;
  status: KPIStatus;
  formula: string;
  source: string;
  frequency: KpiFrequency;
  thresholds: KPIThreshold;
  executiveReading: string;
}

export interface DashboardModule {
  id: string;
  title: string;
  description: string;
  kpis: DashboardKPI[];
  cadence: string;
  sources: string[];
  priorityPhase: number;
}

export interface DashboardAlertRule {
  level: KPIStatus;
  title: string;
  description: string;
  expectedAction: string;
}

export interface DashboardIntegration {
  id: string;
  source: string;
  provides: string[];
  integrationMethod: string;
  cadence: string;
  scope: DashboardViewId[];
}

export interface DashboardRoadmapPhase {
  phase: number;
  title: string;
  timeline: string;
  scope: string;
  justification: string;
}

export interface DashboardViewDefinition {
  id: DashboardViewId;
  title: string;
  executiveQuestion: string;
  cadence: string;
  description: string;
  heroTitle: string;
  heroCopy: string;
  heroKpis: Array<{ label: string; value: string; status: KPIStatus }>;
  modules: DashboardModule[];
}

export interface DashboardBriefingData {
  views: DashboardViewDefinition[];
  integrations: DashboardIntegration[];
  alertRules: DashboardAlertRule[];
  roadmap: DashboardRoadmapPhase[];
  assumptions: string[];
}
