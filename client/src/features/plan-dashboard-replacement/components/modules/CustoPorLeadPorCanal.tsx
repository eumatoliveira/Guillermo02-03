import { useEffect, useRef, useState } from 'react';

export interface CPLChannel {
  name: string;
  cpl: number;    // e.g. 22.0
  leads: number;  // total leads from this channel
}

interface Props {
  channels: CPLChannel[];
  p1: number;   // CPL ≤ p1 → green (cheap)
  p3: number;   // CPL > p3 → red   (expensive)
  title?: string;
}

const H_BAR   = 28;
const MAX_BAR = 85;

function barColor(cpl: number, p1: number, p3: number) {
  return cpl <= p1 ? '#16A34A' : cpl <= p3 ? '#F59E0B' : '#DC2626';
}
function pLevel(cpl: number, p1: number, p3: number): 'P1' | 'P2' | 'P3' {
  return cpl <= p1 ? 'P1' : cpl <= p3 ? 'P2' : 'P3';
}
function pBadge(level: 'P1' | 'P2' | 'P3') {
  return level === 'P1'
    ? { bg: '#D1FAE5', text: '#065F46' }
    : level === 'P2'
    ? { bg: '#FEF3C7', text: '#92400E' }
    : { bg: '#FEE2E2', text: '#991B1B' };
}
function fmtR(v: number) { return `R$${Math.round(v)}`; }

