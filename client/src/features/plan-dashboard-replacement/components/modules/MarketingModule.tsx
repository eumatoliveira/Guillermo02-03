import { useMemo } from 'react';
import {
  BarChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, PieChart, Pie, ScatterChart, Scatter, ZAxis, Cell, Legend,
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
  channels: {
    Instagram: '#E24B4A',
    Google:    '#378ADD',
    'Indicação': '#EF9F27',
    Facebook:  '#1D9E75',
    Whatsapp:  '#7F77DD',
    Outros:    '#888780',
  } as Record<string,string>,
};

const TS = { contentStyle: { background:'var(--tooltip-bg,#1f2937)', border:'none', borderRadius:8, fontSize:12, color:'var(--text-primary,#fff)' }, itemStyle:{ color:'var(--text-secondary,#9ca3af)' } };
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

interface WeeklyBucketLight { label: string; [key: string]: unknown; }

interface Props {
  weeklyData: WeeklyBucketLight[];
  filtered: Appointment[];
  kpis: KPISummary;
  filters: Filters;
  showTargets: boolean;
  plan?: 'ESSENTIAL' | 'PRO' | 'ENTERPRISE';
}

const CHANNELS = ['Whatsapp', 'Facebook', 'Indicação', 'Google', 'Instagram', 'Outros'];
// raw appointment channel → display name
const CHANNEL_MAP: Record<string,string> = {
  Telefone:'Whatsapp', WhatsApp:'Whatsapp', Whatsapp:'Whatsapp',
  Organico:'Facebook', Facebook:'Facebook',
  Presencial:'Outros', OUTROS:'Outros', Outros:'Outros',
  Indicacao:'Indicação', 'Indicação':'Indicação',
  Google:'Google', Instagram:'Instagram',
};
const CHANNEL_CPL: Record<string,number> = { Whatsapp: 18, Facebook: 15, 'Indicação': 8, Google: 25, Instagram: 32, Outros: 12 };
const CHANNEL_CAC: Record<string,number> = { Whatsapp: 78, Facebook: 55, 'Indicação': 45, Google: 145, Instagram: 195, Outros: 65 };
const CHANNEL_LTV: Record<string,number> = { Whatsapp: 720, Facebook: 640, 'Indicação': 840, Google: 580, Instagram: 420, Outros: 780 };
const CHANNEL_ROI: Record<string,number> = { Whatsapp: 485, Facebook: 390, 'Indicação': 620, Google: 248, Instagram: 142, Outros: 520 };

// ─── Thresholds configuráveis via setup da clínica ───────────────────────────
const THRESHOLDS = {
  leads: { dropP2: 0.20 },      // P1 = estável/crescendo | P2 = queda <20% | P3 = queda ≥20%
  cpl:   { riseP2: 0.20 },      // P1 = estável/caindo   | P2 = aumento <20% | P3 = aumento ≥20%
  conv:  { p1: 35, p2: 20 },    // P1 ≥35% | P2 20–35% | P3 <20%
  roi:   { p1: 200, p2: 100 },  // P1 ≥200% | P2 100–200% | P3 <100%
};
// ─────────────────────────────────────────────────────────────────────────────

