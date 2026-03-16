import type { DashboardViewDefinition } from "../../types";
import { decodeDashboardText } from "../../text";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

function formatCompactCurrency(value: number) {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace(".", ",")} mil`;
  }

  return `R$ ${Math.round(value)}`;
}

function ChartCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[28px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)] lg:p-6">
      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff7a1a]">{eyebrow}</div>
        <h3 className="mt-2 text-[1.2rem] font-semibold tracking-[-0.04em] text-[#0f172a]">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-[#667085]">{description}</p>
      </div>
      {children}
    </article>
  );
}

export function OperationsChartsPanel({ view }: { view: DashboardViewDefinition }) {
  const revenueData = [
    { name: "MRR", value: parseMoney(getKpi(view, "receita-mrr", "mrr-total")?.currentValue ?? "0"), color: "#ff7a1a" },
    { name: "New MRR", value: parseMoney(getKpi(view, "receita-mrr", "new-mrr")?.currentValue ?? "0"), color: "#22c55e" },
    { name: "Churn MRR", value: parseMoney(getKpi(view, "receita-mrr", "churn-mrr")?.currentValue ?? "0"), color: "#ef4444" },
    { name: "Forecast 3m", value: parseMoney(getKpi(view, "receita-mrr", "forecast-mrr-3m")?.currentValue ?? "0"), color: "#3b82f6" },
  ];

  const retentionRadar = [
    { label: "NPS", score: Math.min(100, parseNumber(getKpi(view, "clientes-retencao", "nps-clientes")?.currentValue ?? "0") * 10) },
    { label: "Prazo", score: parseNumber(getKpi(view, "clientes-retencao", "entregas-no-prazo")?.currentValue ?? "0") },
    { label: "Health", score: Math.min(100, parseNumber(getKpi(view, "clientes-retencao", "health-score")?.currentValue ?? "0") * 10) },
    { label: "Indicacao", score: Math.min(100, parseNumber(getKpi(view, "clientes-retencao", "taxa-indicacao")?.currentValue ?? "0") * 3) },
    { label: "Churn inv.", score: Math.max(0, 100 - parseNumber(getKpi(view, "clientes-retencao", "churn-rate")?.currentValue ?? "0") * 10) },
  ];

  const financeData = [
    { name: "Receita", value: parseMoney(getKpi(view, "financeiro-interno", "receita-total-mensal")?.currentValue ?? "0"), color: "#22c55e" },
    { name: "Fluxo", value: parseMoney(getKpi(view, "financeiro-interno", "fluxo-caixa-projetado")?.currentValue ?? "0"), color: "#3b82f6" },
    { name: "CAC", value: parseMoney(getKpi(view, "financeiro-interno", "cac")?.currentValue ?? "0"), color: "#f59e0b" },
    { name: "Receita/h", value: parseNumber(getKpi(view, "financeiro-interno", "receita-por-hora")?.currentValue ?? "0"), color: "#8b5cf6" },
  ];

  const capacityData = [
    { name: "Capacidade", value: parseNumber(getKpi(view, "capacidade-operacao", "utilizacao-capacidade")?.currentValue ?? "0"), color: "#ff7a1a" },
    { name: "Horas/cliente", value: parseNumber(getKpi(view, "capacidade-operacao", "horas-por-cliente-semana")?.currentValue ?? "0") * 15, color: "#06b6d4" },
    { name: "SLA resposta", value: parseNumber(getKpi(view, "capacidade-operacao", "sla-resposta-clientes")?.currentValue ?? "0") * 15, color: "#eab308" },
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">Leitura visual da operacao</div>
            <h2 className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-[#0f172a]">Graficos de apoio para os 4 modulos operacionais</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#667085]">
              Visualizacao logica dos KPIs da Operacao Interna. Os graficos abaixo usam os valores mockados atuais para facilitar a leitura executiva por modulo, ate a entrada do historico real.
            </p>
          </div>
          <div className="rounded-[22px] border border-[#ffe1b6] bg-[#fff8ee] px-4 py-3 text-xs font-medium leading-6 text-[#a96500]">
            Mock visual para leitura executiva. Historicos reais entram na fase de integracao.
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          eyebrow="Modulo 1"
          title="Receita & MRR"
          description="Compara o tamanho da base recorrente, entrada de nova receita, perda por churn e capacidade de forecast para os proximos 3 meses."
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} barGap={18}>
                <CartesianGrid stroke="#edf2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => formatCompactCurrency(value)} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {revenueData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          eyebrow="Modulo 2"
          title="Clientes & Retencao"
          description="Resume a qualidade da carteira combinando satisfacao, pontualidade, health score, indicacao e churn invertido para leitura rapida."
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={retentionRadar}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="label" tick={{ fill: "#526070", fontSize: 12 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar dataKey="score" stroke="#ff7a1a" fill="#ff7a1a" fillOpacity={0.32} />
                <Tooltip formatter={(value: number) => `${Math.round(value)} pts`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          eyebrow="Modulo 3"
          title="Financeiro Interno"
          description="Mostra o equilibrio entre receita, caixa projetado, custo de aquisicao e produtividade economica da operacao."
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="#edf2f7" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={86} tick={{ fill: "#526070", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number, _name, item) => item?.payload?.name === "Receita/h" ? `R$ ${Math.round(value)}/h` : formatCompactCurrency(value)} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {financeData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          eyebrow="Modulo 4"
          title="Capacidade & Operacao"
          description="Leitura visual da pressao sobre a operacao combinando ocupacao, horas por cliente e SLA de resposta."
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capacityData} barGap={18}>
                <CartesianGrid stroke="#edf2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number, _name, item) => item?.payload?.name === "Capacidade" ? `${Math.round(value)}%` : `${(value / 15).toFixed(1)} h`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {capacityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </section>
  );
}
