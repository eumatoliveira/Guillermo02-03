import { cn } from "@/lib/utils";
import type { DashboardViewDefinition, KPIStatus } from "../types";
import { decodeDashboardText } from "../text";
import { AlertTriangle, CheckCircle2, Clock3, Layers3 } from "lucide-react";

const statusTone: Record<KPIStatus, string> = {
  green: "border-[#cfeedd] bg-[#f3fbf6] text-[#177245]",
  yellow: "border-[#ffe3bc] bg-[#fff8ef] text-[#a96500]",
  red: "border-[#ffd2d2] bg-[#fff2f2] text-[#bc3d3d]",
};

function countStatus(view: DashboardViewDefinition, status: KPIStatus) {
  return view.modules.flatMap((module) => module.kpis).filter((kpi) => kpi.status === status).length;
}

export function AdminKpiRail({ view }: { view: DashboardViewDefinition }) {
  const totalKpis = view.modules.reduce((sum, module) => sum + module.kpis.length, 0);
  const cards = [
    {
      label: "Visão em foco",
      value: decodeDashboardText(view.title),
      helper: decodeDashboardText(view.executiveQuestion),
      icon: Layers3,
      tone: "border-[#e8edf5] bg-white text-[#0f172a]",
    },
    {
      label: "KPIs mapeados",
      value: String(totalKpis),
      helper: `${view.modules.length} blocos ativos nesta visão`,
      icon: CheckCircle2,
      tone: "border-[#e8edf5] bg-white text-[#0f172a]",
    },
    {
      label: "Cadência executiva",
      value: decodeDashboardText(view.cadence),
      helper: "Ritmo sugerido pelo briefing para revisão",
      icon: Clock3,
      tone: "border-[#e8edf5] bg-white text-[#0f172a]",
    },
    {
      label: "Alertas críticos",
      value: String(countStatus(view, "red")),
      helper: `${countStatus(view, "yellow")} KPIs em atenção e ${countStatus(view, "green")} saudáveis`,
      icon: AlertTriangle,
      tone: countStatus(view, "red") > 0 ? statusTone.red : statusTone.green,
    },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className={cn(
            "min-h-[148px] rounded-[28px] border p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]",
            card.tone,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#94a3b8]">{card.label}</div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f7f9fc] text-[#ff7a1a]">
              <card.icon className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-5 text-[1.9rem] font-semibold leading-tight tracking-[-0.05em] text-[#0f172a]">
            {card.value}
          </div>
          <p className="mt-3 text-sm leading-6 text-[#667085]">{card.helper}</p>
        </article>
      ))}
    </section>
  );
}
