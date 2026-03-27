import { useEffect, useState } from 'react';

export interface FunnelChannel {
  name: string;
  color: string;
  leads: number;
  agendamentos: number;
  consultas: number;
}

interface Props {
  channels: FunnelChannel[];
  title?: string;
}

// ── Thresholds ────────────────────────────────────────────────────────────────
const LA_P1 = 35;  const LA_P2 = 20;
const AC_P1 = 75;  const AC_P2 = 55;
const BAR_H = 180; // px — height of bar area

function convColor(v: number, p1: number, p2: number) {
  return v >= p1 ? '#16A34A' : v >= p2 ? '#F59E0B' : '#DC2626';
}
function convLevel(v: number, p1: number, p2: number): 'P1' | 'P2' | 'P3' {
  return v >= p1 ? 'P1' : v >= p2 ? 'P2' : 'P3';
}
function levelBadge(level: 'P1' | 'P2' | 'P3') {
  return level === 'P1'
    ? { bg: '#D1FAE5', text: '#065F46' }
    : level === 'P2'
    ? { bg: '#FEF3C7', text: '#92400E' }
    : { bg: '#FEE2E2', text: '#991B1B' };
}

// ── Single panel (vertical bars) ──────────────────────────────────────────────
interface PanelProps {
  label: string;
  labelColor: string;
  rows: Array<{
    name: string; color: string;
    value: number; leads: number;
    agendamentos: number; consultas: number;
  }>;
  p1: number; p2: number;
  p1Label: string; p2Label: string;
  animOffset: number;
  hoveredName: string | null;
  setHoveredName: (n: string | null) => void;
}

