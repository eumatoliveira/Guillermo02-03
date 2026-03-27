import { useMemo } from 'react';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';
// Note: ComposedChart/Line removed — KPI 19 now uses LeadsGeradosPorCanal (pure SVG)
import type { Appointment, Filters } from '../../data/mockData';
import type { KPISummary } from '../../data/dashboardTypes';
import { LeadsGeradosPorCanal } from './LeadsGeradosPorCanal';
import type { LeadChannel } from './LeadsGeradosPorCanal';
import { FunilLeadConsulta } from './FunilLeadConsulta';
import { NoShowPorCanalDeOrigem } from './NoShowPorCanalDeOrigem';
import { CustoPorLeadPorCanal } from './CustoPorLeadPorCanal';
import { ConversaoPorCanal } from './ConversaoPorCanal';
import { LtvCacGauge } from './LtvCacGauge';
import type { LtvCacChannel } from './LtvCacGauge';

const C = {
  red:    '#E24B4A',
  amber:  '#EF9F27',
  green:  '#1D9E75',
  blue:   '#378ADD',
  gray:   '#888780',
  channels: {
    Instagram: '#E24B4A',
    Google:    '#378ADD',
    'Indicação': '#EF9F27',
    Facebook:  '#1D9E75',
    Whatsapp:  '#7F77DD',
    Outros:    '#888780',
  } as Record<string, string>,
};

const TS = {
  contentStyle: { background: 'var(--tooltip-bg,#1f2937)', border: 'none', borderRadius: 8, fontSize: 12, color: 'var(--text-primary,#fff)' },
  itemStyle: { color: 'var(--text-secondary,#9ca3af)' },
};
const TK = { fill: 'var(--text-muted,#9ca3af)', fontSize: 10 };
const GR = { stroke: 'var(--chart-grid,#e5e7eb)', strokeOpacity: 0.5, strokeDasharray: '3 3' };

function fmtPct(v: number) { return `${v.toFixed(1)}%`; }

function PriorityBadge({ priority }: { priority: 'P1' | 'P2' | 'P3' }) {
  const cls = priority === 'P3' ? 'red' : priority === 'P2' ? 'yellow' : 'green';
  const label = priority === 'P3' ? 'Crítico' : priority === 'P2' ? 'Alerta' : 'Bom';
  return <span className={`chart-card-badge ${cls}`}>{label}</span>;
}

