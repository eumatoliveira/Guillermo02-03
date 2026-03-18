import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend, PieChart, Pie,
} from 'recharts';
import type { Appointment, Filters } from '../../data/mockData';
import type { WeekBucket, KPISummary } from '../../data/dashboardTypes';

const C = {
  red:    '#E24B4A', redFill:    'rgba(226,75,74,0.10)',
  amber:  '#EF9F27', amberFill:  'rgba(239,159,39,0.10)',
  green:  '#1D9E75', greenFill:  'rgba(29,158,117,0.10)',
  blue:   '#378ADD', blueFill:   'rgba(55,138,221,0.10)',
  purple: '#7F77DD',
  gray:   '#888780',
  channels: {
    Instagram: '#E24B4A', Google: '#378ADD', Indicacao: '#EF9F27',
    Organico:  '#1D9E75', Telefone: '#7F77DD', Presencial: '#888780',
  } as Record<string,string>,
};

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--tooltip-bg, #1f2937)',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--text-primary, #fff)',
  },
  itemStyle: { color: 'var(--text-secondary, #9ca3af)' },
};

const TICK_STYLE = { fill: 'var(--text-muted, #9ca3af)', fontSize: 10 };
const GRID_STYLE = { stroke: 'var(--chart-grid, #e5e7eb)', strokeOpacity: 0.5, strokeDasharray: '3 3' };

interface BadgeProps { priority: 'P1' | 'P2' | 'P3' | 'OK' }
function PriorityBadge({ priority }: BadgeProps) {
  const cls = priority === 'P3' ? 'red' : priority === 'P2' ? 'yellow' : 'green';
  const label = priority === 'P3' ? 'Crítico' : priority === 'P2' ? 'Alerta' : 'Bom';
  return <span className={`chart-card-badge ${cls}`}>{label}</span>;
}

