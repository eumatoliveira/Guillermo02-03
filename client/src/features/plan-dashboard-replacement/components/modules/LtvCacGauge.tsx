import { useEffect, useState } from 'react';

export interface LtvCacChannel {
  name: string;
  ratio: number;
  color: string;
}

interface Props {
  ratio: number;
  channels: LtvCacChannel[];
  title?: string;
}

// ── SVG geometry ──────────────────────────────────────────────────────────────
const CX = 140, CY = 148;
const RO = 108, RI = 80;
const RC = (RO + RI) / 2;  // 94 — stroke centerline
const SW = RO - RI;         // 28 — stroke width

function toXY(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [
    +(CX + r * Math.cos(rad)).toFixed(2),
    +(CY - r * Math.sin(rad)).toFixed(2),
  ];
}

// CW arc in screen coords (sweep-flag=1), startDeg > endDeg
function arc(startDeg: number, endDeg: number): string {
  const [sx, sy] = toXY(RC, startDeg);
  const [ex, ey] = toXY(RC, endDeg);
  const large = startDeg - endDeg >= 180 ? 1 : 0;
  return `M ${sx},${sy} A ${RC},${RC} 0 ${large},1 ${ex},${ey}`;
}

function pLevel(r: number): 'P1' | 'P2' | 'P3' {
  return r >= 3 ? 'P3' : r >= 2 ? 'P2' : 'P1';
}

function pPalette(level: 'P1' | 'P2' | 'P3') {
  if (level === 'P3') return { value: '#16A34A', badgeBg: '#D1FAE5', badgeText: '#065F46' };
  if (level === 'P2') return { value: '#D97706', badgeBg: '#FEF3C7', badgeText: '#92400E' };
  return { value: '#DC2626', badgeBg: '#FEE2E2', badgeText: '#991B1B' };
}

// Zone boundary x-positions projected to the arc baseline (using RO=108)
// 180°→32, 120°→86, 90°→140, 0°→248
const ZL_P1_X = (32 + 86) / 2;   // 59
const ZL_P2_X = (86 + 140) / 2;  // 113
const ZL_P3_X = (140 + 248) / 2; // 194
const ZL_Y    = CY + 17;          // 165

