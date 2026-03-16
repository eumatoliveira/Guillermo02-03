import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardViewDefinition, KPIStatus } from "../types";
import { decodeDashboardText } from "../text";
import { ArrowRight, CalendarClock, FileText, Radar, Sparkles } from "lucide-react";
import { Link } from "wouter";

const statusTone: Record<KPIStatus, string> = {
  green: "border-[#cfeedd] bg-[#f3fbf6] text-[#177245]",
  yellow: "border-[#ffe3bc] bg-[#fff8ef] text-[#a96500]",
  red: "border-[#ffd2d2] bg-[#fff2f2] text-[#bc3d3d]",
};

export function AdminExecutiveHero({ view }: { view: DashboardViewDefinition }) {
  return (
    <section className="rounded-[34px] border border-[#e8edf5] bg-[radial-gradient(circle_at_top_left,_rgba(255,221,198,0.45),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(214,241,255,0.48),_transparent_26%),linear-gradient(180deg,_#ffffff_0%,_#fbfdff_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] lg:p-8">
      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ffd8bf] bg-[#fff4ec] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#ff7a1a]">
              <Sparkles className="h-3.5 w-3.5" />
              Centro de comando executivo
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e7edf6] bg-white px-4 py-1.5 text-xs font-medium text-[#526070]">
              <CalendarClock className="h-3.5 w-3.5" />
              Leitura semanal + fechamento mensal
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="max-w-4xl text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.06em] text-[#0f172a] xl:text-[3.55rem]">
              {decodeDashboardText(view.heroTitle)}
            </h1>
            <p className="max-w-3xl text-base leading-8 text-[#667085]">{decodeDashboardText(view.heroCopy)}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[26px] border border-[#edf2f7] bg-white/80 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
                <Radar className="h-4 w-4 text-[#ff7a1a]" />
                Pergunta executiva desta visão
              </div>
              <p className="mt-3 text-sm leading-7 text-[#667085]">{decodeDashboardText(view.executiveQuestion)}</p>
            </div>
            <div className="rounded-[26px] border border-[#edf2f7] bg-[#fbfdff] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
                <FileText className="h-4 w-4 text-[#ff7a1a]" />
                Contexto de leitura
              </div>
              <p className="mt-3 text-sm leading-7 text-[#667085]">{decodeDashboardText(view.description)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/usuarios">
              <Button className="h-[50px] rounded-full bg-[#ff7a1a] px-6 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(255,122,26,0.24)] hover:bg-[#f06a09]">
                Gerenciar usuários
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button
              type="button"
              variant="ghost"
              className="h-[50px] rounded-full border border-[#e7edf6] bg-white px-6 text-sm font-semibold text-[#0f172a] hover:bg-[#f8fafc]"
            >
              Ver roadmap da visão
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {view.heroKpis.map((item) => (
            <article key={item.label} className="rounded-[28px] border border-[#e8edf5] bg-white/96 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">{decodeDashboardText(item.label)}</div>
                  <div className="mt-3 text-[2.2rem] font-semibold tracking-[-0.05em] text-[#0f172a]">{item.value}</div>
                </div>
                <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", statusTone[item.status])}>
                  {item.status === "green" ? "Saudável" : item.status === "yellow" ? "Atenção" : "Crítico"}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
