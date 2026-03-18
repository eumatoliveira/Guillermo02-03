import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { GLX_ADMIN_BRIEFING_SPEC } from "@/lib/adminBriefingSpec";
import { translateAdminDashboardText } from "@/lib/adminUiLocale";
import { ADMIN_DASHBOARD_MOCK_DATA } from "@/features/admin-dashboard/mockData";
import { useAdminDashboardStore, type AdminChartFilter } from "@/features/admin-dashboard/store/useAdminDashboardStore";
import type { DashboardViewDefinition, DashboardViewId, KPIStatus } from "@/features/admin-dashboard/types";

type SummaryCard = {
  id: string;
  title: string;
  value: string;
  status: KPIStatus;
  formula: string;
  source: string;
  thresholds: { green: string; yellow: string; red: string };
};

type GenericRow = Record<string, string>;

type ChartConfig = {
  id: string;
  title: string;
  subtitle: string;
  type: "bar" | "line" | "area" | "pie";
  data: Array<Record<string, number | string>>;
  dataKeys: string[];
  colors: string[];
};

type AlertItem = {
  id: string;
  title: string;
  level: KPIStatus;
  description: string;
  action: string;
  deadline: string;
};

export type AdminDashboardViewData = {
  heading: string;
  question: string;
  explanation?: string;
  chartLayout?: "generic" | "operation" | "pipeline";
  pipelineView?: DashboardViewDefinition;
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
  summaryCards: SummaryCard[];
  topCharts: ChartConfig[];
  bottomCharts: ChartConfig[];
  integrationGroups?: Array<{
    module: string;
    cadence: string;
    sources: string[];
    note: string;
  }>;
  tableTitle: string;
  tableRows: GenericRow[];
  alerts: AlertItem[];
  metaCards: Array<{ label: string; value: string }>;
  activeFilter?: string | null;
};

const STATUS_WEIGHT: Record<KPIStatus, number> = { green: 0, yellow: 1, red: 2 };

function parseNumericValue(raw: string) {
  const normalized = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(normalized || "0");
  return raw.includes("mil") ? value * 1000 : value;
}

function getView(viewId: DashboardViewId) {
  const view = ADMIN_DASHBOARD_MOCK_DATA.views.find((item) => item.id === viewId);
  if (!view) throw new Error(`View ${viewId} nao encontrada`);
  return view;
}

function getSpecView(viewId: DashboardViewId) {
  return GLX_ADMIN_BRIEFING_SPEC.views.find((item) => item.id === (viewId === "pipeline" ? "PIPELINE" : "OPERATION"));
}

function maybeFilterStatus<T extends { status: KPIStatus }>(items: T[], semaforo: string) {
  if (semaforo === "ALL") return items;
  return items.filter((item) => item.status === semaforo);
}

function filterByProduct<T extends GenericRow>(rows: T[], product: string) {
  if (product === "ALL") return rows;
  return rows.filter((row) => (row.produto ?? "").toUpperCase() === product);
}

function pickSeriesWindow<T>(series: T[], period: string) {
  if (period === "7d") return series.slice(-2);
  if (period === "30d" || period === "mtd") return series.slice(-3);
  if (period === "90d" || period === "qtd") return series.slice(-5);
  if (period === "monthly") return series.slice(-6);
  if (period === "quarterly") return series.slice(-3);
  if (period === "semiannual") return series.slice(-6);
  return series;
}

function matchesPipelineFilter(row: GenericRow, chartFilter: AdminChartFilter | null) {
  if (!chartFilter) return true;
  if (chartFilter.dimension === "source") return (row.origem ?? "") === chartFilter.value;
  if (chartFilter.dimension === "product") return (row.produto ?? "").toUpperCase() === chartFilter.value;
  if (chartFilter.dimension === "stage") return (row.etapa ?? "") === chartFilter.value;
  return true;
}

function matchesOperationFilter(row: GenericRow, chartFilter: AdminChartFilter | null) {
  if (!chartFilter) return true;
  if (chartFilter.dimension === "client") return (row.cliente ?? "") === chartFilter.value;
  if (chartFilter.dimension === "capacityBand") return (row.faixa ?? "") === chartFilter.value;
  if (chartFilter.dimension === "month") return true;
  return true;
}