function Panel({
  label, labelColor, rows, p1, p2, p1Label, p2Label,
  animOffset, hoveredName, setHoveredName,
}: PanelProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), animOffset);
    return () => clearTimeout(t);
  }, [animOffset]);

  // Reference line positions from top of bar area
  const p1LineTop = BAR_H * (1 - p1 / 100);
  const p2LineTop = BAR_H * (1 - p2 / 100);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Panel header */}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        color: labelColor, textTransform: 'uppercase', marginBottom: 16,
      }}>
        {label}
      </div>

      {/* Bar area — paddingTop reserves space for labels above tallest bar */}
      <div style={{ position: 'relative', paddingTop: 34 }}>
        <div style={{ position: 'relative', height: BAR_H }}>

          {/* P1 reference line (green) */}
          <div style={{
            position: 'absolute', left: 0, right: 52, top: p1LineTop,
            borderTop: '1.5px dashed #16A34A',
            pointerEvents: 'none', zIndex: 2,
          }}>
            <div style={{
              position: 'absolute', left: '100%', top: -11, marginLeft: 6,
              background: '#fff', border: '1px solid #86EFAC',
              borderRadius: 20, padding: '1px 6px',
              fontSize: 10, fontWeight: 700, color: '#16A34A',
              whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              {p1Label}
            </div>
          </div>

          {/* P2 reference line (amber) */}
          <div style={{
            position: 'absolute', left: 0, right: 52, top: p2LineTop,
            borderTop: '1.5px dashed #F59E0B',
            pointerEvents: 'none', zIndex: 2,
          }}>
            <div style={{
              position: 'absolute', left: '100%', top: -11, marginLeft: 6,
              background: '#fff', border: '1px solid #FDE68A',
              borderRadius: 20, padding: '1px 6px',
              fontSize: 10, fontWeight: 700, color: '#D97706',
              whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              {p2Label}
            </div>
          </div>

          {/* Bars row */}
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            height: '100%', gap: 6, paddingRight: 58,
          }}>
            {rows.map((ch, i) => {
              const barH    = (ch.value / 100) * BAR_H;
              const level   = convLevel(ch.value, p1, p2);
              const badge   = levelBadge(level);
              const isHov   = hoveredName === ch.name;
              const convLA  = ch.leads > 0 ? (ch.agendamentos / ch.leads) * 100 : 0;
              const convAC  = ch.agendamentos > 0 ? (ch.consultas / ch.agendamentos) * 100 : 0;
              const convLC  = ch.leads > 0 ? (ch.consultas / ch.leads) * 100 : 0;

              return (
                <div
                  key={ch.name}
                  onMouseEnter={() => setHoveredName(ch.name)}
                  onMouseLeave={() => setHoveredName(null)}
                  style={{
                    flex: 1, position: 'relative', height: '100%',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    cursor: 'default',
                  }}
                >
                  {/* Value + badge — fixed above bar's final position */}
                  <div style={{
                    position: 'absolute', left: 0, right: 0,
                    bottom: barH + 5,
                    textAlign: 'center', pointerEvents: 'none', zIndex: 3,
                  }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: ch.color, lineHeight: 1.25,
                    }}>
                      {ch.value.toFixed(1)}%
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      background: badge.bg, color: badge.text,
                      borderRadius: 999, padding: '1px 4px',
                      display: 'inline-block', marginTop: 1,
                    }}>
                      {level}
                    </span>
                  </div>

                  {/* Bar */}
                  <div style={{
                    width: '50%',
                    height: animated ? barH : 0,
                    background: ch.color,
                    opacity: isHov ? 1 : 0.82,
                    borderRadius: '4px 4px 0 0',
                    transition: animated
                      ? `height 500ms ease-out ${i * 80}ms, opacity 150ms ease`
                      : 'opacity 150ms ease',
                    outline: isHov ? `2px solid ${ch.color}` : 'none',
                    outlineOffset: 1,
                  }} />

                  {/* Hover tooltip */}
                  {isHov && (
                    <div style={{
                      position: 'absolute',
                      bottom: Math.max(barH + 10, 60),
                      left: '50%', transform: 'translateX(-50%)',
                      background: '#1f2937', color: '#fff',
                      borderRadius: 6, padding: '8px 12px',
                      fontSize: 12, lineHeight: 1.7,
                      pointerEvents: 'none', zIndex: 30,
                      minWidth: 200,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                      whiteSpace: 'nowrap',
                    }}>
                      <div style={{ fontWeight: 700, color: ch.color, marginBottom: 3 }}>
                        {ch.name}
                      </div>
                      <div>Leads: <strong>{ch.leads}</strong></div>
                      <div>
                        Agendamentos: <strong>{ch.agendamentos}</strong>
                        <span style={{ color: '#9CA3AF' }}> ({convLA.toFixed(1)}%)</span>
                      </div>
                      <div>
                        Consultas: <strong>{ch.consultas}</strong>
                        <span style={{ color: '#9CA3AF' }}> ({convAC.toFixed(1)}%)</span>
                      </div>
                      <div style={{ marginTop: 3, borderTop: '1px solid #374151', paddingTop: 3 }}>
                        Funil completo:{' '}
                        <strong style={{ color: convColor(convLC, 22, 12) }}>
                          {convLC.toFixed(1)}%
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel name labels below bars */}
        <div style={{
          display: 'flex', gap: 6, marginTop: 8, paddingRight: 58,
        }}>
          {rows.map(ch => (
            <div
              key={ch.name}
              style={{
                flex: 1, textAlign: 'center',
                fontSize: 10, color: '#374151', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: ch.color,
                display: 'inline-block', marginRight: 2, verticalAlign: 'middle',
              }} />
              {ch.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ConversaoPorCanal({ channels, title }: Props) {
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [isMobile, setIsMobile]       = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (channels.length === 0) return null;

  // ── Per-channel calculations ─────────────────────────────────────────────────
  const enriched = channels.map(ch => ({
    ...ch,
    convLA: ch.leads > 0        ? (ch.agendamentos / ch.leads)        * 100 : 0,
    convAC: ch.agendamentos > 0 ? (ch.consultas    / ch.agendamentos)  * 100 : 0,
    convLC: ch.leads > 0        ? (ch.consultas    / ch.leads)         * 100 : 0,
  }));

  // Sort worst → best by convLA (same order for both panels)
  const sorted = [...enriched].sort((a, b) => a.convLA - b.convLA);

  // ── Summary pills ─────────────────────────────────────────────────────────────
  const bestOverall = [...enriched].sort((a, b) => b.convLC - a.convLC)[0];
  const worstLA     = [...enriched].sort((a, b) => a.convLA - b.convLA)[0];
  const worstAC     = [...enriched].sort((a, b) => a.convAC - b.convAC)[0];

  const laRows = sorted.map(ch => ({
    name: ch.name, color: ch.color, value: ch.convLA,
    leads: ch.leads, agendamentos: ch.agendamentos, consultas: ch.consultas,
  }));
  const acRows = sorted.map(ch => ({
    name: ch.name, color: ch.color, value: ch.convAC,
    leads: ch.leads, agendamentos: ch.agendamentos, consultas: ch.consultas,
  }));

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
          {title ?? 'Conversão por Canal — Funil Comparativo'}
        </span>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
          Lead → Agendamento&nbsp;&nbsp;·&nbsp;&nbsp;Agendamento → Consulta
        </div>
      </div>

      {/* ── Two panels ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 32 : 0,
      }}>
        <Panel
          label="Lead → Agendamento"
          labelColor="#F97316"
          rows={laRows}
          p1={LA_P1} p2={LA_P2}
          p1Label={`P1 ≥${LA_P1}%`}
          p2Label={`P2 ≥${LA_P2}%`}
          animOffset={0}
          hoveredName={hoveredName}
          setHoveredName={setHoveredName}
        />

        {/* Divider */}
        {!isMobile && (
          <div style={{
            width: 1, background: '#F1F5F9',
            margin: '0 32px', flexShrink: 0,
            alignSelf: 'stretch',
          }} />
        )}

        <Panel
          label="Agendamento → Consulta"
          labelColor="#16A34A"
          rows={acRows}
          p1={AC_P1} p2={AC_P2}
          p1Label={`P1 ≥${AC_P1}%`}
          p2Label={`P2 ≥${AC_P2}%`}
          animOffset={200}
          hoveredName={hoveredName}
          setHoveredName={setHoveredName}
        />
      </div>

      {/* ── Summary pills ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18,
        paddingTop: 14, borderTop: '1px solid #F1F5F9',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: '#F0FDF4', border: '1px solid #86EFAC',
          borderRadius: 20, padding: '5px 12px',
          fontSize: 12, fontWeight: 600, color: '#065F46',
        }}>
          ✓ Melhor funil:{' '}
          <span style={{ color: bestOverall.color, fontWeight: 700 }}>
            {bestOverall.name}
          </span>
          &nbsp;({bestOverall.convLA.toFixed(0)}% → {bestOverall.convAC.toFixed(0)}%)
        </span>

        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: worstLA.convLA < LA_P2 ? '#FEF2F2' : '#FFFBEB',
          border: `1px solid ${worstLA.convLA < LA_P2 ? '#FECACA' : '#FDE68A'}`,
          borderRadius: 20, padding: '5px 12px',
          fontSize: 12, fontWeight: 600,
          color: worstLA.convLA < LA_P2 ? '#991B1B' : '#92400E',
        }}>
          ⚠ Pior L→A:{' '}
          <span style={{ color: worstLA.color, fontWeight: 700 }}>
            {worstLA.name}
          </span>
          &nbsp;{worstLA.convLA.toFixed(1)}%
        </span>

        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: worstAC.convAC < AC_P2 ? '#FEF2F2' : '#FFFBEB',
          border: `1px solid ${worstAC.convAC < AC_P2 ? '#FECACA' : '#FDE68A'}`,
          borderRadius: 20, padding: '5px 12px',
          fontSize: 12, fontWeight: 600,
          color: worstAC.convAC < AC_P2 ? '#991B1B' : '#92400E',
        }}>
          ⚠ Pior A→C:{' '}
          <span style={{ color: worstAC.color, fontWeight: 700 }}>
            {worstAC.name}
          </span>
          &nbsp;{worstAC.convAC.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
