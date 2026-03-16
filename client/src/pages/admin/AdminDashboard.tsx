import { useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { ADMIN_DASHBOARD_MOCK_DATA } from "@/features/admin-dashboard/mockData";
import type { DashboardModule, DashboardViewDefinition, DashboardViewId, KPIStatus } from "@/features/admin-dashboard/types";
import { decodeDashboardText } from "@/features/admin-dashboard/text";
import { AdminExecutiveHero } from "@/features/admin-dashboard/components/AdminExecutiveHero";
import { AdminKpiRail } from "@/features/admin-dashboard/components/AdminKpiRail";
import { AdminModuleCard } from "@/features/admin-dashboard/components/AdminModuleCard";
import { AdminSidebarStack } from "@/features/admin-dashboard/components/AdminSidebarStack";
import { AlertRail } from "@/features/admin-dashboard/components/pipeline/AlertRail";
import { DataFreshnessInfo } from "@/features/admin-dashboard/components/pipeline/DataFreshnessInfo";
import { PipelineChartsPanel } from "@/features/admin-dashboard/components/pipeline/PipelineChartsPanel";
import { KpiBlockSection } from "@/features/admin-dashboard/components/pipeline/KpiBlockSection";
import { PipelineExecutiveHeader } from "@/features/admin-dashboard/components/pipeline/PipelineExecutiveHeader";
import { PipelineSummaryCards } from "@/features/admin-dashboard/components/pipeline/PipelineSummaryCards";
import { OperationsChartsPanel } from "@/features/admin-dashboard/components/operations/OperationsChartsPanel";
import { Link } from "wouter";

const PIPELINE_BLOCK_ORDER = [
  "topo-funil",
  "fechamento",
  "operation-system",
  "advisory",
  "consolidada",
] as const;

function ContextStrip({ activeView }: { activeView: DashboardViewId }) {
  const items =
    activeView === "pipeline"
      ? [
          { label: "Visão", value: "Pipeline & Funil" },
          { label: "Pergunta de negócio", value: "O crescimento futuro está garantido?" },
          { label: "Leitura recomendada", value: "Revisão semanal de 30 minutos, com leitura diária quando necessário." },
        ]
      : [
          { label: "Visão", value: "Operação Interna" },
          { label: "Pergunta de negócio", value: "A empresa está saudável agora e protegendo o dinheiro que ganhou?" },
          { label: "Leitura recomendada", value: "Revisão semanal dos pontos críticos, com fechamento mensal consolidado." },
        ];

  return (
    <div className="grid gap-3 rounded-[24px] border border-[#dcedf8] bg-[linear-gradient(90deg,#def5ff_0%,#eff8ff_100%)] p-4 shadow-[0_8px_24px_rgba(151,210,241,0.18)] lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-[18px] border border-white/70 bg-white/75 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">{item.label}</div>
          <div className="mt-2 text-sm font-medium text-[#0f172a]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function DashboardViewChooser() {
  const options = [
    {
      href: "/admin?view=pipeline",
      label: "Pipeline & Funil",
      description: "Responde se o crescimento futuro está garantido, com 21 KPIs em 5 blocos para leitura semanal do CEO.",
      badge: "Para-brisa do negócio",
    },
    {
      href: "/admin?view=operacao",
      label: "Operação Interna",
      description: "Mostra a saúde atual da empresa com foco em MRR, margem, retenção, financeiro e capacidade de entrega.",
      badge: "Retrovisor executivo",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-[24px] border border-[#dcedf8] bg-[linear-gradient(90deg,#def5ff_0%,#eff8ff_100%)] p-4 shadow-[0_8px_24px_rgba(151,210,241,0.18)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">Dashboard admin GLX</div>
        <h1 className="mt-2 text-[2.3rem] font-semibold tracking-[-0.06em] text-[#0f172a]">Escolha a visão executiva</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5d6b7d]">
          O dashboard admin foi separado em duas leituras complementares. Entre primeiro na visão que responde à decisão de negócio da reunião.
        </p>
      </div>

      <div className="space-y-6">
        {options.map((option) => (
          <Link key={option.href} href={option.href}>
            <article className="cursor-pointer rounded-[34px] border border-[#ffd8bf] bg-white p-7 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[#ffb77f] hover:shadow-[0_24px_44px_rgba(255,122,26,0.14)] lg:p-8">
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full border border-[#ffd8bf] bg-[#fff4ec] px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#ff7a1a]">
                  {option.badge}
                </div>
                <h2 className="mt-5 text-[2rem] font-semibold tracking-[-0.06em] text-[#0f172a]">{option.label}</h2>
                <p className="mt-3 text-sm leading-7 text-[#5d6b7d]">{option.description}</p>
                <div className="mt-6 inline-flex rounded-full bg-[#ff7a1a] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(255,122,26,0.24)]">
                  Entrar nesta visão
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

function countStatus(modules: DashboardModule[], status: KPIStatus) {
  return modules.flatMap((module) => module.kpis).filter((kpi) => kpi.status === status).length;
}

function getPipelineLevers(view: DashboardViewDefinition) {
  const levers = [
    view.modules.find((module) => module.id === "topo-funil")?.kpis.find((kpi) => kpi.id === "calls-qualificacao")?.name,
    view.modules.find((module) => module.id === "fechamento")?.kpis.find((kpi) => kpi.id === "taxa-fechamento-contrato")?.name,
    view.modules.find((module) => module.id === "operation-system")?.kpis.find((kpi) => kpi.id === "setups-fechados-os")?.name,
  ].filter(Boolean) as string[];

  return levers.map((lever) => decodeDashboardText(lever));
}

function PipelineDashboardView({ view }: { view: DashboardViewDefinition }) {
  const totalKpis = view.modules.reduce((sum, module) => sum + module.kpis.length, 0);
  const riskCount = countStatus(view.modules, "yellow") + countStatus(view.modules, "red");
  const sortedModules = PIPELINE_BLOCK_ORDER.map((id) => view.modules.find((module) => module.id === id)).filter(Boolean) as DashboardModule[];

  return (
    <section className="space-y-6">
      <DataFreshnessInfo
        lastUpdated="16/03/2026, 21:00:00"
        sources={["Pipedrive", "Google Calendar", "Planilha de Contratos"]}
      />

      <PipelineExecutiveHeader
        view={view}
        totalKpis={totalKpis}
        riskCount={riskCount}
        activeLevers={getPipelineLevers(view)}
      />

      <PipelineSummaryCards view={view} />

      <PipelineChartsPanel view={view} />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.58fr)_360px]">
        <div className="space-y-6">
          {sortedModules.map((module, index) => (
            <KpiBlockSection key={module.id} module={module} index={index + 1} />
          ))}
        </div>

        <AlertRail modules={sortedModules} lastUpdated="16/03/2026, 21:00:00" />
      </div>
    </section>
  );
}

function OperationsDashboardView({ view }: { view: DashboardViewDefinition }) {
  return (
    <section className="space-y-6">
      <div className="rounded-[18px] border border-[#dcedf8] bg-[#def5ff] px-5 py-4 text-sm text-[#516173] shadow-[0_8px_24px_rgba(151,210,241,0.18)]">
        Cotacao de referencia: 16/03/2026, 21:00:00
      </div>

      <AdminKpiRail view={view} />

      <AdminExecutiveHero view={view} />

      <OperationsChartsPanel view={view} />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.58fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">
                  {decodeDashboardText(view.title)}
                </div>
                <h2 className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-[#0f172a]">Módulos detalhados da visão</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[#667085]">
                  A coluna principal foi organizada para leitura executiva primeiro e profundidade operacional depois. Cada módulo mantém fórmula, origem, frequência e semáforo, mas com melhor respiro, contraste e agrupamento.
                </p>
              </div>
              <div className="rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] px-4 py-3 text-sm text-[#526070]">
                {view.modules.length} módulos ativos nesta visão
              </div>
            </div>
          </div>

          {view.modules.map((module) => (
            <AdminModuleCard key={module.id} module={module} />
          ))}
        </div>

        <AdminSidebarStack view={view} data={ADMIN_DASHBOARD_MOCK_DATA} />
      </div>
    </section>
  );
}

export default function AdminDashboard() {
  const currentSearch = typeof window !== "undefined" ? window.location.search : "";
  const viewParam = new URLSearchParams(currentSearch).get("view");
  const activeView: DashboardViewId = viewParam === "operacao" ? "operacao" : "pipeline";
  const hasSelectedView = viewParam === "pipeline" || viewParam === "operacao";

  const activeDefinition = useMemo(
    () => ADMIN_DASHBOARD_MOCK_DATA.views.find((view) => view.id === activeView) ?? ADMIN_DASHBOARD_MOCK_DATA.views[0],
    [activeView],
  );

  return (
    <AdminLayout>
      {hasSelectedView ? (
        <section className="space-y-6">
          <ContextStrip activeView={activeView} />
          {activeView === "pipeline" ? <PipelineDashboardView view={activeDefinition} /> : <OperationsDashboardView view={activeDefinition} />}
        </section>
      ) : (
        <DashboardViewChooser />
      )}
    </AdminLayout>
  );
}