export function MarketingModule({ weeklyData, filtered, kpis, showTargets, plan = 'ESSENTIAL' }: Props) {
  const isPro = plan === 'PRO' || plan === 'ENTERPRISE';

  // KPI 19 — Leads by channel per period (full width)
  // "Leads" = todos os agendamentos do canal (ponto de entrada do funil)
  const leadsPerPeriod = useMemo(() => {
    return weeklyData.map(w => {
      const wKey = (w as any).weekKey as string | undefined;
      const weekLeads = filtered.filter(a => {
        const d = new Date(a.date);
        const ws = new Date(d);
        ws.setDate(d.getDate() - ((d.getDay()+6)%7));
        const appointmentWeekKey = ws.toISOString().slice(0,10);
        if (wKey) return appointmentWeekKey === wKey;
        // fallback: label "DD/MM" → compare month-day
        const [day, month] = (w.label as string).split('/');
        return appointmentWeekKey.slice(5) === `${month}-${day}`;
      });
      const entry: Record<string,number|string> = { label: w.label, Total: weekLeads.length };
      CHANNELS.forEach(ch => {
        entry[ch] = weekLeads.filter(a => (CHANNEL_MAP[a.channel] ?? a.channel) === ch).length;
      });
      return entry;
    });
  }, [weeklyData, filtered]);

  // KPI 20 — CPL by channel (horizontal bars)
  const cplData = useMemo(() => {
    return CHANNELS.map(ch => ({
      name: ch,
      cpl: Math.round(CHANNEL_CPL[ch] * (0.85 + Math.random() * 0.3)),
    })).sort((a, b) => a.cpl - b.cpl);
  }, []);
  const avgCPL = Math.round(cplData.reduce((s, d) => s + d.cpl, 0) / cplData.length);

  // KPI 21 — Lead → Agendamento conversion
  const conversionData = useMemo(() => {
    return CHANNELS.map(ch => ({
      name: ch,
      conversion: ch === 'Indicação' ? 62 : ch === 'Facebook' ? 48 : ch === 'Outros' ? 55
        : ch === 'Whatsapp' ? 48 : ch === 'Google' ? 38 : 22,
    }));
  }, []);


  // KPI 23 — CAC vs ticket by channel
  const cacData = CHANNELS.map(ch => ({
    name: ch,
    cac: Math.round(CHANNEL_CAC[ch] * (0.85 + Math.random()*0.3)),
    ticket: Math.round(kpis.avgTicket * (0.9 + Math.random()*0.2)),
    color: C.channels[ch],
  })).sort((a,b) => a.cac - b.cac);

  // KPI 24 — ROI by channel (full width)
  const roiData = CHANNELS.map(ch => ({
    name: ch, roi: CHANNEL_ROI[ch],
    color: CHANNEL_ROI[ch] >= THRESHOLDS.roi.p1 ? C.green : CHANNEL_ROI[ch] >= THRESHOLDS.roi.p2 ? C.amber : C.red,
  })).sort((a,b) => b.roi - a.roi);

  // KPI 25 — LTV/CAC scatter
  const ltvCacData = CHANNELS.map(ch => ({
    channel: ch,
    cac: Math.round(CHANNEL_CAC[ch] * (0.85 + Math.random()*0.3)),
    ltv: Math.round(CHANNEL_LTV[ch] * (0.9 + Math.random()*0.2)),
    leads: filtered.filter(a => (CHANNEL_MAP[a.channel] ?? a.channel) === ch).length,
    color: C.channels[ch],
  }));
  const lineData = [{ cac: 0, ltv3x: 0 }, { cac: 250, ltv3x: 750 }];

  // ── Priority helpers (wired to THRESHOLDS) ──────────────────────────────────
  // Leads: compara metade recente vs metade anterior do período selecionado
  const splitIdx    = Math.max(1, Math.floor(leadsPerPeriod.length / 2));
  const recentLeads = leadsPerPeriod.slice(-splitIdx).reduce((s, w) => s + (w.Total as number || 0), 0);
  const priorLeads  = leadsPerPeriod.slice(0, splitIdx).reduce((s, w) => s + (w.Total as number || 0), 0);
  const leadsDrop   = priorLeads > 0 ? (priorLeads - recentLeads) / priorLeads : 0;
  const leadsPriority: 'P1'|'P2'|'P3' =
    leadsDrop <= 0 ? 'P1' : leadsDrop < THRESHOLDS.leads.dropP2 ? 'P2' : 'P3';

  // CPL: compara avgCPL atual vs baseline dos canais (CHANNEL_CPL = referência do período anterior)
  const baselineCPL = Math.round(CHANNELS.reduce((s, ch) => s + CHANNEL_CPL[ch], 0) / CHANNELS.length);
  const cplChange   = baselineCPL > 0 ? (avgCPL - baselineCPL) / baselineCPL : 0;
  const cplPriority = (): 'P1'|'P2'|'P3' =>
    cplChange <= 0 ? 'P1' : cplChange < THRESHOLDS.cpl.riseP2 ? 'P2' : 'P3';

  const convPriority = (v: number): 'P1'|'P2'|'P3' =>
    v >= THRESHOLDS.conv.p1 ? 'P1' : v >= THRESHOLDS.conv.p2 ? 'P2' : 'P3';

  const roiPriority = (v: number): 'P1'|'P2'|'P3' =>
    v >= THRESHOLDS.roi.p1 ? 'P1' : v >= THRESHOLDS.roi.p2 ? 'P2' : 'P3';
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="chart-grid">
      {/* KPI 19 — Leads por canal: donut + ranked bars */}
      {(() => {
        const totals = CHANNELS.map(ch => ({
          name: ch,
          value: leadsPerPeriod.reduce((s, w) => s + ((w as any)[ch] as number || 0), 0),
          color: C.channels[ch],
        })).sort((a, b) => b.value - a.value);
        const total = totals.reduce((s, d) => s + d.value, 0) || 1;
        return (
          <ChartCard title="Leads Gerados por Canal" kpiValue={`${kpis.leads}`} fullWidth
            priority={leadsPriority}
            subtitle="Distribuição de novos pacientes captados por canal de origem."
            note={`Verde = estável/crescendo | Amarelo = queda <${THRESHOLDS.leads.dropP2 * 100}% | Vermelho = queda ≥${THRESHOLDS.leads.dropP2 * 100}% vs período anterior`}>
            <div style={{ display:'flex', gap:24, alignItems:'center', height:200 }}>
              {/* Donut */}
              <div style={{ flex:'0 0 200px', position:'relative' }}>
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={totals} cx="50%" cy="50%" innerRadius={60} outerRadius={88}
                      dataKey="value" paddingAngle={2} animationDuration={400}>
                      {totals.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip {...TS} formatter={(v: any, name: any) => [`${v} leads (${((v/total)*100).toFixed(0)}%)`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
                  <div style={{ fontSize:26, fontWeight:700, color:'var(--text-primary)', lineHeight:1 }}>{total}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>leads</div>
                </div>
              </div>
              {/* Ranked list */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, justifyContent:'center' }}>
                {totals.map(d => {
                  const pct = Math.round((d.value / total) * 100);
                  return (
                    <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0 }} />
                      <div style={{ fontSize:12, color:'var(--text-primary)', width:80, flexShrink:0 }}>{d.name}</div>
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

      {/* KPI 20 — CPL by channel */}
      <ChartCard title="Custo por Lead (CPL)" kpiValue={fmtK(avgCPL)}
        priority={cplPriority()}
        subtitle="Quanto custa captar cada lead potencial por canal."
        note="Verde = estável ou caindo | Amarelo = aumento < 20% | Vermelho = aumento ≥ 20% vs período anterior">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cplData} layout="vertical" margin={{ top:5, right:50, left:60, bottom:0 }}>
            <CartesianGrid {...GR} />
            <XAxis type="number" tick={TK} tickFormatter={v => `R$${v}`} />
            <YAxis type="category" dataKey="name" tick={{ fill:'var(--text-primary)', fontSize:11 }} width={60} />
            <Tooltip {...TS} formatter={(v: any) => [`R$ ${v}`, 'CPL']} />
            <ReferenceLine x={baselineCPL} stroke={C.green} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value:`P1 R$${baselineCPL}`, fill:C.green, fontSize:10, position:'top' }} />
            <ReferenceLine x={Math.round(baselineCPL * (1 + THRESHOLDS.cpl.riseP2))} stroke={C.red} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value:`P3 R$${Math.round(baselineCPL * (1 + THRESHOLDS.cpl.riseP2))}`, fill:C.red, fontSize:10, position:'top' }} />
            <Bar dataKey="cpl" animationDuration={300} radius={[0,4,4,0]}
              label={{ position:'right', formatter:(v:any) => `R$${v}`, fill:'var(--text-muted)', fontSize:10 }}>
              {cplData.map((entry, i) => <Cell key={i} fill={entry.cpl <= baselineCPL ? C.green : entry.cpl <= baselineCPL * (1 + THRESHOLDS.cpl.riseP2) ? C.amber : C.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 21 — Lead → Agendamento conversion */}
      {(() => {
        const avgConv = conversionData.reduce((s,d)=>s+d.conversion,0)/conversionData.length;
        return (
      <ChartCard title="Taxa de Conversão Lead → Agendamento"
        kpiValue={fmtPct(avgConv)}
        priority={convPriority(avgConv)}
        subtitle="% de leads que viraram agendamentos por canal."
        note={`Verde ≥ ${THRESHOLDS.conv.p1}% | Amarelo ${THRESHOLDS.conv.p2}–${THRESHOLDS.conv.p1}% | Vermelho < ${THRESHOLDS.conv.p2}%`}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={conversionData} layout="vertical" margin={{ top:5, right:50, left:65, bottom:0 }}>
            <CartesianGrid {...GR} />
            <XAxis type="number" tick={TK} unit="%" domain={[0,80]} />
            <YAxis type="category" dataKey="name" tick={{ fill:'var(--text-primary)', fontSize:11 }} width={65} />
            <Tooltip {...TS} formatter={(v: any) => [`${v}%`, 'Conversão']} />
            <ReferenceLine x={THRESHOLDS.conv.p1} stroke={C.green} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value:`P1 ${THRESHOLDS.conv.p1}%`, fill:C.green, fontSize:10 }} />
            <ReferenceLine x={THRESHOLDS.conv.p2} stroke={C.red} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value:`P3 ${THRESHOLDS.conv.p2}%`, fill:C.red, fontSize:10 }} />
            <Bar dataKey="conversion" animationDuration={300} radius={[0,4,4,0]}
              label={{ position:'right', formatter:(v:any)=>`${v}%`, fill:'var(--text-muted)', fontSize:10 }}>
              {conversionData.map((entry, i) => <Cell key={i} fill={entry.conversion >= THRESHOLDS.conv.p1 ? C.green : entry.conversion >= THRESHOLDS.conv.p2 ? C.amber : C.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
        );
      })()}

      {/* KPI 22 — Lead → Consulta Realizada: grouped bar por canal + meta */}
      {(() => {
        const convL2CByChannel = CHANNELS.map(ch => {
          const chTotal = filtered.filter(a => (CHANNEL_MAP[a.channel] ?? a.channel) === ch).length;
          const chRealized = filtered.filter(a =>
            (CHANNEL_MAP[a.channel] ?? a.channel) === ch && a.status === 'Realizada'
          ).length;
          // Conv = Realizadas / Total agendamentos do canal (sempre ≤ 100%)
          return {
            name: ch,
            conv: chTotal > 0 ? +Math.min(100, (chRealized / chTotal) * 100).toFixed(1) : 0,
          };
        }).sort((a, b) => b.conv - a.conv);
        const avgL2C = convL2CByChannel.reduce((s, d) => s + d.conv, 0) / convL2CByChannel.length;
        return (
          <ChartCard title="Taxa de Conversão Lead → Consulta Realizada"
            kpiValue={fmtPct(avgL2C)}
            priority={convPriority(avgL2C)}
            subtitle="% de leads que resultaram em consulta realizada, por canal."
            note={`Verde ≥ ${THRESHOLDS.conv.p1}% | Amarelo ${THRESHOLDS.conv.p2}–${THRESHOLDS.conv.p1}% | Vermelho < ${THRESHOLDS.conv.p2}%`}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={convL2CByChannel} layout="vertical" margin={{ top:5, right:50, left:70, bottom:0 }}>
                <CartesianGrid {...GR} />
                <XAxis type="number" tick={TK} unit="%" domain={[0, 80]} />
                <YAxis type="category" dataKey="name" tick={{ fill:'var(--text-primary)', fontSize:11 }} width={70} />
                <Tooltip {...TS} formatter={(v: any) => [`${v}%`, 'Conv. L→C']} />
                <ReferenceLine x={THRESHOLDS.conv.p1} stroke={C.green} strokeDasharray="4 4" strokeWidth={1.5}
                  label={{ value:`Meta ${THRESHOLDS.conv.p1}%`, fill:C.green, fontSize:10 }} />
                <ReferenceLine x={THRESHOLDS.conv.p2} stroke={C.red} strokeDasharray="4 4" strokeWidth={1}
                  label={{ value:`P3 <${THRESHOLDS.conv.p2}%`, fill:C.red, fontSize:10 }} />
                <Bar dataKey="conv" animationDuration={300} radius={[0,4,4,0]}
                  label={{ position:'right', formatter:(v:any)=>`${v}%`, fill:'var(--text-muted)', fontSize:10 }}>
                  {convL2CByChannel.map((entry, i) => (
                    <Cell key={i} fill={entry.conv >= THRESHOLDS.conv.p1 ? C.green : entry.conv >= THRESHOLDS.conv.p2 ? C.amber : C.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        );
      })()}

      {/* KPI 23 — CAC vs ticket (PRO+) */}
      {isPro && <ChartCard title="CAC por Canal vs Ticket Médio"
        subtitle="Custo de aquisição comparado ao ticket. CAC < Ticket = viável."
        note="Laranja = CAC. Cinza = ticket médio. Vermelho = canal inviável (CAC > ticket).">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cacData} layout="vertical" margin={{ top:5, right:50, left:65, bottom:0 }}>
            <CartesianGrid {...GR} />
            <XAxis type="number" tick={TK} tickFormatter={v=>`R$${v}`} />
            <YAxis type="category" dataKey="name" tick={{ fill:'var(--text-primary)', fontSize:11 }} width={65} />
            <Tooltip {...TS} formatter={(v:any, n:any) => [`R$ ${v}`, n === 'cac' ? 'CAC' : 'Ticket']} />
            <Bar dataKey="cac" name="cac" animationDuration={300} radius={[0,2,2,0]}>
              {cacData.map((entry, i) => <Cell key={i} fill={entry.cac > entry.ticket ? C.red : entry.color} fillOpacity={0.85} />)}
            </Bar>
            <Bar dataKey="ticket" name="ticket" fill={C.gray} fillOpacity={0.35} radius={[0,4,4,0]} animationDuration={300} />
            <Legend wrapperStyle={{ fontSize:11, color:'var(--text-muted)' }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>}

      {/* KPI 24 — ROI by channel (full width) */}
      <ChartCard title="ROI por Canal de Marketing (%)" fullWidth
        subtitle="Retorno sobre investimento em marketing por canal."
        priority={roiPriority(roiData.reduce((s,d)=>s+d.roi,0)/roiData.length)}
        note="Verde > 200% | Amarelo 100-200% | Vermelho < 100% — rever investimento no canal">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={roiData} margin={{ top:10, right:10, left:10, bottom:0 }}>
            <CartesianGrid {...GR} />
            <XAxis dataKey="name" tick={TK} />
            <YAxis tick={TK} unit="%" />
            <Tooltip {...TS} formatter={(v:any) => [`${v}%`, 'ROI']} />
            <ReferenceLine y={THRESHOLDS.roi.p1} stroke={C.green} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value:`P1 ${THRESHOLDS.roi.p1}%`, fill:C.green, fontSize:10, position:'insideTopRight' }} />
            <ReferenceLine y={THRESHOLDS.roi.p2} stroke={C.red} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value:`P3 ${THRESHOLDS.roi.p2}%`, fill:C.red, fontSize:10, position:'insideTopRight' }} />
            <Bar dataKey="roi" animationDuration={300} radius={[4,4,0,0]}
              label={{ position:'top', formatter:(v:any)=>`${v}%`, fill:'var(--text-muted)', fontSize:10 }}>
              {roiData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 25 — LTV/CAC scatter (PRO+) */}
      {isPro && <ChartCard title="LTV / CAC por Canal"
        subtitle="Valor do paciente ao longo do tempo vs custo de aquisição."
        note="Pontos acima da linha = saudáveis (LTV > 3×CAC). Abaixo = risco. Tamanho = volume de leads.">
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top:10, right:10, left:10, bottom:20 }}>
            <CartesianGrid {...GR} />
            <XAxis dataKey="cac" name="CAC" tick={TK} tickFormatter={fmtK} label={{ value:'CAC (R$)', position:'insideBottom', fill:'var(--text-muted)', fontSize:10, offset:-10 }} />
            <YAxis dataKey="ltv" name="LTV" tick={TK} tickFormatter={fmtK} label={{ value:'LTV (R$)', angle:-90, position:'insideLeft', fill:'var(--text-muted)', fontSize:10 }} />
            <ZAxis dataKey="leads" range={[40, 300]} />
            <Tooltip {...TS} cursor={{ strokeDasharray:'3 3' }} content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0]?.payload;
              if (!d) return null;
              return (
                <div style={{ ...TS.contentStyle, padding:'8px 12px' }}>
                  <div style={{ fontWeight:600, marginBottom:4 }}>{d.channel}</div>
                  <div>LTV: {fmtK(d.ltv)}</div>
                  <div>CAC: {fmtK(d.cac)}</div>
                  <div>Ratio: {(d.ltv/d.cac).toFixed(1)}x</div>
                </div>
              );
            }} />
            {/* 3x reference line */}
            <Line data={lineData} dataKey="ltv3x" stroke={C.gray} strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
            <Scatter data={ltvCacData} animationDuration={300}>
              {ltvCacData.map((entry, i) => (
                <Cell key={i} fill={entry.ltv / entry.cac >= 3 ? entry.color : C.red} fillOpacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
          {ltvCacData.map(d => (
            <span key={d.channel} style={{ fontSize:10, color:'var(--text-muted)' }}>
              <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:d.color, marginRight:4, verticalAlign:'middle' }} />
              {d.channel}: {(d.ltv/d.cac).toFixed(1)}x
            </span>
          ))}
        </div>
      </ChartCard>}
    </div>
  );
}
