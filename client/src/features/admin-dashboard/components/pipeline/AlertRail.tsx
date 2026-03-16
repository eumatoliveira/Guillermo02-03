import type { DashboardKPI, DashboardModule } from "../../types";
import { decodeDashboardText } from "../../text";
import { StatusBadge } from "./StatusBadge";

function flattenCriticalKpis(modules: DashboardModule[]) {
  return modules.flatMap((module) =>
    module.kpis
      .filter((kpi) => kpi.status !== "green")
      .map((kpi) => ({ module: module.title, kpi })),
  );
}

function groupLevers(modules: DashboardModule[]) {
  const top = modules.find((module) => module.id === "topo-funil");
  const close = modules.find((module) => module.id === "fechamento");
  const os = modules.find((module) => module.id === "operation-system");

  return [
    top?.kpis.find((kpi) => kpi.id === "calls-qualificacao"),
    close?.kpis.find((kpi) => kpi.id === "taxa-fechamento-contrato"),
    os?.kpis.find((kpi) => kpi.id === "setups-fechados-os"),
  ].filter(Boolean) as DashboardKPI[];
}

function RailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[26px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <h3 className="text-base font-semibold tracking-[-0.03em] text-[#0f172a]">{title}</h3>
      <div className="mt-4">{children}</div>
    </article>
  );
}

export function AlertRail({
  modules,
  lastUpdated,
}: {
  modules: DashboardModule[];
  lastUpdated: string;
}) {
  const critical = flattenCriticalKpis(modules);
  const levers = groupLevers(modules);

  return (
    <aside className="space-y-5 xl:sticky xl:top-[112px]">
      <RailCard title="Riscos ativos">
        <div className="space-y-3">
          {critical.length === 0 ? (
            <div className="rounded-[20px] border border-[#cdeed9] bg-[#effaf3] p-4 text-sm leading-7 text-[#177245]">
              Nenhum KPI em amarelo ou vermelho nesta leitura. O pipeline esta dentro da faixa esperada.
            </div>
          ) : (
            critical.map(({ module, kpi }) => (
              <div key={kpi.id} className="rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">
                      {decodeDashboardText(module)}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#0f172a]">{decodeDashboardText(kpi.name)}</div>
                  </div>
                  <StatusBadge status={kpi.status} compact />
                </div>
                <p className="mt-2 text-xs leading-6 text-[#667085]">{decodeDashboardText(kpi.executiveReading)}</p>
              </div>
            ))
          )}
        </div>
      </RailCard>

      <RailCard title="Alavancas da semana">
        <div className="space-y-3">
          {levers.map((kpi) => (
            <div key={kpi.id} className="rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[#0f172a]">{decodeDashboardText(kpi.name)}</div>
                <div className="text-sm font-semibold text-[#ff7a1a]">{decodeDashboardText(kpi.currentValue)}</div>
              </div>
              <p className="mt-2 text-xs leading-6 text-[#667085]">{decodeDashboardText(kpi.executiveReading)}</p>
            </div>
          ))}
        </div>
      </RailCard>

      <RailCard title="Leitura operacional do semaforo">
        <div className="space-y-3 text-sm leading-7 text-[#5d6b7d]">
          <div className="rounded-[20px] border border-[#cdeed9] bg-[#effaf3] p-4">
            <strong className="font-semibold text-[#177245]">Verde:</strong> dentro ou acima da meta.
          </div>
          <div className="rounded-[20px] border border-[#ffe1b6] bg-[#fff8ee] p-4">
            <strong className="font-semibold text-[#a96500]">Amarelo:</strong> atencao, investigar em ate 7 dias.
          </div>
          <div className="rounded-[20px] border border-[#ffd2d2] bg-[#fff1f1] p-4">
            <strong className="font-semibold text-[#b93838]">Vermelho:</strong> impacto direto, acao em 24h e RCA obrigatoria.
          </div>
        </div>
      </RailCard>

      <RailCard title="Atualizacao e fontes">
        <div className="rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] p-4 text-sm leading-7 text-[#5d6b7d]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">Ultima atualizacao</div>
          <div className="mt-2 font-medium text-[#0f172a]">{lastUpdated}</div>
          <p className="mt-3 text-xs leading-6 text-[#667085]">
            Fontes principais desta visao: Pipedrive, Google Calendar e Planilha de Contratos.
          </p>
        </div>
      </RailCard>
    </aside>
  );
}