function buildPipelineData(semaforo: string, period: string, product: string, chartFilter: AdminChartFilter | null): AdminDashboardViewData {
  const view = getView("pipeline");
  const spec = getSpecView("pipeline");
  const allKpis = view.modules.flatMap((module) => module.kpis);
  const kpiMap = new Map(allKpis.map((kpi) => [kpi.id, kpi]));
  const selected = maybeFilterStatus(
    [
      kpiMap.get("leads-totais"),
      kpiMap.get("leads-quentes"),
      kpiMap.get("calls-qualificacao"),
      kpiMap.get("calls-fechamento"),
      kpiMap.get("taxa-fechamento-contrato"),
      kpiMap.get("pipeline-ponderado"),
    ].filter(Boolean) as typeof allKpis,
    semaforo,
  );

  const summaryCards = selected.map((kpi) => ({
    id: kpi.id,
    title: kpi.name,
    value: kpi.currentValue,
    status: kpi.status,
    formula: kpi.formula,
    source: kpi.source,
    thresholds: kpi.thresholds,
  }));

  const topCharts: ChartConfig[] = [
    {
      id: "funnel",
      title: "Funil Executivo",
      subtitle: "Fluxo entre lead, lead quente, call de qualificacao e contrato.",
      type: "bar",
      data: [
        { stage: "Leads", value: parseNumericValue(kpiMap.get("leads-totais")?.currentValue ?? "0") },
        { stage: "Leads quentes", value: parseNumericValue(kpiMap.get("leads-quentes")?.currentValue ?? "0") },
        { stage: "Calls qualif.", value: parseNumericValue(kpiMap.get("calls-qualificacao")?.currentValue ?? "0") },
        { stage: "Calls fech.", value: parseNumericValue(kpiMap.get("calls-fechamento")?.currentValue ?? "0") },
        { stage: "Contratos", value: 2 },
      ],
      dataKeys: ["value"],
      colors: ["#ff7a1a"],
    },
    {
      id: "weighted",
      title: "Pipeline Ponderado",
      subtitle: "Serie semanal respeitando as probabilidades do briefing.",
      type: "line",
      data: [
        ...pickSeriesWindow(
          [
            { semana: "S-5", value: 298000 },
            { semana: "S-4", value: 325000 },
            { semana: "S-3", value: 351000 },
            { semana: "S-2", value: 384000 },
            { semana: "S-1", value: 421000 },
            { semana: "Atual", value: parseNumericValue(kpiMap.get("pipeline-ponderado")?.currentValue ?? "0") },
          ],
          period,
        ),
      ],
      dataKeys: ["value"],
      colors: ["#2563eb"],
    },
  ];

  const bottomCharts: ChartConfig[] = [
    {
      id: "sources",
      title: "Leads por Origem",
      subtitle: "Separacao visual do topo do funil por canal dominante.",
      type: "pie",
      data: [
        { name: "Pipedrive", value: 18 },
        { name: "LinkedIn", value: 11 },
        { name: "Indicacao", value: 9 },
        { name: "Outbound", value: 8 },
      ],
      dataKeys: ["value"],
      colors: ["#ff7a1a", "#0f172a", "#22c55e", "#38bdf8"],
    },
    {
      id: "conversion",
      title: "Conversao por Etapa",
      subtitle: "OS e Advisory separados visualmente, sem misturar funis.",
      type: "bar",
      data: [
        { etapa: "Lead > quente", os: 41, advisory: 32 },
        { etapa: "Quente > call", os: 74, advisory: 66 },
        { etapa: "Call > fechamento", os: 63, advisory: 54 },
        { etapa: "Fechamento > contrato", os: 31, advisory: 27 },
      ],
      dataKeys: ["os", "advisory"],
      colors: ["#ff7a1a", "#14b8a6"],
    },
    {
      id: "cycle",
      title: "Ciclo Medio Lead > Contrato",
      subtitle: "Comparativo por produto para localizar gargalo comercial.",
      type: "bar",
      data: [
        { produto: "OS", dias: 27 },
        { produto: "Advisory", dias: 18 },
      ],
      dataKeys: ["dias"],
      colors: ["#f59e0b"],
    },
    {
      id: "os-vs-advisory",
      title: "OS vs Advisory",
      subtitle: "Leitura de distribuicao entre recorrencia consultiva e setup.",
      type: "area",
      data: [
        { mes: "Nov", os: 1, advisory: 1 },
        { mes: "Dez", os: 2, advisory: 1 },
        { mes: "Jan", os: 2, advisory: 2 },
        { mes: "Fev", os: 3, advisory: 1 },
        { mes: "Mar", os: 3, advisory: 1 },
      ],
      dataKeys: ["os", "advisory"],
      colors: ["#fb923c", "#2dd4bf"],
    },
  ];

  const pipelineRows = [
    { oportunidade: "OS Pro - Clinica Axis", etapa: "Call Fechamento", produto: "OS", probabilidade: "60%", valor: "R$ 48 mil", owner: "Guilherme", origem: "Pipedrive" },
    { oportunidade: "Advisory Board - Velloz", etapa: "Proposta enviada", produto: "ADVISORY", probabilidade: "80%", valor: "R$ 26 mil", owner: "Matheus", origem: "LinkedIn" },
    { oportunidade: "OS Start - Kronos", etapa: "Diagnostico", produto: "OS", probabilidade: "60%", valor: "R$ 18 mil", owner: "Guilherme", origem: "Indicacao" },
    { oportunidade: "Advisory Scale - Nativa", etapa: "Call Qualificacao", produto: "ADVISORY", probabilidade: "30%", valor: "R$ 39 mil", owner: "Matheus", origem: "Outbound" },
  ];

  const tableRows = filterByProduct(
    pipelineRows.filter((row) => matchesPipelineFilter(row, chartFilter)),
    product,
  );

  const alerts = allKpis
    .filter((kpi) => kpi.status !== "green")
    .sort((a, b) => STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status])
    .slice(0, 4)
    .map((kpi, index) => {
      const rule = GLX_ADMIN_BRIEFING_SPEC.alerts.find((item) => item.status === (kpi.status.toUpperCase() as "GREEN" | "YELLOW" | "RED"));
      const hideByFilter =
        chartFilter?.dimension === "product" &&
        chartFilter.value === "OS" &&
        kpi.id.includes("advisory");
      if (hideByFilter) return null;
      return {
        id: `${kpi.id}-${index}`,
        title: kpi.name,
        level: kpi.status,
        description: kpi.executiveReading,
        action: rule?.requiredAction ?? "Investigar",
        deadline: rule?.deadline ?? "Sem prazo",
      };
    })
    .filter(Boolean) as AlertItem[];

  return {
    heading: "Pipeline & Funil",
    question: spec?.questionAnswered ?? view.executiveQuestion,
    explanation: "Visao de futuro. Esta camada continua separada da operacao e responde apenas pela garantia de crescimento dos proximos 30 a 60 dias.",
    chartLayout: "pipeline",
    pipelineView: view,
    summaryCards,
    topCharts,
    bottomCharts,
    tableTitle: "Oportunidades e Gargalos",
    tableRows,
    alerts,
    activeFilter: chartFilter?.label ?? null,
    metaCards: [
      { label: "Cadencia", value: spec?.reviewCadence ?? view.cadence },
      { label: "Produtos", value: product === "ALL" ? (spec?.products ?? []).join(" + ") || "OS + Advisory" : product },
      { label: "Fontes", value: "Pipedrive, Google Calendar e Contratos" },
    ],
  };
}

