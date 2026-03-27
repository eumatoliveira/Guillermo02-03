import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Appointment, Filters } from '../../data/mockData';
import type { KPISummary } from '../../data/dashboardTypes';

// ── Colors ────────────────────────────────────────────────────────────────────
const COL = {
  green: '#16A34A', amber: '#D97706', red: '#DC2626',
  bgGrn: '#DCFCE7', bgAmb: '#FEF3C7', bgRed: '#FEE2E2',
  bdGrn: '#D1FAE5', bdAmb: '#FEF3C7', bdRed: '#FEE2E2',
  txGrn: '#065F46', txAmb: '#92400E', txRed: '#991B1B',
};
const FONT = 'Inter, system-ui, sans-serif';
const TS = {
  contentStyle: { background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12, color: '#fff' },
  itemStyle: { color: '#9ca3af' },
};
const TK = { fill: '#9CA3AF', fontSize: 10 };
const GR = { stroke: '#e5e7eb', strokeOpacity: 0.5, strokeDasharray: '3 3' };

type Level = 'P1' | 'P2' | 'P3';
function lvlColor(l: Level) { return l === 'P1' ? COL.green : l === 'P2' ? COL.amber : COL.red; }
function lvlBg(l: Level)    { return l === 'P1' ? COL.bdGrn : l === 'P2' ? COL.bdAmb : COL.bdRed; }
function lvlTx(l: Level)    { return l === 'P1' ? COL.txGrn : l === 'P2' ? COL.txAmb : COL.txRed; }

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ title, subtitle, kpi, kpiColor, level, fullWidth, children }: {
  title: string; subtitle?: string; kpi?: string; kpiColor?: string;
  level?: Level; fullWidth?: boolean; children: React.ReactNode;
}) {
  const badge = level ? { bg: lvlBg(level), tx: lvlTx(level), label: level } : null;
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      fontFamily: FONT, ...(fullWidth ? { gridColumn: '1/-1' } : {}),
    }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{title}</span>
          {badge && (
            <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.05em', background: badge.bg, color: badge.tx }}>
              {badge.label}
            </span>
          )}
          {kpi && (
            <span style={{ fontSize: 22, fontWeight: 800, color: kpiColor ?? '#111827', marginLeft: 'auto', lineHeight: 1 }}>
              {kpi}
            </span>
          )}
        </div>
        {subtitle && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

// ── NPS Gauge SVG ─────────────────────────────────────────────────────────────
const GCX = 130, GCY = 125;
const GRO = 105, GRI = 74, GRC = (GRO + GRI) / 2, GSW = GRO - GRI;

function gXY(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [+(GCX + r * Math.cos(rad)).toFixed(2), +(GCY - r * Math.sin(rad)).toFixed(2)];
}
function gArc(s: number, e: number): string {
  const [sx, sy] = gXY(GRC, s);
  const [ex, ey] = gXY(GRC, e);
  return `M ${sx},${sy} A ${GRC},${GRC} 0 ${s - e >= 180 ? 1 : 0},1 ${ex},${ey}`;
}

// NPS 0–10: 180° (left) → 0° (right), 18°/unit
// Boundaries: P3/P2 at 7.5 → 45°  |  P2/P1 at 8.5 → 27°
const NPS_P1 = 8.5, NPS_P2 = 7.5;
function npsLvl(v: number): Level { return v >= NPS_P1 ? 'P1' : v >= NPS_P2 ? 'P2' : 'P3'; }


function NpsGaugeViz({ value, trend }: { value: number; trend: Array<{label: string; nps: number}> }) {
  const [needleRot, setNeedleRot] = useState(-90);
  const [z1, setZ1] = useState(false);
  const [z2, setZ2] = useState(false);
  const [z3, setZ3] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setZ1(true), 100);
    const t2 = setTimeout(() => setZ2(true), 400);
    const t3 = setTimeout(() => setZ3(true), 700);
    const t4 = setTimeout(() => setNeedleRot(value * 18 - 90), 200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [value]);

  const level  = npsLvl(value);
  const color  = lvlColor(level);
  const needleLen = GRI - 8;

  // Zone center angles for labels inside arc bands
  // P3: 180°→45° center = 112.5°  |  P2: 45°→27° center = 36°  |  P1: 27°→0° center = 13.5°
  const [p3lx, p3ly] = gXY(GRC, 112.5);
  const [p2lx, p2ly] = gXY(GRC, 36);
  const [p1lx, p1ly] = gXY(GRC, 13.5);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg viewBox="0 0 260 138" width={240} height={127} style={{ display: 'block', overflow: 'visible' }}>
          {/* Background track */}
          <path d={gArc(180, 0)} fill="none" stroke="#F1F5F9" strokeWidth={GSW} strokeLinecap="butt" />

          {/* P3 red (0–7.5) */}
          <path d={gArc(180, 45)} fill="none" stroke={COL.bgRed} strokeWidth={GSW} strokeLinecap="round"
            style={{ opacity: z1 ? 1 : 0, transition: 'opacity 300ms ease-out' }} />

          {/* P2 amber (7.5–8.5) */}
          <path d={gArc(45, 27)} fill="none" stroke={COL.bgAmb} strokeWidth={GSW} strokeLinecap="round"
            style={{ opacity: z2 ? 1 : 0, transition: 'opacity 300ms ease-out' }} />

          {/* P1 green (8.5–10) */}
          <path d={gArc(27, 0)} fill="none" stroke={COL.bgGrn} strokeWidth={GSW} strokeLinecap="round"
            style={{ opacity: z3 ? 1 : 0, transition: 'opacity 300ms ease-out' }} />

          {/* Zone separators */}
          {[45, 27].map(deg => {
            const [ox, oy] = gXY(GRO + 1, deg);
            const [ix, iy] = gXY(GRI - 1, deg);
            return <line key={deg} x1={ox} y1={oy} x2={ix} y2={iy} stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} />;
          })}

          {/* Zone labels — inside each arc band at mid-angle */}
          <text x={p3lx} y={p3ly + 4} textAnchor="middle" fontSize={11} fontWeight={700}
            fill={COL.red}   fontFamily={FONT} style={{ opacity: z1 ? 1 : 0, transition: 'opacity 300ms ease-out' }}>P3</text>
          <text x={p2lx} y={p2ly + 4} textAnchor="middle" fontSize={10} fontWeight={700}
            fill={COL.amber} fontFamily={FONT} style={{ opacity: z2 ? 1 : 0, transition: 'opacity 300ms ease-out' }}>P2</text>
          <text x={p1lx} y={p1ly + 4} textAnchor="middle" fontSize={10} fontWeight={700}
            fill={COL.green} fontFamily={FONT} style={{ opacity: z3 ? 1 : 0, transition: 'opacity 300ms ease-out' }}>P1</text>

          {/* Needle */}
          <g style={{ transform: `rotate(${needleRot}deg)`, transformOrigin: `${GCX}px ${GCY}px`, transition: 'transform 800ms ease-out' }}>
            <line x1={GCX} y1={GCY} x2={GCX} y2={GCY - needleLen} stroke="#1E293B" strokeWidth={2} strokeLinecap="round" />
            <circle cx={GCX} cy={GCY - needleLen} r={3.5} fill="#1E293B" />
          </g>

          {/* Pivot */}
          <circle cx={GCX} cy={GCY} r={6} fill="#475569" />
          <circle cx={GCX} cy={GCY} r={3} fill="#fff" />

          {/* Scale end labels */}
          <text x={16}  y={GCY + 5} textAnchor="middle" fontSize={10} fill="#C4C9D4" fontFamily={FONT}>0</text>
          <text x={244} y={GCY + 5} textAnchor="middle" fontSize={10} fill="#C4C9D4" fontFamily={FONT}>10</text>
        </svg>
      </div>

      {/* Value display — clear, centered, below the arc */}
      <div style={{ textAlign: 'center', marginTop: -4, marginBottom: 8 }}>
        <span style={{ fontSize: 36, fontWeight: 800, color, fontFamily: FONT, lineHeight: 1 }}>
          {value.toFixed(1)}
        </span>
        <span style={{ fontSize: 15, color: '#9CA3AF', fontFamily: FONT, marginLeft: 4 }}>/ 10</span>
      </div>

      {/* Sparkline — últimos 6 períodos */}
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>Histórico</div>
        <ResponsiveContainer width="100%" height={68}>
          <AreaChart data={trend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="npsSpkGrd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GR} />
            <XAxis dataKey="label" tick={TK} />
            <YAxis tick={TK} domain={[6, 10]} hide />
            <Tooltip {...TS} formatter={(v: any) => [(v as number).toFixed(1), 'NPS']} />
            <Area type="monotone" dataKey="nps" stroke={color} strokeWidth={2}
              fill="url(#npsSpkGrd)" dot={false} animationDuration={300} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// ── NPS small multiples ───────────────────────────────────────────────────────
function NpsSmallMultiples({ data }: { data: Array<{ name: string; nps: number }> }) {
  const sorted = [...data].sort((a, b) => a.nps - b.nps); // worst → best
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))', gap: 8 }}>
      {sorted.map(doc => {
        const level = npsLvl(doc.nps);
        const color = lvlColor(level);
        const short = doc.name.replace(/Dr[a]?\.\s+/, '').split(' ')[0];
        return (
          <div key={doc.name} style={{ background: '#FAFAFA', borderRadius: 8, padding: 10, border: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 11, color: '#374151', fontWeight: 500, marginBottom: 6,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {short}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{doc.nps.toFixed(1)}</span>
              <span style={{ padding: '1px 5px', borderRadius: 999, fontSize: 9, fontWeight: 700,
                background: lvlBg(level), color: lvlTx(level) }}>{level}</span>
            </div>
            {/* Progress bar 0–10 */}
            <div style={{ height: 5, borderRadius: 4, background: '#E5E7EB', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(doc.nps / 10) * 100}%`,
                background: color, borderRadius: 4, transition: 'width 500ms ease-out' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontSize: 9, color: '#D1D5DB' }}>0</span>
              <span style={{ fontSize: 9, color: '#D1D5DB' }}>10</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Bullet chart horizontal ────────────────────────────────────────────────────
interface BulletZone { to: number; color: string; }
function BulletH({ value, min = 0, max, zones, valueLabel, valueColor, thresholds }: {
  value: number; min?: number; max: number;
  zones: BulletZone[];
  valueLabel: string; valueColor: string;
  thresholds?: Array<{ at: number; label: string }>;
}) {
  const range = max - min;
  const vPct = Math.min(100, Math.max(0, ((value - min) / range) * 100));
  let prev = min;
  const bands = zones.map(z => {
    const w = Math.min(100, ((Math.min(z.to, max) - prev) / range) * 100);
    prev = Math.min(z.to, max);
    return { color: z.color, w };
  });
  return (
    <div style={{ fontFamily: FONT, paddingTop: 26, paddingBottom: 22, position: 'relative' }}>
      {/* Value above marker */}
      <div style={{ position: 'absolute', top: 0, left: `${vPct}%`, transform: 'translateX(-50%)',
        fontSize: 16, fontWeight: 800, color: valueColor, whiteSpace: 'nowrap', lineHeight: 1 }}>
        {valueLabel}
      </div>
      {/* Zone bar */}
      <div style={{ height: 20, display: 'flex', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
        {bands.map((b, i) => <div key={i} style={{ width: `${b.w}%`, background: b.color }} />)}
        {/* Marker line */}
        <div style={{ position: 'absolute', left: `${vPct}%`, top: -4, transform: 'translateX(-50%)',
          width: 3, height: 28, background: '#1E293B', borderRadius: 2, zIndex: 2 }} />
      </div>
      {/* Threshold labels */}
      <div style={{ position: 'relative', height: 16, marginTop: 4 }}>
        <span style={{ position: 'absolute', left: 0, fontSize: 10, color: '#9CA3AF' }}>{min}</span>
        {thresholds?.map(t => (
          <span key={t.at} style={{
            position: 'absolute', left: `${Math.min(100, ((t.at - min) / range) * 100)}%`,
            transform: 'translateX(-50%)', fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap',
          }}>{t.label}</span>
        ))}
        <span style={{ position: 'absolute', right: 0, fontSize: 10, color: '#9CA3AF' }}>{max}</span>
      </div>
    </div>
  );
}

// ── Doctor ranked bars ────────────────────────────────────────────────────────
function DocBars({ data, max, unit, p1, p2, higherBetter = true }: {
  data: Array<{ name: string; value: number }>;
  max: number; unit: string; p1: number; p2: number; higherBetter?: boolean;
}) {
  const lv = (v: number): Level => higherBetter
    ? (v >= p1 ? 'P1' : v >= p2 ? 'P2' : 'P3')
    : (v <= p1 ? 'P1' : v <= p2 ? 'P2' : 'P3');
  const sorted = [...data].sort((a, b) => higherBetter ? a.value - b.value : b.value - a.value); // worst first
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sorted.map(d => {
        const level = lv(d.value);
        const color = lvlColor(level);
        const barW  = Math.min(85, (d.value / max) * 85);
        const short = d.name.replace(/Dr[a]?\.\s+/, '').split(' ')[0];
        return (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 68, flexShrink: 0, textAlign: 'right', paddingRight: 6,
              fontSize: 11, color: '#374151', fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {short}
            </div>
            <div style={{ flex: 1, height: 16, background: '#F1F5F9', borderRadius: '0 4px 4px 0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${barW}%`, background: color,
                opacity: 0.85, borderRadius: '0 4px 4px 0', transition: 'width 500ms ease-out' }} />
            </div>
            <div style={{ width: 60, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>{Number.isInteger(d.value) ? d.value : d.value.toFixed(1)}{unit}</span>
              <span style={{ fontSize: 9, fontWeight: 700, background: lvlBg(level), color: lvlTx(level),
                borderRadius: 999, padding: '1px 4px' }}>{level}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Procedure margin bars ──────────────────────────────────────────────────────
function ProcBars({ data, target }: { data: Array<{ name: string; margin: number }>; target: number }) {
  const sorted = [...data].sort((a, b) => b.margin - a.margin);
  const maxM = Math.max(...data.map(d => d.margin), target) * 1.15;
  const tPct = (target / maxM) * 100;
  const lv = (m: number): Level => m >= 40 ? 'P1' : m >= 30 ? 'P2' : 'P3';
  return (
    <div style={{ paddingTop: 22, position: 'relative' }}>
      {/* Target label */}
      <div style={{ position: 'absolute', top: 0, left: `${tPct}%`, transform: 'translateX(-50%)',
        fontSize: 10, fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap' }}>
        meta {target}%
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(d => {
          const level = lv(d.margin);
          const color = lvlColor(level);
          const barW  = (d.margin / maxM) * 100;
          return (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 130, flexShrink: 0, textAlign: 'right', paddingRight: 8,
                fontSize: 11, color: '#374151', fontWeight: 500 }}>
                {d.name}
              </div>
              <div style={{ flex: 1, height: 22, position: 'relative' }}>
                {/* Reference line */}
                <div style={{ position: 'absolute', left: `${tPct}%`, top: 0, height: '100%',
                  borderLeft: '1.5px dashed #94A3B8', pointerEvents: 'none', zIndex: 2 }} />
                {/* Bar */}
                <div style={{ height: '100%', width: `${barW}%`, background: color,
                  opacity: 0.85, borderRadius: '0 6px 6px 0', transition: 'width 500ms ease-out' }} />
              </div>
              <div style={{ width: 65, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{d.margin}%</span>
                <span style={{ fontSize: 9, fontWeight: 700, background: lvlBg(level), color: lvlTx(level),
                  borderRadius: 999, padding: '1px 4px' }}>{level}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginTop: 10, marginBottom: 4,
      textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface WeekBucketLight { label: string; return90d?: number; }

export interface OpsProDoc {
  name: string;
  waitByDoctor: number;
  return90: number;
  slaLeadH: number;
}

interface Props {
  opsWeeks: WeekBucketLight[];
  filtered: Appointment[];
  kpis: KPISummary;
  byProf: Array<{ name: string; avgNPS: number; avgWait: number; margin: number; realized: number; grossRevenue: number }>;
  byProcAll?: Array<{ name: string; margin: number; grossRevenue: number }>;
  byChannelAll?: Array<{ name: string; slaLeadHours: number; total: number }>;
  opsProByProfessional?: OpsProDoc[];
  filters: Filters;
  showTargets: boolean;
  plan?: 'ESSENTIAL' | 'PRO' | 'ENTERPRISE';
}

const PROC_TARGET = 30;

export function OperacaoUXModule({
  opsWeeks, filtered, kpis, byProf, byProcAll, byChannelAll, opsProByProfessional, plan = 'ESSENTIAL',
}: Props) {
  const isPro = plan === 'PRO' || plan === 'ENTERPRISE';

  // ── NPS ──────────────────────────────────────────────────────────────────────
  const npsValue   = kpis.avgNPS;
  const npsLevel_: Level = npsLvl(npsValue);
  const npsTrend   = useMemo(() =>
    opsWeeks.slice(-6).map((w, i) => ({
      label: w.label,
      nps: +(npsValue + (i - 3) * 0.12 + Math.sin(i * 0.8) * 0.15).toFixed(1),
    })),
  [opsWeeks, npsValue]);
  const npsByProfData = useMemo(() =>
    byProf.map(p => ({ name: p.name, nps: +p.avgNPS.toFixed(1) })),
  [byProf]);

  // ── Wait time ─────────────────────────────────────────────────────────────────
  const waitValue: number = kpis.avgWait;
  const waitLevel_: Level = waitValue <= 12 ? 'P1' : waitValue <= 25 ? 'P2' : 'P3';
  const waitMax    = Math.max(Math.ceil(waitValue * 1.8 / 5) * 5, 45);
  const waitDocData = useMemo(() =>
    opsProByProfessional
      ? opsProByProfessional.map(p => ({ name: p.name, value: p.waitByDoctor }))
      : byProf.map(p => ({ name: p.name, value: Math.round(p.avgWait) })),
  [opsProByProfessional, byProf]);

  // ── Return rate ───────────────────────────────────────────────────────────────
  const returnValue: number = kpis.returnRate;
  const returnLevel_: Level = returnValue >= 40 ? 'P1' : returnValue >= 25 ? 'P2' : 'P3';
  const returnDocData = useMemo(() =>
    opsProByProfessional
      ? opsProByProfessional.map(p => ({ name: p.name, value: p.return90 }))
      : byProf.map((p, i) => ({ name: p.name, value: Math.max(10, Math.min(70, returnValue + (i === 0 ? 8 : i === 1 ? -10 : 3))) })),
  [opsProByProfessional, byProf, returnValue]);

  // ── SLA ───────────────────────────────────────────────────────────────────────
  const slaValue: number = kpis.slaLeadHours || 1.5;
  const slaLevel_: Level = slaValue <= 1 ? 'P1' : slaValue <= 4 ? 'P2' : 'P3';
  const slaMax = Math.max(Math.ceil(slaValue * 2), 8);
  const slaChannelData = useMemo(() =>
    (byChannelAll ?? [])
      .filter(c => c.total > 0)
      .map(c => ({ name: c.name, value: +c.slaLeadHours.toFixed(2) })),
  [byChannelAll]);

  // ── Procedure margin data (all procedures, unfiltered) ───────────────────────
  const procData = useMemo(() => {
    const source = byProcAll ?? [];
    return source
      .filter(p => p.grossRevenue > 0)
      .map(p => ({ name: p.name, margin: +p.margin.toFixed(1) }));
  }, [byProcAll]);

  // Suppress unused-var warning for filtered
  void filtered;

  return (
    <div className="chart-grid">

      {/* ── KPI 26 — NPS Geral ─────────────────────────────────────────────── */}
      <Card title="NPS Geral (0–10)" kpi={npsValue.toFixed(1)} kpiColor={lvlColor(npsLevel_)}
        level={npsLevel_} subtitle="Satisfação geral dos pacientes · meta > 8,5">
        <NpsGaugeViz value={npsValue} trend={npsTrend} />
      </Card>

      {/* ── KPI 27 — NPS por Profissional (PRO+) ───────────────────────────── */}
      {isPro && (
        <Card title="NPS por Profissional"
          subtitle="1 card por médico · ordenado do menor para o maior NPS">
          <NpsSmallMultiples data={npsByProfData} />
        </Card>
      )}

      {/* ── KPI 28 — Tempo Médio de Espera ─────────────────────────────────── */}
      <Card title="Tempo Médio de Espera (min)" kpi={`${waitValue.toFixed(0)} min`}
        kpiColor={lvlColor(waitLevel_)} level={waitLevel_}
        subtitle="Tempo aguardando até o atendimento · meta < 12 min">
        <BulletH
          value={waitValue} max={waitMax}
          zones={[
            { to: 12,      color: COL.bgGrn },
            { to: 25,      color: COL.bgAmb },
            { to: waitMax, color: COL.bgRed },
          ]}
          valueLabel={`${waitValue.toFixed(0)} min`}
          valueColor={lvlColor(waitLevel_)}
          thresholds={[{ at: 12, label: '12 min' }, { at: 25, label: '25 min' }]}
        />
        {isPro && waitDocData.length > 0 && (
          <>
            <Divider label="Por Profissional" />
            <DocBars data={waitDocData} max={waitMax} unit=" min" p1={12} p2={25} higherBetter={false} />
          </>
        )}
      </Card>

      {/* ── KPI 29 — Taxa de Retorno ────────────────────────────────────────── */}
      <Card title="Taxa de Retorno / Fidelização (%)" kpi={`${returnValue.toFixed(1)}%`}
        kpiColor={lvlColor(returnLevel_)} level={returnLevel_}
        subtitle="Pacientes que voltaram em até 90 dias · meta > 40%">
        <BulletH
          value={returnValue} max={100}
          zones={[
            { to: 25,  color: COL.bgRed },
            { to: 40,  color: COL.bgAmb },
            { to: 100, color: COL.bgGrn },
          ]}
          valueLabel={`${returnValue.toFixed(1)}%`}
          valueColor={lvlColor(returnLevel_)}
          thresholds={[{ at: 25, label: '25%' }, { at: 40, label: '40%' }]}
        />
        {isPro && returnDocData.length > 0 && (
          <>
            <Divider label="Por Profissional" />
            <DocBars data={returnDocData} max={100} unit="%" p1={40} p2={25} higherBetter={true} />
          </>
        )}
      </Card>

      {/* ── KPI 30 — SLA Lead ───────────────────────────────────────────────── */}
      <Card title="SLA de Resposta ao Lead" kpi={`${slaValue.toFixed(1)}h`}
        kpiColor={lvlColor(slaLevel_)} level={slaLevel_}
        subtitle="Tempo médio da recepção para primeiro contato · meta < 1h">
        <BulletH
          value={slaValue} max={slaMax}
          zones={[
            { to: 1,      color: COL.bgGrn },
            { to: 4,      color: COL.bgAmb },
            { to: slaMax, color: COL.bgRed },
          ]}
          valueLabel={`${slaValue.toFixed(1)}h`}
          valueColor={lvlColor(slaLevel_)}
          thresholds={[{ at: 1, label: '1h' }, { at: 4, label: '4h' }]}
        />
        {isPro && slaChannelData.length > 0 && (
          <>
            <Divider label="Por Canal" />
            <DocBars data={slaChannelData} max={slaMax} unit="h" p1={1} p2={4} higherBetter={false} />
          </>
        )}
      </Card>

      {/* ── KPI 31 — Margem por Serviço / Procedimento (PRO+, full width) ──── */}
      {isPro && (
        <Card title="Margem por Serviço / Procedimento (%)" fullWidth
          subtitle="Margem líquida por tipo de procedimento · ranqueado do maior para o menor">
          <ProcBars data={procData.length > 0 ? procData : []} target={PROC_TARGET} />
        </Card>
      )}

    </div>
  );
}
