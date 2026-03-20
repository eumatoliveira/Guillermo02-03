import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, PieChart, Pie, Cell,
} from 'recharts';
import type { Appointment, Filters } from '../../data/mockData';
import type { FinanceWeek, KPISummary } from '../../data/dashboardTypes';

const C = {
  red:    '#E24B4A', redFill:    'rgba(226,75,74,0.10)',
  amber:  '#EF9F27', amberFill:  'rgba(239,159,39,0.10)',
  green:  '#1D9E75', greenFill:  'rgba(29,158,117,0.10)',
  blue:   '#378ADD', blueFill:   'rgba(55,138,221,0.10)',
  purple: '#7F77DD',
  gray:   '#888780',
};

const TS = { contentStyle: { background: 'var(--tooltip-bg, #1f2937)', border: 'none', borderRadius: 8, fontSize: 12, color: 'var(--text-primary, #fff)' }, itemStyle: { color: 'var(--text-secondary, #9ca3af)' } };
const TK = { fill: 'var(--text-muted, #9ca3af)', fontSize: 10 };
const GR = { stroke: 'var(--chart-grid, #e5e7eb)', strokeOpacity: 0.5, strokeDasharray: '3 3' };

function fmtK(v: number) { return v >= 1000 ? `R$${(v/1000).toFixed(0)}k` : `R$${v.toFixed(0)}`; }
function fmtPct(v: number) { return `${v.toFixed(1)}%`; }

function PriorityBadge({ priority }: { priority: 'P1'|'P2'|'P3'|'OK' }) {
  const cls = priority === 'P3' ? 'red' : priority === 'P2' ? 'yellow' : 'green';
  const label = priority === 'P3' ? 'Crítico' : priority === 'P2' ? 'Alerta' : 'Bom';
  return <span className={`chart-card-badge ${cls}`}>{label}</span>;
}

