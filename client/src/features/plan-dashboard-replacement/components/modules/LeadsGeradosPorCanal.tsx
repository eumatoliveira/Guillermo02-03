import { useEffect, useRef, useState } from 'react';

export interface LeadChannel {
  name: string;
  color: string;
  data: number[];        // weekly values oldest→newest
  meta: number;          // weekly target for this channel
  isLastPartial?: boolean;
}

interface Props {
  channels: LeadChannel[];
  totalMeta: number;
  total?: number;   // override: pass filtered.length to match funnel exactly
  title?: string;
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
interface SparklineProps {
  data: number[];
  partialValue?: number;
  meta: number;
  color: string;
  animDelay?: number;
}

function Sparkline({ data, partialValue, meta, color, animDelay = 0 }: SparklineProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const upd = () => setW(el.getBoundingClientRect().width);
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // stroke-dashoffset animation after layout is measured
  useEffect(() => {
    if (w < 10 || data.length < 2) return;
    const timer = setTimeout(() => {
      const p = lineRef.current;
      if (!p) return;
      const len = p.getTotalLength();
      if (len < 1) return;
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
      p.style.transition = 'none';
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          p.style.transition = `stroke-dashoffset 600ms ease-out ${animDelay}ms`;
          p.style.strokeDashoffset = '0';
        })
      );
    }, 60);
    return () => clearTimeout(timer);
  }, [w, data, animDelay]);

  const H = 40;
  const allVals  = [...data, ...(partialValue !== undefined ? [partialValue] : [])];
  const n        = allVals.length;
  const yMax     = Math.max(...allVals, meta, 1) * 1.2;
  const toX      = (i: number) => n <= 1 ? w / 2 : (i / (n - 1)) * w;
  const toV      = (v: number) => H - (Math.min(v, yMax) / yMax) * H;
  const metaY    = toV(meta);

  const pts      = data.map((v, i) => [toX(i), toV(v)] as [number, number]);
  const lastPt   = pts[pts.length - 1];
  const partPt   = partialValue !== undefined ? [toX(data.length), toV(partialValue)] as [number, number] : null;

  const linePath = pts.length >= 2
    ? `M ${pts.map(p => p.join(',')).join(' L ')}`
    : '';
  const areaPath = pts.length >= 2
    ? `M ${pts[0][0]},${H} L ${pts.map(p => p.join(',')).join(' L ')} L ${pts[pts.length - 1][0]},${H} Z`
    : '';

  return (
    <div ref={wrapRef} style={{ marginTop: 8 }}>
      {w > 0 && (
        <svg width={w} height={H} style={{ display: 'block', overflow: 'visible' }}>
          {/* Area fill */}
          {areaPath && <path d={areaPath} fill={color} fillOpacity={0.10} />}

          {/* Meta reference line */}
          {metaY > 0 && metaY < H && (
            <line x1={0} y1={metaY} x2={w} y2={metaY}
              stroke="#CBD5E1" strokeWidth={1} strokeDasharray="3 3" />
          )}

          {/* Main trend line (animated) */}
          {linePath && (
            <path ref={lineRef} d={linePath} fill="none" stroke={color} strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Last complete dot */}
          {lastPt && <circle cx={lastPt[0]} cy={lastPt[1]} r={4} fill={color} />}

          {/* Partial: dashed extension + hollow dot */}
          {partPt && lastPt && (
            <>
              <line x1={lastPt[0]} y1={lastPt[1]} x2={partPt[0]} y2={partPt[1]}
                stroke={color} strokeWidth={1.5} strokeDasharray="3 3" strokeOpacity={0.55} />
              <circle cx={partPt[0]} cy={partPt[1]} r={4}
                fill="white" stroke={color} strokeWidth={1.5} strokeOpacity={0.55} />
            </>
          )}
        </svg>
      )}
    </div>
  );
}

// ── Channel mini-card ──────────────────────────────────────────────────────────
interface CardStats {
  ch: LeadChannel;
  completeData: number[];
  latestComplete: number;
  variation: number | null;
  trend: number[];
  partialValue: number | undefined;
  animDelay: number;
}

