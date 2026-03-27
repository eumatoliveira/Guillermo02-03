import { useEffect, useRef, useState } from 'react';

export interface NoShowChannel {
  name: string;
  noshow: number;   // percentage, e.g. 22.0
  total: number;    // total appointments from this channel
}

interface Props {
  channels: NoShowChannel[];
  title?: string;
}

const H_BAR     = 28;
const MAX_BAR   = 85; // worst channel fills 85% of bar area width

function barColor(v: number) {
  return v > 20 ? '#DC2626' : v >= 10 ? '#F59E0B' : '#16A34A';
}
function pLevel(v: number): 'P1' | 'P2' | 'P3' {
  return v < 10 ? 'P1' : v <= 20 ? 'P2' : 'P3';
}
function pBadge(level: 'P1' | 'P2' | 'P3') {
  return level === 'P3'
    ? { bg: '#FEE2E2', text: '#991B1B' }
    : level === 'P2'
    ? { bg: '#FEF3C7', text: '#92400E' }
    : { bg: '#D1FAE5', text: '#065F46' };
}

export function NoShowPorCanalDeOrigem({ channels, title }: Props) {
  const [animated, setAnimated]   = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile]   = useState(false);
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
  const sorted     = [...channels].sort((a, b) => b.noshow - a.noshow);
  const totalAppts = sorted.reduce((s, c) => s + c.total, 0);
  const average    = totalAppts > 0
    ? sorted.reduce((s, c) => s + c.noshow * c.total, 0) / totalAppts
    : 0;
  const worst      = sorted[0];
  const best       = sorted[sorted.length - 1];
  const maxNoshow  = worst.noshow > 0 ? worst.noshow : 1;
  const avgBarPct  = (average / maxNoshow) * MAX_BAR;

  // ── Header badge ─────────────────────────────────────────────────────────────
  const avgLevel = pLevel(average);
  const avgBadge =
    avgLevel === 'P3' ? { label: 'P3 — CRÍTICO', bg: '#FEE2E2', text: '#991B1B' }
    : avgLevel === 'P2' ? { label: 'P2 — ATENÇÃO', bg: '#FEF3C7', text: '#92400E' }
    : { label: 'P1 — OK', bg: '#D1FAE5', text: '#065F46' };

  // ── Action insight ────────────────────────────────────────────────────────────
  const hasP3 = sorted.some(c => c.noshow > 20);
  const hasP2 = !hasP3 && sorted.some(c => c.noshow >= 10);
  const insight = hasP3
    ? { bg: '#FEF2F2', border: '#DC2626',
        text: `🔴 ${worst.name} com no-show crítico — reforçar protocolo de confirmação para leads deste canal` }
    : hasP2
    ? { bg: '#FFFBEB', border: '#F59E0B',
        text: `⚠️ ${worst.name} acima da média — avaliar qualificação dos leads e cadência de confirmação` }
    : { bg: '#F0FDF4', border: '#16A34A',
        text: '✓ Todos os canais dentro do threshold aceitável' };

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
          {title ?? 'No-show por Canal de Origem'}
        </span>
        <span style={{
          padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.06em', background: avgBadge.bg, color: avgBadge.text,
        }}>
          {avgBadge.label}
        </span>
        <span style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginLeft: 'auto' }}>
          {average.toFixed(1)}%
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
        Média ponderada por volume de agendamentos
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      {/* paddingTop reserves space above first bar for the avg-line label */}
      <div style={{ marginTop: 16, paddingTop: 24 }}>
        {sorted.map((ch, i) => {
          const color      = barColor(ch.noshow);
          const level      = pLevel(ch.noshow);
          const badge      = pBadge(level);
          const barW       = (ch.noshow / maxNoshow) * MAX_BAR;
          const isHov      = hoveredIdx === i;
          const noShowCnt  = Math.round(ch.total * ch.noshow / 100);

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
                  {ch.total} agendamentos
                </div>
              </div>

              {/* Bar + reference line */}
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

                {/* Average reference line — same pct in every row = continuous visual */}
                <div style={{
                  position: 'absolute',
                  left: `${avgBarPct}%`,
                  top: 0, height: '100%', width: 0,
                  borderLeft: '1.5px dashed #64748B',
                  pointerEvents: 'none',
                }}>
                  {/* Floating label — only on first row */}
                  {i === 0 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginBottom: 6,
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 20,
                      padding: '2px 8px',
                      fontSize: 11, fontWeight: 600,
                      color: '#475569',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    }}>
                      média {average.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Right label + P-badge */}
              <div style={{
                width: 80, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color }}>
                  {ch.noshow.toFixed(1)}%
                </span>
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
                  position: 'absolute',
                  bottom: '100%',
                  left: labelW + 16,
                  marginBottom: 6,
                  background: '#1f2937',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 12, lineHeight: 1.6,
                  pointerEvents: 'none',
                  zIndex: 20,
                  minWidth: 200,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{ch.name}</div>
                  <div>{ch.noshow.toFixed(1)}% no-show</div>
                  <div>{ch.total} agendamentos no período</div>
                  <div>{noShowCnt} pacientes não apareceram</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Gap indicator ───────────────────────────────────────────────────── */}
      {worst.name !== best.name && (
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 12 }}>
          Diferença entre pior e melhor canal:{' '}
          <strong style={{ color: '#6B7280' }}>{worst.name}</strong> {worst.noshow.toFixed(1)}% vs{' '}
          <strong style={{ color: '#6B7280' }}>{best.name}</strong> {best.noshow.toFixed(1)}%{' '}
          → gap de{' '}
          <strong style={{ color: '#6B7280' }}>{(worst.noshow - best.noshow).toFixed(1)}pp</strong>
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
