import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, PieChart, Pie, Cell,
} from 'recharts';
import type { Appointment, Filters } from '../../data/mockData';
import type { FinanceWeek, KPISummary } from '../../data/dashboardTypes';

const C = {
  red:    '#E24B4A',
  amber:  '#EF9F27',
  green:  '#1D9E75',
  blue:   '#378ADD',
  gray:   '#888780',
};

const TS = {
  contentStyle: { background: 'var(--tooltip-bg, #1f2937)', border: 'none', borderRadius: 8, fontSize: 12, color: 'var(--text-primary, #fff)' },
  itemStyle: { color: 'var(--text-secondary, #9ca3af)' },
};
const TK = { fill: 'var(--text-muted, #9ca3af)', fontSize: 10 };
const GR = { stroke: 'var(--chart-grid, #e5e7eb)', strokeOpacity: 0.5, strokeDasharray: '3 3' };

function fmtK(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000)      return `R$${(v / 1000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
}
function fmtPct(v: number) { return `${v.toFixed(1)}%`; }

function PriorityBadge({ priority }: { priority: 'P1' | 'P2' | 'P3' | 'OK' }) {
  const cls   = priority === 'P3' ? 'red'    : priority === 'P2' ? 'yellow' : 'green';
  const label = priority === 'P3' ? 'Crítico': priority === 'P2' ? 'Alerta' : 'Bom';
  return <span className={`chart-card-badge ${cls}`}>{label}</span>;
}

interface CardProps {
  title: string; subtitle?: string; note?: string;
  priority?: 'P1' | 'P2' | 'P3' | 'OK'; fullWidth?: boolean; kpiValue?: string;
  children: React.ReactNode;
}
function ChartCard({ title, subtitle, note, priority, fullWidth, kpiValue, children }: CardProps) {
  return (
    <div className="chart-card" style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <div className="chart-card-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="chart-card-title">{title}</span>
            {priority && <PriorityBadge priority={priority} />}
            {kpiValue && <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginLeft: 4 }}>{kpiValue}</span>}
          </div>
          {subtitle && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>{subtitle}</span>}
        </div>
      </div>
      <div className="chart-card-body">
        {children}
        {note && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>{note}</p>}
      </div>
    </div>
  );
}

// ── Reusable inline bullet chart ──────────────────────────────────────────────
interface BulletProps {
  value: number; max: number;
  p1: number; p3: number;           // thresholds (inverted: lower = better)
  p1Label: string; p3Label: string;
  colorZones: [string, string, string]; // [green, yellow, red] bg colors
}
function BulletBar({ value, max, p1, p3, p1Label, p3Label, colorZones }: BulletProps) {
  const pct    = (v: number) => Math.min(100, (v / max) * 100);
  const valPct = pct(value);
  const color  = value < p1 ? C.green : value < p3 ? C.amber : C.red;
  return (
    <div style={{ padding: '28px 4px 4px', position: 'relative' }}>
      {/* Value label above marker */}
      <div style={{ position: 'absolute', top: 6, left: `${Math.max(3, Math.min(93, valPct))}%`, transform: 'translateX(-50%)', fontSize: 12, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
        {fmtPct(value)}
      </div>
      <div style={{ position: 'relative', height: 28, borderRadius: 8 }}>
        {/* Zone backgrounds */}
        <div style={{ display: 'flex', height: '100%', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ width: `${pct(p1)}%`, background: colorZones[0] }} />
          <div style={{ width: `${pct(p3 - p1)}%`, background: colorZones[1] }} />
          <div style={{ flex: 1,                   background: colorZones[2] }} />
        </div>
        {/* Dividers */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(p1)}%`, width: 1.5, background: C.green,  opacity: 0.5 }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(p3)}%`, width: 1.5, background: C.red,    opacity: 0.5 }} />
        {/* Value marker */}
        <div style={{ position: 'absolute', top: -5, bottom: -5, left: `${valPct}%`, transform: 'translateX(-50%)', width: 3, borderRadius: 2, background: color, boxShadow: `0 0 5px ${color}70` }} />
      </div>
      {/* Scale labels */}
      <div style={{ position: 'relative', height: 16, marginTop: 6 }}>
        {[
          { pos: 0,          label: '0%',    c: 'var(--text-muted)' },
          { pos: pct(p1),    label: p1Label, c: C.green  },
          { pos: pct(p3),    label: p3Label, c: C.red    },
          { pos: 100,        label: `${max}%`, c: 'var(--text-muted)' },
        ].map(({ pos, label, c }) => (
          <span key={label} style={{ position: 'absolute', left: `${pos}%`, transform: 'translateX(-50%)', fontSize: 9, color: c, whiteSpace: 'nowrap' }}>{label}</span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  financeWeeks: FinanceWeek[];
  filtered: Appointment[];
  kpis: KPISummary;
  filters: Filters;
  showTargets: boolean;
  plan?: 'ESSENTIAL' | 'PRO' | 'ENTERPRISE';
}

const THRESHOLDS = {
  gross:    { target: 120_000, p1: 1.00, p2: 0.80 }, // P1 ≥ 100% meta | P2 80-99% | P3 < 80%
  net:      { p1: 0.92, p2: 0.85 },                  // P1 > 92% bruto | P2 85-92% | P3 < 85%
  margin:   { p1: 20,   p3: 12   },                  // P1 > 20% | P2 12-20% | P3 < 12%
  ticket:   { dropP2: 10, dropP3: 10 },               // P1 estável/crescente | P2 queda < 10% | P3 queda ≥ 10%
  inad:     { p1: 4,    p3: 8    },                  // P1 < 4% | P2 4-8% | P3 > 8%
  expenses: { p1: 45,   p3: 60   },                  // P1 < 45% | P2 45-60% | P3 > 60%
  ebitda:   { p1: 25,   p3: 15   },                  // P1 > 25% | P2 15-25% | P3 < 15%
  forecast: { p1: 10,   p2: 20   },                  // P1 desvio ≤ 10% | P2 10-20% | P3 > 20%
  bep:      { p1: 90,   p2: 70   },                  // P1 coberto > 90% no dia 15 | P2 70-90% | P3 < 70%
};

export function FinanceiroModule({ financeWeeks, kpis, showTargets, plan = 'ESSENTIAL' }: Props) {
  const isPro = plan === 'PRO' || plan === 'ENTERPRISE';

  // ── Derived series ────────────────────────────────────────────────────────
  const grossSeries   = financeWeeks.map(w => ({ label: w.label, gross: w.gross }));
  const netSeries     = financeWeeks.map(w => ({ label: w.label, liquida: Math.round(w.net), deducoes: Math.round(w.gross - w.net) }));
  const ticketSeries  = financeWeeks.map(w => ({ label: w.label, value: Math.round(w.ticketAvg) }));
  const cashSeries    = useMemo(() => {
    let base = kpis.grossRevenue * 0.45;
    return financeWeeks.map(w => {
      base += w.net * 0.35 - w.gross * 0.28;
      return { label: w.label, cash: Math.round(Math.max(5000, base)) };
    });
  }, [financeWeeks, kpis.grossRevenue]);

  // ── Computed KPIs ─────────────────────────────────────────────────────────
  const curMargin    = financeWeeks.length ? financeWeeks[financeWeeks.length - 1].marginPct : kpis.margin;
  const inadRate     = kpis.inadimplenciaRate;
  const fixedRatio   = kpis.fixedExpenseRatio;
  const ebitdaPct    = Math.max(0, curMargin * 0.9);   // proxy from margin
  const ebitdaAbs    = Math.round(kpis.netRevenue * (ebitdaPct / 100));
  const weeklyTarget = Math.round(THRESHOLDS.gross.target / Math.max(1, financeWeeks.length));
  const minCash      = kpis.grossRevenue * 0.15;

  // Break-even
  const contribMarginPct = Math.max(0.15, Math.min(0.8, (kpis.netRevenue - kpis.totalCost * 0.35) / Math.max(kpis.netRevenue, 1)));
  const bepRevenue       = kpis.fixedExpenses / contribMarginPct;
  const bepCoverage      = bepRevenue > 0 ? Math.min(150, (kpis.grossRevenue / bepRevenue) * 100) : 100;
  const bepCrossDay      = bepCoverage < 100
    ? Math.round(31 * (bepRevenue / Math.max(kpis.grossRevenue, 1)))
    : null;

  // Forecast stacked series
  const forecastSeries = useMemo(() => {
    const realized = financeWeeks.map(w => ({ label: w.label, realizado: w.gross, projetado: 0 }));
    const lastGross = financeWeeks.length ? financeWeeks[financeWeeks.length - 1].gross : kpis.grossRevenue;
    const projected = Math.round(lastGross * 1.08);
    realized.push({ label: 'Projeção', realizado: 0, projetado: projected });
    return realized;
  }, [financeWeeks, kpis.grossRevenue]);
  const forecastMeta = weeklyTarget;

  // ── Priority helpers ──────────────────────────────────────────────────────
  const marginColor  = curMargin  >= THRESHOLDS.margin.p1   ? C.green : curMargin  >= THRESHOLDS.margin.p3   ? C.amber : C.red;
  const ebitdaColor  = ebitdaPct  >= THRESHOLDS.ebitda.p1 ? C.green : ebitdaPct  >= THRESHOLDS.ebitda.p3 ? C.amber : C.red;
  const grossCov     = kpis.grossRevenue / THRESHOLDS.gross.target;
  const grossPrio: 'P1'|'P2'|'P3' = grossCov >= THRESHOLDS.gross.p1 ? 'P1' : grossCov >= THRESHOLDS.gross.p2 ? 'P2' : 'P3';
  const netPct       = kpis.grossRevenue > 0 ? kpis.netRevenue / kpis.grossRevenue : 0;
  const netPrio: 'P1'|'P2'|'P3'    = netPct >= THRESHOLDS.net.p1 ? 'P1' : netPct >= THRESHOLDS.net.p2 ? 'P2' : 'P3';
  const inadPrio: 'P1'|'P2'|'P3'   = inadRate < THRESHOLDS.inad.p1 ? 'P1' : inadRate < THRESHOLDS.inad.p3 ? 'P2' : 'P3';
  const expPrio: 'P1'|'P2'|'P3'    = fixedRatio < THRESHOLDS.expenses.p1 ? 'P1' : fixedRatio < THRESHOLDS.expenses.p3 ? 'P2' : 'P3';
  const marginPrio: 'P1'|'P2'|'P3' = curMargin >= THRESHOLDS.margin.p1 ? 'P1' : curMargin >= THRESHOLDS.margin.p3 ? 'P2' : 'P3';
  const ebitdaPrio: 'P1'|'P2'|'P3' = ebitdaPct >= THRESHOLDS.ebitda.p1 ? 'P1' : ebitdaPct >= THRESHOLDS.ebitda.p3 ? 'P2' : 'P3';
  // Ticket: trend-based — P1 estável/crescente | P2 queda < 10% | P3 queda ≥ 10%
  const ticketPrev   = financeWeeks.length >= 2 ? financeWeeks[financeWeeks.length - 2].ticketAvg : kpis.avgTicket;
  const ticketDrop   = ticketPrev > 0 ? ((ticketPrev - kpis.avgTicket) / ticketPrev) * 100 : 0;
  const ticketTrend  = ticketDrop <= 0 ? 'crescente' : ticketDrop < THRESHOLDS.ticket.dropP2 ? `queda ${ticketDrop.toFixed(1)}%` : `queda ${ticketDrop.toFixed(1)}% ⚠`;
  const ticketPrio: 'P1'|'P2'|'P3' = ticketDrop <= 0 ? 'P1' : ticketDrop < THRESHOLDS.ticket.dropP3 ? 'P2' : 'P3';
  // Cash: P1 positivo e saudável | P2 positivo mas abaixo do mínimo | P3 negativo
  const lastCashVal  = cashSeries[cashSeries.length - 1]?.cash ?? 0;
  const cashPrio: 'P1'|'P2'|'P3'   = lastCashVal >= minCash ? 'P1' : lastCashVal > 0 ? 'P2' : 'P3';
  // Forecast: P1 desvio ≤ 10% | P2 10-20% | P3 > 20%
  const forecastProj  = forecastSeries[forecastSeries.length - 1]?.projetado ?? 0;
  const forecastDev   = kpis.grossRevenue > 0 ? Math.abs((forecastProj - kpis.grossRevenue) / kpis.grossRevenue) * 100 : 0;
  const forecastPrio: 'P1'|'P2'|'P3' = forecastDev <= THRESHOLDS.forecast.p1 ? 'P1' : forecastDev <= THRESHOLDS.forecast.p2 ? 'P2' : 'P3';
  // Break-even: P1 coberto > 90% no dia 15 | P2 70-90% | P3 < 70%
  const bepPrio: 'P1'|'P2'|'P3'    = bepCoverage >= THRESHOLDS.bep.p1 ? 'P1' : bepCoverage >= THRESHOLDS.bep.p2 ? 'P2' : 'P3';

  return (
    <div className="chart-grid">

      {/* ── 1. FATURAMENTO BRUTO — Barra + linha de meta ─────────────────────── */}
      <ChartCard
        title="Faturamento Bruto Mensal"
        priority={grossPrio}
        kpiValue={fmtK(kpis.grossRevenue)}
        subtitle={`${Math.round(grossCov * 100)}% da meta mensal (${fmtK(THRESHOLDS.gross.target)})`}
        note={`P1 ≥ meta (${fmtK(weeklyTarget)}) | P2 80–99% da meta | P3 < 80%`}
      >
        {(() => {
          const p3Line = Math.round(weeklyTarget * THRESHOLDS.gross.p2);
          return (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={grossSeries} margin={{ top: 10, right: 40, left: 10, bottom: 0 }}>
                <CartesianGrid {...GR} />
                <XAxis dataKey="label" tick={TK} />
                <YAxis tick={TK} tickFormatter={fmtK} />
                <Tooltip {...TS} formatter={(v: any) => [fmtK(v), 'Faturamento']} />
                <Bar dataKey="gross" name="Faturamento" radius={[4, 4, 0, 0]} animationDuration={300}>
                  {grossSeries.map((d, i) => (
                    <Cell key={i} fill={d.gross >= weeklyTarget ? C.green : d.gross >= p3Line ? C.amber : C.red} />
                  ))}
                </Bar>
                <ReferenceLine y={weeklyTarget} stroke={C.green} strokeDasharray="5 3" strokeWidth={1.5}
                  label={{ value: `P1 ${fmtK(weeklyTarget)}`, position: 'insideTopRight', fill: C.green, fontSize: 10 }} />
                <ReferenceLine y={p3Line} stroke={C.red} strokeDasharray="4 3" strokeWidth={1.5}
                  label={{ value: `P3 ${fmtK(p3Line)}`, position: 'insideBottomRight', fill: C.red, fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          );
        })()}
      </ChartCard>

      {/* ── 2. RECEITA LÍQUIDA — Barra empilhada ──────────────────────────────── */}
      <ChartCard
        title="Receita Líquida"
        priority={netPrio}
        kpiValue={fmtK(kpis.netRevenue)}
        subtitle={`${fmtPct(netPct * 100)} do faturamento bruto · Deduções: ${fmtK(kpis.grossRevenue - kpis.netRevenue)}`}
        note="Verde = receita líquida (ficou) · Vermelho = deduções (foi embora)"
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={netSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid {...GR} />
            <XAxis dataKey="label" tick={TK} />
            <YAxis tick={TK} tickFormatter={fmtK} />
            <Tooltip {...TS} formatter={(v: any, n: any) => [fmtK(v), n === 'liquida' ? 'Receita Líquida' : 'Deduções']} />
            <Bar dataKey="liquida"  name="liquida"  stackId="s" fill={C.green} fillOpacity={0.85} animationDuration={300} />
            <Bar dataKey="deducoes" name="deducoes" stackId="s" fill={C.red}   fillOpacity={0.75} radius={[4, 4, 0, 0]} animationDuration={300} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── 3. MARGEM LÍQUIDA — Gauge ──────────────────────────────────────────── */}
      {(() => {
        const gaugeMax = 40;
        const gaugePct = Math.min(100, (curMargin / gaugeMax) * 100);
        return (
          <ChartCard
            title="Margem Líquida Total (%)"
            priority={marginPrio}
            subtitle="Lucro líquido ÷ Receita líquida × 100"
            note="Verde ≥ 20% | Amarelo 12–20% | Vermelho < 12%"
          >
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={[{ value: gaugePct }, { value: Math.max(0, 100 - gaugePct) }]}
                    startAngle={180} endAngle={0}
                    cx="50%" cy="100%"
                    innerRadius={70} outerRadius={110}
                    paddingAngle={0} dataKey="value" animationDuration={400}
                  >
                    <Cell fill={marginColor} />
                    <Cell fill="var(--chart-grid, #e5e7eb)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: marginColor, lineHeight: 1 }}>{curMargin.toFixed(1)}<span style={{ fontSize: 18 }}>%</span></div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>margem líquida</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px 0', fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ color: C.red   }}>P3 12%</span>
              <span style={{ color: C.amber }}>P2</span>
              <span style={{ color: C.green }}>P1 20%</span>
            </div>
          </ChartCard>
        );
      })()}

      {/* ── 4. TICKET MÉDIO — Linha temporal + meta ───────────────────────────── */}
      <ChartCard
        title="Ticket Médio"
        priority={ticketPrio}
        kpiValue={fmtK(kpis.avgTicket)}
        subtitle={`Tendência: ${ticketTrend} · Ticket atual: ${fmtK(kpis.avgTicket)} vs período anterior: ${fmtK(Math.round(ticketPrev))}`}
        note="P1 estável/crescente | P2 queda < 10% vs período ant. | P3 queda ≥ 10%"
      >
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={ticketSeries} margin={{ top: 10, right: 40, left: 10, bottom: 0 }}>
            <CartesianGrid {...GR} />
            <XAxis dataKey="label" tick={TK} />
            <YAxis tick={TK} tickFormatter={fmtK} />
            <Tooltip {...TS} formatter={(v: any) => [fmtK(v), 'Ticket Médio']} />
            <Line type="monotone" dataKey="value" stroke={C.amber} strokeWidth={2.5}
              dot={{ r: 3, fill: C.amber }} activeDot={{ r: 5 }} animationDuration={300} />
            <ReferenceLine y={Math.round(ticketPrev)} stroke={C.green} strokeDasharray="5 3" strokeWidth={1.5}
              label={{ value: `Período ant. ${fmtK(Math.round(ticketPrev))}`, position: 'insideTopRight', fill: C.green, fontSize: 10 }} />
            <ReferenceLine y={Math.round(ticketPrev * (1 - THRESHOLDS.ticket.dropP3 / 100))} stroke={C.red} strokeDasharray="4 3" strokeWidth={1}
              label={{ value: 'P3 −10%', position: 'insideBottomRight', fill: C.red, fontSize: 10 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── 5. INADIMPLÊNCIA — Bullet chart horizontal ────────────────────────── */}
      <ChartCard
        title="Inadimplência (%)"
        priority={inadPrio}
        kpiValue={fmtPct(inadRate)}
        subtitle="% do faturamento não recebido — quanto menor, melhor"
        note="Verde < 4% | Amarelo 4–8% | Vermelho > 8%"
      >
        <BulletBar
          value={inadRate} max={15}
          p1={THRESHOLDS.inad.p1} p3={THRESHOLDS.inad.p3}
          p1Label="P1 4%" p3Label="P3 8%"
          colorZones={['rgba(29,158,117,0.18)', 'rgba(239,159,39,0.18)', 'rgba(226,75,74,0.18)']}
        />
      </ChartCard>

      {/* ── 6. DESPESAS FIXAS / RECEITA — Bullet chart horizontal ───────────────── */}
      <ChartCard
        title="Despesas Fixas / Receita (%)"
        priority={expPrio}
        kpiValue={fmtPct(fixedRatio)}
        subtitle="% da receita comprometida antes de gerar lucro — quanto menor, melhor"
        note="Verde < 45% | Amarelo 45–60% | Vermelho > 60%"
      >
        <BulletBar
          value={fixedRatio} max={90}
          p1={THRESHOLDS.expenses.p1} p3={THRESHOLDS.expenses.p3}
          p1Label="P1 45%" p3Label="P3 60%"
          colorZones={['rgba(29,158,117,0.18)', 'rgba(239,159,39,0.18)', 'rgba(226,75,74,0.18)']}
        />
      </ChartCard>

      {/* ── 7. EBITDA — Gauge + R$ absoluto (PRO+) ────────────────────────────── */}
      {isPro && (() => {
        const gaugeMax = 40;
        const gaugePct = Math.min(100, (ebitdaPct / gaugeMax) * 100);
        return (
          <ChartCard
            title="DRE Gerencial: EBITDA %"
            priority={ebitdaPrio}
            subtitle="Eficiência operacional antes de juros, impostos, depreciação"
            note="Verde ≥ 20% | Amarelo 10–20% | Vermelho < 10%"
          >
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={[{ value: gaugePct }, { value: Math.max(0, 100 - gaugePct) }]}
                    startAngle={180} endAngle={0}
                    cx="50%" cy="100%"
                    innerRadius={70} outerRadius={110}
                    paddingAngle={0} dataKey="value" animationDuration={400}
                  >
                    <Cell fill={ebitdaColor} />
                    <Cell fill="var(--chart-grid, #e5e7eb)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: ebitdaColor, lineHeight: 1 }}>{ebitdaPct.toFixed(1)}<span style={{ fontSize: 13 }}>%</span></div>
                <div style={{ fontSize: 12, fontWeight: 600, color: ebitdaColor, marginTop: 3 }}>{fmtK(ebitdaAbs)}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>EBITDA absoluto</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px 0', fontSize: 11 }}>
              <span style={{ color: C.red   }}>P3 10%</span>
              <span style={{ color: C.amber }}>P2</span>
              <span style={{ color: C.green }}>P1 20%</span>
            </div>
          </ChartCard>
        );
      })()}

      {/* ── 8. FORECAST DE RECEITA — Barra 2 segmentos + meta (PRO+) ────────────── */}
      {isPro && (
        <ChartCard
          title="Forecast de Receita"
          priority={forecastPrio}
          subtitle={`Desvio projeção vs atual: ${forecastDev.toFixed(1)}% · P1 ≤ 10% | P2 10–20% | P3 > 20%`}
          note="P1 desvio ≤ 10% da meta | P2 10–20% | P3 > 20%  ·  Escuro = realizado · Claro = projetado"
        >
          {(() => {
            const p1Line = forecastMeta;
            const p2Line = Math.round(forecastMeta * (1 - THRESHOLDS.forecast.p1 / 100));
            const p3Line = Math.round(forecastMeta * (1 - THRESHOLDS.forecast.p2 / 100));
            return (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={forecastSeries} margin={{ top: 10, right: 40, left: 10, bottom: 0 }}>
                  <CartesianGrid {...GR} />
                  <XAxis dataKey="label" tick={TK} />
                  <YAxis tick={TK} tickFormatter={fmtK} />
                  <Tooltip {...TS} formatter={(v: any, n: any) => [fmtK(v), n === 'realizado' ? 'Realizado' : 'Projetado']} />
                  <Bar dataKey="realizado" name="realizado" stackId="s" fill={C.blue} fillOpacity={0.85} animationDuration={300} />
                  <Bar dataKey="projetado" name="projetado" stackId="s" fill={C.blue} fillOpacity={0.35} radius={[4, 4, 0, 0]} animationDuration={300} />
                  <ReferenceLine y={p1Line} stroke={C.green} strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: `P1 ${fmtK(p1Line)}`, position: 'insideTopRight', fill: C.green, fontSize: 10 }} />
                  <ReferenceLine y={p2Line} stroke={C.amber} strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: `P2 ${fmtK(p2Line)}`, position: 'insideTopRight', fill: C.amber, fontSize: 10 }} />
                  <ReferenceLine y={p3Line} stroke={C.red} strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: `P3 ${fmtK(p3Line)}`, position: 'insideBottomRight', fill: C.red, fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </ChartCard>
      )}

      {/* ── 9. POSIÇÃO DE CAIXA — Linha + área + zona de segurança (PRO+) ───────── */}
      {isPro && (() => {
        const lastCash = cashSeries[cashSeries.length - 1]?.cash ?? 0;
        const cashColor = lastCash >= minCash ? C.green : C.red;
        return (
          <ChartCard
            title="Posição de Caixa"
            priority={cashPrio}
            kpiValue={fmtK(lastCash)}
            subtitle="Saldo estimado por período · Área vermelha = abaixo do mínimo de segurança"
            note={`Mínimo de segurança: ${fmtK(minCash)} (15% do faturamento)`}
          >
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={cashSeries} margin={{ top: 10, right: 40, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashGradPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.green} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={C.green} stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="cashGradNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.red} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={C.red} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GR} />
                <XAxis dataKey="label" tick={TK} />
                <YAxis tick={TK} tickFormatter={fmtK} />
                <Tooltip {...TS} formatter={(v: any) => [fmtK(v), 'Caixa']} />
                {/* Safety zone shading */}
                <ReferenceLine y={minCash} stroke={C.amber} strokeDasharray="4 3" strokeWidth={1.5}
                  label={{ value: `Mín. ${fmtK(minCash)}`, position: 'insideTopRight', fill: C.amber, fontSize: 10 }} />
                <Line type="monotone" dataKey="cash" stroke={cashColor} strokeWidth={2.5}
                  dot={{ r: 3, fill: cashColor }} activeDot={{ r: 5 }} animationDuration={300} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        );
      })()}

      {/* ── 10. BREAK-EVEN — Barra de progresso + data estimada (PRO+) ─────────── */}
      {isPro && (() => {
        const bepColor = bepCoverage >= 120 ? C.green : bepCoverage >= 100 ? C.amber : C.red;
        const bepPct   = Math.min(100, bepCoverage);
        return (
          <ChartCard
            title="Break-even"
            priority={bepPrio}
            kpiValue={`${bepCoverage.toFixed(0)}%`}
            subtitle={bepCrossDay ? `Previsão de cruzar no dia ${bepCrossDay}` : 'Break-even atingido no período'}
            note={`Meta de receita: ${fmtK(bepRevenue)} · Atual: ${fmtK(kpis.grossRevenue)}`}
          >
            <div style={{ padding: '16px 4px 4px' }}>
              {/* Progress bar */}
              <div style={{ position: 'relative', height: 32, background: 'var(--chart-grid, #e5e7eb)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: `${bepPct}%`, height: '100%', background: bepColor, borderRadius: 10, transition: 'width 0.6s ease-out' }} />
                {/* 100% marker */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '66.7%', width: 2, background: C.green, opacity: 0.6 }} />
              </div>
              {/* Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>0%</span>
                <span style={{ color: C.green }}>Break-even 100%</span>
                <span>150%</span>
              </div>
              {/* Big coverage number */}
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: bepColor }}>{bepCoverage.toFixed(0)}%</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>coberto</span>
              </div>
              {bepCrossDay && (
                <div style={{ textAlign: 'center', marginTop: 4, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Previsão de cruzar o break-even no <strong style={{ color: bepColor }}>dia {bepCrossDay}</strong>
                </div>
              )}
              {/* Simulation values */}
              {showTargets && (
                <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'center' }}>
                  {[0.9, 1.0, 1.1].map((mult) => {
                    const simRev = Math.round(kpis.grossRevenue * mult);
                    const simCov = bepRevenue > 0 ? (simRev / bepRevenue) * 100 : 100;
                    const simColor = simCov >= 100 ? C.green : C.red;
                    return (
                      <div key={mult} style={{ textAlign: 'center', padding: '6px 10px', borderRadius: 8, background: 'var(--chart-grid, #f3f4f6)' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                          {mult < 1 ? '-10%' : mult > 1 ? '+10%' : 'Atual'}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: simColor }}>{simCov.toFixed(0)}%</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{fmtK(simRev)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ChartCard>
        );
      })()}

    </div>
  );
}
