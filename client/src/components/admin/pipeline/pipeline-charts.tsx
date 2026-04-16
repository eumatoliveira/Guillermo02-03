"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { DashboardViewDefinition } from "@/features/admin-dashboard/types";
import { useAdminDashboardStore } from "@/features/admin-dashboard/store/useAdminDashboardStore";

type ChartCardProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
};

function parseMoney(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const numeric = Number.parseFloat(normalized || "0");
  return value.includes("mil") ? numeric * 1000 : numeric;
}

function parseNumber(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return Number.parseFloat(normalized || "0");
}

function getKpi(view: DashboardViewDefinition, moduleId: string, kpiId: string) {
  return view.modules.find((module) => module.id === moduleId)?.kpis.find((kpi) => kpi.id === kpiId);
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value) || 0;
  return 0;
}

function formatCompactCurrency(value: number) {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace(".", ",")} mil`;
  }

  return `R$ ${Math.round(value)}`;
}

type FunnelPoint = { etapa: string; valor: number; color: string };
type WeightedPoint = { semana: string; pipeline: number; meta: number; acv: number };
type CyclePoint = { produto: string; dias: number; color: string };
type OsVsAdvisoryPoint = { eixo: string; atual: number; meta: number };

function tooltipNumber(value: ValueType | undefined) {
  return toNumber(value);
}

function funnelStage(entry: unknown) {
  return String((entry as FunnelPoint | undefined)?.etapa ?? "");
}

function weightedWeek(entry: unknown) {
  return String((entry as WeightedPoint | undefined)?.semana ?? "");
}

function cycleProduct(entry: unknown) {
  return String((entry as CyclePoint | undefined)?.produto ?? "");
}

function advisoryAxis(entry: unknown) {
  return String((entry as OsVsAdvisoryPoint | undefined)?.eixo ?? "");
}

function ChartCard({
  eyebrow = "Painel superior",
  title,
  subtitle,
  children,
  height = 280,
}: ChartCardProps) {
  return (
    <div
      data-glx-chart-card="true"
      data-glx-chart-title={title}
      data-glx-chart-subtitle={subtitle ?? ""}
      className="rounded-[28px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-shadow duration-200 hover:shadow-[0_24px_48px_rgba(15,23,42,0.08)]"
    >
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">{eyebrow}</p>
        <h3 className="text-[1.25rem] font-semibold tracking-[-0.04em] text-[#0f172a]">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-[#667085]">{subtitle}</p> : null}
      </div>

      <div style={{ height }}>{children}</div>
    </div>
  );
}

type ApiKpiMap = Record<string, { value: number | null; status: string }>;

function apiNum(kpis: ApiKpiMap | undefined, key: string): number | null {
  if (!kpis) return null;
  const v = kpis[key]?.value;
  return v === undefined ? null : v;
}

function NoDataPlaceholder({ title, subtitle, eyebrow = "Detalhe" }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <ChartCard title={title} subtitle={subtitle} eyebrow={eyebrow} height={250}>
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <span className="text-2xl">—</span>
        <p className="text-sm italic text-[#94a3b8]">Dados não entrados</p>
        <p className="text-xs text-[#c4cdd6]">Fonte sem integração disponível</p>
      </div>
    </ChartCard>
  );
}

export function PipelineChartsGrid({ view, apiKpis }: { view: DashboardViewDefinition; apiKpis?: ApiKpiMap }) {
  const chartFilter = useAdminDashboardStore((state) => state.chartFilter);
  const setChartFilter = useAdminDashboardStore((state) => state.setChartFilter);
  const setProduct = useAdminDashboardStore((state) => state.setProduct);

  // Valores da API (reais) — null quando não disponível
  const leadsTotais        = apiNum(apiKpis, "leads_totais_gerados");
  const leadsQuentes       = apiNum(apiKpis, "leads_quentes");
  const callsQualificacao  = apiNum(apiKpis, "calls_de_qualificacao");
  const callsFechamento    = apiNum(apiKpis, "calls_de_fechamento");
  const taxaLeadQuente     = apiNum(apiKpis, "taxa_lead_lead_quente");
  const taxaLeadCall       = apiNum(apiKpis, "taxa_lead_quente_call");
  const taxaQualifFech     = apiNum(apiKpis, "taxa_qualif_fechamento");
  const taxaFechContrato   = apiNum(apiKpis, "taxa_fechamento_contrato");
  const pipelinePonderado  = apiNum(apiKpis, "pipeline_ponderado_total");
  const acvMedio           = apiNum(apiKpis, "acv_valor_medio_contrato");
  const osStartMrr12       = apiNum(apiKpis, "os_start_ativos_mrr_12m");
  const osProMrr12         = apiNum(apiKpis, "os_pro_ativos_mrr_12m");
  const renovacaoAdvisory  = apiNum(apiKpis, "taxa_renovacao_advisory_6m");
  const setupsAndamento    = apiNum(apiKpis, "setups_em_andamento");

  // Funil: só renderiza se tiver pelo menos os campos base da API
  const hasFunnelData = leadsTotais !== null;
  const contratos = (callsFechamento !== null && taxaFechContrato !== null)
    ? Math.max(1, Math.round((callsFechamento * taxaFechContrato) / 100))
    : null;

  const funnelData = hasFunnelData ? [
    { etapa: "Leads",         valor: leadsTotais ?? 0,       color: "#2563eb" },
    { etapa: "Leads quentes", valor: leadsQuentes ?? 0,      color: "#22c55e" },
    { etapa: "Calls qualif.", valor: callsQualificacao ?? 0, color: "#f97316" },
    { etapa: "Calls fech.",   valor: callsFechamento ?? 0,   color: "#f59e0b" },
    { etapa: "Contratos",     valor: contratos ?? 0,         color: "#0f172a" },
  ] : null;

  // Pipeline Ponderado: só exibe o ponto atual; série histórica não vem da API → null
  const hasPipelineData = pipelinePonderado !== null;
  const targetMrr = pipelinePonderado !== null ? Math.round(pipelinePonderado / 3) : 0;
  const weightedData = hasPipelineData ? [
    { semana: "Atual", pipeline: pipelinePonderado ?? 0, meta: targetMrr * 3, acv: acvMedio ?? 0 },
  ] : null;

  // Conversão por Etapa: usa taxas reais da API
  const hasConversionData = taxaLeadQuente !== null;
  const conversionData = hasConversionData ? [
    { etapa: "Lead -> Quente",    atual: taxaLeadQuente ?? 0,   meta: 35 },
    { etapa: "Quente -> Call",    atual: taxaLeadCall ?? 0,     meta: 60 },
    { etapa: "Qualif. -> Fech.",  atual: taxaQualifFech ?? 0,   meta: 70 },
    { etapa: "Fech. -> Contrato", atual: taxaFechContrato ?? 0, meta: 40 },
  ] : null;

  // OS vs Advisory: usa valores reais da API
  const hasOsAdvisoryData = osStartMrr12 !== null;
  const osVsAdvisoryData = hasOsAdvisoryData ? [
    { eixo: "OS Start",  atual: osStartMrr12 ?? 0,      meta: 80 },
    { eixo: "OS Pro",    atual: osProMrr12 ?? 0,         meta: 80 },
    { eixo: "Advisory",  atual: renovacaoAdvisory ?? 0,  meta: 75 },
    { eixo: "Setups",    atual: (setupsAndamento ?? 0) * 20, meta: 40 },
  ] : null;

  // Leads por Origem: distribuição por canal não está na API → sempre null
  // Ciclo Médio por produto: API tem apenas valor agregado, sem breakdown OS/Advisory → sempre null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Funil Executivo — dados reais da API */}
        {funnelData ? (
          <ChartCard
            title="Funil Executivo"
            subtitle="Blocos 1 e 2: entrada de leads, aquecimento comercial, calls e contratos."
            height={320}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} barGap={16}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                <XAxis dataKey="etapa" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip formatter={(value: ValueType | undefined) => [`${Math.round(tooltipNumber(value))}`, "Volume"]} />
                <Legend />
                <Bar
                  isAnimationActive animationDuration={250} animationEasing="ease-out"
                  dataKey="valor" name="Volume atual" radius={[8, 8, 0, 0]}
                  onClick={(entry) => {
                    const etapa = funnelStage(entry);
                    const stageMap: Record<string, string> = {
                      Leads: "Lead", "Leads quentes": "Lead Quente",
                      "Calls qualif.": "Call Qualificacao", "Calls fech.": "Call Fechamento",
                      Contratos: "Proposta enviada",
                    };
                    setChartFilter({ dimension: "stage", value: stageMap[etapa] ?? etapa, label: `Etapa ${etapa}` });
                  }}
                >
                  {funnelData.map((entry) => (
                    <Cell key={entry.etapa} fill={entry.color}
                      fillOpacity={!chartFilter || chartFilter.value === entry.etapa || chartFilter.label === `Etapa ${entry.etapa}` ? 1 : 0.45}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <NoDataPlaceholder eyebrow="Painel superior" title="Funil Executivo"
            subtitle="Blocos 1 e 2: entrada de leads, aquecimento comercial, calls e contratos." />
        )}

        {/* Pipeline Ponderado — apenas ponto atual da API; série histórica não disponível */}
        {weightedData ? (
          <ChartCard
            title="Pipeline Ponderado"
            subtitle="Bloco 5: valor atual do pipeline ponderado e ACV médio."
            height={320}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightedData}>
                <defs>
                  <linearGradient id="pipelineFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                <XAxis dataKey="semana" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={(value) => `${Math.round(toNumber(value) / 1000)}k`} />
                <Tooltip formatter={(value: ValueType | undefined, name: NameType | undefined) =>
                  [formatCompactCurrency(tooltipNumber(value)), name === "pipeline" ? "Pipeline" : "Referencia"]} />
                <Legend />
                <ReferenceLine y={targetMrr * 3} stroke="#10b981" strokeDasharray="4 4" label="Meta 3x" />
                <Area isAnimationActive animationDuration={250} animationEasing="ease-out"
                  type="monotone" dataKey="pipeline" name="Pipeline ponderado"
                  stroke="#2563eb" fill="url(#pipelineFill)" strokeWidth={3} />
                <Line isAnimationActive animationDuration={1200} animationBegin={120} animationEasing="ease-out"
                  type="monotone" dataKey="acv" name="ACV medio" stroke="#f97316"
                  strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <NoDataPlaceholder eyebrow="Painel superior" title="Pipeline Ponderado"
            subtitle="Bloco 5: serie semanal do pipeline ponderado." />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Leads por Origem — distribuição por canal não está na API */}
        <NoDataPlaceholder title="Leads por Origem"
          subtitle="Bloco 1: distribuição por canal não disponível na API." />

        {/* Conversão por Etapa — dados reais da API */}
        {conversionData ? (
          <ChartCard title="Conversao por Etapa"
            subtitle="Blocos 1 e 2: atual vs meta nas conversoes criticas do funil."
            eyebrow="Detalhe" height={250}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                <XAxis dataKey="etapa" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, 100]} />
                <Tooltip formatter={(value: ValueType | undefined) => [`${Math.round(tooltipNumber(value))}%`, "Taxa"]} />
                <Legend />
                <Bar isAnimationActive animationDuration={900} animationEasing="ease-out"
                  dataKey="atual" name="Atual" fill="#f97316" radius={[8, 8, 0, 0]}
                  onClick={(entry) =>
                    setChartFilter({
                      dimension: "stage",
                      value: funnelStage(entry).includes("Fech.") ? "Proposta enviada"
                        : funnelStage(entry).includes("Qualif.") ? "Call Fechamento" : "Call Qualificacao",
                      label: `Conversao ${funnelStage(entry)}`,
                    })
                  }
                />
                <Line isAnimationActive animationDuration={1100} animationBegin={100} animationEasing="ease-out"
                  type="monotone" dataKey="meta" name="Meta" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <NoDataPlaceholder title="Conversao por Etapa"
            subtitle="Blocos 1 e 2: atual vs meta nas conversoes criticas do funil." />
        )}

        {/* Ciclo Médio por produto — API tem apenas valor agregado, sem breakdown OS/Advisory */}
        <NoDataPlaceholder title="Ciclo Medio Lead > Contrato"
          subtitle="Bloco 2: breakdown OS x Advisory não disponível na API." />

        {/* OS vs Advisory — dados reais da API */}
        {osVsAdvisoryData ? (
          <ChartCard title="OS vs Advisory"
            subtitle="Blocos 3 e 4: recorrencia do OS versus renovacao e base ativa do Advisory."
            eyebrow="Detalhe" height={250}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={osVsAdvisoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                <XAxis dataKey="eixo" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip formatter={(value: ValueType | undefined, _name: NameType | undefined, item) =>
                  [`${Math.round(tooltipNumber(value))}${item?.dataKey === "atual" ? "%" : ""}`, item?.dataKey === "meta" ? "Meta" : "Atual"]} />
                <Legend />
                <Bar isAnimationActive animationDuration={900} animationEasing="ease-out"
                  dataKey="atual" name="Atual" fill="#14b8a6" radius={[8, 8, 0, 0]}
                  onClick={(entry) => {
                    const eixo = advisoryAxis(entry);
                    if (eixo.includes("Advisory")) { setProduct("ADVISORY"); setChartFilter({ dimension: "product", value: "ADVISORY", label: "Produto ADVISORY" }); return; }
                    setProduct("OS");
                    setChartFilter({ dimension: "product", value: "OS", label: `Produto ${eixo.includes("Setups") ? "OS Setup" : "OS"}` });
                  }}
                />
                <Line isAnimationActive animationDuration={1080} animationBegin={100} animationEasing="ease-out"
                  type="monotone" dataKey="meta" name="Meta" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <NoDataPlaceholder title="OS vs Advisory"
            subtitle="Blocos 3 e 4: recorrencia do OS versus renovacao e base ativa do Advisory." />
        )}
      </div>
    </div>
  );
}