interface CardProps {
  title: string; subtitle?: string; note?: string;
  priority?: 'P1' | 'P2' | 'P3'; fullWidth?: boolean; kpiValue?: string;
  children: React.ReactNode;
}
function ChartCard({ title, subtitle, note, priority, fullWidth, kpiValue, children }: CardProps) {
  return (
    <div className="chart-card" style={fullWidth ? { gridColumn: '1/-1' } : {}}>
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

// Inline SVG bullet chart — single KPI with colour zones
interface BulletProps { value: number; max: number; p1: number; p3: number; }
function BulletBar({ value, max, p1, p3 }: BulletProps) {
  const pct  = (v: number) => `${Math.min(100, (v / max) * 100).toFixed(2)}%`;
  const valW = `${Math.min(100, (value / max) * 100).toFixed(2)}%`;
  const color = value >= p1 ? C.green : value >= p3 ? C.amber : C.red;
  const barY = 18; const barH = 22;
  return (
    <div style={{ padding: '16px 0 8px' }}>
      <svg width="100%" height={58} style={{ overflow: 'visible', display: 'block' }}>
        {/* Background zones: red→yellow→green */}
        <rect x="0"       y={barY} width={pct(p3)}       height={barH} fill="#FEE2E2" />
        <rect x={pct(p3)} y={barY} width={pct(p1 - p3)}  height={barH} fill="#FEF3C7" />
        <rect x={pct(p1)} y={barY} width={pct(max - p1)} height={barH} fill="#D1FAE5" />
        {/* Value bar */}
        <rect x="0" y={barY} width={valW} height={barH} fill={color} rx="3" />
        {/* Markers */}
        <line x1={pct(p3)} y1={barY - 4} x2={pct(p3)} y2={barY + barH + 4}
          stroke={C.red} strokeWidth={1.5} strokeDasharray="3 2" />
        <text x={pct(p3)} y={barY - 6} textAnchor="middle" fontSize={9} fill={C.red} fontWeight={600}>P3 {p3}%</text>
        <line x1={pct(p1)} y1={barY - 4} x2={pct(p1)} y2={barY + barH + 4}
          stroke={C.green} strokeWidth={1.5} strokeDasharray="3 2" />
        <text x={pct(p1)} y={barY - 6} textAnchor="middle" fontSize={9} fill={C.green} fontWeight={600}>P1 {p1}%</text>
      </svg>
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
const CHANNEL_MAP: Record<string, string> = {
  Telefone: 'Whatsapp', WhatsApp: 'Whatsapp', Whatsapp: 'Whatsapp',
  Facebook: 'Facebook',
  Presencial: 'Outros', Outros: 'Outros',
  'Indicação': 'Indicação',
  Google: 'Google', Instagram: 'Instagram',
};
const CHANNEL_COLORS: Record<string, string> = {
  Google: '#4285F4', Instagram: '#E1306C', 'Indicação': '#16A34A',
  Whatsapp: '#F59E0B', Facebook: '#8B5CF6', Outros: '#94A3B8',
};
const CHANNEL_CPL:    Record<string, number> = { Whatsapp: 18, Facebook: 15, 'Indicação': 8,  Google: 25, Instagram: 32, Outros: 12 };
const CHANNEL_CAC:    Record<string, number> = { Whatsapp: 78, Facebook: 55, 'Indicação': 45, Google: 145, Instagram: 195, Outros: 65 };
const CHANNEL_LTV:    Record<string, number> = { Whatsapp: 720, Facebook: 640, 'Indicação': 840, Google: 580, Instagram: 420, Outros: 780 };
const CHANNEL_ROI:    Record<string, number> = { Whatsapp: 485, Facebook: 390, 'Indicação': 620, Google: 248, Instagram: 142, Outros: 520 };

const THRESHOLDS = {
  leads:  { dropP2: 0.20 },
  cpl:    { riseP2: 0.20 },
  conv:   { p1: 35, p2: 20 },
  roi:    { p1: 200, p2: 100 },
  noshow: { p1: 8, p3: 15 },
  ltvCac: { p1: 3, p2: 2 },
};

export function MarketingModule({ weeklyData: _weeklyData, filtered, kpis, filters, showTargets: _showTargets, plan = 'ESSENTIAL' }: Props) {
  const isPro = plan === 'PRO' || plan === 'ENTERPRISE';

  // KPI 19 — Leads by channel per period (stacked bars + total line)
  // Groups appointments into 7-day spans matching computeWeeklyTrend exactly
  const leadsPerPeriod = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) return [];

    const fmt = (dateStr: string) => {
      const [, m, d] = dateStr.slice(0, 10).split('-');
      return `${d}/${m}`;
    };

    const buckets: Array<{ label: string; appts: typeof filtered }> = [];
    let current: typeof filtered = [];
    let weekStart = sorted[0].date;

    for (const appt of sorted) {
      const diff = (new Date(appt.date).getTime() - new Date(weekStart).getTime()) / 86_400_000;
      if (diff >= 7) {
        buckets.push({ label: fmt(weekStart), appts: current });
        current = [];
        weekStart = appt.date;
      }
      current.push(appt);
    }
    if (current.length > 0) buckets.push({ label: fmt(weekStart), appts: current });

    return buckets.slice(-8).map(({ label, appts }) => {
      const entry: Record<string, number | string> = { label, Total: appts.length };
      CHANNELS.forEach(ch => {
        entry[ch] = appts.filter(a => (CHANNEL_MAP[a.channel] ?? a.channel) === ch).length;
      });
      return entry;
    });
  }, [filtered]);

  const leadsAvg  = leadsPerPeriod.length
    ? leadsPerPeriod.reduce((s, w) => s + (w.Total as number || 0), 0) / leadsPerPeriod.length
    : 0;
  const leadsMeta = Math.round(leadsAvg * 1.10);

  const leadsMetaSafe = Math.max(leadsMeta, 1);

  // Transform leadsPerPeriod → LeadChannel[] for v3 small multiples component
  const LEAD_CHANNEL_MAP = [
    { mapKey: 'Google',    name: 'Google Ads', color: '#4285F4' },
    { mapKey: 'Instagram', name: 'Instagram',  color: '#E1306C' },
    { mapKey: 'Indicação', name: 'Indicação',  color: '#16A34A' },
    { mapKey: 'Whatsapp',  name: 'WhatsApp',   color: '#F59E0B' },
    { mapKey: 'Facebook',  name: 'Facebook',   color: '#8B5CF6' },
    { mapKey: 'Outros',    name: 'Outros',     color: '#94A3B8' },
  ] as const;
  const leadChannels: LeadChannel[] = LEAD_CHANNEL_MAP.map(c => ({
    name:  c.name,
    color: c.color,
    data:  leadsPerPeriod.map(w => (w[c.mapKey] as number) ?? 0),
    meta: Math.max(1, Math.round(leadsMetaSafe / 6)),
  }));
  const visibleLeadChannels = filters.channel
    ? leadChannels.filter((_, i) => {
        const normalized = CHANNEL_MAP[filters.channel] ?? filters.channel;
        return LEAD_CHANNEL_MAP[i].mapKey === normalized;
      })
    : leadChannels;

  // KPI 20 — CPL by channel
  const cplData = useMemo(() => CHANNELS.map(ch => ({
    name: ch,
    cpl: Math.round(CHANNEL_CPL[ch] * (0.85 + Math.random() * 0.3)),
  })).sort((a, b) => a.cpl - b.cpl), []);
  const baselineCPL = Math.round(CHANNELS.reduce((s, ch) => s + CHANNEL_CPL[ch], 0) / CHANNELS.length);
  const cplP3 = Math.round(baselineCPL * (1 + THRESHOLDS.cpl.riseP2));

  // KPI 21 — Conv Lead → Agendamento (single %)
  // Use kpis.leads (same source as the scorecard) so all lead-based metrics are consistent.
  // Conversion rates are derived from filtered appointments and applied to kpis.leads.
  const totalLeads   = kpis.leads;
  const rawBooked    = filtered.filter(a => a.status !== 'Cancelada' && a.status !== 'No-Show').length;
  const rawConsultas = filtered.filter(a => a.status === 'Realizada').length;
  const rateBooked   = filtered.length > 0 ? rawBooked   / filtered.length : 0;
  const rateConsulta = filtered.length > 0 ? rawConsultas / filtered.length : 0;
  const totalBooked    = Math.round(totalLeads * rateBooked);
  const totalConsultas = Math.round(totalLeads * rateConsulta);
  const convAgend   = totalLeads > 0 ? (totalBooked / totalLeads) * 100 : 42;
  const convPriority = (v: number): 'P1' | 'P2' | 'P3' =>
    v >= THRESHOLDS.conv.p1 ? 'P1' : v >= THRESHOLDS.conv.p2 ? 'P2' : 'P3';

  // No-show por Canal de Origem
  const noShowByChannel = useMemo(() => {
    const normalizedFilter = filters.channel
      ? (CHANNEL_MAP[filters.channel] ?? filters.channel)
      : null;
    return CHANNELS
      .filter(ch => !normalizedFilter || ch === normalizedFilter)
      .map(ch => {
        const chAppts  = filtered.filter(a => (CHANNEL_MAP[a.channel] ?? a.channel) === ch);
        const chNoShow = chAppts.filter(a => a.status === 'No-Show').length;
        const rate     = chAppts.length > 0
          ? parseFloat(((chNoShow / chAppts.length) * 100).toFixed(1))
          : 0;
        return { name: ch, rate, color: C.channels[ch] };
      }).sort((a, b) => b.rate - a.rate);
  }, [filtered, filters.channel]);

  // KPI 23 — CAC por canal (PRO+)
  const cacData = useMemo(() => CHANNELS.map(ch => ({
    name: ch,
    cac: Math.round(CHANNEL_CAC[ch] * (0.85 + Math.random() * 0.3)),
    color: CHANNEL_COLORS[ch] ?? C.gray,
  })).sort((a, b) => a.cac - b.cac), []);
  const avgTicket   = kpis.avgTicket || 350;
  // P1 = CAC ≤ ticket/3 (aquisição barata), P3 = CAC > ticket/2 (caro demais)
  const cacP1       = Math.round(avgTicket / 3);
  const cacP3       = Math.round(avgTicket / 2);
  const avgCacValue = Math.round(cacData.reduce((s, d) => s + d.cac, 0) / cacData.length);
  const cacXDomain  = Math.ceil(Math.max(cacP3, ...cacData.map(d => d.cac)) * 1.15);
  const cacPriority: 'P1' | 'P2' | 'P3' =
    avgCacValue <= cacP1 ? 'P1' : avgCacValue <= cacP3 ? 'P2' : 'P3';

  // KPI 24 — ROI por canal: horizontal, eixo zero central
  const roiData = CHANNELS.map(ch => ({
    name: ch,
    roi:   CHANNEL_ROI[ch],
    color: CHANNEL_ROI[ch] >= THRESHOLDS.roi.p1 ? C.green
         : CHANNEL_ROI[ch] >= THRESHOLDS.roi.p2 ? C.amber : C.red,
  })).sort((a, b) => b.roi - a.roi);
  const roiAvg = roiData.reduce((s, d) => s + d.roi, 0) / roiData.length;
  const roiPriority: 'P1' | 'P2' | 'P3' =
    roiAvg >= THRESHOLDS.roi.p1 ? 'P1' : roiAvg >= THRESHOLDS.roi.p2 ? 'P2' : 'P3';

  // KPI 25 — LTV/CAC gauge (PRO+)
  const ltvCacRatios = useMemo(() => CHANNELS.map(ch => {
    const cac = Math.round(CHANNEL_CAC[ch] * (0.85 + Math.random() * 0.3));
    const ltv = Math.round(CHANNEL_LTV[ch] * (0.90 + Math.random() * 0.2));
    return ltv / cac;
  }), []);
  const avgLtvCac      = ltvCacRatios.reduce((s, r) => s + r, 0) / ltvCacRatios.length;
  const ltvCacChannels: LtvCacChannel[] = CHANNELS.map((ch, i) => ({
    name: ch, ratio: ltvCacRatios[i], color: C.channels[ch],
  }));

  return (
    <div className="chart-grid">

      {/* KPI 19 — Leads Gerados: componente dedicado com SVG puro */}
      <div style={{ gridColumn: '1/-1' }}>
        <LeadsGeradosPorCanal
          channels={visibleLeadChannels}
          totalMeta={leadsMetaSafe}
          total={kpis.leads}
        />
      </div>

      {/* KPI 20 — CPL: componente dedicado */}
      <div style={{ gridColumn: '1/-1' }}>
        <CustoPorLeadPorCanal
          channels={cplData.map(d => ({ name: d.name, cpl: d.cpl, leads: Math.max(1, Math.round(kpis.leads / cplData.length)) }))}
          p1={baselineCPL}
          p3={cplP3}
        />
      </div>

      {/* KPI 21 — Conv Lead → Agendamento: Bullet chart */}
      <ChartCard title="Conversão Lead → Agendamento"
        kpiValue={fmtPct(convAgend)}
        priority={convPriority(convAgend)}
        subtitle="Eficiência da recepção — % de leads que viraram agendamentos."
        note={`Verde ≥ ${THRESHOLDS.conv.p1}% | Amarelo ${THRESHOLDS.conv.p2}–${THRESHOLDS.conv.p1}% | Vermelho < ${THRESHOLDS.conv.p2}%`}>
        <BulletBar value={convAgend} max={80} p1={THRESHOLDS.conv.p1} p3={THRESHOLDS.conv.p2} />
      </ChartCard>

      {/* KPI 22 — Funil: componente dedicado */}
      <div style={{ gridColumn: '1/-1' }}>
        <FunilLeadConsulta
          leads={totalLeads}
          agendamentos={totalBooked}
          consultas={totalConsultas}
        />
      </div>

      {/* Conversão por Canal — Funil Comparativo */}
      <div style={{ gridColumn: '1/-1' }}>
        <ConversaoPorCanal
          channels={CHANNELS.map(ch => {
            const chAppts = filtered.filter(a => (CHANNEL_MAP[a.channel] ?? a.channel) === ch);
            const agend   = chAppts.filter(a => a.status !== 'Cancelada' && a.status !== 'No-Show').length;
            const consul  = chAppts.filter(a => a.status === 'Realizada').length;
            const leads   = Math.max(1, Math.round(kpis.leads * (chAppts.length / Math.max(1, filtered.length))));
            return {
              name:         ch,
              color:        CHANNEL_COLORS[ch] ?? '#94A3B8',
              leads,
              agendamentos: Math.round(leads * (chAppts.length > 0 ? agend / chAppts.length : rateBooked)),
              consultas:    Math.round(leads * (chAppts.length > 0 ? consul / chAppts.length : rateConsulta)),
            };
          })}
        />
      </div>

      {/* No-show por Canal de Origem — componente dedicado */}
      <div style={{ gridColumn: '1/-1' }}>
        <NoShowPorCanalDeOrigem
          channels={noShowByChannel.map(ch => ({
            name: ch.name,
            noshow: ch.rate,
            total: filtered.filter(a => (CHANNEL_MAP[a.channel] ?? a.channel) === ch.name).length || 1,
          }))}
        />
      </div>

      {/* KPI 23 — CAC por Canal (PRO+) */}
      {isPro && (
        <ChartCard title="CAC por Canal"
          priority={cacPriority}
          subtitle="Custo de aquisição por canal. Cor = canal. P1 = CAC baixo (≤ ticket/3) | P3 = CAC caro (> ticket/2)."
          note={`P1 ≤ R$${cacP1} | P2 R$${cacP1}–R$${cacP3} | P3 > R$${cacP3}`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cacData} layout="vertical" margin={{ top: 16, right: 60, left: 65, bottom: 0 }}>
              <CartesianGrid {...GR} />
              <XAxis type="number" tick={TK} tickFormatter={v => `R$${v}`} domain={[0, cacXDomain]} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-primary)', fontSize: 11 }} width={65} />
              <Tooltip {...TS} formatter={(v: any) => [`R$ ${v}`, 'CAC']} />
              <ReferenceLine x={cacP1} stroke={C.green} strokeDasharray="4 4" strokeWidth={1.5}
                label={{ value: `P1 R$${cacP1}`, fill: C.green, fontSize: 10, position: 'top' }} />
              <ReferenceLine x={cacP3} stroke={C.red} strokeDasharray="4 4" strokeWidth={1.5}
                label={{ value: `P3 R$${cacP3}`, fill: C.red, fontSize: 10, position: 'top' }} />
              <Bar dataKey="cac" animationDuration={300} radius={[0, 4, 4, 0]}
                label={{ position: 'right', formatter: (v: any) => `R$${v}`, fill: 'var(--text-muted)', fontSize: 10 }}>
                {cacData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* KPI 24 — ROI por Canal: horizontal com eixo zero central */}
      <ChartCard title="ROI por Canal de Marketing (%)" fullWidth
        priority={roiPriority}
        subtitle="Retorno por canal. Barras à direita do zero = ROI positivo (verde). Barras à esquerda = ROI negativo (vermelho)."
        note="Verde > 200% | Amarelo 100–200% | Vermelho < 100% — considerar realocação ou corte do canal">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={roiData} layout="vertical" margin={{ top: 5, right: 70, left: 65, bottom: 0 }}>
            <CartesianGrid {...GR} />
            <XAxis type="number" tick={TK} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-primary)', fontSize: 11 }} width={65} />
            <Tooltip {...TS} formatter={(v: any) => [`${v}%`, 'ROI']} />
            {/* Zero axis — visual anchor */}
            <ReferenceLine x={0} stroke={C.gray} strokeWidth={2} />
            <ReferenceLine x={THRESHOLDS.roi.p1} stroke={C.green} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: `P1 ${THRESHOLDS.roi.p1}%`, fill: C.green, fontSize: 10, position: 'top' }} />
            <ReferenceLine x={THRESHOLDS.roi.p2} stroke={C.red} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: `P3 ${THRESHOLDS.roi.p2}%`, fill: C.red, fontSize: 10, position: 'top' }} />
            <Bar dataKey="roi" animationDuration={300} radius={[0, 4, 4, 0]}
              label={{ position: 'right', formatter: (v: any) => `${v}%`, fill: 'var(--text-muted)', fontSize: 10 }}>
              {roiData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* KPI 25 — LTV/CAC Gauge (PRO+) */}
      {isPro && (
        <LtvCacGauge ratio={avgLtvCac} channels={ltvCacChannels} />
      )}
    </div>
  );
}
