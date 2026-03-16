import type { DashboardViewDefinition, KPIStatus } from "../../types";
import { decodeDashboardText } from "../../text";
import { StatusBadge } from "./StatusBadge";

const summaryTone: Record<KPIStatus, string> = {
  green: "bg-[#effaf3] text-[#177245]",
  yellow: "bg-[#fff8ee] text-[#a96500]",
  red: "bg-[#fff1f1] text-[#b93838]",
};

export function PipelineSummaryCards({ view }: { view: DashboardViewDefinition }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {view.heroKpis.map((card) => (
        <article key={card.label} className="rounded-[26px] border border-[#e8edf5] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">
              {decodeDashboardText(card.label)}
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${summaryTone[card.status]}`}>
              {card.status === "green" ? "Saudavel" : card.status === "yellow" ? "Atencao" : "Critico"}
            </span>
          </div>
          <div className="mt-5 text-[2.15rem] font-semibold tracking-[-0.06em] text-[#0f172a]">
            {decodeDashboardText(card.value)}
          </div>
          <div className="mt-4">
            <StatusBadge status={card.status} compact />
          </div>
        </article>
      ))}
    </section>
  );
}