function buildOperacaoData(semaforo: string, period: string, _product: string, chartFilter: AdminChartFilter | null): AdminDashboardViewData {
  const view = getView("operacao");
  const spec = getSpecView("operacao");
  const allKpis = view.modules.flatMap((module) => module.kpis);
  const kpiMap = new Map(allKpis.map((kpi) => [kpi.id, kpi]));
  const selected = maybeFilterStatus(
    [
      kpiMap.get("mrr-total"),
      kpiMap.get("crescimento-mrr"),
      kpiMap.get("churn-rate"),
      kpiMap.get("margem-liquida"),
      kpiMap.get("fluxo-caixa-projetado"),
      kpiMap.get("utilizacao-capacidade"),
    ].filter(Boolean) as typeof allKpis,
    semaforo,
  );

  const summaryCards = selected.map((kpi) => ({
    id: kpi.id,
    title: kpi.name,
    value: kpi.currentValue,
    status: kpi.status,
    formula: kpi.formula,
    source: kpi.source,
    thresholds: kpi.thresholds,
  }));

  const topCharts: ChartConfig[] = [
    {
      id: "mrr",
      title: "Modulo 1 - Receita & MRR | Evolucao MRR",
      subtitle: "MRR total conforme Planilha de Contratos, mostrando tendencia mensal da base recorrente.",
      type: "line",
      data: [
        ...pickSeriesWindow(
          [
            { mes: "Out", value: 112000 },
            { mes: "Nov", value: 118000 },
            { mes: "Dez", value: 125000 },
            { mes: "Jan", value: 132000 },
            { mes: "Fev", value: 141000 },
            { mes: "Mar", value: parseNumericValue(kpiMap.get("mrr-total")?.currentValue ?? "0") },
          ],
          period,
        ),
      ],
      dataKeys: ["value"],
      colors: ["#2563eb"],
    },
    {
      id: "new-vs-churn",
      title: "Modulo 1 - Receita & MRR | New MRR vs Churn MRR",
      subtitle: "Comparativo direto entre receita nova e perda recorrente, respeitando a logica do briefing.",
      type: "bar",
      data: [
        { mes: "Jan", newMrr: 15000, churnMrr: 3100 },
        { mes: "Fev", newMrr: 19800, churnMrr: 4200 },
        { mes: "Mar", newMrr: parseNumericValue(kpiMap.get("new-mrr")?.currentValue ?? "0"), churnMrr: parseNumericValue(kpiMap.get("churn-mrr")?.currentValue ?? "0") },
      ],
      dataKeys: ["newMrr", "churnMrr"],
      colors: ["#22c55e", "#ef4444"],
    },
  ];

  const bottomCharts: ChartConfig[] = [
    {
      id: "revenue-composition",
      title: "Modulo 3 - Financeiro Interno | Composicao da Receita",
      subtitle: "Receita total mensal separada entre recorrencia, setup e one-time para leitura financeira.",
      type: "pie",
      data: [
        { name: "MRR recorrente", value: 148200 },
        { name: "Setup OS", value: 18600 },
        { name: "Advisory one-time", value: 10100 },
      ],
      dataKeys: ["value"],
      colors: ["#ff7a1a", "#3b82f6", "#14b8a6"],
    },
    {
      id: "margin",
      title: "Modulo 3 - Financeiro Interno | Margem Liquida",
      subtitle: "Margem liquida mensal com base em DRE e thresholds do briefing.",
      type: "area",
      data: [
        { mes: "Out", value: 24 },
        { mes: "Nov", value: 27 },
        { mes: "Dez", value: 31 },
        { mes: "Jan", value: 29 },
        { mes: "Fev", value: 34 },
        { mes: "Mar", value: parseNumericValue(kpiMap.get("margem-liquida")?.currentValue ?? "0") },
      ],
      dataKeys: ["value"],
      colors: ["#22c55e"],
    },
    {
      id: "nps",
      title: "Modulo 2 - Clientes & Retencao | NPS e Health Score",
      subtitle: "Satisfacao, risco e retencao, alimentados por Forms, Checklist e Planilha de Contratos.",
      type: "bar",
      data: [
        { name: "NPS", value: parseNumericValue(kpiMap.get("nps-clientes")?.currentValue ?? "0") },
        { name: "Health score", value: parseNumericValue(kpiMap.get("health-score")?.currentValue ?? "0") },
      ],
      dataKeys: ["value"],
      colors: ["#a855f7"],
    },
    {
      id: "capacity",
      title: "Modulo 4 - Capacidade & Operacao | Capacidade e SLA",
      subtitle: "Uso da capacidade, tempo de resposta e pressao operacional do time.",
      type: "line",
      data: [
        { semana: "S1", capacidade: 76, sla: 1.9 },
        { semana: "S2", capacidade: 81, sla: 2.2 },
        { semana: "S3", capacidade: 83, sla: 2.6 },
        { semana: "S4", capacidade: parseNumericValue(kpiMap.get("utilizacao-capacidade")?.currentValue ?? "0"), sla: parseNumericValue(kpiMap.get("sla-resposta-clientes")?.currentValue ?? "0") },
      ],
      dataKeys: ["capacidade", "sla"],
      colors: ["#f97316", "#0f172a"],
    },
  ];

  const operationRows = [
    { cliente: "Clinica Axis", healthScore: "6,8", faixa: "Risco moderado", nps: "7,1", entregasNoPrazo: "91%" },
    { cliente: "Velloz", healthScore: "8,9", faixa: "Saudavel", nps: "9,0", entregasNoPrazo: "98%" },
    { cliente: "Kronos", healthScore: "5,9", faixa: "Plano de resgate", nps: "6,4", entregasNoPrazo: "84%" },
    { cliente: "Nativa", healthScore: "7,4", faixa: "Atencao", nps: "8,2", entregasNoPrazo: "93%" },
  ];
  const tableRows = operationRows.filter((row) => matchesOperationFilter(row, chartFilter));

  const alerts = allKpis
    .filter((kpi) => kpi.status !== "green")
    .sort((a, b) => STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status])
    .slice(0, 5)
    .map((kpi, index) => {
      const rule = GLX_ADMIN_BRIEFING_SPEC.alerts.find((item) => item.status === (kpi.status.toUpperCase() as "GREEN" | "YELLOW" | "RED"));
      const hideByFilter =
        chartFilter?.dimension === "client" &&
        !["nps-clientes", "health-score", "churn-rate"].includes(kpi.id);
      if (hideByFilter) return null;
      return {
        id: `${kpi.id}-${index}`,
        title: kpi.name,
        level: kpi.status,
        description: kpi.executiveReading,
        action: rule?.requiredAction ?? "Investigar",
        deadline: rule?.deadline ?? "Sem prazo",
      };
    })
    .filter(Boolean) as AlertItem[];

  return {
    heading: "Operação Interna",
    question: spec?.questionAnswered ?? view.executiveQuestion,
    explanation: "Visao de presente e passado recente. Esta rota mostra a saude atual do negocio usando apenas fontes operacionais e financeiras do briefing.",
    chartLayout: "operation",
    operationChartsData: {
      mrrAtual: parseNumericValue(kpiMap.get("mrr-total")?.currentValue ?? "0"),
      crescimentoMrrAtual: parseNumericValue(kpiMap.get("crescimento-mrr")?.currentValue ?? "0"),
      newMrrAtual: parseNumericValue(kpiMap.get("new-mrr")?.currentValue ?? "0"),
      churnMrrAtual: parseNumericValue(kpiMap.get("churn-mrr")?.currentValue ?? "0"),
      margemAtual: parseNumericValue(kpiMap.get("margem-liquida")?.currentValue ?? "0"),
      capacidadeAtual: parseNumericValue(kpiMap.get("utilizacao-capacidade")?.currentValue ?? "0"),
      slaAtual: parseNumericValue(kpiMap.get("sla-resposta-clientes")?.currentValue ?? "0"),
      npsAtual: parseNumericValue(kpiMap.get("nps-clientes")?.currentValue ?? "0"),
    },
    summaryCards,
    topCharts,
    bottomCharts,
    integrationGroups: [
      {
        module: "Modulo 1 - Receita & MRR",
        cadence: "Mensal + revisao semanal de forecast",
        sources: ["Planilha de Contratos", "Pipedrive", "Calculado"],
        note: "MRR total, crescimento, new MRR, churn MRR e forecast MRR 3 meses.",
      },
      {
        module: "Modulo 2 - Clientes & Retencao",
        cadence: "Mensal + checkpoints semanais",
        sources: ["Planilha de Contratos", "Google Forms", "Checklist por cliente", "Pipedrive"],
        note: "Clientes ativos, churn rate, NPS, entregas no prazo, onboarding, health score e indicacao.",
      },
      {
        module: "Modulo 3 - Financeiro Interno",
        cadence: "Semanal para caixa e inadimplencia; mensal para margem e CAC",
        sources: ["ASAAS", "Planilha DRE", "Controle de Tempo", "Pipedrive"],
        note: "Receita total, margem liquida, CAC, fluxo de caixa projetado, inadimplencia e receita por hora.",
      },
      {
        module: "Modulo 4 - Capacidade & Operacao",
        cadence: "Semanal",
        sources: ["Planilha de Capacidade", "Controle de Tempo", "WhatsApp / Gmail"],
        note: "Utilizacao de capacidade, horas por cliente por semana e SLA de resposta.",
      },
    ],
    tableTitle: "Health Score por cliente",
    tableRows,
    alerts,
    activeFilter: chartFilter?.label ?? null,
    metaCards: [
      { label: "Cadencia", value: spec?.reviewCadence ?? view.cadence },
      { label: "Fontes", value: "Contratos, ASAAS, DRE, Forms e Tempo" },
      { label: "Escopo", value: "Receita, retencao, margem e capacidade" },
    ],
  };
}

