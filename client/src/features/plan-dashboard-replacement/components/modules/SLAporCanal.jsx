import { useEffect, useState } from 'react';

const channels = [
  { name: 'Instagram',  hours: 5.2, leads: 45 },
  { name: 'Google Ads', hours: 3.8, leads: 62 },
  { name: 'WhatsApp',   hours: 2.1, leads: 38 },
  { name: 'Indicação',  hours: 0.8, leads: 29 },
  { name: 'Site',       hours: 0.4, leads: 18 },
];
const average  = 2.6;
const maxHours = 8;

const sorted = [...channels].sort((a, b) => b.hours - a.hours);

function getColor(h) { return h > 4 ? '#DC2626' : h >= 1 ? '#F59E0B' : '#16A34A'; }
function getBadge(h) { return h > 4 ? 'P1'      : h >= 1 ? 'P2'      : 'P3'; }

export default function SLAporCanal() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const hasP1     = sorted.some(c => c.hours > 4);
  const aboveMeta = !hasP1 && average > 1;

  return (
    <div style={{
      background:    '#fff',
      padding:       24,
      borderRadius:  12,
      boxShadow:     '0 1px 3px rgba(0,0,0,0.1)',
      maxWidth:      600,
      fontFamily:    'sans-serif',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
          SLA de Resposta ao Lead por Canal
        </h3>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B', whiteSpace: 'nowrap', lineHeight: 1 }}>
          {average}h
        </span>
      </div>
      <p style={{ margin: '4px 0 20px', fontSize: 13, color: '#9CA3AF' }}>
        Tempo médio entre contato e resposta · meta &lt; 1h
      </p>

      {/* ── Rows ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map((ch) => {
          const c = getColor(ch.hours);
          const b = getBadge(ch.hours);
          const w = (ch.hours / maxHours) * 100;

          return (
            <div key={ch.name} style={{ display: 'flex', alignItems: 'center' }}>

              {/* Col 1 — name */}
              <div style={{ width: 130, flexShrink: 0, textAlign: 'right', paddingRight: 12 }}>
                <div style={{ fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ch.name}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  {ch.leads} leads
                </div>
              </div>

              {/* Col 2 — bar track */}
              <div style={{ flexGrow: 1, position: 'relative' }}>
                <div style={{ height: 24, background: '#F3F4F6', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    height:     '100%',
                    width:      ready ? `${w}%` : '0%',
                    background: c,
                    borderRadius: 4,
                    transition: 'width 500ms ease-out',
                  }} />
                </div>
              </div>

              {/* Col 3 — value + badge */}
              <div style={{ width: 80, flexShrink: 0, paddingLeft: 12, display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: c }}>
                  {ch.hours}h
                </span>
                <span style={{
                  fontSize:     10,
                  fontWeight:   700,
                  padding:      '2px 6px',
                  borderRadius: 10,
                  background:   `${c}20`,
                  color:        c,
                  marginLeft:   6,
                }}>
                  {b}
                </span>
              </div>

            </div>
          );
        })}
      </div>

      {/* ── Insight ────────────────────────────────────────────────────────── */}
      <p style={{
        margin:    '16px 0 0',
        fontSize:  13,
        color:     hasP1 ? '#DC2626' : aboveMeta ? '#F59E0B' : '#16A34A',
      }}>
        {hasP1
          ? '⚠ Canal com SLA crítico — leads esfriando antes da primeira resposta'
          : aboveMeta
          ? '⚠ SLA acima da meta de 1h'
          : '✓ Todos dentro do SLA'}
      </p>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9CA3AF' }}>
        Meta &lt; 1h · P1 &gt; 4h · P2 entre 1–4h · P3 &lt; 1h
      </p>

    </div>
  );
}
