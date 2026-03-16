import type { DashboardModule } from "../../types";
import { decodeDashboardText } from "../../text";
import { KpiRowCard } from "./KpiRowCard";

export function KpiBlockSection({ module, index }: { module: DashboardModule; index: number }) {
  return (
    <section className="rounded-[30px] border border-[#e8edf5] bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.05)] lg:p-7">
      <div className="flex flex-col gap-5 border-b border-[#edf2f7] pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff7a1a]">Bloco {index}</div>
            <h3 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.05em] text-[#0f172a]">
              {decodeDashboardText(module.title)}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#5d6b7d]">{decodeDashboardText(module.description)}</p>
          </div>

          <div className="flex flex-wrap gap-2 xl:max-w-[340px] xl:justify-end">
            <span className="rounded-full border border-[#e7edf6] bg-[#fbfdff] px-3 py-1.5 text-xs font-medium text-[#526070]">
              {decodeDashboardText(module.cadence)}
            </span>
            {module.sources.map((source) => (
              <span key={source} className="rounded-full border border-[#e7edf6] bg-white px-3 py-1.5 text-xs font-medium text-[#667085]">
                {decodeDashboardText(source)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {module.kpis.map((kpi) => (
          <KpiRowCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}