export function CustoPorLeadPorCanal({ channels, p1, p3, title }: Props) {
  const [animated, setAnimated]     = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile]     = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 560);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (channels.length === 0) return null;

  // ── Calculated ──────────────────────────────────────────────────────────────
  const sorted      = [...channels].sort((a, b) => a.cpl - b.cpl); // best → worst
  const totalLeads  = sorted.reduce((s, c) => s + c.leads, 0);
  const average     = totalLeads > 0
    ? sorted.reduce((s, c) => s + c.cpl * c.leads, 0) / totalLeads
    : 0;
  const worst       = sorted[sorted.length - 1];
  const best        = sorted[0];
  const maxCpl      = worst.cpl > 0 ? worst.cpl : 1;

  // Reference line positions as % of bar area
  const p1BarPct  = Math.min(MAX_BAR, (p1  / maxCpl) * MAX_BAR);
  const p3BarPct  = Math.min(MAX_BAR, (p3  / maxCpl) * MAX_BAR);
  const avgBarPct = Math.min(MAX_BAR, (average / maxCpl) * MAX_BAR);

  // ── Header badge ─────────────────────────────────────────────────────────────
  const avgLevel = pLevel(average, p1, p3);
  const avgBadge =
    avgLevel === 'P1' ? { label: 'P1 — OK',      bg: '#D1FAE5', text: '#065F46' }
    : avgLevel === 'P2' ? { label: 'P2 — ATENÇÃO', bg: '#FEF3C7', text: '#92400E' }
    : { label: 'P3 — CRÍTICO', bg: '#FEE2E2', text: '#991B1B' };

  // ── Action insight ────────────────────────────────────────────────────────────
  const hasP3 = sorted.some(c => c.cpl > p3);
  const hasP2 = !hasP3 && sorted.some(c => c.cpl > p1);
  const insight = hasP3
    ? { bg: '#FEF2F2', border: '#DC2626',
        text: `🔴 ${worst.name} com CPL crítico (${fmtR(worst.cpl)}) — revisar alocação de budget ou pausar canal` }
    : hasP2
    ? { bg: '#FFFBEB', border: '#F59E0B',
        text: `⚠️ ${worst.name} acima da meta — otimizar criativos ou segmentação para reduzir CPL` }
    : { bg: '#F0FDF4', border: '#16A34A',
        text: '✓ Todos os canais com CPL dentro do target — manter estratégia atual' };

  const labelW = isMobile ? 90 : 120;

  return (
    <div ref={cardRef} style={{
      background: '#fff', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', lineHeight: 1.3 }}>
          {title ?? 'Custo por Lead (CPL)'}
        </span>
        <span style={{
          padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.06em', background: avgBadge.bg, color: avgBadge.text,
        }}>
          {avgBadge.label}
        </span>
        <span style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginLeft: 'auto' }}>
          {fmtR(average)}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
        Média ponderada por volume de leads&nbsp;·&nbsp;
        <span style={{ color: '#16A34A', fontWeight: 600 }}>P1 ≤ {fmtR(p1)}</span>
        &nbsp;·&nbsp;
        <span style={{ color: '#F59E0B', fontWeight: 600 }}>{fmtR(p1)}–{fmtR(p3)}</span>
        &nbsp;·&nbsp;
        <span style={{ color: '#DC2626', fontWeight: 600 }}>P3 &gt; {fmtR(p3)}</span>
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 16, paddingTop: 24 }}>
        {sorted.map((ch, i) => {
          const color   = barColor(ch.cpl, p1, p3);
          const level   = pLevel(ch.cpl, p1, p3);
          const badge   = pBadge(level);
          const barW    = (ch.cpl / maxCpl) * MAX_BAR;
          const isHov   = hoveredIdx === i;

          return (
            <div
              key={ch.name}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                paddingLeft: 8, paddingTop: 5, paddingBottom: 5,
                borderRadius: 6,
                background: isHov ? 'rgba(0,0,0,0.02)' : 'transparent',
                transition: 'background 150ms ease',
                marginBottom: i < sorted.length - 1 ? 10 : 0,
                position: 'relative',
              }}
            >
              {/* Left label */}
              <div style={{ width: labelW, flexShrink: 0, textAlign: 'right', paddingRight: 8 }}>
                <div style={{
                  fontSize: 13, color: '#111827', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {ch.name}
                </div>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>
                  {ch.leads} leads
                </div>
              </div>

              {/* Bar + reference lines */}
              <div style={{ flex: 1, position: 'relative', height: H_BAR }}>
                {/* Bar */}
                <div style={{
                  height: '100%',
                  width: animated ? `${barW}%` : '0%',
                  background: color,
                  opacity: 0.85,
                  borderRadius: '0 6px 6px 0',
                  transition: animated ? `width 500ms ease-out ${i * 80}ms` : 'none',
                }} />

                {/* P1 reference line (green) */}
                {p1BarPct <= MAX_BAR && (
                  <div style={{
                    position: 'absolute', left: `${p1BarPct}%`,
                    top: 0, height: '100%', width: 0,
                    borderLeft: '1.5px dashed #16A34A',
                    pointerEvents: 'none',
                  }}>
                    {i === 0 && (
                      <div style={{
                        position: 'absolute', bottom: '100%', left: '50%',
                        transform: 'translateX(-50%)', marginBottom: 6,
                        background: '#fff', border: '1px solid #86EFAC',
                        borderRadius: 20, padding: '2px 8px',
                        fontSize: 11, fontWeight: 700, color: '#16A34A',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}>
                        P1 {fmtR(p1)}
                      </div>
                    )}
                  </div>
                )}

                {/* P3 reference line (red) */}
                {p3BarPct <= MAX_BAR && (
                  <div style={{
                    position: 'absolute', left: `${p3BarPct}%`,
                    top: 0, height: '100%', width: 0,
                    borderLeft: '1.5px dashed #DC2626',
                    pointerEvents: 'none',
                  }}>
                    {i === 0 && (
                      <div style={{
                        position: 'absolute', bottom: '100%', left: '50%',
                        transform: 'translateX(-50%)', marginBottom: 6,
                        background: '#fff', border: '1px solid #FECACA',
                        borderRadius: 20, padding: '2px 8px',
                        fontSize: 11, fontWeight: 700, color: '#DC2626',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}>
                        P3 {fmtR(p3)}
                      </div>
                    )}
                  </div>
                )}

                {/* Average line (slate) */}
                <div style={{
                  position: 'absolute', left: `${avgBarPct}%`,
                  top: 0, height: '100%', width: 0,
                  borderLeft: '1.5px dashed #64748B',
                  pointerEvents: 'none',
                }}>
                  {i === 0 && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: '50%',
                      transform: 'translateX(-50%)', marginBottom: 6,
                      background: '#fff', border: '1px solid #e2e8f0',
                      borderRadius: 20, padding: '2px 8px',
                      fontSize: 11, fontWeight: 600, color: '#475569',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    }}>
                      média {fmtR(average)}
                    </div>
                  )}
                </div>
              </div>

              {/* Right label + P-badge */}
              <div style={{
                width: 80, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color }}>{fmtR(ch.cpl)}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: badge.bg, color: badge.text,
                  borderRadius: 999, padding: '1px 5px',
                }}>
                  {level}
                </span>
              </div>

              {/* Hover tooltip */}
              {isHov && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: labelW + 16,
                  marginBottom: 6,
                  background: '#1f2937', color: '#fff',
                  borderRadius: 6, padding: '8px 12px',
                  fontSize: 12, lineHeight: 1.6,
                  pointerEvents: 'none', zIndex: 20,
                  minWidth: 200,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{ch.name}</div>
                  <div>CPL: {fmtR(ch.cpl)}</div>
                  <div>{ch.leads} leads no período</div>
                  <div>Investimento estimado: {fmtR(ch.cpl * ch.leads)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Gap indicator ───────────────────────────────────────────────────── */}
      {worst.name !== best.name && (
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 12 }}>
          Diferença entre melhor e pior canal:{' '}
          <strong style={{ color: '#6B7280' }}>{best.name}</strong> {fmtR(best.cpl)} vs{' '}
          <strong style={{ color: '#6B7280' }}>{worst.name}</strong> {fmtR(worst.cpl)}{' '}
          → gap de{' '}
          <strong style={{ color: '#6B7280' }}>{fmtR(worst.cpl - best.cpl)}</strong>
        </div>
      )}

      {/* ── Action insight ───────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 16,
        background: insight.bg,
        borderLeft: `3px solid ${insight.border}`,
        borderRadius: '0 8px 8px 0',
        padding: '10px 14px',
        fontSize: 13, color: '#374151', lineHeight: 1.55,
      }}>
        {insight.text}
      </div>
    </div>
  );
}
