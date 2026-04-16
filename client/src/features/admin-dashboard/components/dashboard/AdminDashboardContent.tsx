import { AnimatePresence, m } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowRight, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getAdminDashboardUiCopy,
  translateAdminDashboardText,
} from "@/lib/adminUiLocale";
import { OperacaoChartsGrid } from "@/components/admin/operacao/operacao-charts";
import { PipelineChartsGrid } from "@/components/admin/pipeline/pipeline-charts";
import {
  useAdminDashboardStore,
  type AdminPeriod,
  type AdminProduct,
} from "@/features/admin-dashboard/store/useAdminDashboardStore";
import type { AdminDashboardViewData } from "@/features/admin-dashboard/hooks/useAdminDashboardView";

const PERIOD_OPTIONS: AdminPeriod[] = ["7d", "30d", "90d", "mtd", "qtd", "ytd"];
const OPERATION_PERIOD_OPTIONS: AdminPeriod[] = ["monthly", "quarterly", "semiannual"];
const PRODUCT_OPTIONS: AdminProduct[] = ["ALL", "OS", "ADVISORY"];

function statusClass(status: string) {
  if (status === "green") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "yellow") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "neutral") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function AdminFilterBar() {
  return (
    <m.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-[#e8edf5] bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
    >
      <FilterControls />
    </m.section>
  );
}

function FilterControls({ mode = "generic" }: { mode?: AdminDashboardViewData["chartLayout"] }) {
  const { language } = useLanguage();
  const uiCopy = getAdminDashboardUiCopy(language);
  const { period, product, setPeriod, setProduct, chartFilter, clearChartFilter } = useAdminDashboardStore();
  const periodOptions = mode === "operation" ? OPERATION_PERIOD_OPTIONS : PERIOD_OPTIONS;
  const showProduct = mode !== "operation";

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-end">
      <div className="min-w-[360px]">
        <FilterGroup
          label={uiCopy.period}
          options={periodOptions}
          value={period}
          onChange={setPeriod}
          formatOptionLabel={(option) => formatPeriodLabel(option, language)}
        />
      </div>
      {showProduct ? (
        <div className="min-w-[280px]">
          <FilterGroup label={uiCopy.product} options={PRODUCT_OPTIONS} value={product} onChange={setProduct} />
        </div>
      ) : null}
      {chartFilter ? (
        <div className="flex items-end">
          <button
            type="button"
            onClick={clearChartFilter}
            className="rounded-full border border-[#ffd7ba] bg-[#fff7f1] px-3 py-2 text-xs font-semibold text-[#ff7a1a]"
          >
            {uiCopy.filterSlice}: {translateAdminDashboardText(chartFilter.label, language)} x
          </button>
        </div>
      ) : null}
    </div>
  );
}

function formatPeriodLabel(option: AdminPeriod, language: "pt" | "en" | "es") {
  if (option === "monthly") return language === "en" ? "Monthly" : language === "es" ? "Mensual" : "Mensal";
  if (option === "quarterly") return language === "en" ? "Quarterly" : language === "es" ? "Trimestral" : "Trimestral";
  if (option === "semiannual") return language === "en" ? "Semiannual" : language === "es" ? "Semestral" : "Semestral";
  return option;
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  formatOptionLabel,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (next: T) => void;
  formatOptionLabel?: (option: T) => string;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold transition",
                active
                  ? "border-[#ff7a1a] bg-[#ff7a1a] text-white shadow-[0_12px_20px_rgba(255,122,26,0.18)]"
                  : "border-[#e8edf5] bg-[#fbfdff] text-[#526070] hover:border-[#ffd7ba] hover:bg-white",
              )}
            >
              {formatOptionLabel ? formatOptionLabel(option) : option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-[26px] border border-[#edf2f7] bg-white" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-[360px] animate-pulse rounded-[28px] border border-[#edf2f7] bg-white" />
        <div className="h-[360px] animate-pulse rounded-[28px] border border-[#edf2f7] bg-white" />
      </div>
      <div className="grid gap-5 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[320px] animate-pulse rounded-[28px] border border-[#edf2f7] bg-white" />
        ))}
      </div>
    </div>
  );
}

