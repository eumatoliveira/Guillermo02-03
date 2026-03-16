import type { DashboardViewDefinition, KPIStatus } from "../../types";
import { decodeDashboardText } from "../../text";
import { StatusBadge } from "./StatusBadge";

const statusAccent: Record<KPIStatus, string> = {
  green: "text-[#177245]",
  yellow: "text-[#a96500]",
  red: "text-[#b93838]",
};

export function PipelineExecutiveHeader({
  view,
  totalKpis,
  riskCount,
  activeLevers,
}: {
  view: DashboardViewDefinition;
  totalKpis: number;
  riskCount: number;
  activeLevers: string[];
}) {
  return (
    <section className="overflow-hidden rounded-[34px] border border-[#e8edf5] bg-[radial-gradient(circle_at_top_left,#fff1e7_0%,#ffffff_46%,#f1f9ff_100%)] p-6 shadow-[0_22px_48px_rgba(15,23,42,0.08)] lg:p-8">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.28fr)_360px]">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#94a3b8]">
              {decodeDashboardText(view.title)}
            </div>
            <h1 className="max-w-4xl text-[2.6rem] font-semibold leading-[0.95] tracking-[-0.07em] text-[#0f172a] md:text-[3.2rem]">
              O crescimento futuro esta garantido?
            </h1>
            <p className="max-w-3xl text-base leading-8 text-[#5d6b7d]">
              Visao 2 do dashboard interno da GLX para leitura semanal do pipeline e checagem diaria quando houver prospeccao intensa.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/80 bg-white/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">Estrutura da visao</div>
              <p className="mt-2 text-sm leading-7 text-[#0f172a]">{totalKpis} KPIs organizados em 5 blocos de leitura executiva.</p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">Ritmo de leitura</div>
              <p className="mt-2 text-sm leading-7 text-[#0f172a]">Revisao semanal de 30 minutos, com leitura diaria quando necessario.</p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/80 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">Alavancas da semana</div>
              <p className="mt-2 text-sm leading-7 text-[#0f172a]">{activeLevers.join(" • ")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-[#edf2f7] bg-white/88 p-5 shadow-[0_18px_34px_rgba(15,23,42,0.07)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">Resumo do momento</div>
              <h2 className="mt-2 text-[1.2rem] font-semibold tracking-[-0.04em] text-[#0f172a]">Resposta da semana</h2>
            </div>
            <StatusBadge status={riskCount > 0 ? "yellow" : "green"} compact />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {view.heroKpis.map((item) => (
              <div key={item.label} className="rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">{decodeDashboardText(item.label)}</div>
                <div className={`mt-3 text-[2rem] font-semibold tracking-[-0.06em] ${statusAccent[item.status]}`}>
                  {decodeDashboardText(item.value)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] p-4 text-sm leading-7 text-[#526070]">
            <strong className="font-semibold text-[#0f172a]">Pergunta executiva:</strong> {decodeDashboardText(view.executiveQuestion)}
          </div>
        </div>
      </div>
    </section>
  );
}
