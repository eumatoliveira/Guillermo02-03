import { useEffect, useState } from 'react';

interface Props {
  leads: number;
  agendamentos: number;
  consultas: number;
  title?: string;
}

function convColor(v: number) {
  return v >= 35 ? '#16A34A' : v >= 20 ? '#EA580C' : '#DC2626';
}
function pillBg(v: number)     { return v >= 22 ? '#F0FDF4' : v >= 12 ? '#FFF7ED' : '#FEF2F2'; }
function pillBorder(v: number) { return v >= 22 ? '#86EFAC' : v >= 12 ? '#FED7AA' : '#FECACA'; }
function pillText(v: number)   { return v >= 22 ? '#16A34A' : v >= 12 ? '#EA580C' : '#DC2626'; }

export function FunilLeadConsulta({ leads, agendamentos, consultas, title }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 560);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Calculated ────────────────────────────────────────────────────────────
  const safeL = Math.max(1, leads);
  const safeA = Math.max(1, agendamentos);
  const convLA = (agendamentos / safeL) * 100;
  const convAC = (consultas    / safeA) * 100;
  const convLC = (consultas    / safeL) * 100;
  const dropLA = leads        - agendamentos;
  const dropAC = agendamentos - consultas;
  const biggestDrop = dropLA > dropAC ? 'LA' : dropAC > dropLA ? 'AC' : 'equal';

  // ── Badge ────────────────────────────────────────────────────────────────
  const badge =
    convLC >= 22 ? { label: 'P1 — OK',      bg: '#D1FAE5', text: '#065F46' }
    : convLC >= 12 ? { label: 'P2 — ATENÇÃO', bg: '#FEF3C7', text: '#92400E' }
    :               { label: 'P3 — CRÍTICO',  bg: '#FEE2E2', text: '#991B1B' };

  // ── Stages & connectors ───────────────────────────────────────────────────
  const stages = [
    { value: leads,        label: 'Leads',       color: '#3B82F6', bg: '#EFF6FF' },
    { value: agendamentos, label: 'Agendamentos', color: '#F97316', bg: '#FFF7ED' },
    { value: consultas,    label: 'Consultas',    color: '#16A34A', bg: '#F0FDF4' },
  ];
  const connectors = [
    { conv: convLA, drop: dropLA },
    { conv: convAC, drop: dropAC },
  ];

  // ── Insight ────────────────────────────────────────────────────────────────
  const insight =
    biggestDrop === 'LA'
      ? { bg: '#FEF3C7', border: '#F59E0B', icon: '⚠️',
          text: 'Maior perda entre Leads → Agendamentos — problema na recepção ou velocidade de resposta.' }
      : biggestDrop === 'AC'
      ? { bg: '#FEE2E2', border: '#DC2626', icon: '🔴',
          text: 'Maior perda entre Agendamentos → Consultas — problema de no-show ou cancelamento.' }
      : { bg: '#F0F9FF', border: '#7DD3FC', icon: 'ℹ️',
          text: 'Perdas distribuídas igualmente entre as duas etapas.' };

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 24,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', lineHeight: 1.3 }}>
          {title ?? 'Funil Lead → Consulta'}
        </span>
        <span style={{
          padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.06em', background: badge.bg, color: badge.text,
        }}>
          {badge.label}
        </span>
        <span style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginLeft: 'auto' }}>
          {convLC.toFixed(1)}%
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
        Taxa de conversão funil completo
      </div>

      {/* ── Funnel ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'flex-start',
        gap: 0,
        marginTop: 20,
      }}>
        {stages.map((s, i) => (
          <StageRow
            key={i}
            stage={s}
            connector={connectors[i]}
            isMobile={isMobile}
            isLast={i === stages.length - 1}
          />
        ))}
      </div>

      {/* ── Insight bar ──────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 16,
        background: insight.bg,
        borderLeft: `3px solid ${insight.border}`,
        borderRadius: '0 8px 8px 0',
        padding: '10px 14px',
        display: 'flex', gap: 8, alignItems: 'flex-start',
        fontSize: 13, color: '#374151', lineHeight: 1.55,
      }}>
        <span style={{ flexShrink: 0, fontSize: 14 }}>{insight.icon}</span>
        <span>{insight.text}</span>
      </div>

      {/* ── Conversion summary pills ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'L→A', value: convLA },
          { label: 'A→C', value: convAC },
          { label: 'L→C', value: convLC },
        ].map(p => (
          <span key={p.label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: pillBg(p.value),
            border: `1px solid ${pillBorder(p.value)}`,
            borderRadius: 20, padding: '4px 12px',
            fontSize: 13, fontWeight: 700,
            color: pillText(p.value),
          }}>
            {p.label}: {p.value.toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StageRowProps {
  stage: { value: number; label: string; color: string; bg: string };
  connector?: { conv: number; drop: number };
  isMobile: boolean;
  isLast: boolean;
}

function StageRow({ stage, connector, isMobile, isLast }: StageRowProps) {
  return (
    <>
      {/* Stage block */}
      <div style={{
        flex: isMobile ? undefined : 1,
        height: 100,
        background: stage.bg,
        borderLeft: `4px solid ${stage.color}`,
        borderRadius: 8,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 6, minWidth: 0,
      }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: stage.color, lineHeight: 1 }}>
          {stage.value.toLocaleString('pt-BR')}
        </span>
        <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{stage.label}</span>
      </div>

      {/* Connector */}
      {!isLast && connector && (
        isMobile
          ? <MobileConnector conv={connector.conv} drop={connector.drop} />
          : <DesktopConnector conv={connector.conv} drop={connector.drop} />
      )}
    </>
  );
}

// ── Desktop connector (horizontal arrow + pill below) ────────────────────────
function DesktopConnector({ conv, drop }: { conv: number; drop: number }) {
  const col = convColor(conv);
  return (
    <div style={{
      width: 88, flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Arrow area — same height as stage blocks */}
      <div style={{
        height: 100,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        width: '100%',
      }}>
        {/* Conversion rate */}
        <span style={{ fontSize: 12, fontWeight: 700, color: col, whiteSpace: 'nowrap' }}>
          {conv.toFixed(1)}%
        </span>
        {/* Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', paddingLeft: 4, paddingRight: 0 }}>
          <div style={{ flex: 1, height: 2, background: col, borderRadius: 1 }} />
          {/* Arrowhead */}
          <div style={{
            width: 0, height: 0,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderLeft: `9px solid ${col}`,
            flexShrink: 0,
          }} />
        </div>
      </div>
      {/* Loss pill below */}
      <LossPill drop={drop} />
    </div>
  );
}

// ── Mobile connector (vertical arrow + pill beside) ──────────────────────────
function MobileConnector({ conv, drop }: { conv: number; drop: number }) {
  const col = convColor(conv);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: '6px 0',
    }}>
      {/* Down arrow + rate */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{conv.toFixed(1)}%</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 2, height: 18, background: col, borderRadius: 1 }} />
          <div style={{
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `9px solid ${col}`,
            flexShrink: 0,
          }} />
        </div>
      </div>
      {/* Loss pill */}
      <LossPill drop={drop} />
    </div>
  );
}

// ── Loss pill ──────────────────────────────────────────────────────────────────
function LossPill({ drop }: { drop: number }) {
  return (
    <div style={{
      background: '#FEF2F2', borderRadius: 10,
      padding: '2px 8px', fontSize: 11,
      color: '#DC2626', fontWeight: 500,
      whiteSpace: 'nowrap',
      border: '1px solid #FECACA',
    }}>
      −{drop.toLocaleString('pt-BR')} perdidos
    </div>
  );
}