export function AdminDashboardPanels({
  data,
  onOpenKpi,
  onOpenChart,
}: {
  data: AdminDashboardViewData;
  onOpenKpi: (card: AdminDashboardViewData["summaryCards"][number]) => void;
  onOpenChart: (chart: AdminDashboardViewData["topCharts"][number]) => void;
}) {
  const useHorizontalAlerts = data.chartLayout === "pipeline" || data.chartLayout === "operation";

  return (
    <div className="space-y-6">
      <m.section
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[32px] border border-[#e8edf5] bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.05)]"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,520px)] xl:items-start">
          <div className="max-w-3xl">
            <h1 className="text-[2.4rem] font-semibold leading-none tracking-[-0.06em] text-[#0f172a]">{data.heading}</h1>
            <p className="mt-3 text-base leading-8 text-[#526070]">{data.question}</p>
            {data.explanation ? <p className="mt-2 text-sm leading-7 text-[#667085]">{data.explanation}</p> : null}
          </div>

          <div className="xl:justify-self-end">
            <FilterControls mode={data.chartLayout} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {data.metaCards.map((item) => (
              <div key={item.label} className="rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">{item.label}</div>
                <div className="mt-2 text-sm font-semibold text-[#0f172a]">{item.value}</div>
              </div>
            ))}
        </div>
      </m.section>

      <div className="grid gap-4 xl:grid-cols-6">
        {data.summaryCards.map((card, index) => (
          <m.button
            key={card.id}
            type="button"
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -6, scale: 1.01, boxShadow: "0 24px 48px rgba(15,23,42,0.08)" }}
            whileTap={{ scale: 0.99 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => onOpenKpi(card)}
            className="rounded-[26px] border border-[#e8edf5] bg-white p-5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-[#ffd9bd]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">{card.title}</div>
              <div className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", statusClass(card.status))}>
                {card.status.toUpperCase()}
              </div>
            </div>
            <m.div
              className="mt-4 text-[2rem] font-semibold tracking-[-0.06em] text-[#0f172a]"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 + 0.12, duration: 0.28 }}
            >
              {card.value}
            </m.div>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#667085]">
              <Database className="h-3.5 w-3.5" />
              {card.source}
            </div>
          </m.button>
        ))}
      </div>

      {data.chartLayout === "operation" && data.operationChartsData ? (
        <OperacaoChartsGrid {...data.operationChartsData} />
      ) : data.chartLayout === "pipeline" && data.pipelineView ? (
        <PipelineChartsGrid view={data.pipelineView} apiKpis={data.pipelineApiKpis} />
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            {data.topCharts.map((chart, index) => (
              <ChartCard key={chart.id} chart={chart} delay={index * 0.08} />
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-4">
            {data.bottomCharts.map((chart, index) => (
              <ChartCard key={chart.id} chart={chart} compact delay={index * 0.06} />
            ))}
          </div>
        </>
      )}

      {useHorizontalAlerts ? (
        <div className="space-y-5">
          <DashboardTablePanel data={data} onOpenChart={onOpenChart} />
          <DashboardAlertsPanel data={data} onOpenChart={onOpenChart} horizontal />
        </div>
      ) : (
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_380px]">
          <DashboardTablePanel data={data} onOpenChart={onOpenChart} />
          <DashboardAlertsPanel data={data} onOpenChart={onOpenChart} />
        </div>
      )}
    </div>
  );
}