export function LtvCacGauge({ ratio, channels, title }: Props) {
  const [needleRot, setNeedleRot] = useState(-90);
  const [z1, setZ1] = useState(false);
  const [z2, setZ2] = useState(false);
  const [z3, setZ3] = useState(false);

  useEffect(() => {
    const capped = Math.min(ratio, 6);
    const t1 = setTimeout(() => setZ1(true), 100);
    const t2 = setTimeout(() => setZ2(true), 400);
    const t3 = setTimeout(() => setZ3(true), 700);
    const t4 = setTimeout(() => setNeedleRot(capped * 30 - 90), 200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [ratio]);

  const level  = pLevel(ratio);
  const colors = pPalette(level);
  const badge  = level === 'P3'
    ? { label: 'BOM',     bg: '#D1FAE5', text: '#065F46' }
    : level === 'P2'
    ? { label: 'ATENÇÃO', bg: '#FEF3C7', text: '#92400E' }
    : { label: 'CRÍTICO', bg: '#FEE2E2', text: '#991B1B' };

  const displayRatio = ratio > 6 ? `>${ratio.toFixed(1)}×` : `${ratio.toFixed(1)}×`;
  const needleLen    = RI - 8;  // 72px

  const sorted = [...channels].sort((a, b) => b.ratio - a.ratio);

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
            {title ?? 'LTV / CAC'}
          </span>
          <span style={{
            padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.06em', background: badge.bg, color: badge.text,
          }}>
            {badge.label}
          </span>
          <span style={{
            fontSize: 28, fontWeight: 800, color: colors.value,
            marginLeft: 'auto', lineHeight: 1,
          }}>
            {displayRatio}
          </span>
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
          Valor do paciente ÷ custo de aquisição
        </div>
      </div>

      {/* ── Gauge ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg viewBox="0 0 280 175" width={280} height={175}
          style={{ display: 'block', overflow: 'visible' }}>

          {/* Gray background track */}
          <path d={arc(180, 0)} fill="none" stroke="#F1F5F9"
            strokeWidth={SW} strokeLinecap="butt" />

          {/* Zone 1: 0–2× red */}
          <path d={arc(180, 120)} fill="none" stroke="#FEE2E2"
            strokeWidth={SW} strokeLinecap="round"
            style={{ opacity: z1 ? 1 : 0, transition: 'opacity 300ms ease-out' }} />

          {/* Zone 2: 2–3× amber */}
          <path d={arc(120, 90)} fill="none" stroke="#FEF3C7"
            strokeWidth={SW} strokeLinecap="round"
            style={{ opacity: z2 ? 1 : 0, transition: 'opacity 300ms ease-out' }} />

          {/* Zone 3: 3–6× green */}
          <path d={arc(90, 0)} fill="none" stroke="#DCFCE7"
            strokeWidth={SW} strokeLinecap="round"
            style={{ opacity: z3 ? 1 : 0, transition: 'opacity 300ms ease-out' }} />

          {/* Zone boundary separators */}
          {([120, 90] as const).map(deg => {
            const [ox, oy] = toXY(RO + 1, deg);
            const [ix, iy] = toXY(RI - 1, deg);
            return (
              <line key={deg} x1={ox} y1={oy} x2={ix} y2={iy}
                stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} />
            );
          })}

          {/* Needle */}
          <g style={{
            transform: `rotate(${needleRot}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: 'transform 800ms ease-out',
          }}>
            <line x1={CX} y1={CY} x2={CX} y2={CY - needleLen}
              stroke="#1E293B" strokeWidth={2} strokeLinecap="round" />
            <circle cx={CX} cy={CY - needleLen} r={4} fill="#1E293B" />
          </g>

          {/* Pivot */}
          <circle cx={CX} cy={CY} r={6} fill="#475569" />
          <circle cx={CX} cy={CY} r={3} fill="#fff" />

          {/* Scale labels */}
          <text x={28} y={CY + 5} textAnchor="end" fontSize={11} fill="#9CA3AF"
            fontFamily="Inter, system-ui, sans-serif">0×</text>
          <text x={252} y={CY + 5} textAnchor="start" fontSize={11} fill="#9CA3AF"
            fontFamily="Inter, system-ui, sans-serif">6×</text>
          <text x={CX} y={CY - RO - 8} textAnchor="middle" fontSize={11} fill="#9CA3AF"
            fontFamily="Inter, system-ui, sans-serif">3×</text>

          {/* Zone labels */}
          <text x={ZL_P1_X} y={ZL_Y} textAnchor="middle" fontSize={10}
            fontWeight="700" fill="#DC2626" fontFamily="Inter, system-ui, sans-serif">P1</text>
          <text x={ZL_P2_X} y={ZL_Y} textAnchor="middle" fontSize={10}
            fontWeight="700" fill="#D97706" fontFamily="Inter, system-ui, sans-serif">P2</text>
          <text x={ZL_P3_X} y={ZL_Y} textAnchor="middle" fontSize={10}
            fontWeight="700" fill="#16A34A" fontFamily="Inter, system-ui, sans-serif">P3</text>
        </svg>
      </div>

      {/* ── Channel table ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
        {sorted.map((ch, i) => {
          const lv = pLevel(ch.ratio);
          const { value: vc, badgeBg: bb, badgeText: bt } = pPalette(lv);
          return (
            <div key={ch.name} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 8px', borderRadius: 6,
              background: Math.floor(i / 2) % 2 === 0 ? '#fff' : '#FAFAFA',
              borderBottom: i < sorted.length - 2 ? '1px solid #F8FAFC' : 'none',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: ch.color, flexShrink: 0, display: 'inline-block',
              }} />
              <span style={{
                flex: 1, fontSize: 12, color: '#374151', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {ch.name}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: vc, flexShrink: 0 }}>
                {ch.ratio.toFixed(1)}×
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, background: bb, color: bt,
                borderRadius: 999, padding: '1px 5px', flexShrink: 0,
              }}>
                {lv}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 14, paddingTop: 10, borderTop: '1px solid #F1F5F9',
        fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5,
      }}>
        quanto maior o ratio, mais sustentável a captação
      </div>
    </div>
  );
}
