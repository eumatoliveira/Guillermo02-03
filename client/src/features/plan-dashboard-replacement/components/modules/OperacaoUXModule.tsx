import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, ScatterChart, Scatter, ZAxis, Cell, PieChart, Pie,
} from 'recharts';
import type { Appointment, Filters } from '../../data/mockData';
import type { KPISummary } from '../../data/dashboardTypes';

const C = {
  red:    '#E24B4A',
  amber:  '#EF9F27',
  green:  '#1D9E75',
  blue:   '#378ADD',
  purple: '#7F77DD',
  gray:   '#888780',
};

const TS = { contentStyle:{ background:'var(--tooltip-bg,#1f2937)', border:'none', borderRadius:8, fontSize:12, color:'var(--text-primary,#fff)' }, itemStyle:{ color:'var(--text-secondary,#9ca3af)' } };
const TK = { fill:'var(--text-muted,#9ca3af)', fontSize:10 };
const GR = { stroke:'var(--chart-grid,#e5e7eb)', strokeOpacity:0.5, strokeDasharray:'3 3' };

function fmtK(v: number) { return v >= 1000 ? `R$${(v/1000).toFixed(1)}k` : `R$${v.toFixed(0)}`; }
function fmtPct(v: number) { return `${v.toFixed(1)}%`; }

function PriorityBadge({ priority }: { priority: 'P1'|'P2'|'P3'|'OK' }) {
  const cls = priority === 'P3' ? 'red' : priority === 'P2' ? 'yellow' : 'green';
  const label = priority === 'P3' ? 'Crítico' : priority === 'P2' ? 'Alerta' : 'Bom';
  return <span className={`chart-card-badge ${cls}`}>{label}</span>;
}

interface CardProps {
  title: string; subtitle?: string; note?: string;
  priority?: 'P1'|'P2'|'P3'|'OK'; fullWidth?: boolean; kpiValue?: string;
  children: React.ReactNode;
}
function ChartCard({ title, subtitle, note, priority, fullWidth, kpiValue, children }: CardProps) {
  return (
    <div className="chart-card" style={fullWidth ? { gridColumn:'1/-1' } : {}}>
      <div className="chart-card-header">
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span className="chart-card-title">{title}</span>
            {priority && <PriorityBadge priority={priority} />}
            {kpiValue && <span style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', marginLeft:4 }}>{kpiValue}</span>}
          </div>
          {subtitle && <span style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, display:'block' }}>{subtitle}</span>}
        </div>
      </div>
      <div className="chart-card-body">
        {children}
        {note && <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:8, lineHeight:1.5 }}>{note}</p>}
      </div>
    </div>
  );
}

interface WeekBucketLight { label: string; weekKey?: string; return90d?: number; return180d?: number; }

interface Props {
  opsWeeks: WeekBucketLight[];
  filtered: Appointment[];
  kpis: KPISummary;
  byProf: Array<{ name: string; avgNPS: number; avgWait: number; margin: number; realized: number; grossRevenue: number }>;
  filters: Filters;
  showTargets: boolean;
  plan?: 'ESSENTIAL' | 'PRO' | 'ENTERPRISE';
}

const PROCEDURES = ['Consulta Padrão', 'Retorno', 'Avaliação Inicial', 'Proc. Cirúrgico', 'Exame'];
const PROCEDURE_MARGIN = [32, 24, 45, 52, 38];
const PROCEDURE_TICKET = [180, 120, 250, 1200, 320];