function localizeViewData(data: AdminDashboardViewData, language: "pt" | "en" | "es"): AdminDashboardViewData {
  const translate = (value: string) => translateAdminDashboardText(value, language);

  return {
    ...data,
    heading: translate(data.heading),
    question: translate(data.question),
    explanation: data.explanation ? translate(data.explanation) : data.explanation,
    summaryCards: data.summaryCards.map((card) => ({
      ...card,
      title: translate(card.title),
      formula: translate(card.formula),
      source: translate(card.source),
      thresholds: {
        green: translate(card.thresholds.green),
        yellow: translate(card.thresholds.yellow),
        red: translate(card.thresholds.red),
      },
    })),
    topCharts: data.topCharts.map((chart) => ({
      ...chart,
      title: translate(chart.title),
      subtitle: translate(chart.subtitle),
      data: chart.data.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key, typeof value === "string" ? translate(value) : value]),
        ),
      ),
    })),
    bottomCharts: data.bottomCharts.map((chart) => ({
      ...chart,
      title: translate(chart.title),
      subtitle: translate(chart.subtitle),
      data: chart.data.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key, typeof value === "string" ? translate(value) : value]),
        ),
      ),
    })),
    integrationGroups: data.integrationGroups?.map((group) => ({
      ...group,
      module: translate(group.module),
      cadence: translate(group.cadence),
      sources: group.sources.map(translate),
      note: translate(group.note),
    })),
    tableTitle: translate(data.tableTitle),
    tableRows: data.tableRows.map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [translate(key), translate(value)])),
    ),
    alerts: data.alerts.map((alert) => ({
      ...alert,
      title: translate(alert.title),
      description: translate(alert.description),
      action: translate(alert.action),
      deadline: translate(alert.deadline),
    })),
    metaCards: data.metaCards.map((card) => ({
      label: translate(card.label),
      value: translate(card.value),
    })),
    activeFilter: data.activeFilter ? translate(data.activeFilter) : data.activeFilter,
  };
}

function fetchView(viewId: DashboardViewId, semaforo: string, period: string, product: string, chartFilter: AdminChartFilter | null): Promise<AdminDashboardViewData> {
  const data = viewId === "pipeline"
    ? buildPipelineData(semaforo, period, product, chartFilter)
    : buildOperacaoData(semaforo, period, product, chartFilter);
  return Promise.resolve(data);
}

export function useAdminDashboardView(viewId: DashboardViewId) {
  const { language } = useLanguage();
  const period = useAdminDashboardStore((state) => state.period);
  const product = useAdminDashboardStore((state) => state.product);
  const semaforo = useAdminDashboardStore((state) => state.semaforo);
  const chartFilter = useAdminDashboardStore((state) => state.chartFilter);

  return useQuery({
    queryKey: ["admin-dashboard-view", viewId, language, period, product, semaforo, chartFilter?.dimension, chartFilter?.value],
    queryFn: async () => {
      const data = await fetchView(viewId, semaforo, period, product, chartFilter);
      return localizeViewData(data, language);
    },
    staleTime: 1000 * 60 * 5,
  });
}