interface CardProps {
  title: string;
  subtitle?: string;
  note?: string;
  priority?: 'P1' | 'P2' | 'P3' | 'OK';
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
            {kpiValue && (
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginLeft: 4 }}>
                {kpiValue}
              </span>
            )}
          </div>
          {subtitle && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div className="chart-card-body">
        {children}
        {note && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>{note}</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  agendaWeeks: WeekBucket[];
  filtered: Appointment[];
  kpis: KPISummary;
  filters: Filters;
  showTargets: boolean;
  plan?: 'ESSENTIAL' | 'PRO' | 'ENTERPRISE';
}

export function AgendaNoShowModule({ agendaWeeks, filtered, kpis, showTargets, plan = 'ESSENTIAL' }: Props) {
  const isPro = plan === 'PRO' || plan === 'ENTERPRISE';
  const labels = agendaWeeks.map(w => w.label);

  // KPI 1 — No-show rate series
  const noShowSeries = useMemo(
    () => agendaWeeks.map(w => ({ label: w.label, value: +w.noShowRate.toFixed(1) })),
    [agendaWeeks],
  );

  // KPI 2 — Occupancy slots view
  const occupancyCurrent = agendaWeeks.length ? agendaWeeks[agendaWeeks.length - 1].occupancyRate : kpis.occupancyRate;
  const slotsSeries = useMemo(
    () => agendaWeeks.map(w => ({
      label: w.label,
      Realizadas: w.realized,
      'No-Show': w.noShows,
      Canceladas: w.canceled,
    })),
    [agendaWeeks],
  );
  const weeklyCapacityAvg = agendaWeeks.length
    ? Math.round(agendaWeeks.reduce((s, w) => s + w.weeklyTarget, 0) / agendaWeeks.length)
    : 50;

  // KPI 3 — Confirmation stacked
  const confirmSeries = useMemo(
    () => agendaWeeks.map(w => ({
      label: w.label,
      confirmed: +w.confirmationRate.toFixed(1),
      notConfirmed: +(100 - w.confirmationRate).toFixed(1),
    })),
    [agendaWeeks],
  );

  // KPI 4 — Consultations vs target
  const consultSeries = useMemo(
    () => agendaWeeks.map(w => ({ label: w.label, realized: w.realized, target: w.weeklyTarget })),
    [agendaWeeks],
  );
  const weeklyTargetAvg = agendaWeeks.length ? Math.round(agendaWeeks.reduce((s, w) => s + w.weeklyTarget, 0) / agendaWeeks.length) : 50;

  // KPI 5 — No-show cost (full width)
  const avgTicket = kpis.avgTicket || 190;
  let accumulated = 0;
  const noShowCostSeries = useMemo(
    () => agendaWeeks.map(w => {
      const monthlyCost = Math.round(w.noShows * avgTicket);
      accumulated += monthlyCost;
      return { label: w.label, monthlyCost, accumulated };
    }),
    [agendaWeeks, avgTicket],
  );

  // KPI 6 — Lost capacity rate
  const lostCapSeries = agendaWeeks.map(w => ({
    label: w.label,
    value: +w.noShowRate.toFixed(1), // proxy for capacity loss
  }));

  // KPI 7 — Lead time histogram
  const leadTimeBuckets = useMemo(() => {
    const buckets = [
      { range: '0–2d', count: 0 },
      { range: '3–5d', count: 0 },
      { range: '6–8d', count: 0 },
      { range: '9–12d', count: 0 },
      { range: '13–17d', count: 0 },
      { range: '18–22d', count: 0 },
    ];
    filtered.forEach(a => {
      if (!a.confirmedAt) return;
      const days = Math.abs(
        (new Date(a.scheduledAt).getTime() - new Date(a.firstContactAt).getTime()) / 86_400_000,
      );
      if (days <= 2) buckets[0].count++;
      else if (days <= 5) buckets[1].count++;
      else if (days <= 8) buckets[2].count++;
      else if (days <= 12) buckets[3].count++;
      else if (days <= 17) buckets[4].count++;
      else buckets[5].count++;
    });
    const max = Math.max(...buckets.map(b => b.count), 1);
    return buckets.map(b => ({ ...b, opacity: 0.3 + (b.count / max) * 0.7 }));
  }, [filtered]);

  // KPI 8 — Appointments by channel (full width)
  const channelNames = Object.keys(C.channels);
  const channelSeries = useMemo(() => {
    return agendaWeeks.map(w => {
      const weekRows = filtered.filter(a => {
        const d = new Date(a.date);
        const ws = new Date(d);
        ws.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return ws.toISOString().slice(0, 10) === w.weekKey;
      });
      const entry: Record<string, number | string> = { label: w.label };
      channelNames.forEach(ch => {
        entry[ch] = weekRows.filter(r => {
          if (ch === 'Organico') return ['Organico', 'Facebook'].includes(r.channel);
          if (ch === 'Telefone') return ['Telefone', 'Whatsapp', 'WhatsApp'].includes(r.channel);
          if (ch === 'Presencial') return ['Presencial', 'OUTROS', 'Outros'].includes(r.channel);
          return r.channel === ch;
        }).length;
      });
      return entry;
    });
  }, [agendaWeeks, filtered]);

  // Priority helpers
  // Business rules: No-show < 8%, Ocupação > 80%, Confirmações > 85%
  // P3 = Crítico (vermelho), P2 = Alerta (amarelo), P1 = Bom (verde)
  const noShowPriority = (v: number) => v > 12 ? 'P3' : v > 8 ? 'P2' : 'P1';
  const occPriority = (v: number) => v < 65 ? 'P3' : v < 80 ? 'P2' : 'P1';
  const confPriority = (v: number) => v < 72 ? 'P3' : v < 85 ? 'P2' : 'P1';

  const curNoShow = agendaWeeks.length ? agendaWeeks[agendaWeeks.length - 1].noShowRate : kpis.noShowRate;
  const curConf = agendaWeeks.length ? agendaWeeks[agendaWeeks.length - 1].confirmationRate : kpis.confirmationRate;

  return (
    <div className="chart-grid">
      {/* KPI 1 — No-show Rate */}
      <ChartCard
        title="01 Taxa de No-show (%)"
        subtitle="Faltas ÷ Agendamentos. Verde < 8%, Amarelo 8-12%, Vermelho > 12%"
        priority={noShowPriority(curNoShow) as any}
        kpiValue={`${curNoShow.toFixed(1)}%`}
        note="Linha vermelha = meta 8%. Abaixo = saudável."
      >
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={noShowSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="nsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.red} stopOpacity={0.25} />
                <stop offset="100%" stopColor={C.red} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="label" tick={TICK_STYLE} />
            <YAxis tick={TICK_STYLE} unit="%" domain={[0, 30]} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'No-show']} />
            <Area type="monotone" dataKey="value" stroke={C.red} strokeWidth={2} fill="url(#nsGrad)" dot={{ r: 3, fill: C.red }} animationDuration={300} />
            {showTargets && <ReferenceLine y={8} stroke={C.gray} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Meta 8%', fill: C.gray, fontSize: 10 }} />}
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 2 — Taxa de Ocupação (semicircle gauge + sparkline) */}
      {(() => {
        const occ = occupancyCurrent;
        const occColor = occ >= 80 ? C.green : occ >= 60 ? C.amber : C.red;
        const gaugeData = [
          { value: Math.min(occ, 100), fill: occColor },
          { value: Math.max(0, 100 - occ), fill: 'var(--chart-grid, #e5e7eb)' },
        ];
        const occSparkline = agendaWeeks.map(w => ({ label: w.label, value: +w.occupancyRate.toFixed(1) }));
        return (
          <ChartCard
            title="02 Taxa de Ocupação"
            subtitle="Quantas vagas foram preenchidas? Meta: acima de 80%."
            priority={occPriority(occupancyCurrent) as any}
            kpiValue={`${occ.toFixed(1)}%`}
          >
            {/* KPI number + barra de progresso */}
            <div style={{ padding:'12px 0 16px' }}>
              <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginBottom:12 }}>
                <span style={{ fontSize:48, fontWeight:800, color:occColor, lineHeight:1 }}>{occ.toFixed(1)}<span style={{ fontSize:28 }}>%</span></span>
                <span style={{ fontSize:13, color:'var(--text-muted)', paddingBottom:6 }}>da agenda ocupada</span>
              </div>
              {/* Barra de progresso com marcador de meta */}
              <div style={{ position:'relative', height:18, background:'var(--chart-grid,#e5e7eb)', borderRadius:9, overflow:'visible' }}>
                <div style={{ width:`${Math.min(occ,100)}%`, height:'100%', background:occColor, borderRadius:9, transition:'width 0.5s ease' }} />
                {/* Marcador de meta 80% */}
                <div style={{ position:'absolute', top:-4, left:'80%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <div style={{ width:2, height:26, background:C.gray, borderRadius:1 }} />
                  <span style={{ fontSize:10, color:C.gray, whiteSpace:'nowrap' }}>meta 80%</span>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:20, fontSize:11, color:'var(--text-muted)' }}>
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
            {/* Sparkline tendência */}
            <ResponsiveContainer width="100%" height={65}>
              <AreaChart data={occSparkline} margin={{ top:4, right:8, left:-10, bottom:0 }}>
                <defs>
                  <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={occColor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={occColor} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={TICK_STYLE} />
                <YAxis tick={TICK_STYLE} unit="%" domain={[50, 100]} tickCount={3} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'Ocupação']} />
                <ReferenceLine y={80} stroke={C.gray} strokeDasharray="3 3" />
                <Area type="monotone" dataKey="value" stroke={occColor} strokeWidth={2}
                  fill="url(#occGrad)" dot={false} animationDuration={300} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        );
      })()}

      {/* KPI 3 — Confirmation stacked */}
      <ChartCard
        title="03 Taxa de Confirmações Realizadas (%)"
        subtitle="% de agendamentos que confirmaram presença"
        priority={confPriority(curConf) as any}
        kpiValue={`${curConf.toFixed(1)}%`}
        note="Verde ≥ 85%, Amarelo 80-85%, Vermelho < 80%"
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={confirmSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="label" tick={TICK_STYLE} />
            <YAxis tick={TICK_STYLE} unit="%" domain={[0, 100]} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="confirmed" name="Confirmados" stackId="s" fill={C.green} radius={[0, 0, 0, 0]} animationDuration={300} />
            <Bar dataKey="notConfirmed" name="Não confirmados" stackId="s" fill="#F0997B" radius={[4, 4, 0, 0]} animationDuration={300} />
            {showTargets && <ReferenceLine y={85} stroke={C.gray} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Meta 85%', fill: C.gray, fontSize: 10 }} />}
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 4 — Consultations vs target */}
      <ChartCard
        title="04 Consultas Realizadas vs Meta"
        subtitle="Volume de consultas por período vs meta semanal"
        kpiValue={`${kpis.realized}`}
        note="Barras = realizadas. Linha tracejada = meta semanal."
      >
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={consultSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="label" tick={TICK_STYLE} />
            <YAxis tick={TICK_STYLE} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="realized" name="Realizadas" fill={C.blue} radius={[4, 4, 0, 0]} animationDuration={300} />
            <ReferenceLine y={weeklyTargetAvg} stroke={C.gray} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: `Meta ${weeklyTargetAvg}`, position: 'insideTopRight', fill: C.gray, fontSize: 10 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 5 — No-show cost (PRO+) */}
      {isPro && <ChartCard
        title="05 Custo Estimado do No-show (R$)"
        subtitle="Custo mensal e acumulado de consultas perdidas"
        fullWidth
        note="Barras = custo por período. Linha laranja = acumulado total."
      >
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={noShowCostSeries} margin={{ top: 10, right: 40, left: 10, bottom: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="label" tick={TICK_STYLE} />
            <YAxis yAxisId="left" tick={TICK_STYLE} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={TICK_STYLE} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: any, name: any) => [
              `R$ ${(v as number).toLocaleString('pt-BR')}`, name === 'monthlyCost' ? 'Custo no período' : 'Acumulado'
            ]} />
            <Bar yAxisId="left" dataKey="monthlyCost" name="monthlyCost" fill={C.red} fillOpacity={0.7} radius={[4, 4, 0, 0]} animationDuration={300} />
            <Line yAxisId="right" type="monotone" dataKey="accumulated" name="accumulated" stroke="#BA7517" strokeWidth={2} dot={{ r: 3 }} animationDuration={300} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>}

      {/* KPI 6 — Capacity loss (PRO+) */}
      {isPro && <ChartCard
        title="06 Taxa de Perda de Capacidade não Recuperável (%)"
        subtitle="No-shows + cancelamentos tardios ÷ total de slots"
        note="Limite crítico = 8% (PRO). Acima disso há impacto financeiro relevante."
      >
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={lostCapSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="lcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.red} stopOpacity={0.22} />
                <stop offset="100%" stopColor={C.red} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="label" tick={TICK_STYLE} />
            <YAxis tick={TICK_STYLE} unit="%" domain={[0, 25]} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'Perda']} />
            <Area type="monotone" dataKey="value" stroke={C.red} strokeWidth={2} fill="url(#lcGrad)" animationDuration={300} />
            {showTargets && <ReferenceLine y={8} stroke={C.gray} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Limite 8%', fill: C.gray, fontSize: 10 }} />}
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>}

      {/* KPI 7 — Lead time histogram */}
      <ChartCard
        title="07 Lead Time do Agendamento (dias)"
        subtitle="Distribuição de frequência por faixa de antecedência"
        kpiValue={`${kpis.leadTimeDays.toFixed(1)}d`}
        note={`Mediana estimada: ${kpis.leadTimeDays.toFixed(1)} dias. Faixas > 13 dias indicam risco maior de no-show.`}
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={leadTimeBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="range" tick={TICK_STYLE} />
            <YAxis tick={TICK_STYLE} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [v, 'Agendamentos']} />
            <Bar dataKey="count" name="Agendamentos" animationDuration={300} radius={[4, 4, 0, 0]}>
              {leadTimeBuckets.map((entry, i) => (
                <Cell key={i} fill={C.purple} fillOpacity={entry.opacity} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 8 — Appointments by channel: donut + ranked bars */}
      {(() => {
        const totals = channelNames.map(ch => ({
          name: ch,
          value: channelSeries.reduce((s, w) => s + ((w as any)[ch] as number || 0), 0),
          color: C.channels[ch],
        })).sort((a, b) => b.value - a.value);
        const total = totals.reduce((s, d) => s + d.value, 0) || 1;
        return (
          <ChartCard
            title="08 Agendamentos por Canal de Aquisição"
            subtitle="De onde vieram seus pacientes no período selecionado."
            fullWidth
          >
            <div style={{ display:'flex', gap:32, alignItems:'center', height:200 }}>
              {/* Donut */}
              <div style={{ flex:'0 0 200px', position:'relative' }}>
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={totals} cx="50%" cy="50%" innerRadius={60} outerRadius={88}
                      dataKey="value" paddingAngle={2} animationDuration={400}>
                      {totals.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: any, name: any) => [`${v} agend. (${Math.round((v/total)*100)}%)`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
                  <div style={{ fontSize:26, fontWeight:700, color:'var(--text-primary)', lineHeight:1 }}>{total}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>agend.</div>
                </div>
              </div>
              {/* Ranked bars */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:9, justifyContent:'center' }}>
                {totals.map(d => {
                  const pct = Math.round((d.value / total) * 100);
                  return (
                    <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0 }} />
                      <div style={{ fontSize:12, color:'var(--text-primary)', width:82, flexShrink:0 }}>{d.name}</div>
                      <div style={{ flex:1, height:8, background:'var(--chart-grid,#e5e7eb)', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:d.color, borderRadius:4, transition:'width 0.4s ease' }} />
                      </div>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', width:28, textAlign:'right' }}>{d.value}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', width:32, textAlign:'right' }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartCard>
        );
      })()}
    </div>
  );
}
