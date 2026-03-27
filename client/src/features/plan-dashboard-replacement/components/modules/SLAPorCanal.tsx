import { useEffect, useState } from 'react';

export interface SLAChannel {
  name: string;
  hours: number;   // average response time in hours
  leads: number;   // volume of leads from this channel
}

interface Props {
  channels: SLAChannel[];
  title?: string;
}

const H_BAR   = 24;
const MAX_BAR = 85;

function slaColor(h: number) { return h < 1 ? '#16A34A' : h <= 4 ? '#F59E0B' : '#DC2626'; }
function slaLevel(h: number): 'P1' | 'P2' | 'P3' { return h < 1 ? 'P3' : h <= 4 ? 'P2' : 'P1'; }
function slaBadge(l: 'P1' | 'P2' | 'P3') {
  return l === 'P3' ? { bg: '#D1FAE5', text: '#065F46' }
    : l === 'P2'    ? { bg: '#FEF3C7', text: '#92400E' }
    :                 { bg: '#FEE2E2', text: '#991B1B' };
}
function fmtH(h: number) { return `${h.toFixed(1)}h`; }

export function SLAPorCanal({ channels, title }: Props) {
  const [animated, setAnimated]     = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile]     = useState(false);

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

  // ── Calculated ───────────────────────────────────────────────────────────────
  const sorted     = [...channels].sort((a, b) => b.hours - a.hours); // worst → best
  const totalLeads = sorted.reduce((s, c) => s + c.leads, 0);
  const average    = totalLeads > 0
    ? sorted.reduce((s, c) => s + c.hours * c.leads, 0) / totalLeads
    : 0;
  const worst   = sorted[0];
  const best    = sorted[sorted.length - 1];
  const maxHours = worst.hours > 0 ? worst.hours : 1;

  // Reference positions (% of bar area)
  const ref1hPct = Math.min(MAX_BAR, (1 / maxHours) * MAX_BAR);
  const ref4hPct = Math.min(MAX_BAR, (4 / maxHours) * MAX_BAR);
  const avgPct   = Math.min(MAX_BAR, (average / maxHours) * MAX_BAR);

  // ── Header badge ──────────────────────────────────────────────────────────────
  const avgLvl = slaLevel(average);
  const avgBadge = avgLvl === 'P3'
    ? { label: 'P3 — OK',      bg: '#D1FAE5', text: '#065F46' }
    : avgLvl === 'P2'
    ? { label: 'P2 — ATENÇÃO', bg: '#FEF3C7', text: '#92400E' }
    : { label: 'P1 — CRÍTICO', bg: '#FEE2E2', text: '#991B1B' };

  // ── Action insight ────────────────────────────────────────────────────────────
  const hasP1  = sorted.some(c => c.hours > 4);
  const allGood = sorted.every(c => c.hours < 1);
  const insight = hasP1
    ? { bg: '#FEF2F2', border: '#DC2626',
        text: `🔴 ${worst.name} com SLA crítico — leads deste canal esfriando antes da primeira resposta` }
    : !allGood
    ? { bg: '#FFFBEB', border: '#F59E0B',
        text: '⚠️ Todos os canais acima da meta — revisar protocolo de resposta da recepção' }
    : { bg: '#F0FDF4', border: '#16A34A',
        text: '✓ Todos os canais dentro do SLA' };

  const labelW = isMobile ? 80 : 110;

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', lineHeight: 1.3 }}>
          {title ?? 'SLA de Resposta ao Lead por Canal'}
        </span>
        <span style={{
          padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.06em', background: avgBadge.bg, color: avgBadge.text,
        }}>
          {avgBadge.label}
        </span>
        <span style={{ fontSize: 24, fontWeight: 800, color: slaColor(average), marginLeft: 'auto' }}>
          {fmtH(average)}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 4 }}>
        Tempo médio entre contato do lead e primeira resposta da recepção&nbsp;·&nbsp;meta &lt; 1h
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 8, paddingTop: 28 }}>
        {sorted.map((ch, i) => {
          const color = slaColor(ch.hours);
          const level = slaLevel(ch.hours);
          const badge = slaBadge(level);
          const barW  = (ch.hours / maxHours) * MAX_BAR;
          const isHov = hoveredIdx === i;

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
                  fontSize: 13, color: '#374151', fontWeight: 500,
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
                  borderRadius: '0 5px 5px 0',
                  transition: animated ? `width 500ms ease-out ${i * 80}ms` : 'none',
                }} />

                {/* Reference line — meta 1h (green) */}
                {ref1hPct <= MAX_BAR && (
                  <div style={{
                    position: 'absolute', left: `${ref1hPct}%`,
                    top: 0, height: '100%', width: 0,
                    borderLeft: '1.5px dashed #16A34A', pointerEvents: 'none',
                  }}>
                    {i === 0 && (
                      <div style={{
                        position: 'absolute', bottom: '100%', left: '50%',
                        transform: 'translateX(-50%)', marginBottom: 6,
                        background: '#fff', border: '1px solid #86EFAC',
                        borderRadius: 20, padding: '2px 8px',
                        fontSize: 11, fontWeight: 700, color: '#16A34A',
                        whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}>
                        meta 1h
                      </div>
                    )}
                  </div>
                )}

                {/* Reference line — P1 >4h (red) */}
                {ref4hPct <= MAX_BAR && (
                  <div style={{
                    position: 'absolute', left: `${ref4hPct}%`,
                    top: 0, height: '100%', width: 0,
                    borderLeft: '1.5px dashed #DC2626', pointerEvents: 'none',
                  }}>
                    {i === 0 && (
                      <div style={{
                        position: 'absolute', bottom: '100%', left: '50%',
                        transform: 'translateX(-50%)', marginBottom: 6,
                        background: '#fff', border: '1px solid #FECACA',
                        borderRadius: 20, padding: '2px 8px',
                        fontSize: 11, fontWeight: 700, color: '#DC2626',
                        whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}>
                        P1 &gt;4h
                      </div>
                    )}
                  </div>
                )}

                {/* Weighted average line (solid dark) */}
                <div style={{
                  position: 'absolute', left: `${avgPct}%`,
                  top: 0, height: '100%', width: 0,
                  borderLeft: '2px solid #1E293B', pointerEvents: 'none',
                }}>
                  {i === 0 && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: '50%',
                      transform: 'translateX(-50%)', marginBottom: 6,
                      background: '#fff', border: '1px solid #e2e8f0',
                      borderRadius: 20, padding: '2px 8px',
                      fontSize: 11, fontWeight: 600, color: '#475569',
                      whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    }}>
                      média {fmtH(average)}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: value + badge */}
              <div style={{
                width: 72, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{fmtH(ch.hours)}</span>
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
                  minWidth: 180,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{ch.name}</div>
                  <div>SLA médio: <strong>{fmtH(ch.hours)}</strong></div>
                  <div>Volume: <strong>{ch.leads} leads</strong></div>
                  <div>
                    Status:{' '}
                    <strong style={{ color: slaColor(ch.hours) }}>
                      {level === 'P3' ? '✓ Dentro do SLA' : level === 'P2' ? '⚠ Atenção' : '🔴 Crítico'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Gap indicator ────────────────────────────────────────────────────── */}
      {worst.name !== best.name && (
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 12 }}>
          Pior canal:{' '}
          <strong style={{ color: '#6B7280' }}>{worst.name}</strong>{' '}{fmtH(worst.hours)}
          {' · '}Melhor:{' '}
          <strong style={{ color: '#6B7280' }}>{best.name}</strong>{' '}{fmtH(best.hours)}
          {' · '}Gap:{' '}
          <strong style={{ color: '#6B7280' }}>{fmtH(worst.hours - best.hours)}</strong>
        </div>
      )}

      {/* ── Action insight ────────────────────────────────────────────────────── */}
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
