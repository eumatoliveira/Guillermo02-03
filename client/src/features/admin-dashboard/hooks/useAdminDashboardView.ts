import { useEffect, useState } from "react";
import type { DashboardViewId } from "../types";
import { useAdminDashboardStore } from "../store/useAdminDashboardStore";
import { ADMIN_DASHBOARD_MOCK_DATA } from "../mockData";

// ─── Tipos da API ─────────────────────────────────────────────────────────────

type ApiStatus = "verde" | "amarelo" | "vermelho" | "neutro";

interface ApiKpi {
  value: number | null;
  status: ApiStatus;
}

interface ApiResponse {
  visao_2_pipeline: Record<string, ApiKpi>;
  visao_1_operacao: Record<string, ApiKpi>;
}

// ─── Tipo de saída do hook ────────────────────────────────────────────────────

export interface AdminDashboardViewData {
  heading: string;
  question: string;
  explanation?: string;
  chartLayout: "pipeline" | "operation" | "generic";
  metaCards: Array<{ label: string; value: string }>;
  summaryCards: Array<{
    id: string;
    title: string;
    value: string;
    status: "green" | "yellow" | "red" | "neutral";
    source: string;
    formula: string;
    thresholds: { green: string; yellow: string; red: string };
  }>;
  topCharts: Array<{
    id: string;
    title: string;
    subtitle: string;
    type: "line" | "area" | "bar" | "pie";
    data: Array<Record<string, unknown>>;
    dataKeys: string[];
    colors: string[];
  }>;
  bottomCharts: Array<{
    id: string;
    title: string;
    subtitle: string;
    type: "line" | "area" | "bar" | "pie";
    data: Array<Record<string, unknown>>;
    dataKeys: string[];
    colors: string[];
  }>;
  tableRows: Array<Record<string, unknown>>;
  alerts: Array<{
    id: string;
    level: "green" | "yellow" | "red" | "neutral";
    title: string;
    description: string;
    deadline: string;
  }>;
  pipelineView?: import("../types").DashboardViewDefinition;
  pipelineApiKpis?: Record<string, { value: number | null; status: string }>;
  operationChartsData?: {
    mrrAtual: number;
    crescimentoMrrAtual: number;
    newMrrAtual: number;
    churnMrrAtual: number;
    margemAtual: number;
    capacidadeAtual: number;
    slaAtual: number;
    npsAtual: number;
  };
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

// Usa o proxy interno — nunca expõe o servidor externo no bundle do browser
const API_BASE = "/api/admin-dashboard";

function mapStatus(s: ApiStatus): "green" | "yellow" | "red" | "neutral" {
  if (s === "verde") return "green";
  if (s === "amarelo") return "yellow";
  if (s === "vermelho") return "red";
  return "neutral";
}

/** Retorna "Dados não entrados" quando value é null, ou formata o número */
function formatValue(kpi: ApiKpi | undefined, unit: string): string {
  if (!kpi || kpi.value === null || kpi.value === undefined) return "Dados não entrados";
  const v = kpi.value;
  if (unit === "R$") return `R$ ${v.toLocaleString("pt-BR")}`;
  if (unit === "%") return `${v}%`;
  if (unit === "score") return String(v);
  if (unit === "dias") return `${v} dias`;
  if (unit === "hrs") return `${v}h`;
  return String(v);
}

/** Converte period do store para timestamps from/to em ms */
function periodToRange(period: string): { from?: number; to?: number } {
  const now = Date.now();
  const day = 86_400_000;
  if (period === "7d")   return { from: now - 7 * day, to: now };
  if (period === "30d")  return { from: now - 30 * day, to: now };
  if (period === "90d")  return { from: now - 90 * day, to: now };
  if (period === "mtd") {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    return { from: d.getTime(), to: now };
  }
  if (period === "qtd") {
    const d = new Date();
    const q = Math.floor(d.getMonth() / 3);
    d.setMonth(q * 3, 1); d.setHours(0, 0, 0, 0);
    return { from: d.getTime(), to: now };
  }
  if (period === "ytd") {
    const d = new Date(); d.setMonth(0, 1); d.setHours(0, 0, 0, 0);
    return { from: d.getTime(), to: now };
  }
  if (period === "monthly") return { from: now - 30 * day, to: now };
  if (period === "quarterly") return { from: now - 90 * day, to: now };
  if (period === "semiannual") return { from: now - 180 * day, to: now };
  return {};
}

// ─── Mapeamento Pipeline ──────────────────────────────────────────────────────

const PIPELINE_KPIS: Array<{ id: string; key: string; label: string; unit: string; source: string; formula: string }> = [
  { id: "leads_totais_gerados",        key: "leads_totais_gerados",        label: "Leads Totais Gerados",           unit: "qty", source: "Pipedrive / LinkedIn",          formula: "Soma de todos os leads no período" },
  { id: "leads_quentes",               key: "leads_quentes",               label: "Leads Quentes",                  unit: "qty", source: "Pipedrive",                     formula: "SQL Quente + SQL Morno" },
  { id: "taxa_lead_lead_quente",       key: "taxa_lead_lead_quente",       label: "Taxa Lead → Lead Quente (%)",    unit: "%",   source: "Cálculo interno — Pipedrive",   formula: "Leads quentes ÷ Leads totais × 100" },
  { id: "calls_de_qualificacao",       key: "calls_de_qualificacao",       label: "Calls de Qualificação",          unit: "qty", source: "Pipedrive / Google Calendar",   formula: "Calls de qualificação realizadas" },
  { id: "taxa_lead_quente_call",       key: "taxa_lead_quente_call",       label: "Taxa Lead Quente → Call (%)",    unit: "%",   source: "Cálculo interno — Pipedrive",   formula: "Calls ÷ Leads quentes × 100" },
  { id: "calls_de_fechamento",         key: "calls_de_fechamento",         label: "Calls de Fechamento",            unit: "qty", source: "Pipedrive / Google Calendar",   formula: "Calls de fechamento realizadas" },
  { id: "taxa_qualif_fechamento",      key: "taxa_qualif_fechamento",      label: "Taxa Qualif → Fechamento (%)",   unit: "%",   source: "Cálculo interno",               formula: "Calls fechamento ÷ Calls qualif × 100" },
  { id: "taxa_fechamento_contrato",    key: "taxa_fechamento_contrato",    label: "Taxa Fechamento → Contrato (%)", unit: "%",   source: "Cálculo interno",               formula: "Contratos ÷ Calls fechamento × 100" },
  { id: "ciclo_medio_lead_contrato",   key: "ciclo_medio_lead_contrato",   label: "Ciclo Médio Lead → Contrato",    unit: "dias",source: "Pipedrive",                     formula: "Média de dias entre lead e contrato" },
  { id: "diagnosticos_agendados_os",   key: "diagnosticos_agendados_os",   label: "Diagnósticos OS Agendados",      unit: "qty", source: "Pipedrive",                     formula: "Diagnósticos OS agendados no período" },
  { id: "setups_fechados_os",          key: "setups_fechados_os",          label: "Setups OS Fechados",             unit: "qty", source: "Pipedrive",                     formula: "Setups OS fechados no período" },
  { id: "taxa_diagnostico_setup",      key: "taxa_diagnostico_setup",      label: "Taxa Diagnóstico → Setup (%)",   unit: "%",   source: "Cálculo interno",               formula: "Setups ÷ Diagnósticos × 100" },
  { id: "taxa_setup_mrr_12m",          key: "taxa_setup_mrr_12m",          label: "Taxa Setup → MRR 12m (%)",       unit: "%",   source: "Planilha de Contratos",         formula: "Setups convertidos em MRR 12m" },
  { id: "os_start_ativos_mrr_12m",     key: "os_start_ativos_mrr_12m",     label: "OS Start Ativos MRR 12m (%)",    unit: "%",   source: "Planilha de Contratos",         formula: "OS Start ativos com MRR 12m" },
  { id: "os_pro_ativos_mrr_12m",       key: "os_pro_ativos_mrr_12m",       label: "OS Pro Ativos MRR 12m (%)",      unit: "%",   source: "Planilha de Contratos",         formula: "OS Pro ativos com MRR 12m" },
  { id: "advisory_fechados",           key: "advisory_fechados",           label: "Advisory Fechados",              unit: "qty", source: "Pipedrive",                     formula: "Contratos Advisory fechados" },
  { id: "advisory_ativos_total",       key: "advisory_ativos_total",       label: "Advisory Ativos Total",          unit: "qty", source: "Pipedrive",                     formula: "Total de Advisory ativos" },
  { id: "taxa_renovacao_advisory_6m",  key: "taxa_renovacao_advisory_6m",  label: "Taxa Renovação Advisory 6m (%)", unit: "%",   source: "Planilha de Contratos",         formula: "Renovações ÷ Vencimentos × 100" },
  { id: "pipeline_ponderado_total",    key: "pipeline_ponderado_total",    label: "Pipeline Ponderado Total",       unit: "R$",  source: "Pipedrive",                     formula: "Σ(valor × probabilidade) por etapa" },
  { id: "acv_valor_medio_contrato",    key: "acv_valor_medio_contrato",    label: "ACV — Valor Médio Contrato",     unit: "R$",  source: "Pipedrive",                     formula: "Receita anual ÷ contratos ativos" },
  { id: "setups_em_andamento",         key: "setups_em_andamento",         label: "Setups em Andamento",            unit: "qty", source: "Pipedrive",                     formula: "Setups com status em andamento" },
];

const OPERACAO_KPIS: Array<{ id: string; key: string; label: string; unit: string; source: string; formula: string }> = [
  { id: "mrr_total",                 key: "mrr_total",                 label: "MRR Total",                      unit: "R$",   source: "Planilha de Contratos",   formula: "Σ(valor do plano × clientes ativos)" },
  { id: "crescimento_mrr",           key: "crescimento_mrr",           label: "Crescimento MRR (%)",            unit: "%",    source: "Cálculo interno",         formula: "(MRR atual − MRR anterior) ÷ MRR anterior × 100" },
  { id: "new_mrr",                   key: "new_mrr",                   label: "New MRR",                        unit: "R$",   source: "Pipedrive + Contratos",   formula: "Σ MRR de contratos novos no mês" },
  { id: "churn_mrr",                 key: "churn_mrr",                 label: "Churn MRR",                      unit: "R$",   source: "Planilha de Contratos",   formula: "Σ MRR de clientes que cancelaram" },
  { id: "forecast_mrr_3_meses",      key: "forecast_mrr_3_meses",      label: "Forecast MRR 3 meses",           unit: "R$",   source: "Pipedrive",               formula: "Pipeline ponderado + contratos vigentes" },
  { id: "clientes_ativos",           key: "clientes_ativos",           label: "Clientes Ativos",                unit: "qty",  source: "Planilha de Contratos",   formula: "Clientes com contrato ativo" },
  { id: "churn_rate",                key: "churn_rate",                label: "Churn Rate (%)",                 unit: "%",    source: "Cálculo interno",         formula: "Clientes cancelados ÷ Base ativa × 100" },
  { id: "nps_de_clientes_glx",       key: "nps_de_clientes_glx",       label: "NPS de Clientes GLX",            unit: "score",source: "Google Forms",            formula: "% Promotores − % Detratores" },
  { id: "entregas_no_prazo",         key: "entregas_no_prazo",         label: "Entregas no Prazo (%)",          unit: "%",    source: "Planilha de Contratos",   formula: "Entregas no prazo ÷ Total entregas × 100" },
  { id: "tempo_medio_de_onboarding", key: "tempo_medio_de_onboarding", label: "Tempo Médio de Onboarding",      unit: "dias", source: "Cálculo interno",         formula: "Média de dias desde assinatura até go-live" },
  { id: "health_score_por_cliente",  key: "health_score_por_cliente",  label: "Health Score por Cliente",       unit: "score",source: "Cálculo interno",         formula: "Média ponderada de uso, NPS e entregas" },
  { id: "taxa_de_indicacao",         key: "taxa_de_indicacao",         label: "Taxa de Indicação (%)",          unit: "%",    source: "Pipedrive",               formula: "Leads via indicação ÷ Total leads × 100" },
  { id: "receita_total_mensal",      key: "receita_total_mensal",      label: "Receita Total Mensal",           unit: "R$",   source: "ASAAS",                   formula: "Σ receita de todos os clientes no mês" },
  { id: "margem_liquida",            key: "margem_liquida",            label: "Margem Líquida (%)",             unit: "%",    source: "DRE",                     formula: "(Receita − Custos totais) ÷ Receita × 100" },
  { id: "cac_custo_de_aquisicao",    key: "cac_custo_de_aquisicao",    label: "CAC — Custo de Aquisição",       unit: "R$",   source: "Cálculo interno",         formula: "Investimento em vendas ÷ Novos clientes" },
  { id: "fluxo_de_caixa_projetado",  key: "fluxo_de_caixa_projetado",  label: "Fluxo de Caixa Projetado",       unit: "R$",   source: "ASAAS",                   formula: "Entradas previstas − Saídas previstas" },
  { id: "inadimplencia",             key: "inadimplencia",             label: "Inadimplência (%)",              unit: "%",    source: "ASAAS",                   formula: "Valor em atraso ÷ Receita total × 100" },
  { id: "receita_por_hora",          key: "receita_por_hora",          label: "Receita por Hora",               unit: "R$",   source: "Controle de Tempo",       formula: "Receita total ÷ Horas trabalhadas" },
  { id: "utilizacao_de_capacidade",  key: "utilizacao_de_capacidade",  label: "Utilização de Capacidade (%)",   unit: "%",    source: "Controle de Tempo",       formula: "Horas alocadas ÷ Horas disponíveis × 100" },
  { id: "horas_por_cliente_semana",  key: "horas_por_cliente_semana",  label: "Horas por Cliente/Semana",       unit: "hrs",  source: "Controle de Tempo",       formula: "Horas totais ÷ Clientes ativos ÷ semanas" },
  { id: "sla_resposta_clientes",     key: "sla_resposta_clientes",     label: "SLA Resposta Clientes",          unit: "hrs",  source: "Cálculo interno",         formula: "Tempo médio de primeira resposta ao cliente" },
];

// ─── Builders ────────────────────────────────────────────────────────────────

function buildPipelineData(api: ApiResponse): AdminDashboardViewData {
  const p = api.visao_2_pipeline;
  const view = ADMIN_DASHBOARD_MOCK_DATA.views.find((v) => v.id === "pipeline")!;

  const summaryCards = PIPELINE_KPIS.slice(0, 6).map((def) => {
    const kpi = p[def.key];
    return {
      id: def.id,
      title: def.label,
      value: formatValue(kpi, def.unit),
      status: mapStatus(kpi?.status ?? "neutro"),
      source: def.source,
      formula: def.formula,
      thresholds: { green: "Meta atingida", yellow: "Abaixo da meta", red: "Crítico" },
    };
  });

  const metaCards = [
    { label: "Pipeline Ponderado", value: formatValue(p.pipeline_ponderado_total, "R$") },
    { label: "Leads Quentes",      value: formatValue(p.leads_quentes, "qty") },
    { label: "Taxa Fechamento → Contrato", value: formatValue(p.taxa_fechamento_contrato, "%") },
    { label: "Setups em Andamento", value: formatValue(p.setups_em_andamento, "qty") },
  ];

  const tableRows = PIPELINE_KPIS.map((def) => ({
    KPI: def.label,
    Valor: formatValue(p[def.key], def.unit),
    Status: mapStatus(p[def.key]?.status ?? "neutro").toUpperCase(),
    Fonte: def.source,
  }));

  return {
    heading: "O crescimento futuro está garantido?",
    question: "O crescimento dos próximos 30 a 60 dias está garantido?",
    explanation: "Dados ao vivo via API GLX — aiatende.dev.br",
    chartLayout: "pipeline",
    metaCards,
    summaryCards,
    topCharts: [],
    bottomCharts: [],
    tableRows,
    alerts: [],
    pipelineView: view,
    pipelineApiKpis: p as Record<string, { value: number | null; status: string }>,
  };
}

function buildOperacaoData(api: ApiResponse): AdminDashboardViewData {
  const o = api.visao_1_operacao;

  const summaryCards = OPERACAO_KPIS.slice(0, 6).map((def) => {
    const kpi = o[def.key];
    return {
      id: def.id,
      title: def.label,
      value: formatValue(kpi, def.unit),
      status: mapStatus(kpi?.status ?? "neutro"),
      source: def.source,
      formula: def.formula,
      thresholds: { green: "Meta atingida", yellow: "Abaixo da meta", red: "Crítico" },
    };
  });

  const metaCards = [
    { label: "MRR Total",        value: formatValue(o.mrr_total, "R$") },
    { label: "Churn Rate",       value: formatValue(o.churn_rate, "%") },
    { label: "Margem Líquida",   value: formatValue(o.margem_liquida, "%") },
    { label: "Cap. Utilizada",   value: formatValue(o.utilizacao_de_capacidade, "%") },
  ];

  const tableRows = OPERACAO_KPIS.map((def) => ({
    KPI: def.label,
    Valor: formatValue(o[def.key], def.unit),
    Status: mapStatus(o[def.key]?.status ?? "neutro").toUpperCase(),
    Fonte: def.source,
  }));

  const mrrAtual       = o.mrr_total?.value ?? 0;
  const crescimento    = o.crescimento_mrr?.value ?? 0;
  const newMrr         = o.new_mrr?.value ?? 0;
  const churnMrr       = o.churn_mrr?.value ?? 0;
  const margem         = o.margem_liquida?.value ?? 0;
  const capacidade     = o.utilizacao_de_capacidade?.value ?? 0;
  const sla            = o.sla_resposta_clientes?.value ?? 0;
  const nps            = o.nps_de_clientes_glx?.value ?? 0;

  return {
    heading: "A operação interna está saudável?",
    question: "A empresa está saudável agora e protegendo o dinheiro que ganhou?",
    explanation: "Dados ao vivo via API GLX — aiatende.dev.br",
    chartLayout: "operation",
    metaCards,
    summaryCards,
    topCharts: [],
    bottomCharts: [],
    tableRows,
    alerts: [],
    operationChartsData: {
      mrrAtual,
      crescimentoMrrAtual: crescimento,
      newMrrAtual: newMrr,
      churnMrrAtual: churnMrr,
      margemAtual: margem,
      capacidadeAtual: capacidade,
      slaAtual: sla,
      npsAtual: nps,
    },
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminDashboardView(viewId: DashboardViewId): {
  data: AdminDashboardViewData | null;
  isLoading: boolean;
} {
  const period = useAdminDashboardStore((state) => state.period);
  const [data, setData] = useState<AdminDashboardViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const { from, to } = periodToRange(period);
    const params = new URLSearchParams();
    if (from) params.set("from", String(from));
    if (to)   params.set("to", String(to));

    fetch(`${API_BASE}/kpis?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json() as Promise<ApiResponse>;
      })
      .then((api) => {
        if (cancelled) return;
        setData(viewId === "operacao" ? buildOperacaoData(api) : buildPipelineData(api));
      })
      .catch(() => {
        // Em caso de erro de rede, mantém dados anteriores sem travar a UI
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [viewId, period]);

  return { data, isLoading };
}
