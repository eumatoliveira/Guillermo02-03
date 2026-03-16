import type { DashboardKPI } from "../../types";
import { decodeDashboardText } from "../../text";
import { StatusBadge } from "./StatusBadge";

const frequencyCopy = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensal",
} as const;

export function KpiRowCard({ kpi }: { kpi: DashboardKPI }) {
  return (
    <article className="rounded-[24px] border border-[#edf2f7] bg-[#fcfdff] p-5 transition hover:border-[#dde6f2] hover:bg-white">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_220px_220px_260px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[1.02rem] font-semibold text-[#0f172a]">{decodeDashboardText(kpi.name)}</h4>
            <StatusBadge status={kpi.status} compact />
          </div>
          <p className="text-sm leading-7 text-[#5d6b7d]">{decodeDashboardText(kpi.executiveReading)}</p>
          <div className="grid gap-2 text-xs leading-6 text-[#7b8898]">
            <div><strong className="font-semibold text-[#526070]">Origem:</strong> {decodeDashboardText(kpi.source)}</div>
            <div><strong className="font-semibold text-[#526070]">Frequencia:</strong> {frequencyCopy[kpi.frequency]}</div>
            <div><strong className="font-semibold text-[#526070]">Formula:</strong> {decodeDashboardText(kpi.formula)}</div>
          </div>
        </div>

        <div className="rounded-[22px] border border-[#e7edf6] bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Valor atual</div>
          <div className="mt-3 text-[1.9rem] font-semibold leading-none tracking-[-0.06em] text-[#0f172a]">
            {decodeDashboardText(kpi.currentValue)}
          </div>
        </div>

        <div className="rounded-[22px] border border-[#e7edf6] bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Meta resumida</div>
          <div className="mt-3 space-y-2 text-xs leading-6 text-[#667085]">
            <div><strong>Verde:</strong> {decodeDashboardText(kpi.thresholds.green)}</div>
            <div><strong>Amarelo:</strong> {decodeDashboardText(kpi.thresholds.yellow)}</div>
          </div>
        </div>

        <div className="rounded-[22px] border border-[#e7edf6] bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Acao esperada</div>
          <div className="mt-3 text-xs leading-6 text-[#667085]">
            {kpi.status === "green" ? (
              <span>Dentro ou acima da meta. Nenhuma acao corretiva imediata.</span>
            ) : kpi.status === "yellow" ? (
              <span>Atencao. Investigar em ate 7 dias e acompanhar no proximo ciclo semanal.</span>
            ) : (
              <span>Impacto direto no crescimento futuro. Acao em 24h com RCA obrigatoria.</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
