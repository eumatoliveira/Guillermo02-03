import { cn } from "@/lib/utils";
import type { DashboardModule, KPIStatus } from "../types";
import { decodeDashboardText } from "../text";

const statusStyles: Record<KPIStatus, string> = {
  green: "border-[#cfeedd] bg-[#f3fbf6] text-[#177245]",
  yellow: "border-[#ffe3bc] bg-[#fff8ef] text-[#a96500]",
  red: "border-[#ffd2d2] bg-[#fff2f2] text-[#bc3d3d]",
};

const statusCopy: Record<KPIStatus, string> = {
  green: "Na meta",
  yellow: "Atenção",
  red: "Ação imediata",
};

const frequencyLabel = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
} as const;

export function AdminModuleCard({ module }: { module: DashboardModule }) {
  return (
    <section className="rounded-[30px] border border-[#e8edf5] bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.05)] lg:p-7">
      <div className="flex flex-col gap-5 border-b border-[#edf2f7] pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[#ffd8bf] bg-[#fff4ec] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff7a1a]">
                Fase {module.priorityPhase}
              </span>
              <span className="inline-flex rounded-full border border-[#e7edf6] bg-[#fbfdff] px-3 py-1 text-xs font-medium text-[#526070]">
                {decodeDashboardText(module.cadence)}
              </span>
            </div>
            <h3 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-[#0f172a]">{decodeDashboardText(module.title)}</h3>
            <p className="text-sm leading-7 text-[#667085]">{decodeDashboardText(module.description)}</p>
          </div>

          <div className="flex flex-wrap gap-2 xl:max-w-[320px] xl:justify-end">
            {module.sources.map((source) => (
              <span key={source} className="rounded-full border border-[#e7edf6] bg-white px-3 py-2 text-xs font-medium text-[#667085]">
                {decodeDashboardText(source)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {module.kpis.map((kpi) => (
          <article key={kpi.id} className="rounded-[26px] border border-[#edf2f7] bg-[#fcfdff] p-5 transition hover:border-[#dfe7f2] hover:bg-white">
            <div className="grid gap-5 xl:grid-cols-[1.55fr_0.55fr_0.55fr_0.9fr]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-[1.02rem] font-semibold text-[#0f172a]">{decodeDashboardText(kpi.name)}</h4>
                  <span className="rounded-full border border-[#e7edf6] bg-white px-3 py-1 text-[11px] font-medium text-[#667085]">
                    {decodeDashboardText(kpi.source)}
                  </span>
                </div>
                <p className="text-sm leading-7 text-[#667085]">{decodeDashboardText(kpi.executiveReading)}</p>
                <p className="text-xs leading-6 text-[#8b97a7]">
                  <span className="font-semibold text-[#667085]">Fórmula:</span> {decodeDashboardText(kpi.formula)}
                </p>
              </div>

              <div className="rounded-[24px] border border-[#e7edf6] bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Valor atual</div>
                <div className="mt-3 text-[1.85rem] font-semibold leading-none tracking-[-0.05em] text-[#0f172a]">
                  {decodeDashboardText(kpi.currentValue)}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#e7edf6] bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Frequência</div>
                <div className="mt-3 inline-flex rounded-full border border-[#e7edf6] bg-[#fbfdff] px-3 py-1.5 text-xs font-medium text-[#526070]">
                  {frequencyLabel[kpi.frequency]}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#e7edf6] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Semáforo</div>
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", statusStyles[kpi.status])}>
                    {statusCopy[kpi.status]}
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-xs leading-5 text-[#667085]">
                  <div><strong>Verde:</strong> {decodeDashboardText(kpi.thresholds.green)}</div>
                  <div><strong>Amarelo:</strong> {decodeDashboardText(kpi.thresholds.yellow)}</div>
                  <div><strong>Vermelho:</strong> {decodeDashboardText(kpi.thresholds.red)}</div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
