import { Database, RefreshCw } from "lucide-react";
import { decodeDashboardText } from "../../text";

export function DataFreshnessInfo({
  lastUpdated,
  sources,
}: {
  lastUpdated: string;
  sources: string[];
}) {
  return (
    <section className="rounded-[24px] border border-[#dcedf8] bg-[linear-gradient(90deg,#def5ff_0%,#eef8ff_100%)] p-4 shadow-[0_10px_28px_rgba(151,210,241,0.18)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-[#4d647a]">
            <RefreshCw className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7d8ea4]">Ultima atualizacao</div>
            <p className="mt-1 text-sm font-medium text-[#0f172a]">{lastUpdated}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-[#4d647a]">
            <Database className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7d8ea4]">Fontes da Visao 2</div>
            <p className="mt-1 text-sm leading-6 text-[#526070]">{sources.map((source) => decodeDashboardText(source)).join(" • ")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
