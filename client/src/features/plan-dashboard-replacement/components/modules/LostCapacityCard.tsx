import { useEffect, useRef, useState } from 'react';

interface Props {
  noShow: number;
  cancelamentoTardio: number;
  title?: string;
}

const MAX = 30;
const P1 = 8;
const P3 = 15;

export function LostCapacityCard({ noShow, cancelamentoTardio, title }: Props) {
  const total = noShow + cancelamentoTardio;

  // Animation: fill from 0 → actual width on mount
  const [animated, setAnimated] = useState(false);
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    frameRef.current = requestAnimationFrame(() => setAnimated(true));
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, []);

  // Badge
  const badge =
    total < P1  ? { label: 'OK',      bg: '#D1FAE5', text: '#065F46' } :
    total <= P3  ? { label: 'ATENÇÃO', bg: '#FEF3C7', text: '#92400E' } :
                  { label: 'CRÍTICO', bg: '#FEE2E2', text: '#991B1B' };

  // Insight
  const insight =
    noShow > cancelamentoTardio
      ? 'Principal causa: no-show — revisar protocolo de confirmação'
      : cancelamentoTardio > noShow
        ? 'Principal causa: cancelamentos tardios — revisar política de cancelamento'
        : 'No-show e cancelamento tardio em proporção similar';

  // SVG chart layout
  const svgH = 56; // total svg height
  const barY = 24; // top of bar area
  const barH = 20;
  const labelY = barY - 6; // label above markers

  const pct = (v: number) => `${Math.min(100, (v / MAX) * 100)}%`;
  const noShowW  = animated ? pct(noShow)  : '0%';
  const cancelW  = animated ? pct(Math.min(cancelamentoTardio, Math.max(0, total - noShow))) : '0%';
  const totalPct = Math.min(100, (total / MAX) * 100);

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 20,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', lineHeight: 1.3 }}>
          {title ?? 'Perda de Capacidade não Recuperável'}
        </span>
        <span style={{
          padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.06em', background: badge.bg, color: badge.text,
        }}>
          {badge.label}
        </span>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginLeft: 'auto' }}>
          {total.toFixed(1)}%
        </span>
      </div>

      {/* ── Subtitle ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B7280' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
          No-show {noShow.toFixed(1)}%
        </span>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>+</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B7280' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
          Cancelamento tardio {cancelamentoTardio.toFixed(1)}%
        </span>
      </div>

      {/* ── Bullet chart (SVG) ── */}
      <div style={{ marginTop: 16 }}>
        <svg width="100%" height={svgH} style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <clipPath id="lc-bar-clip">
              <rect x="0" y={barY} width="100%" height={barH} rx="4" ry="4" />
            </clipPath>
          </defs>

          {/* Background zones */}
          <rect x="0"          y={barY} width={pct(P1)}       height={barH} fill="#D1FAE5" clipPath="url(#lc-bar-clip)" />
          <rect x={pct(P1)}    y={barY} width={pct(P3 - P1)}  height={barH} fill="#FEF3C7" clipPath="url(#lc-bar-clip)" />
          <rect x={pct(P3)}    y={barY} width={pct(MAX - P3)} height={barH} fill="#FEE2E2" clipPath="url(#lc-bar-clip)" />

          {/* Value bar — stacked: no-show (red) + cancelamento (orange) */}
          <rect
            x="0" y={barY} height={barH}
            width={noShowW}
            fill="#DC2626"
            clipPath="url(#lc-bar-clip)"
            style={{ transition: animated ? 'width 600ms ease-out' : 'none' }}
          />
          <rect
            x={noShowW} y={barY} height={barH}
            width={cancelW}
            fill="#F97316"
            clipPath="url(#lc-bar-clip)"
            style={{ transition: animated ? 'width 600ms ease-out 60ms' : 'none' }}
          />

          {/* Threshold marker at 8% */}
          <line
            x1={pct(P1)} y1={barY - 2} x2={pct(P1)} y2={barY + barH + 2}
            stroke="#16A34A" strokeWidth="1.5" strokeDasharray="3 2"
          />
          <text x={pct(P1)} y={labelY} textAnchor="middle" fontSize="9" fill="#16A34A" fontWeight="600">8%</text>

          {/* Threshold marker at 15% */}
          <line
            x1={pct(P3)} y1={barY - 2} x2={pct(P3)} y2={barY + barH + 2}
            stroke="#DC2626" strokeWidth="1.5" strokeDasharray="3 2"
          />
          <text x={pct(P3)} y={labelY} textAnchor="middle" fontSize="9" fill="#DC2626" fontWeight="600">15%</text>

          {/* Current total marker */}
          {total > 0 && (
            <>
              <line
                x1={`${totalPct}%`} y1={barY - 4}
                x2={`${totalPct}%`} y2={barY + barH + 4}
                stroke="#111827" strokeWidth="2.5"
              />
              {/* Label pill */}
              <g transform={`translate(${totalPct < 85 ? 0 : -44}, 0)`}>
                <rect
                  x={`calc(${totalPct}% + 4px)`} y={barY - 18}
                  width="40" height="16" rx="8"
                  fill="white"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
                />
                <text
                  x={`calc(${totalPct}% + 24px)`} y={barY - 6}
                  textAnchor="middle" fontSize="10" fontWeight="700" fill="#111827"
                >
                  {total.toFixed(1)}%
                </text>
              </g>
            </>
          )}
        </svg>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B7280' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#DC2626', flexShrink: 0 }} />
          No-show
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B7280' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#F97316', flexShrink: 0 }} />
          Cancelamento tardio (&lt; 24h)
        </span>
      </div>

      {/* ── Thresholds line ── */}
      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '6px 0 0' }}>
        Verde &lt; 8%&nbsp;&nbsp;|&nbsp;&nbsp;Amarelo 8–15%&nbsp;&nbsp;|&nbsp;&nbsp;Vermelho &gt; 15%
      </p>

      {/* ── Insight ── */}
      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '6px 0 0', fontStyle: 'italic' }}>
        {insight}
      </p>
    </div>
  );
}
