import { cn } from "@/lib/utils";
import type { DashboardBriefingData, DashboardViewDefinition, KPIStatus } from "../types";
import { decodeDashboardText } from "../text";
import { DatabaseZap, FileText, PlugZap, ShieldAlert, TimerReset } from "lucide-react";

const statusStyles: Record<KPIStatus, string> = {
  green: "border-[#cfeedd] bg-[#f3fbf6] text-[#177245]",
  yellow: "border-[#ffe3bc] bg-[#fff8ef] text-[#a96500]",
  red: "border-[#ffd2d2] bg-[#fff2f2] text-[#bc3d3d]",
};

function SidebarCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[28px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff4ec] text-[#ff7a1a]">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h2 className="text-base font-semibold tracking-[-0.03em] text-[#0f172a]">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

export function AdminSidebarStack({
  view,
  data,
}: {
  view: DashboardViewDefinition;
  data: DashboardBriefingData;
}) {
  return (
    <aside className="space-y-5 xl:sticky xl:top-[112px]">
      <SidebarCard icon={FileText} title="Resumo executivo do briefing">
        <div className="space-y-4 text-sm leading-7 text-[#667085]">
          <p>{decodeDashboardText(view.description)}</p>
          <div className="rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Leitura sugerida</div>
            <p className="mt-2">
              Comece pelo topo executivo, valide alertas e depois aprofunde nos módulos. A ideia é decidir rápido antes de mergulhar nos detalhes.
            </p>
          </div>
        </div>
      </SidebarCard>

      <SidebarCard icon={PlugZap} title="Plano de dados e integrações">
        <div className="space-y-3">
          {data.integrations
            .filter((item) => item.scope.includes(view.id))
            .map((integration) => (
              <div key={integration.id} className="rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[#0f172a]">{decodeDashboardText(integration.source)}</h3>
                  <span className="rounded-full border border-[#e7edf6] bg-white px-3 py-1 text-[11px] font-medium text-[#526070]">
                    {decodeDashboardText(integration.cadence)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-6 text-[#667085]">{decodeDashboardText(integration.integrationMethod)}</p>
              </div>
            ))}
        </div>
      </SidebarCard>

      <SidebarCard icon={ShieldAlert} title="Semáforos e leitura rápida">
        <div className="space-y-3">
          {data.alertRules.map((rule) => (
            <div key={rule.level} className="rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] p-4">
              <div className="flex items-center gap-3">
                <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", statusStyles[rule.level])}>
                  {decodeDashboardText(rule.title)}
                </span>
                <div className="text-sm font-medium text-[#0f172a]">{decodeDashboardText(rule.description)}</div>
              </div>
              <p className="mt-2 text-xs leading-6 text-[#667085]">{decodeDashboardText(rule.expectedAction)}</p>
            </div>
          ))}
        </div>
      </SidebarCard>

      <SidebarCard icon={TimerReset} title="Roadmap por fases">
        <div className="space-y-3">
          {data.roadmap.map((phase) => (
            <div key={phase.phase} className="rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">{decodeDashboardText(phase.timeline)}</div>
                  <h3 className="mt-1 text-sm font-semibold text-[#0f172a]">Fase {phase.phase} — {decodeDashboardText(phase.title)}</h3>
                </div>
                <span className="rounded-full border border-[#ffd8bf] bg-[#fff4ec] px-3 py-1 text-[11px] font-semibold text-[#ff7a1a]">
                  Prioridade
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-[#667085]">{decodeDashboardText(phase.scope)}</p>
            </div>
          ))}
        </div>
      </SidebarCard>

      <SidebarCard icon={DatabaseZap} title="Premissas da API">
        <div className="space-y-3">
          {data.assumptions.map((assumption) => (
            <div key={assumption} className="rounded-[22px] border border-dashed border-[#e7edf6] bg-[#fbfdff] p-4 text-xs leading-6 text-[#667085]">
              {decodeDashboardText(assumption)}
            </div>
          ))}
        </div>
      </SidebarCard>
    </aside>
  );
}
