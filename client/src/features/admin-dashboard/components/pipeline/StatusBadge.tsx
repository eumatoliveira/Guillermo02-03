import { cn } from "@/lib/utils";
import type { KPIStatus } from "../../types";

const badgeTone: Record<KPIStatus, string> = {
  green: "border-[#cdeed9] bg-[#effaf3] text-[#177245]",
  yellow: "border-[#ffe1b6] bg-[#fff8ee] text-[#a96500]",
  red: "border-[#ffd2d2] bg-[#fff1f1] text-[#b93838]",
};

const badgeCopy: Record<KPIStatus, { label: string; helper: string }> = {
  green: { label: "Verde", helper: "Dentro ou acima da meta" },
  yellow: { label: "Amarelo", helper: "Investigar em ate 7 dias" },
  red: { label: "Vermelho", helper: "Acao em 24h + RCA obrigatoria" },
};

export function StatusBadge({ status, compact = false }: { status: KPIStatus; compact?: boolean }) {
  const copy = badgeCopy[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
        badgeTone[status],
        compact && "px-2.5 py-1 text-[11px]",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {copy.label}
      {!compact ? <span className="font-medium opacity-80">{copy.helper}</span> : null}
    </span>
  );
}