function DashboardTablePanel({
  data,
  onOpenChart,
}: {
  data: AdminDashboardViewData;
  onOpenChart: (chart: AdminDashboardViewData["topCharts"][number]) => void;
}) {
  const { language } = useLanguage();
  const uiCopy = getAdminDashboardUiCopy(language);
  return (
    <m.section
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">{uiCopy.lowerPanel}</div>
          <h3 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em] text-[#0f172a]">
            {translateAdminDashboardText(data.tableTitle, language)}
          </h3>
          {data.activeFilter ? (
            <p className="mt-1 text-sm text-[#ff7a1a]">
              {uiCopy.filteredBy}: {translateAdminDashboardText(data.activeFilter, language)}
            </p>
          ) : null}
        </div>
        <div className="rounded-full border border-[#edf2f7] bg-[#fbfdff] px-3 py-2 text-xs text-[#667085]">
          {data.tableRows.length} {uiCopy.records}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-[#edf2f7]">
        <div className="grid grid-cols-6 gap-3 border-b border-[#edf2f7] bg-[#fbfdff] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">
          {Object.keys(data.tableRows[0] ?? {}).map((key) => (
            <div key={key}>{translateAdminDashboardText(key, language)}</div>
          ))}
        </div>
        <div className="bg-white">
          {data.tableRows.map((row, index) => (
            <button
              key={index}
              type="button"
              onClick={() =>
                onOpenChart({
                  id: `row-${index}`,
                  title: String(Object.values(row)[0] ?? uiCopy.drilldown),
                  subtitle: translateAdminDashboardText("Drilldown contextual da linha selecionada.", language),
                  type: "bar",
                  data: [],
                  dataKeys: [],
                  colors: [],
                })
              }
              className="grid w-full grid-cols-6 gap-3 border-b border-[#f2f5f9] px-4 py-3 text-left text-sm text-[#0f172a] transition last:border-b-0 hover:bg-[#fffaf6]"
            >
              {Object.entries(row).map(([key, value]) => (
                <div key={key} className="truncate">
                  {translateAdminDashboardText(String(value), language)}
                </div>
              ))}
            </button>
          ))}
        </div>
      </div>
    </m.section>
  );
}

function DashboardAlertsPanel({
  data,
  onOpenChart,
  horizontal = false,
}: {
  data: AdminDashboardViewData;
  onOpenChart: (chart: AdminDashboardViewData["topCharts"][number]) => void;
  horizontal?: boolean;
}) {
  const { language } = useLanguage();
  const uiCopy = getAdminDashboardUiCopy(language);
  return (
    <m.section
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-[#e8edf5] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff4ec] text-[#ff7a1a]">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">{uiCopy.alerts}</div>
          <h3 className="mt-1 text-lg font-semibold text-[#0f172a]">{uiCopy.executiveSemaphore}</h3>
        </div>
      </div>

      <div className={cn("mt-5", horizontal ? "grid gap-3 md:grid-cols-2 xl:grid-cols-4" : "space-y-3")}>
        {data.alerts.map((alert) => (
          <button
            key={alert.id}
            type="button"
            onClick={() => onOpenChart({ id: alert.id, title: alert.title, subtitle: alert.description, type: "bar", data: [], dataKeys: [], colors: [] })}
            className={cn(
              "rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] p-4 text-left transition hover:border-[#ffd7ba] hover:bg-white",
              horizontal ? "h-full min-h-[190px]" : "w-full",
            )}
            >
              <div className="flex items-center justify-between gap-3">
              <div className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", statusClass(alert.level))}>
                {alert.level.toUpperCase()}
              </div>
              <ArrowRight className="h-4 w-4 text-[#94a3b8]" />
            </div>
            <div className="mt-3 text-sm font-semibold text-[#0f172a]">{alert.title}</div>
            <div className="mt-3 text-sm font-semibold text-[#0f172a]">{translateAdminDashboardText(alert.title, language)}</div>
            <div className="mt-2 text-xs leading-6 text-[#667085]">{translateAdminDashboardText(alert.description, language)}</div>
            <div className="mt-3 text-xs text-[#ff7a1a]">Prazo: {translateAdminDashboardText(alert.deadline, language)}</div>
          </button>
        ))}
      </div>
    </m.section>
  );
}

function ChartCard({
  chart,
  compact = false,
  delay = 0,
}: {
  chart: AdminDashboardViewData["topCharts"][number];
  compact?: boolean;
  delay?: number;
}) {
  const { language } = useLanguage();
  return (
    <m.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      data-glx-chart-card="true"
      data-glx-chart-title={chart.title}
      data-glx-chart-subtitle={chart.subtitle}
      className="rounded-[28px] border border-[#e8edf5] bg-white p-5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-[#ffd9bd]"
    >
      <div className="mb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">
            {compact ? translateAdminDashboardText("Detalhe", language) : translateAdminDashboardText("Painel superior", language)}
          </div>
          <h3 className="mt-2 text-[1.3rem] font-semibold tracking-[-0.04em] text-[#0f172a]">{translateAdminDashboardText(chart.title, language)}</h3>
          <p className="mt-2 text-sm leading-7 text-[#667085]">{translateAdminDashboardText(chart.subtitle, language)}</p>
        </div>
      </div>
      <div className={cn("w-full overflow-hidden rounded-[20px] bg-[#fcfdff]", compact ? "h-[240px]" : "h-[320px]")}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartRenderer chart={chart} />
        </ResponsiveContainer>
      </div>
    </m.article>
  );
}

function ChartRenderer({ chart }: { chart: AdminDashboardViewData["topCharts"][number] }) {
  const { language } = useLanguage();
  const firstKey = chart.dataKeys[0];
  const secondKey = chart.dataKeys[1];
  const xKey = Object.keys(chart.data[0] ?? {}).find((key) => !chart.dataKeys.includes(key)) ?? "name";

  if (chart.type === "line") {
    return (
      <LineChart data={chart.data}>
        <CartesianGrid stroke="#edf2f7" vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={(value) => translateAdminDashboardText(String(value), language)} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Legend />
        <Line isAnimationActive type="monotone" dataKey={firstKey} stroke={chart.colors[0]} strokeWidth={3} dot={{ r: 4 }} />
        {secondKey ? <Line isAnimationActive type="monotone" dataKey={secondKey} stroke={chart.colors[1]} strokeWidth={3} dot={{ r: 4 }} /> : null}
      </LineChart>
    );
  }

  if (chart.type === "area") {
    return (
      <AreaChart data={chart.data}>
        <CartesianGrid stroke="#edf2f7" vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={(value) => translateAdminDashboardText(String(value), language)} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Legend />
        <Area isAnimationActive type="monotone" dataKey={firstKey} stroke={chart.colors[0]} fill={`${chart.colors[0]}33`} strokeWidth={3} />
        {secondKey ? <Line isAnimationActive type="monotone" dataKey={secondKey} stroke={chart.colors[1]} strokeWidth={3} dot={{ r: 4 }} /> : null}
      </AreaChart>
    );
  }

  if (chart.type === "pie") {
    return (
      <PieChart>
        <Tooltip />
        <Legend />
        <Pie isAnimationActive data={chart.data} dataKey={firstKey} nameKey={xKey} innerRadius={55} outerRadius={86} paddingAngle={3}>
          {chart.data.map((entry, index) => (
            <Cell key={`${entry[xKey]}-${index}`} fill={chart.colors[index % chart.colors.length]} />
          ))}
        </Pie>
      </PieChart>
    );
  }

  return (
    <BarChart data={chart.data}>
      <CartesianGrid stroke="#edf2f7" vertical={false} />
      <XAxis dataKey={xKey} tickFormatter={(value) => translateAdminDashboardText(String(value), language)} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
      <Tooltip />
      <Legend />
      <Bar isAnimationActive dataKey={firstKey} fill={chart.colors[0]} radius={[8, 8, 0, 0]} />
      {secondKey ? <Bar isAnimationActive dataKey={secondKey} fill={chart.colors[1]} radius={[8, 8, 0, 0]} /> : null}
    </BarChart>
  );
}

export function AdminDrilldownDrawer() {
  const { language } = useLanguage();
  const uiCopy = getAdminDashboardUiCopy(language);
  const activeDrilldown = useAdminDashboardStore((state) => state.activeDrilldown);
  const closeDrilldown = useAdminDashboardStore((state) => state.closeDrilldown);

  return (
    <AnimatePresence>
      {activeDrilldown ? (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#0f172a]/24"
            onClick={closeDrilldown}
          />
          <m.aside
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[430px] border-l border-[#e8edf5] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">{uiCopy.drilldown}</div>
                <h3 className="mt-2 text-[1.6rem] font-semibold tracking-[-0.05em] text-[#0f172a]">
                  {translateAdminDashboardText(activeDrilldown.title, language)}
                </h3>
                {activeDrilldown.description ? (
                  <p className="mt-3 text-sm leading-7 text-[#667085]">{translateAdminDashboardText(activeDrilldown.description, language)}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeDrilldown}
                className="rounded-full border border-[#e8edf5] px-3 py-2 text-sm text-[#667085] transition hover:bg-[#f8fafc]"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {activeDrilldown.formula ? (
                <div className="rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">{uiCopy.formula}</div>
                  <div className="mt-2 text-sm text-[#0f172a]">{translateAdminDashboardText(activeDrilldown.formula, language)}</div>
                </div>
              ) : null}

              {activeDrilldown.source ? (
                <div className="rounded-[22px] border border-[#edf2f7] bg-[#fbfdff] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">{uiCopy.dataSource}</div>
                  <div className="mt-2 text-sm text-[#0f172a]">{translateAdminDashboardText(activeDrilldown.source, language)}</div>
                </div>
              ) : null}

              {activeDrilldown.thresholds ? (
                <div className="grid gap-3">
                  <ThresholdCard label="Verde" color="text-emerald-700 bg-emerald-50 border-emerald-200" value={activeDrilldown.thresholds.green} />
                  <ThresholdCard label="Amarelo" color="text-amber-700 bg-amber-50 border-amber-200" value={activeDrilldown.thresholds.yellow} />
                  <ThresholdCard label="Vermelho" color="text-rose-700 bg-rose-50 border-rose-200" value={activeDrilldown.thresholds.red} />
                </div>
              ) : null}
            </div>
          </m.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function ThresholdCard({ label, color, value }: { label: string; color: string; value: string }) {
  return (
    <div className={cn("rounded-[22px] border p-4", color)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-2 text-sm">{value}</div>
    </div>
  );
}
