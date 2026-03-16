import type { DashboardViewDefinition } from "../../types";
import { decodeDashboardText } from "../../text";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
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

export function PipelineChartsPanel({ view }: { view: DashboardViewDefinition }) {
  const topFunnelData = [
    { name: "Leads", value: parseNumber(getKpi(view, "topo-funil", "leads-totais")?.currentValue ?? "0"), color: "#3b82f6" },
    { name: "Quentes", value: parseNumber(getKpi(view, "topo-funil", "leads-quentes")?.currentValue ?? "0"), color: "#22c55e" },
    { name: "Calls qualif.", value: parseNumber(getKpi(view, "topo-funil", "calls-qualificacao")?.currentValue ?? "0"), color: "#ff7a1a" },
  ];

  const closingData = [
    {
      stage: "Qualif. -> Fech.",
      taxa: parseNumber(getKpi(view, "fechamento", "taxa-qualif-fechamento")?.currentValue ?? "0"),
      meta: 70,
    },
    {
      stage: "Fech. -> Contrato",
      taxa: parseNumber(getKpi(view, "fechamento", "taxa-fechamento-contrato")?.currentValue ?? "0"),
      meta: 40,
    },
    {
      stage: "Ciclo (dias)",
      taxa: parseNumber(getKpi(view, "fechamento", "ciclo-lead-contrato")?.currentValue ?? "0"),
      meta: 21,
    },
  ];

  const osData = [
    { label: "Diagnosticos", score: parseNumber(getKpi(view, "operation-system", "diagnosticos-os")?.currentValue ?? "0") * 20 },
    { label: "Setups", score: parseNumber(getKpi(view, "operation-system", "setups-fechados-os")?.currentValue ?? "0") * 25 },
    { label: "Diag -> Setup", score: parseNumber(getKpi(view, "operation-system", "taxa-diagnostico-setup")?.currentValue ?? "0") },
    { label: "Setup -> MRR", score: parseNumber(getKpi(view, "operation-system", "taxa-setup-mrr")?.currentValue ?? "0") },
    { label: "OS Start", score: parseNumber(getKpi(view, "operation-system", "os-start-mrr12")?.currentValue ?? "0") },
    { label: "OS Pro", score: parseNumber(getKpi(view, "operation-system", "os-pro-mrr12")?.currentValue ?? "0") },
  ];

  const advisoryData = [
    { name: "Fechados", value: parseNumber(getKpi(view, "advisory", "advisory-fechados")?.currentValue ?? "0"), color: "#ff7a1a" },
    { name: "Ativos", value: parseNumber(getKpi(view, "advisory", "advisory-ativos")?.currentValue ?? "0"), color: "#3b82f6" },
    { name: "Renovacao %", value: parseNumber(getKpi(view, "advisory", "renovacao-advisory")?.currentValue ?? "0"), color: "#22c55e" },
  ];

  const consolidatedData = [
    { name: "Pipeline Ponderado", value: parseMoney(getKpi(view, "consolidada", "pipeline-ponderado")?.currentValue ?? "0"), color: "#ff7a1a" },
    { name: "ACV", value: parseMoney(getKpi(view, "consolidada", "acv-medio")?.currentValue ?? "0"), color: "#8b5cf6" },
    { name: "Setups andamento", value: parseNumber(getKpi(view, "consolidada", "setups-andamento")?.currentValue ?? "0") * 30000, color: "#22c55e" },
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">Leitura visual do pipeline</div>
            <h2 className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-[#0f172a]">Gráficos de apoio para os 5 blocos da visão</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#667085]">
              Visualização lógica dos KPIs do pipeline para leitura executiva rápida. Os gráficos abaixo usam os valores mockados atuais organizados pelos 5 blocos do briefing.
            </p>
          </div>
          <div className="rounded-[22px] border border-[#ffe1b6] bg-[#fff8ee] px-4 py-3 text-xs font-medium leading-6 text-[#a96500]">
            Mock visual para a leitura semanal. Séries históricas entram com as integrações reais.
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          eyebrow="Bloco 1"
          title="Topo do Funil"
          description="Mostra o abastecimento do pipeline comum a OS e Advisory: volume de leads, leads quentes e calls de qualificação."
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topFunnelData} barGap={18}>
                <CartesianGrid stroke="#edf2f7" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => `${Math.round(value)}`} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {topFunnelData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          eyebrow="Bloco 2"
          title="Fechamento"
          description="Compara as conversões de qualificação e fechamento com a meta e mostra o ciclo médio até contrato."
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={closingData}>
                <CartesianGrid stroke="#edf2f7" vertical={false} />
                <XAxis dataKey="stage" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number, name) => name === "meta" ? `${Math.round(value)}` : `${Math.round(value)}${name === "taxa" && value < 100 ? "%" : ""}`} />
                <Legend />
                <Bar dataKey="taxa" name="Atual" fill="#ff7a1a" radius={[8, 8, 0, 0]} />
                <Line type="monotone" dataKey="meta" name="Meta" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          eyebrow="Bloco 3"
          title="Operation System (OS) — Start / Pro"
          description="Mantém separado o produto com diagnóstico e setup, medindo a conversão até MRR 12 meses e a saúde de Start e Pro."
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={osData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="label" tick={{ fill: "#526070", fontSize: 12 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar dataKey="score" stroke="#ff7a1a" fill="#ff7a1a" fillOpacity={0.3} />
                <Tooltip formatter={(value: number) => `${Math.round(value)}${value <= 100 ? "%" : ""}`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          eyebrow="Bloco 4"
          title="Advisory — Board / Scale"
          description="Resume a entrada e permanência do produto consultivo que vai direto para recorrência, sem diagnóstico nem setup."
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={advisoryData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="#edf2f7" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={94} tick={{ fill: "#526070", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number, _name, item) => item?.payload?.name === "Renovacao %" ? `${Math.round(value)}%` : `${Math.round(value)}`} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {advisoryData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div className="xl:col-span-2">
          <ChartCard
            eyebrow="Bloco 5"
            title="Visão Consolidada"
            description="Destaca os três indicadores executivos que respondem a garantia de crescimento futuro: Pipeline Ponderado Total, ACV e Setups em Andamento."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {consolidatedData.map((item) => (
                <div key={item.name} className="rounded-[24px] border border-[#edf2f7] bg-[#fbfdff] p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">{decodeDashboardText(item.name)}</div>
                  <div className="mt-4 text-[2rem] font-semibold tracking-[-0.06em] text-[#0f172a]">
                    {item.name === "Setups andamento" ? Math.round(item.value / 30000) : formatCompactCurrency(item.value)}
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf2f7]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, item.name === "Setups andamento" ? (item.value / 120000) * 100 : (item.value / 462000) * 100)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>
    </section>
  );
}
