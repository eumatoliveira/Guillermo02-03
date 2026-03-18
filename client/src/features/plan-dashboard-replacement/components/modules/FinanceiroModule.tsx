import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell,
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

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); }
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

export function FinanceiroModule({ financeWeeks, filtered, kpis, showTargets, plan = 'ESSENTIAL' }: Props) {
  const isPro = plan === 'PRO' || plan === 'ENTERPRISE';
  const grossSeries = financeWeeks.map(w => ({ label: w.label, value: w.gross }));
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
      return { name: p.replace('Dr. ', 'Dr.').replace('Dra. ', 'Dra.'), ticket: Math.round(avg), benchmark: Math.round(kpis.avgTicket * 1.12) };
    }).sort((a, b) => b.ticket - a.ticket);
  }, [filtered, kpis.avgTicket]);

  // KPI 13 — Inadimplência
  const inadSeries = financeWeeks.map(w => ({ label: w.label, value: +w.delinquencyPct.toFixed(1) }));

  // KPI 14 — Fixed expenses stacked
  const expCategories = ['Pessoal', 'Aluguel', 'Equipamentos', 'Marketing', 'Outros'];
  const expColors = [C.purple, C.blue, C.amber, C.green, C.gray];
  const expSeries = useMemo(() => financeWeeks.map(w => {
    const total = w.gross * (w.fixedPct / 100);
    return {
      label: w.label,
      Pessoal: Math.round(total * 0.50),
      Aluguel: Math.round(total * 0.20),
      Equipamentos: Math.round(total * 0.12),
      Marketing: Math.round(total * 0.10),
      Outros: Math.round(total * 0.08),
      receita: Math.round(w.gross),
    };
  }), [financeWeeks]);

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
      {/* KPI 9 — Gross revenue */}
      <ChartCard title="09 Faturamento Bruto" kpiValue={fmtK(kpis.grossRevenue)} subtitle="Total faturado no período. Verde = dentro da meta." note="Barras = faturamento por período. Linha roxa = média móvel (3 períodos).">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={grossWithAvg} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid {...GR} />
            <XAxis dataKey="label" tick={TK} />
            <YAxis tick={TK} tickFormatter={fmtK} />
            <Tooltip {...TS} formatter={(v: any, n: any) => [fmtK(v), n === 'gross' ? 'Faturamento' : 'Média móvel']} />
            <Bar dataKey="gross" name="gross" fill={C.blue} radius={[4,4,0,0]} animationDuration={300} />
            <Line type="monotone" dataKey="avg" name="avg" stroke={C.purple} strokeWidth={2} dot={false} animationDuration={300} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 10 — Net revenue */}
      <ChartCard title="10 Receita Líquida" kpiValue={fmtK(kpis.netRevenue)} subtitle="Receita bruta menos deduções, cancelamentos e inadimplência." note="Área verde = receita líquida. Linha tracejada = faturamento bruto (referência).">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={netSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.green} stopOpacity={0.25} />
                <stop offset="100%" stopColor={C.green} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GR} />
            <XAxis dataKey="label" tick={TK} />
            <YAxis tick={TK} tickFormatter={fmtK} />
            <Tooltip {...TS} formatter={(v: any, n: any) => [fmtK(v), n === 'net' ? 'Líquida' : 'Bruta']} />
            <Area type="monotone" dataKey="net" name="net" stroke={C.green} strokeWidth={2} fill="url(#netGrad)" animationDuration={300} />
            {showTargets && <Line type="monotone" dataKey="gross" name="gross" stroke={C.blue} strokeWidth={1} strokeDasharray="3 3" dot={false} animationDuration={300} />}
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 11 — Margin */}
      <ChartCard title="11 Margem Líquida Total (%)" kpiValue={fmtPct(curMargin)} priority={marginPriority(curMargin)} subtitle="EBITDA ÷ Receita líquida. Meta > 20%." note="Verde = acima da meta. Vermelho = abaixo.">
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
            {showTargets && <ReferenceLine y={20} stroke={C.gray} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Meta 20%', fill: C.gray, fontSize: 10 }} />}
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 12 — Ticket médio */}
      <ChartCard title="12 Ticket Médio por Profissional" kpiValue={fmtK(kpis.avgTicket)} subtitle="Receita média por consulta realizada." note="Barras laranja = seu ticket. Barras cinza = benchmark do mercado.">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byProf} layout="vertical" margin={{ top: 5, right: 40, left: 60, bottom: 0 }}>
            <CartesianGrid {...GR} />
            <XAxis type="number" tick={TK} tickFormatter={fmtK} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-primary)', fontSize: 11 }} width={60} />
            <Tooltip {...TS} formatter={(v: any, n: any) => [fmtK(v), n === 'ticket' ? 'Seu ticket' : 'Benchmark']} />
            <Bar dataKey="ticket" name="ticket" fill={C.amber} radius={[0,4,4,0]} animationDuration={300} />
            <Bar dataKey="benchmark" name="benchmark" fill={C.gray} fillOpacity={0.4} radius={[0,4,4,0]} animationDuration={300} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 13 — Inadimplência */}
      <ChartCard
        title="13 Inadimplência (%)"
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
            {showTargets && <ReferenceLine y={4} stroke={C.gray} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Meta 4%', fill: C.gray, fontSize: 10 }} />}
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
          <ChartCard title="14 Despesas Fixas / Receita (%)" kpiValue={fmtPct(ratio)}
            subtitle="De cada R$100 que você recebe, quanto vai para custos fixos? Meta: menos de R$45.">
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
                {/* Ratio bar */}
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>Comprometimento da receita</span>
                    <span style={{ fontSize:13, fontWeight:700, color:ratioColor }}>{fmtPct(ratio)}</span>
                  </div>
                  <div style={{ height:12, background:'var(--chart-grid,#e5e7eb)', borderRadius:6, overflow:'hidden', position:'relative' }}>
                    <div style={{ width:`${Math.min(ratio, 100)}%`, height:'100%', background:ratioColor, borderRadius:6, transition:'width 0.4s ease' }} />
                    {/* Meta marker at 45% */}
                    <div style={{ position:'absolute', top:0, left:'45%', width:2, height:'100%', background:C.gray, opacity:0.7 }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>0%</span>
                    <span style={{ fontSize:10, color:C.gray }}>Meta: 45%</span>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>100%</span>
                  </div>
                </div>
                {/* Category list */}
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
      <ChartCard title="15 Posição de Caixa" kpiValue={fmtK(cashSeries.length ? cashSeries[cashSeries.length-1].cash : 0)} subtitle="Histórico e projeção da posição de caixa da clínica." note="Área verde = caixa positivo. Linha zero = ponto de alerta.">
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
      {isPro && <ChartCard title="16 DRE Gerencial — EBITDA" kpiValue={`${((ebitdaVal/recLiq)*100).toFixed(1)}%`}
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

      {isPro && <ChartCard title="17 Forecast de Receita" subtitle="Histórico e projeção para os próximos 3 períodos." fullWidth note="Linha sólida = histórico. Linha tracejada = projeção. Área = intervalo de confiança ±12%.">
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
      {isPro && <ChartCard title="18 Ponto de Break-even" subtitle="Consultas necessárias para cobrir todos os custos fixos." note={`BEP: ${bepConsults} consultas/mês · Atual: ${kpis.realized} · Margem de segurança: ${kpis.realized > bepConsults ? ((kpis.realized - bepConsults) / bepConsults * 100).toFixed(1) : '0.0'}%`}
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
