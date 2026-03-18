import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  AdminDashboardPanels,
  AdminDashboardSkeleton,
  AdminDrilldownDrawer,
} from "@/features/admin-dashboard/components/dashboard/AdminDashboardContent";
import { useAdminDashboardView } from "@/features/admin-dashboard/hooks/useAdminDashboardView";
import { useAdminDashboardStore } from "@/features/admin-dashboard/store/useAdminDashboardStore";
import type { DashboardViewId } from "@/features/admin-dashboard/types";
import { exportAdminDashboardCsv, exportAdminDashboardPdf } from "@/features/admin-dashboard/utils/adminDashboardExport";
import { toast } from "sonner";

function useAdminSearch() {
  const [search, setSearch] = useState(() => (typeof window !== "undefined" ? window.location.search : ""));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setSearch(window.location.search);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return search;
}

export default function AdminDashboard() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const search = useAdminSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const syncFromQuery = useAdminDashboardStore((state) => state.syncFromQuery);
  const openDrilldown = useAdminDashboardStore((state) => state.openDrilldown);
  const setPeriod = useAdminDashboardStore((state) => state.setPeriod);
  const setProduct = useAdminDashboardStore((state) => state.setProduct);
  const period = useAdminDashboardStore((state) => state.period);
  const product = useAdminDashboardStore((state) => state.product);
  const semaforo = useAdminDashboardStore((state) => state.semaforo);
  const activeView = (params.get("view") as DashboardViewId) || "pipeline";
  const { data, isLoading } = useAdminDashboardView(activeView);

  useEffect(() => {
    syncFromQuery(params);
  }, [params, syncFromQuery]);

  useEffect(() => {
    if (activeView === "operacao") {
      if (!["monthly", "quarterly", "semiannual"].includes(period)) {
        setPeriod("monthly");
      }
      if (product !== "ALL") {
        setProduct("ALL");
      }
      return;
    }

    if (!["7d", "30d", "90d", "mtd", "qtd", "ytd"].includes(period)) {
      setPeriod("30d");
    }
  }, [activeView, period, product, setPeriod, setProduct]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = new URLSearchParams(window.location.search);
    next.set("view", activeView);
    next.set("period", period);
    if (activeView === "operacao") {
      next.delete("product");
    } else {
      next.set("product", product);
    }
    next.set("semaforo", semaforo);
    window.history.replaceState({}, "", `/admin?${next.toString()}`);
  }, [activeView, period, product, semaforo]);

  useEffect(() => {
    if (!data) return;

    const handleCsv = () => {
      try {
        exportAdminDashboardCsv({
          view: activeView,
          data,
          period,
        });
        toast.success("CSV exportado com sucesso.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel exportar o CSV.");
      }
    };

    const handlePdf = async () => {
      if (!rootRef.current) {
        toast.error("Area do dashboard indisponivel para exportacao.");
        return;
      }

      try {
        await exportAdminDashboardPdf({
          view: activeView,
          data,
          period,
          rootElement: rootRef.current,
        });
        toast.success("PDF executivo gerado com sucesso.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel gerar o PDF.");
      }
    };

    window.addEventListener("glx-admin-export-csv", handleCsv as EventListener);
    window.addEventListener("glx-admin-export-pdf", handlePdf as EventListener);
    return () => {
      window.removeEventListener("glx-admin-export-csv", handleCsv as EventListener);
      window.removeEventListener("glx-admin-export-pdf", handlePdf as EventListener);
    };
  }, [activeView, data, period]);

  return (
    <AdminLayout>
      <div ref={rootRef} className="space-y-6 bg-white">
        {isLoading || !data ? (
          <AdminDashboardSkeleton />
        ) : (
          <AdminDashboardPanels
            data={data}
            onOpenKpi={(card) =>
              openDrilldown({
                type: "kpi",
                title: card.title,
                formula: card.formula,
                source: card.source,
                thresholds: card.thresholds,
                description: "Detalhe do KPI com formula, thresholds e origem do dado conforme o briefing.",
              })
            }
            onOpenChart={(chart) =>
              openDrilldown({
                type: "chart",
                title: chart.title,
                description: chart.subtitle,
              })
            }
          />
        )}

        <AdminDrilldownDrawer />
      </div>
    </AdminLayout>
  );
}