interface CardProps {
  title: string;
  subtitle?: string;
  note?: string;
  priority?: 'P1'|'P2'|'P3'|'OK';
  fullWidth?: boolean;
  kpiValue?: string;
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

interface Props {
  financeWeeks: FinanceWeek[];
  filtered: Appointment[];
  kpis: KPISummary;
  filters: Filters;
  showTargets: boolean;
  plan?: 'ESSENTIAL' | 'PRO' | 'ENTERPRISE';
}

// ─── Thresholds configuráveis via setup da clínica ───────────────────────────
const THRESHOLDS = {
  gross:    { p2: 0.80, p1: 1.00, target: 120_000 }, // target = meta mensal em R$
  net:      { p1: 0.92, p3: 0.85 },                   // % do faturamento bruto
  margin:   { p1: 20,   p3: 12 },                     // %
  ticket:   { p2: 0.10 },                             // queda máx. P2 = <10%, P3 = ≥10%
  inad:     { p1: 4,    p3: 8 },                      // %
  expenses: { p1: 45,   p3: 60 },                     // % da receita
};
// ─────────────────────────────────────────────────────────────────────────────

export function FinanceiroModule({ financeWeeks, filtered, kpis, showTargets, plan = 'ESSENTIAL' }: Props) {
  const isPro = plan === 'PRO' || plan === 'ENTERPRISE';

  // ── Priority helpers (wired to THRESHOLDS) ─────────────────────────────────
  const grossPct = kpis.grossRevenue / THRESHOLDS.gross.target;
  const grossPriority: 'P1'|'P2'|'P3' =
    grossPct >= THRESHOLDS.gross.p1 ? 'P1' : grossPct >= THRESHOLDS.gross.p2 ? 'P2' : 'P3';

  const netPct = kpis.netRevenue / Math.max(1, kpis.grossRevenue);
  const netPriority: 'P1'|'P2'|'P3' =
    netPct >= THRESHOLDS.net.p1 ? 'P1' : netPct >= THRESHOLDS.net.p3 ? 'P2' : 'P3';

  // Ticket: compare last two finance weeks to detect trend
  const ticketPrev = financeWeeks.length >= 2 ? financeWeeks[financeWeeks.length - 2].ticketAvg : kpis.avgTicket;
  const ticketDrop = ticketPrev > 0 ? (ticketPrev - kpis.avgTicket) / ticketPrev : 0;
  const ticketPriority: 'P1'|'P2'|'P3' =
    ticketDrop < 0 ? 'P1'            // subiu → P1
    : ticketDrop < THRESHOLDS.ticket.p2 ? 'P2'  // queda < 10%
    : 'P3';                                      // queda ≥ 10%

  const expPriority: 'P1'|'P2'|'P3' =
    kpis.fixedExpenseRatio < THRESHOLDS.expenses.p1 ? 'P1'
    : kpis.fixedExpenseRatio < THRESHOLDS.expenses.p3 ? 'P2' : 'P3';

  const lastCash = financeWeeks.length ? (() => {
    let base = kpis.grossRevenue * 0.45;
    financeWeeks.forEach(w => { base += w.net * 0.35 - w.gross * 0.28; });
    return Math.max(5000, base);
  })() : 0;
  const cashPriority: 'P1'|'P3' = lastCash >= 0 ? 'P1' : 'P3';
  // ───────────────────────────────────────────────────────────────────────────

  const movAvg = useMemo(() => {
    const vals = financeWeeks.map(w => w.gross);
    return vals.map((_, i) => {
      const s = Math.max(0, i - 2);
      const slice = vals.slice(s, i + 1);
      return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
    });
  }, [financeWeeks]);
  const grossWithAvg = financeWeeks.map((w, i) => ({ label: w.label, gross: w.gross, avg: movAvg[i] }));

  // KPI 10 — Net revenue area
  const netSeries = financeWeeks.map(w => ({ label: w.label, net: w.net, gross: w.gross }));

  // KPI 11 — Margin over time
  const marginSeries = financeWeeks.map(w => ({ label: w.label, value: +w.marginPct.toFixed(1) }));

  // KPI 12 — Ticket médio by professional
  const byProf = useMemo(() => {
    const profs = Array.from(new Set(filtered.map(a => a.professional)));
    return profs.map(p => {
      const rows = filtered.filter(a => a.professional === p && a.status === 'Realizada');
      const avg = rows.length ? rows.reduce((s, r) => s + r.revenue, 0) / rows.length : 0;
      return { name: p.replace('Dr. ', 'Dr.').replace('Dra. ', 'Dra.'), ticket: Math.round(avg), mediaClinica: Math.round(kpis.avgTicket) };
    }).sort((a, b) => b.ticket - a.ticket);
  }, [filtered, kpis.avgTicket]);

  // KPI 13 — Inadimplência
  const inadSeries = financeWeeks.map(w => ({ label: w.label, value: +w.delinquencyPct.toFixed(1) }));


  // KPI 15 — Cash position
  let cashBase = kpis.grossRevenue * 0.45;
  const cashSeries = financeWeeks.map(w => {
    cashBase += w.net * 0.35 - w.gross * 0.28;
    return { label: w.label, cash: Math.round(Math.max(5000, cashBase)) };
  });

  // KPI 16 — DRE / EBITDA waterfall
  const gross = Math.round(kpis.grossRevenue);
  const deducoes = Math.round(gross * 0.10);
  const recLiq = gross - deducoes;
  const cmv = Math.round(recLiq * 0.30);
  const lucroBruto = recLiq - cmv;
  const despesas = Math.round(recLiq * 0.40);
  const ebitdaVal = lucroBruto - despesas;
  const dreData = [
    { name: 'Receita Bruta', value: gross, fill: C.green },
    { name: '(-) Deduções',  value: -deducoes, fill: C.red },
    { name: 'Receita Líq.',  value: recLiq, fill: C.blue },
    { name: '(-) CMV',       value: -cmv, fill: C.red },
    { name: 'Lucro Bruto',   value: lucroBruto, fill: C.green },
    { name: '(-) Despesas',  value: -despesas, fill: C.red },
    { name: 'EBITDA',        value: ebitdaVal, fill: C.blue },
  ];

  // KPI 17 — Forecast (historical + projection)
  const forecastSeries = useMemo(() => {
    const hist = financeWeeks.map(w => ({ label: w.label, hist: w.gross, proj: undefined as number|undefined, high: undefined as number|undefined, low: undefined as number|undefined }));
    const lastVal = financeWeeks.length ? financeWeeks[financeWeeks.length - 1].gross : 50000;
    const projLabels = ['P+5d', 'P+10d', 'P+15d'];
    const growth = 1.04;
    projLabels.forEach((lbl, i) => {
      const base = Math.round(lastVal * Math.pow(growth, i + 1));
      hist.push({ label: lbl, hist: undefined as any, proj: base, high: Math.round(base * 1.12), low: Math.round(base * 0.88) });
    });
    return hist;
  }, [financeWeeks]);

  // KPI 18 — Break-even
  const bepConsults = kpis.breakEven || Math.ceil(kpis.fixedExpenses / Math.max(1, kpis.avgTicket));
  const maxConsults = Math.max(bepConsults * 2, kpis.realized + 20);
  const breakEvenData = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const qty = Math.round((maxConsults / 11) * i);
    return {
      qty,
      revenue: Math.round(qty * kpis.avgTicket),
      cost: Math.round(kpis.fixedExpenses + qty * kpis.avgTicket * 0.35),
    };
  }), [bepConsults, maxConsults, kpis.fixedExpenses, kpis.avgTicket]);

  const curMargin = financeWeeks.length ? financeWeeks[financeWeeks.length - 1].marginPct : kpis.margin;
  // Business rules: Margem > 20%, Inadimplência < 4%, Despesas Fixas < 45%, DRE EBITDA > 25% (PRO)
  const marginPriority = (v: number): 'P1'|'P2'|'P3' => v < 12 ? 'P3' : v < 20 ? 'P2' : 'P1';
  const inadPriority = (v: number): 'P1'|'P2'|'P3' => v > 8 ? 'P3' : v > 4 ? 'P2' : 'P1';

  return (
    <div className="chart-grid">
      {/* KPI 9 — Faturamento Bruto (pure SVG) */}
      {(() => {
        const numP       = grossWithAvg.length || 1;
        const weeklyMeta = Math.round(THRESHOLDS.gross.target / numP);
        const weeklyP3   = Math.round(weeklyMeta * THRESHOLDS.gross.p2);
        const mtdPct     = Math.round((kpis.grossRevenue / THRESHOLDS.gross.target) * 100);

        // Trend direction: last mov-avg vs previous
        const lastAvg = movAvg[movAvg.length - 1] ?? 0;
        const prevAvg = movAvg[Math.max(0, movAvg.length - 2)] ?? lastAvg;
        const trendColor = lastAvg >= prevAvg ? C.green : C.red;

        // SVG layout
        const W = 500, H = 175;
        const PAD = { top: 22, right: 64, bottom: 28, left: 46 };
        const cW = W - PAD.left - PAD.right;
        const cH = H - PAD.top - PAD.bottom;
        const maxVal = Math.max(...grossWithAvg.map(d => d.gross), weeklyMeta) * 1.20;
        const bW = Math.max(18, (cW / numP) * 0.55);
        const px = (i: number) => PAD.left + (i + 0.5) * (cW / numP);
        const py = (v: number) => PAD.top + cH * (1 - v / maxVal);

        // Y-axis: 4 round ticks
        const step = Math.ceil(maxVal / 4 / 5000) * 5000;
        const yTicks = [0, 1, 2, 3, 4].map(n => n * step).filter(v => v <= maxVal * 1.02);

        // Trend path
        const trendPath = grossWithAvg
          .map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(d.avg).toFixed(1)}`)
          .join(' ');

        return (
          <ChartCard
            title="Faturamento Bruto"
            priority={grossPriority}
            kpiValue={fmtK(kpis.grossRevenue)}
            subtitle={`${fmtK(kpis.grossRevenue)} de ${fmtK(THRESHOLDS.gross.target)} meta (${mtdPct}%)`}
            note={`Barras = faturamento por período · Linha = média móvel 3p · Meta semanal = ${fmtK(weeklyMeta)}`}
          >
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display:'block', overflow:'visible' }}>
              {/* Subtle grid + Y labels */}
              {yTicks.map(v => (
                <g key={v}>
                  <line x1={PAD.left} y1={py(v)} x2={PAD.left + cW} y2={py(v)}
                    stroke="var(--chart-grid,#e5e7eb)" strokeWidth={0.5} strokeOpacity={0.6} />
                  <text x={PAD.left - 5} y={py(v) + 4} textAnchor="end" fontSize={9}
                    fill="var(--text-muted,#9ca3af)">{fmtK(v)}</text>
                </g>
              ))}

              {/* P3 dashed line (red) */}
              <line x1={PAD.left} y1={py(weeklyP3)} x2={PAD.left + cW} y2={py(weeklyP3)}
                stroke={C.red} strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.7} />
              <text x={PAD.left + cW + 5} y={py(weeklyP3) + 4} fontSize={9} fill={C.red}>P3</text>

              {/* P1 meta dashed line (green) */}
              <line x1={PAD.left} y1={py(weeklyMeta)} x2={PAD.left + cW} y2={py(weeklyMeta)}
                stroke={C.green} strokeWidth={1.5} strokeDasharray="5 3" strokeOpacity={0.85} />
              <text x={PAD.left + cW + 5} y={py(weeklyMeta) + 4} fontSize={9} fill={C.green}>
                P1 meta
              </text>

              {/* Bars */}
              {grossWithAvg.map((d, i) => {
                const isPartial = i === numP - 1;
                const barColor  = d.gross >= weeklyMeta ? C.blue : '#F97316';
                const barH      = Math.max(2, (d.gross / maxVal) * cH);
                const bx        = px(i) - bW / 2;
                const by        = py(d.gross);
                return (
                  <g key={i}>
                    <rect x={bx} y={by} width={bW} height={barH}
                      fill={barColor} fillOpacity={isPartial ? 0.42 : 0.88} rx={3} />
                    {isPartial && (
                      <text x={px(i)} y={by - 7} textAnchor="middle" fontSize={7.5}
                        fill={barColor} opacity={0.85} fontStyle="italic">em andamento</text>
                    )}
                  </g>
                );
              })}

              {/* Trend line */}
              <path d={trendPath} fill="none" stroke={trendColor} strokeWidth={2.5}
                strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
              {grossWithAvg.map((d, i) => (
                <circle key={i} cx={px(i)} cy={py(d.avg)} r={3}
                  fill={trendColor} stroke="var(--panel-bg,#fff)" strokeWidth={1.5} />
              ))}

              {/* X-axis labels */}
              {grossWithAvg.map((d, i) => (
                <text key={i} x={px(i)} y={H - 5} textAnchor="middle" fontSize={9}
                  fill="var(--text-muted,#9ca3af)">{d.label}</text>
              ))}
            </svg>
          </ChartCard>
        );
      })()}

      {/* KPI 10 — Receita Líquida (pure SVG) */}
      {(() => {
        const numP = netSeries.length || 1;
        const W = 500, H = 190;
        const PAD = { top: 22, right: 64, bottom: 28, left: 46 };
        const cW = W - PAD.left - PAD.right;
        const cH = H - PAD.top - PAD.bottom;

        // P1/P3 reference values (weekly equivalents based on cumulative gross avg)
        const weeklyGross = Math.round(kpis.grossRevenue / numP);
        const p1Line = Math.round(weeklyGross * THRESHOLDS.net.p1); // 92%
        const p3Line = Math.round(weeklyGross * THRESHOLDS.net.p3); // 85%

        const maxVal = Math.max(...netSeries.map(d => d.gross), p1Line) * 1.18;
        const px = (i: number) => PAD.left + (i + 0.5) * (cW / numP);
        const py = (v: number) => PAD.top + cH * (1 - v / maxVal);

        // Y-axis ticks
        const step = Math.ceil(maxVal / 4 / 5000) * 5000;
        const yTicks = [0, 1, 2, 3, 4].map(n => n * step).filter(v => v <= maxVal * 1.02);

        // Points for bruto (dashed blue) and liquida (solid green)
        const brutoPts: [number, number][] = netSeries.map((d, i) => [px(i), py(d.gross)]);
        const liqPts:   [number, number][] = netSeries.map((d, i) => [px(i), py(d.net)]);

        const brutoPolyline = brutoPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
        const liqPolyline   = liqPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

        // Red polygon: forward along bruto, backward along liquida
        const redPoly = [
          ...brutoPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`),
          ...[...liqPts].reverse().map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`),
        ].join(' ');

        // Green polygon: forward along liquida, close at bottom
        const baseline = py(0);
        const greenPoly = [
          ...liqPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`),
          `${(PAD.left + cW).toFixed(1)},${baseline.toFixed(1)}`,
          `${PAD.left.toFixed(1)},${baseline.toFixed(1)}`,
        ].join(' ');

        // Subtitle values
        const netPctOfGross = Math.round((kpis.netRevenue / Math.max(1, kpis.grossRevenue)) * 100);
        const deducaoTotal  = netSeries.reduce((s, d) => s + (d.gross - d.net), 0);

        // "perda" label: last data point gap midpoint
        const lastD     = netSeries[netSeries.length - 1];
        const lossLabelX = px(numP - 1);
        const lossLabelY = lastD ? (py(lastD.gross) + py(lastD.net)) / 2 : 0;

        return (
          <ChartCard
            title="Receita Líquida"
            priority={netPriority}
            kpiValue={fmtK(kpis.netRevenue)}
            subtitle={`${fmtK(kpis.netRevenue)} líquida · ${netPctOfGross}% do bruto · Dedução: ${fmtK(deducaoTotal)}`}
            note="Linha tracejada azul = faturamento bruto · Linha verde = receita líquida · Área vermelha = deduções"
          >
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
              {/* Y-axis grid + labels */}
              {yTicks.map(v => (
                <g key={v}>
                  <line x1={PAD.left} y1={py(v)} x2={PAD.left + cW} y2={py(v)}
                    stroke="var(--chart-grid,#e5e7eb)" strokeWidth={0.5} strokeOpacity={0.6} />
                  <text x={PAD.left - 5} y={py(v) + 4} textAnchor="end" fontSize={9}
                    fill="var(--text-muted,#9ca3af)">{fmtK(v)}</text>
                </g>
              ))}

              {/* P3 dashed line (red) */}
              <line x1={PAD.left} y1={py(p3Line)} x2={PAD.left + cW} y2={py(p3Line)}
                stroke={C.red} strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.7} />
              <text x={PAD.left + cW + 5} y={py(p3Line) + 4} fontSize={9} fill={C.red}>P3</text>

              {/* P1 meta dashed line (green) */}
              <line x1={PAD.left} y1={py(p1Line)} x2={PAD.left + cW} y2={py(p1Line)}
                stroke={C.green} strokeWidth={1.5} strokeDasharray="5 3" strokeOpacity={0.85} />
              <text x={PAD.left + cW + 5} y={py(p1Line) + 4} fontSize={9} fill={C.green}>P1</text>

              {/* Green filled area below líquida line */}
              <polygon points={greenPoly} fill={C.green} fillOpacity={0.10} />

              {/* Red deduction area between bruto and líquida */}
              <polygon points={redPoly} fill={C.red} fillOpacity={0.14} />

              {/* Bruto line (dashed blue) */}
              <polyline points={brutoPolyline} fill="none" stroke={C.blue}
                strokeWidth={1.5} strokeDasharray="5 3" opacity={0.85} />

              {/* Líquida line (solid green) */}
              <polyline points={liqPolyline} fill="none" stroke={C.green}
                strokeWidth={2.5} opacity={0.95} />

              {/* "perda R$Xk" floating label in the gap at last point */}
              {lastD && lastD.gross > lastD.net && (
                <text x={lossLabelX} y={lossLabelY + 4} textAnchor="middle" fontSize={9}
                  fill={C.red} fontWeight={600}>
                  perda {fmtK(lastD.gross - lastD.net)}
                </text>
              )}

              {/* Data dots: hollow for last (partial), filled for others */}
              {netSeries.map((d, i) => {
                const isLast = i === numP - 1;
                return (
                  <g key={i}>
                    <circle cx={px(i)} cy={py(d.gross)} r={isLast ? 4 : 2.5}
                      fill={isLast ? 'var(--panel-bg,#fff)' : C.blue}
                      stroke={C.blue} strokeWidth={isLast ? 2 : 0} opacity={0.85} />
                    <circle cx={px(i)} cy={py(d.net)} r={isLast ? 4 : 2.5}
                      fill={isLast ? 'var(--panel-bg,#fff)' : C.green}
                      stroke={C.green} strokeWidth={isLast ? 2 : 0} opacity={0.95} />
                    {isLast && (
                      <text x={px(i)} y={py(d.net) - 9} textAnchor="middle" fontSize={7.5}
                        fill={C.green} fontStyle="italic" opacity={0.85}>em andamento</text>
                    )}
                  </g>
                );
              })}

              {/* X-axis labels */}
              {netSeries.map((d, i) => (
                <text key={i} x={px(i)} y={H - 5} textAnchor="middle" fontSize={9}
                  fill="var(--text-muted,#9ca3af)">{d.label}</text>
              ))}
            </svg>
          </ChartCard>
        );
      })()}

      {/* KPI 11 — Margin */}
      <ChartCard title="Margem Líquida Total (%)" kpiValue={fmtPct(curMargin)} priority={marginPriority(curMargin)} subtitle="Lucro Líquido ÷ Receita Líquida. Meta > 20%." note="Verde = acima da meta. Vermelho = abaixo.">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={marginSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="mGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.green} stopOpacity={0.22} />
                <stop offset="100%" stopColor={C.green} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GR} />
            <XAxis dataKey="label" tick={TK} />
            <YAxis tick={TK} unit="%" />
            <Tooltip {...TS} formatter={(v: any) => [`${v}%`, 'Margem']} />
            <Area type="monotone" dataKey="value" stroke={C.green} strokeWidth={2} fill="url(#mGrad)" animationDuration={300} />
            <ReferenceLine y={THRESHOLDS.margin.p1} stroke={C.green} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `P1 ${THRESHOLDS.margin.p1}%`, fill: C.green, fontSize: 10 }} />
            <ReferenceLine y={THRESHOLDS.margin.p3} stroke={C.red}   strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `P3 ${THRESHOLDS.margin.p3}%`, fill: C.red,   fontSize: 10 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 12 — Ticket médio */}
      <ChartCard title="Ticket Médio por Profissional" priority={ticketPriority} kpiValue={fmtK(kpis.avgTicket)} subtitle="Receita média por consulta realizada, comparada à média da clínica" note="Barras laranja = ticket do profissional. Barras cinza = média geral da clínica.">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={byProf} layout="vertical" margin={{ top: 5, right: 40, left: 60, bottom: 0 }}>
            <CartesianGrid {...GR} />
            <XAxis type="number" tick={TK} tickFormatter={fmtK} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-primary)', fontSize: 11 }} width={60} />
            <Tooltip {...TS} formatter={(v: any, n: any) => [fmtK(v), n === 'ticket' ? 'Ticket do profissional' : 'Média da clínica']} />
            <Bar dataKey="ticket" name="ticket" fill={C.amber} radius={[0,4,4,0]} animationDuration={300} />
            <Bar dataKey="mediaClinica" name="mediaClinica" fill={C.gray} fillOpacity={0.4} radius={[0,4,4,0]} animationDuration={300} />
            <ReferenceLine x={kpis.avgTicket} stroke={C.green} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `P1 ${fmtK(kpis.avgTicket)}`, fill: C.green, fontSize: 10 }} />
            <ReferenceLine x={Math.round(kpis.avgTicket * (1 - THRESHOLDS.ticket.p2))} stroke={C.red} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `P3 ${fmtK(Math.round(kpis.avgTicket * (1 - THRESHOLDS.ticket.p2)))}`, fill: C.red, fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 13 — Inadimplência */}
      <ChartCard
        title="Inadimplência (%)"
        kpiValue={fmtPct(kpis.inadimplenciaRate)}
        priority={inadPriority(kpis.inadimplenciaRate)}
        subtitle="% do faturamento não recebido. Meta ≤ 4%."
        note="Verde ≤ 4%, Amarelo 4-8%, Vermelho > 8%. Quanto menor, melhor."
      >
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={inadSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="inadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.red} stopOpacity={0.22} />
                <stop offset="100%" stopColor={C.red} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GR} />
            <XAxis dataKey="label" tick={TK} />
            <YAxis tick={TK} unit="%" />
            <Tooltip {...TS} formatter={(v: any) => [`${v}%`, 'Inadimplência']} />
            <Area type="monotone" dataKey="value" stroke={C.red} strokeWidth={2} fill="url(#inadGrad)" animationDuration={300} />
            <ReferenceLine y={4} stroke={C.green} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'P1 4%', fill: C.green, fontSize: 10 }} />
            <ReferenceLine y={8} stroke={C.red}   strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'P3 8%', fill: C.red,   fontSize: 10 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 14 — Fixed expenses (doctor-friendly) */}
      {(() => {
        const ratio = kpis.fixedExpenseRatio;
        const ratioColor = ratio < 35 ? C.green : ratio < 45 ? C.amber : C.red;
        const totalFixed = kpis.fixedExpenses;
        const slices = [
          { name: 'Pessoal',       value: Math.round(totalFixed * 0.50), color: C.purple },
          { name: 'Aluguel',       value: Math.round(totalFixed * 0.20), color: C.blue   },
          { name: 'Equipamentos',  value: Math.round(totalFixed * 0.12), color: C.amber  },
          { name: 'Marketing',     value: Math.round(totalFixed * 0.10), color: C.green  },
          { name: 'Outros',        value: Math.round(totalFixed * 0.08), color: C.gray   },
        ];
        return (
          <ChartCard title="Despesas Fixas / Receita (%)" priority={expPriority} kpiValue={fmtPct(ratio)}>
            <div style={{ display:'flex', gap:24, alignItems:'center', height:200 }}>
              {/* Donut — onde o dinheiro vai */}
              <div style={{ flex:'0 0 180px', position:'relative' }}>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={slices} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                      dataKey="value" paddingAngle={2} animationDuration={400}>
                      {slices.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip {...TS} formatter={(v: any, name: any) => [fmtK(v as number), name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)', lineHeight:1 }}>{fmtK(totalFixed)}</div>
                  <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:2 }}>custos fixos</div>
                </div>
              </div>
              {/* Right panel */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, justifyContent:'center' }}>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>Comprometimento da receita</span>
                    <span style={{ fontSize:13, fontWeight:700, color:ratioColor }}>{fmtPct(ratio)}</span>
                  </div>
                  <div style={{ height:12, background:'var(--chart-grid,#e5e7eb)', borderRadius:6, overflow:'hidden', position:'relative' }}>
                    <div style={{ width:`${Math.min(ratio, 100)}%`, height:'100%', background:ratioColor, borderRadius:6, transition:'width 0.4s ease' }} />
                    <div style={{ position:'absolute', top:0, left:'45%', width:2, height:'100%', background:C.gray, opacity:0.7 }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>0%</span>
                    <span style={{ fontSize:10, color:C.gray }}>Meta: 45%</span>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>100%</span>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {slices.map(d => (
                    <div key={d.name} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:d.color, flexShrink:0 }} />
                      <span style={{ fontSize:11, color:'var(--text-primary)', flex:1 }}>{d.name}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:'var(--text-primary)' }}>{fmtK(d.value)}</span>
                      <span style={{ fontSize:10, color:'var(--text-muted)', width:32, textAlign:'right' }}>{Math.round((d.value/totalFixed)*100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ChartCard>
        );
      })()}

      {/* KPI 15 — Cash position */}
      <ChartCard title="Posição de Caixa" priority={cashPriority} kpiValue={fmtK(cashSeries.length ? cashSeries[cashSeries.length-1].cash : 0)} note="Área verde = caixa positivo. Linha zero = ponto de alerta.">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={cashSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.green} stopOpacity={0.22} />
                <stop offset="100%" stopColor={C.green} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GR} />
            <XAxis dataKey="label" tick={TK} />
            <YAxis tick={TK} tickFormatter={fmtK} />
            <Tooltip {...TS} formatter={(v: any) => [fmtK(v), 'Caixa']} />
            <Area type="monotone" dataKey="cash" stroke={C.green} strokeWidth={2} fill="url(#cashGrad)" animationDuration={300} />
            <ReferenceLine y={0} stroke={C.gray} strokeWidth={1} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 16 — DRE waterfall (PRO+, full width) */}
      {isPro && <ChartCard title="DRE Gerencial — EBITDA" kpiValue={`${((ebitdaVal/recLiq)*100).toFixed(1)}%`}
        priority={((ebitdaVal/recLiq)*100) >= 25 ? 'OK' : ((ebitdaVal/recLiq)*100) >= 20 ? 'P3' : 'P2'}
        subtitle="Cascata da demonstração de resultado gerencial." fullWidth note="Verde = entradas, Vermelho = saídas. Meta EBITDA > 25%.">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dreData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid {...GR} />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
            <YAxis tick={TK} tickFormatter={fmtK} />
            <Tooltip {...TS} formatter={(v: any) => [fmtK(Math.abs(v)), '']} />
            <Bar dataKey="value" animationDuration={300} radius={[4,4,0,0]} label={{ position: 'top', formatter: (v: any) => fmtK(Math.abs(v)), fill: 'var(--text-muted)', fontSize: 10 }}>
              {dreData.map((entry, i) => <rect key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>}

      {isPro && <ChartCard title="Forecast de Receita" subtitle="Histórico e projeção para os próximos 3 períodos." fullWidth note="Linha sólida = histórico. Linha tracejada = projeção. Área = intervalo de confiança ±12%.">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={forecastSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.blue} stopOpacity={0.12} />
                <stop offset="100%" stopColor={C.blue} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GR} />
            <XAxis dataKey="label" tick={TK} />
            <YAxis tick={TK} tickFormatter={fmtK} />
            <Tooltip {...TS} formatter={(v: any, n: any) => [fmtK(v), n === 'hist' ? 'Histórico' : n === 'proj' ? 'Projetado' : n]} />
            <Area type="monotone" dataKey="high" stroke="none" fill="url(#foreGrad)" animationDuration={300} connectNulls />
            <Area type="monotone" dataKey="low" stroke="none" fill="var(--panel-bg)" animationDuration={300} connectNulls />
            <Line type="monotone" dataKey="hist" stroke={C.blue} strokeWidth={2} dot={{ r: 3 }} connectNulls animationDuration={300} />
            <Line type="monotone" dataKey="proj" stroke={C.blue} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} connectNulls animationDuration={300} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>}

      {/* KPI 18 — Break-even (PRO+) */}
      {isPro && <ChartCard title="Ponto de Break-even" subtitle="Consultas necessárias para cobrir todos os custos fixos." note={`BEP: ${bepConsults} consultas/mês · Atual: ${kpis.realized} · Margem de segurança: ${kpis.realized > bepConsults ? ((kpis.realized - bepConsults) / bepConsults * 100).toFixed(1) : '0.0'}%`}
        kpiValue={`${bepConsults} consult.`} priority={kpis.realized >= bepConsults ? 'OK' : 'P2'} fullWidth>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={breakEvenData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="bepProfitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.green} stopOpacity={0.10} />
                <stop offset="100%" stopColor={C.green} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="bepLossGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.red} stopOpacity={0.08} />
                <stop offset="100%" stopColor={C.red} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GR} />
            <XAxis dataKey="qty" tick={TK} label={{ value: 'Consultas/mês', position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 10, offset: -5 }} />
            <YAxis tick={TK} tickFormatter={fmtK} />
            <Tooltip {...TS} formatter={(v: any, n: any) => [fmtK(v), n === 'revenue' ? 'Receita' : 'Custo Total']} />
            <Line type="monotone" dataKey="revenue" stroke={C.green} strokeWidth={2} dot={false} animationDuration={300} />
            <Line type="monotone" dataKey="cost" stroke={C.red} strokeWidth={2} dot={false} animationDuration={300} />
            {showTargets && <ReferenceLine x={bepConsults} stroke={C.gray} strokeDasharray="4 4" label={{ value: `BEP ${bepConsults}`, fill: C.gray, fontSize: 10 }} />}
            {showTargets && <ReferenceLine x={kpis.realized} stroke={C.green} strokeDasharray="4 4" label={{ value: `Atual ${kpis.realized}`, fill: C.green, fontSize: 10 }} />}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>}
    </div>
  );
}