function ChannelCard({ stats }: { stats: CardStats }) {
  const { ch, latestComplete, variation, trend, partialValue, animDelay } = stats;
  const [hovered, setHovered] = useState(false);

  const pColor =
    latestComplete >= ch.meta         ? '#16A34A'
    : latestComplete >= ch.meta * 0.8 ? '#F59E0B'
    :                                   '#DC2626';
  const pLabel =
    latestComplete >= ch.meta         ? 'P1'
    : latestComplete >= ch.meta * 0.8 ? 'P2'
    :                                   'P3';
  const pBg =
    latestComplete >= ch.meta         ? '#D1FAE5'
    : latestComplete >= ch.meta * 0.8 ? '#FEF3C7'
    :                                   '#FEE2E2';

  const isUp   = variation !== null && variation >= 5;
  const isDown = variation !== null && variation <= -5;
  const varBg  = isUp ? '#DCFCE7' : isDown ? '#FEE2E2' : '#F1F5F9';
  const varCol = isUp ? '#16A34A' : isDown ? '#DC2626' : '#9CA3AF';
  const arrow  = isUp ? '↑' : isDown ? '↓' : '→';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderStyle: 'solid',
        borderWidth: '1px',
        borderLeftWidth: 3,
        borderColor: hovered ? `${ch.color}55` : '#F1F5F9',
        borderLeftColor: ch.color,
        borderRadius: 10,
        padding: 14,
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 150ms ease',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Top row: channel name + P-badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ch.color, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{ch.name}</span>
        </div>
        <span style={{
          background: pBg, color: pColor,
          borderRadius: 999, padding: '2px 7px',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: pColor }} />
          {pLabel}
        </span>
      </div>

      {/* Middle: value + variation pill */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: ch.color, lineHeight: 1 }}>
          {latestComplete.toLocaleString('pt-BR')}
        </span>
        {variation !== null && (
          <span style={{
            background: varBg, color: varCol,
            borderRadius: 12, padding: '2px 7px',
            fontSize: 11, fontWeight: 700,
          }}>
            {arrow}&thinsp;{Math.abs(variation).toFixed(0)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
        Meta: {ch.meta}/sem
      </div>

      {/* Sparkline */}
      <Sparkline
        data={trend}
        partialValue={partialValue}
        meta={ch.meta}
        color={ch.color}
        animDelay={animDelay}
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function LeadsGeradosPorCanal({ channels, totalMeta, total, title }: Props) {
  // Build per-channel stats
  const stats: CardStats[] = channels.map((ch, i) => {
    const completeData  = ch.isLastPartial ? ch.data.slice(0, -1) : ch.data;
    const latestComplete = completeData[completeData.length - 1] ?? 0;
    const previous       = completeData[completeData.length - 2] ?? 0;
    const variation      = previous > 0
      ? ((latestComplete - previous) / previous) * 100
      : null;
    const trend          = completeData.slice(-5);
    const partialValue   = ch.isLastPartial && ch.data.length > 0
      ? ch.data[ch.data.length - 1]
      : undefined;
    return { ch, completeData, latestComplete, variation, trend, partialValue, animDelay: i * 100 };
  });

  const computedTotal = stats.reduce((s, c) => s + c.completeData.reduce((a, b) => a + b, 0), 0);
  const grandTotal    = total ?? computedTotal;
  const numWeeks      = stats[0]?.completeData.length ?? 1;
  const periodMeta    = totalMeta * numWeeks;
  const diff          = grandTotal - periodMeta;
  const diffPct       = periodMeta > 0 ? (diff / periodMeta) * 100 : 0;

  const globalBadge =
    grandTotal >= periodMeta         ? { label: 'P1 — OK',      bg: '#D1FAE5', text: '#065F46' }
    : grandTotal >= periodMeta * 0.8 ? { label: 'P2 — ATENÇÃO', bg: '#FEF3C7', text: '#92400E' }
    :                                  { label: 'P3 — CRÍTICO',  bg: '#FEE2E2', text: '#991B1B' };

  const bestCh = [...stats].sort((a, b) =>
    b.completeData.reduce((s, v) => s + v, 0) - a.completeData.reduce((s, v) => s + v, 0)
  )[0];
  const fallingCh = stats
    .filter(c => c.variation !== null && c.variation <= -5)
    .sort((a, b) => (a.variation ?? 0) - (b.variation ?? 0))[0];

  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', lineHeight: 1.3 }}>
          {title ?? 'Leads Gerados por Canal'}
        </span>
        <span style={{
          padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.06em', background: globalBadge.bg, color: globalBadge.text,
        }}>
          {globalBadge.label}
        </span>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginLeft: 'auto' }}>
          {grandTotal.toLocaleString('pt-BR')}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
        Meta período ({numWeeks} sem):&nbsp;
        <strong style={{ color: '#6B7280', fontWeight: 600 }}>{periodMeta}</strong> leads
        <span style={{ marginLeft: 8, color: '#CBD5E1' }}>({totalMeta}/sem)</span>
      </div>

      {/* ── Channel grid ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
        marginTop: 16,
      }}>
        {stats.map(s => (
          <ChannelCard key={s.ch.name} stats={s} />
        ))}
      </div>

      {/* ── Summary row ────────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 14,
        fontSize: 12, color: '#6B7280',
        display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
      }}>
        <span>Total leads: <strong style={{ color: '#111827' }}>{grandTotal.toLocaleString('pt-BR')}</strong></span>
        <span style={{ color: '#D1D5DB' }}>·</span>
        <span>
          vs meta:&nbsp;
          <strong style={{ color: diff >= 0 ? '#16A34A' : '#DC2626' }}>
            {diff >= 0 ? '+' : ''}{diff.toLocaleString('pt-BR')} ({diffPct.toFixed(0)}%)
          </strong>
        </span>
        {bestCh && (
          <>
            <span style={{ color: '#D1D5DB' }}>·</span>
            <span>
              Melhor canal:&nbsp;
              <strong style={{ color: bestCh.ch.color }}>{bestCh.ch.name}</strong>
            </span>
          </>
        )}
        {fallingCh && (
          <>
            <span style={{ color: '#D1D5DB' }}>·</span>
            <span>
              Em queda:&nbsp;
              <strong style={{ color: '#DC2626' }}>{fallingCh.ch.name}</strong>
              &nbsp;({fallingCh.variation?.toFixed(0)}%)
            </span>
          </>
        )}
      </div>
    </div>
  );
}