export function OperacaoUXModule({ opsWeeks, filtered, kpis, byProf, showTargets, plan = 'ESSENTIAL' }: Props) {
  const isPro = plan === 'PRO' || plan === 'ENTERPRISE';

  // KPI 26 — NPS donut (Promotores / Neutros / Detratores)
  const npsValue = kpis.avgNPS;
  const npsScores = filtered.map(a => (a as any).nps as number | null).filter((n): n is number => n !== null);
  const npsPromoters  = npsScores.filter(n => n >= 9).length;
  const npsNeutrals   = npsScores.filter(n => n >= 7 && n < 9).length;
  const npsDetractors = npsScores.filter(n => n < 7).length;
  const npsTotal = npsPromoters + npsNeutrals + npsDetractors || 1;
  const npsDonutData = [
    { name: 'Promotores', value: npsPromoters,  color: C.green },
    { name: 'Neutros',    value: npsNeutrals,   color: C.amber },
    { name: 'Detratores', value: npsDetractors, color: C.red   },
  ];
  const npsTrend = opsWeeks.map((w, i) => ({ label: w.label, nps: +(npsValue + (i - opsWeeks.length/2) * 0.1).toFixed(1) }));

  // KPI 27 — NPS by professional
  const npsByProf = useMemo(() =>
    byProf.map(p => ({
      name: p.name.replace('Dr. ','Dr.').replace('Dra. ','Dra.'),
      nps: +p.avgNPS.toFixed(1),
    })).sort((a,b) => b.nps - a.nps),
    [byProf],
  );

  // KPI 28 — Wait time
  const waitSeries = opsWeeks.map((w, i) => ({ label: w.label, value: +(kpis.avgWait + Math.sin(i) * 2).toFixed(1) }));

  // KPI 29 — Return rate + by channel
  const returnSeries = opsWeeks.map(w => ({
    label: w.label,
    r90: w.return90d ?? +(kpis.returnRate * 0.85),
    r180: w.return180d ?? +(kpis.returnRate),
  }));
  const returnByChannel = [
    { name: 'Indicacao', rate: 65 }, { name: 'Presencial', rate: 52 },
    { name: 'Google', rate: 41 },   { name: 'Organico', rate: 38 },
    { name: 'Telefone', rate: 35 }, { name: 'Instagram', rate: 28 },
  ];

  // KPI 30 — SLA response distribution
  const slaBuckets = [
    { range: '<15min', pct: 38, fill: C.green },
    { range: '15-30min', pct: 25, fill: C.green, fillOpacity: 0.7 },
    { range: '30-60min', pct: 15, fill: C.amber },
    { range: '1-2h',    pct: 12, fill: C.red },
    { range: '2-4h',    pct: 7,  fill: C.red },
    { range: '>4h',     pct: 3,  fill: C.red },
  ];
  const slaHours = kpis.slaLeadHours || 1.5;
  const slaOutOfTarget = slaBuckets.slice(3).reduce((s, b) => s + b.pct, 0);

  // KPI 31 — Margin by procedure (full width)
  const marginByProc = PROCEDURES.map((name, i) => ({
    name,
    margin: PROCEDURE_MARGIN[i],
    absolute: Math.round(PROCEDURE_TICKET[i] * PROCEDURE_MARGIN[i] / 100),
    fill: PROCEDURE_MARGIN[i] >= 40 ? C.green : PROCEDURE_MARGIN[i] >= 30 ? C.amber : C.red,
  })).sort((a,b) => b.margin - a.margin);

  // KPI 32 — Margin by doctor + scatter
  const marginByDoc = byProf.map(p => ({
    name: p.name.replace('Dr. ','Dr.').replace('Dra. ','Dra.'),
    margin: +p.margin.toFixed(1),
    volume: p.realized,
    revenue: p.grossRevenue,
    fill: p.margin >= 0 ? C.green : C.red,
  })).sort((a,b) => b.margin - a.margin);

  // OPS table
  const opsTableRows = [
    { id:'01', kpi:'Overall NPS (0-10)', value:`${npsValue.toFixed(1)}`, target:'> 8,5', baseN:'Avaliações', priority: npsValue >= 8.5 ? 'OK' : npsValue >= 7.5 ? 'P2' : 'P1' as const, action:'Coleta automática WhatsApp pós-consulta' },
    { id:'02', kpi:'Tempo Médio de Wait (min)', value:`${kpis.avgWait.toFixed(0)} min`, target:'< 12 min', baseN:`${kpis.realized}`, priority: kpis.avgWait <= 12 ? 'OK' : kpis.avgWait <= 20 ? 'P2' : 'P1' as const, action:'Rebalancear agenda / encaixes' },
    { id:'03', kpi:'Taxa de Retorno 90d (%)', value:`${kpis.returnRate.toFixed(1)}%`, target:'> 40%', baseN:`${kpis.realized}`, priority: kpis.returnRate >= 40 ? 'OK' : kpis.returnRate >= 25 ? 'P2' : 'P1' as const, action:'Cohort 180d e rotina de recall' },
    { id:'04', kpi:'SLA de Resposta ao Lead (h)', value:`${slaHours.toFixed(2)}h`, target:'< 1h', baseN:`${kpis.leads}`, priority: slaHours <= 1 ? 'OK' : slaHours <= 2 ? 'P2' : 'P1' as const, action:'SLA por recepção / responsável' },
  ];

  const npsPriority = (v: number): 'P1'|'P2'|'P3'|'OK' => v < 7 ? 'P3' : v < 8.5 ? 'P2' : 'P1';
  const waitPriority = (v: number): 'P1'|'P2'|'P3'|'OK' => v > 25 ? 'P3' : v > 12 ? 'P2' : 'P1';
  const returnPriority = (v: number): 'P1'|'P2'|'P3'|'OK' => v < 25 ? 'P3' : v < 40 ? 'P2' : 'P1';

  return (
    <div className="chart-grid">
      {/* KPI 26 — NPS donut */}
      <ChartCard title="26 NPS Geral (0–10)" kpiValue={npsValue.toFixed(1)} priority={npsPriority(npsValue)}
        subtitle="Satisfação geral dos pacientes. Meta > 8,5.">
        <div style={{ display:'flex', gap:20, alignItems:'center', height:180 }}>
          {/* Donut */}
          <div style={{ flex:'0 0 180px', position:'relative' }}>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={npsDonutData} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                  dataKey="value" paddingAngle={2} animationDuration={400}>
                  {npsDonutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip {...TS} formatter={(v: any, name: any) => [`${v} pacientes (${Math.round((v/npsTotal)*100)}%)`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
              <div style={{ fontSize:28, fontWeight:700, color: npsValue >= 8.5 ? C.green : npsValue >= 7 ? C.amber : C.red, lineHeight:1 }}>{npsValue.toFixed(1)}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>NPS</div>
            </div>
          </div>
          {/* Legend list */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12, justifyContent:'center' }}>
            {npsDonutData.map(d => {
              const pct = Math.round((d.value / npsTotal) * 100);
              return (
                <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0 }} />
                  <div style={{ fontSize:12, color:'var(--text-primary)', flex:1 }}>{d.name}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:d.color }}>{d.value}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', width:36, textAlign:'right' }}>{pct}%</div>
                </div>
              );
            })}
            <div style={{ borderTop:'1px solid var(--chart-grid,#e5e7eb)', paddingTop:8, fontSize:11, color:'var(--text-muted)' }}>
              {npsTotal} avaliações · Promotores ≥9 · Neutros 7-8 · Detratores &lt;7
            </div>
          </div>
        </div>
      </ChartCard>

      {/* KPI 27 — NPS by professional (PRO+) */}
      {isPro && <ChartCard title="27 NPS por Profissional" subtitle="Avaliação média de satisfação por médico. Meta > 8,0."
        note="Verde ≥ 9. Amarelo 8-9. Vermelho < 8 → requer atenção.">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={npsByProf} layout="vertical" margin={{ top:5, right:50, left:60, bottom:0 }}>
            <CartesianGrid {...GR} />
            <XAxis type="number" tick={TK} domain={[0,10]} />
            <YAxis type="category" dataKey="name" tick={{ fill:'var(--text-primary)', fontSize:11 }} width={60} />
            <Tooltip {...TS} formatter={(v: any) => [(v as number).toFixed(1), 'NPS']} />
            {showTargets && <ReferenceLine x={8} stroke={C.gray} strokeDasharray="4 4" label={{ value:'Meta 8,0 (PRO)', fill:C.gray, fontSize:10 }} />}
            <Bar dataKey="nps" animationDuration={300} radius={[0,4,4,0]}
              label={{ position:'right', formatter:(v:any)=>(v as number).toFixed(1), fill:'var(--text-muted)', fontSize:11 }}>
              {npsByProf.map((entry, i) => <Cell key={i} fill={entry.nps >= 9 ? C.green : entry.nps >= 8 ? C.amber : C.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>}

      {/* KPI 28 — Wait time */}
      <ChartCard title="28 Tempo Médio de Espera (min)" kpiValue={`${kpis.avgWait.toFixed(0)} min`}
        priority={waitPriority(kpis.avgWait)}
        subtitle="Tempo médio que o paciente aguarda para ser atendido. Meta < 12 min."
        note="Verde < 12 min (ótimo). Amarelo 12-20 min (warning). Vermelho > 20 min (crítico).">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={waitSeries} margin={{ top:10, right:10, left:-20, bottom:0 }}>
            <defs>
              <linearGradient id="waitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.amber} stopOpacity={0.22} />
                <stop offset="100%" stopColor={C.amber} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GR} />
            <XAxis dataKey="label" tick={TK} />
            <YAxis tick={TK} unit=" min" />
            <Tooltip {...TS} formatter={(v: any) => [`${v} min`, 'Espera']} />
            <Area type="monotone" dataKey="value" stroke={C.amber} strokeWidth={2} fill="url(#waitGrad)" animationDuration={300} />
            {showTargets && <ReferenceLine y={12} stroke={C.gray} strokeDasharray="4 4" label={{ value:'Meta 12 min', fill:C.gray, fontSize:10 }} />}
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 29 — Return rate */}
      <ChartCard title="29 Taxa de Retorno / Fidelização (%)" kpiValue={fmtPct(kpis.returnRate)}
        priority={returnPriority(kpis.returnRate)}
        subtitle="% de pacientes que voltaram em até 90 dias. Meta > 40%.">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={returnSeries} margin={{ top:10, right:10, left:-20, bottom:0 }}>
            <defs>
              <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.green} stopOpacity={0.28} />
                <stop offset="100%" stopColor={C.green} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GR} />
            <XAxis dataKey="label" tick={TK} />
            <YAxis tick={TK} unit="%" domain={[0, 80]} />
            <Tooltip {...TS} formatter={(v: any) => [`${(v as number).toFixed(1)}%`, 'Retorno 90d']} />
            <ReferenceLine y={40} stroke={C.gray} strokeDasharray="4 4" label={{ value:'Meta 40%', position:'insideTopRight', fill:C.gray, fontSize:10 }} />
            <Area type="monotone" dataKey="r90" stroke={C.green} strokeWidth={2} fill="url(#retGrad)" dot={false} animationDuration={300} />
          </AreaChart>
        </ResponsiveContainer>
        {/* Channel breakdown pills */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
          {returnByChannel.map(d => (
            <div key={d.name} style={{ display:'flex', alignItems:'center', gap:4, background:'var(--panel-bg,#f9fafb)', borderRadius:6, padding:'3px 8px', fontSize:11 }}>
              <span style={{ color:'var(--text-muted)' }}>{d.name}</span>
              <span style={{ fontWeight:700, color: d.rate >= 40 ? C.green : d.rate >= 25 ? C.amber : C.red }}>{d.rate}%</span>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* KPI 30 — SLA response */}
      <ChartCard title="30 SLA de Resposta ao Lead"
        kpiValue={`${slaHours.toFixed(1)}h`}
        priority={slaHours <= 1 ? 'OK' : slaHours <= 2 ? 'P2' : 'P1'}
        subtitle="Tempo que a recepção leva para responder ao primeiro contato. Meta < 1h."
        note={`Mediana: ${(slaHours * 0.7).toFixed(0)} min · Fora do SLA: ${slaOutOfTarget}%`}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={slaBuckets} margin={{ top:10, right:10, left:-10, bottom:0 }}>
            <CartesianGrid {...GR} />
            <XAxis dataKey="range" tick={TK} />
            <YAxis tick={TK} unit="%" />
            <Tooltip {...TS} formatter={(v: any) => [`${v}%`, 'Leads respondidos']} />
            {showTargets && <ReferenceLine x="30-60min" stroke={C.gray} strokeDasharray="4 4" label={{ value:'SLA 1h', fill:C.gray, fontSize:10 }} />}
            <Bar dataKey="pct" name="pct" animationDuration={300} radius={[4,4,0,0]}>
              {slaBuckets.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={entry.fillOpacity ?? 1} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 31 — Margin by procedure (PRO+, full width) */}
      {isPro && <ChartCard title="31 Margem por Procedimento (%)" fullWidth
        subtitle="% de margem líquida por tipo de procedimento. Meta > 30%."
        note="Verde ≥ 40% · Amarelo 30-39% · Vermelho < 30%">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={marginByProc} layout="vertical" margin={{ top:5, right:80, left:100, bottom:0 }}>
            <CartesianGrid {...GR} />
            <XAxis type="number" tick={TK} unit="%" domain={[0,70]} />
            <YAxis type="category" dataKey="name" tick={{ fill:'var(--text-primary)', fontSize:11 }} width={100} />
            <Tooltip {...TS} formatter={(v: any, n: any, props: any) => [
              n === 'margin' ? `${v}% · R$${props.payload.absolute}/proc` : fmtK(v as number), n === 'margin' ? 'Margem' : 'Valor',
            ]} />
            {showTargets && <ReferenceLine x={30} stroke={C.gray} strokeDasharray="4 4" label={{ value:'Meta 30%', fill:C.gray, fontSize:10 }} />}
            <Bar dataKey="margin" animationDuration={300} radius={[0,4,4,0]}
              label={{ position:'right', formatter:(v:any)=>`${v}%`, fill:'var(--text-muted)', fontSize:11 }}>
              {marginByProc.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>}

      {/* KPI 32 — Margin by doctor + scatter (PRO+) */}
      {isPro && <ChartCard title="32 Margem por Médico (%)" fullWidth
        subtitle="Contribuição de margem e volume por profissional."
        note="Barras = margem %. Gráfico de dispersão = volume × margem (tamanho = receita total).">
        <div style={{ display:'flex', gap:20, height:220 }}>
          <div style={{ flex:'0 0 55%' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={marginByDoc} layout="vertical" margin={{ top:5, right:50, left:65, bottom:0 }}>
                <CartesianGrid {...GR} />
                <XAxis type="number" tick={TK} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fill:'var(--text-primary)', fontSize:11 }} width={65} />
                <Tooltip {...TS} formatter={(v: any, n: any, props: any) => [`${(v as number).toFixed(1)}% · R$${(props.payload.revenue/1000).toFixed(0)}k`, 'Margem']} />
                {showTargets && <ReferenceLine x={0} stroke={C.gray} strokeWidth={1} />}
                <Bar dataKey="margin" animationDuration={300} radius={[0,4,4,0]}
                  label={{ position:'right', formatter:(v:any)=>`${(v as number).toFixed(1)}%`, fill:'var(--text-muted)', fontSize:10 }}>
                  {marginByDoc.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex:1 }}>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top:10, right:10, left:10, bottom:20 }}>
                <CartesianGrid {...GR} />
                <XAxis dataKey="volume" name="Consultas" tick={TK} label={{ value:'Consultas', position:'insideBottom', fill:'var(--text-muted)', fontSize:10, offset:-10 }} />
                <YAxis dataKey="margin" name="Margem %" tick={TK} unit="%" />
                <ZAxis dataKey="revenue" range={[40, 300]} />
                <Tooltip {...TS} content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0]?.payload;
                  if (!d) return null;
                  return (
                    <div style={{ ...TS.contentStyle, padding:'8px 12px' }}>
                      <div style={{ fontWeight:600, marginBottom:4 }}>{d.name}</div>
                      <div>{d.volume} consultas</div>
                      <div>Margem: {d.margin.toFixed(1)}%</div>
                      <div>Receita: {fmtK(d.revenue)}</div>
                    </div>
                  );
                }} />
                <Scatter data={marginByDoc} animationDuration={300}>
                  {marginByDoc.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.8} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartCard>}

      {/* Operations Summary Table */}
      <div className="chart-card" style={{ gridColumn:'1/-1' }}>
        <div className="chart-card-header">
          <span className="chart-card-title">Tabela Operação & UX (P1/P2)</span>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>Alertas e ações imediatas</span>
        </div>
        <div className="chart-card-body">
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border-card)' }}>
                  {['ID','KPI','Valor','Target','Base N','Status','Ação recomendada'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'var(--text-muted)', fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {opsTableRows.map(row => {
                  const badgeCls = row.priority === 'P1' ? 'red' : row.priority === 'P2' ? 'yellow' : 'green';
                  return (
                    <tr key={row.id} style={{ borderBottom:'1px solid var(--border-card)', transition:'background 150ms' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-bg-soft)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding:'10px 12px', color:'var(--text-muted)', fontSize:12 }}>{row.id}</td>
                      <td style={{ padding:'10px 12px', color:'var(--text-primary)', fontWeight:500 }}>{row.kpi}</td>
                      <td style={{ padding:'10px 12px', color:'var(--text-primary)', fontWeight:700 }}>{row.value}</td>
                      <td style={{ padding:'10px 12px', color:'var(--text-muted)' }}>{row.target}</td>
                      <td style={{ padding:'10px 12px', color:'var(--text-muted)' }}>{row.baseN}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <span className={`chart-card-badge ${badgeCls}`}>{row.priority}</span>
                      </td>
                      <td style={{ padding:'10px 12px', color:'var(--text-secondary)', fontSize:12 }}>{row.action}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
