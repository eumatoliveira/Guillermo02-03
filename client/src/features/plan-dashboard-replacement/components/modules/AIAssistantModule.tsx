import { useState, useRef, useEffect, useCallback } from 'react';
import type { KPISummary } from '../../data/dashboardTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CustomFact {
  id: string;
  label: string;
  value: string;
}

interface Props {
  kpis: KPISummary;
  fmt: (v: number) => string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY_FACTS = 'glx_ai_facts_v2';
const STORAGE_KEY_CHAT  = 'glx_ai_chat_v2';
const STORAGE_KEY_APIKEY = 'glx_anthropic_key';

const PURPLE      = '#7C3AED';
const PURPLE_MID  = '#8B5CF6';
const PURPLE_LIGHT = '#EDE9FE';

// ─── System Prompt Builder ────────────────────────────────────────────────────

function buildSystemPrompt(kpis: KPISummary, fmt: (v: number) => string, facts: CustomFact[]): string {
  const roi = kpis.totalAdSpend > 0
    ? ((kpis.grossRevenue - kpis.totalAdSpend) / kpis.totalAdSpend) * 100
    : 0;

  const lines = [
    'Você é o **Assistente GLX**, uma IA especializada em análise de performance de clínicas médicas.',
    'Você tem acesso em tempo real aos dados do dashboard desta clínica. Responda sempre com base nesses dados reais.',
    'Seja objetivo, use os números específicos ao responder, inclua ícones (📋💰🚀⚙️) para organizar seções.',
    'Destaque métricas em **negrito**. Use ✅ para meta atingida, ⚠️ para atenção, 🔴 para crítico.',
    'Sempre termine respostas analíticas com recomendações práticas e acionáveis.',
    '',
    '═══ DADOS DO PERÍODO ═══',
    '',
    '📋 AGENDA & NO-SHOW',
    `• Consultas total: ${kpis.total}`,
    `• Realizadas: ${kpis.realized}`,
    `• No-Shows: ${kpis.noShows}`,
    `• Cancelamentos: ${kpis.canceled}`,
    `• Taxa de Ocupação: ${kpis.occupancyRate.toFixed(1)}% (meta > 80%)`,
    `• Taxa de No-Show: ${kpis.noShowRate.toFixed(1)}% (meta < 8%)`,
    `• Confirmações: ${kpis.confirmationRate.toFixed(1)}% (meta > 85%)`,
    `• Lead Time: ${kpis.leadTimeDays.toFixed(1)} dias (meta < 3 dias)`,
    `• Capacidade perdida: ${kpis.lostCapacityRate.toFixed(1)}%`,
    `• Custo estimado de no-show: ${fmt(kpis.noShowEstimatedCost)}`,
    '',
    '💰 FINANCEIRO',
    `• Faturamento Bruto: ${fmt(kpis.grossRevenue)}`,
    `• Receita Líquida: ${fmt(kpis.netRevenue)}`,
    `• Total de custos: ${fmt(kpis.totalCost)}`,
    `• Despesas Fixas: ${fmt(kpis.fixedExpenses)}`,
    `• Margem Líquida: ${kpis.margin.toFixed(1)}% (meta > 20%)`,
    `• EBITDA: ${fmt(kpis.ebitda)}`,
    `• Ticket Médio: ${fmt(kpis.avgTicket)}`,
    `• Inadimplência: ${kpis.inadimplenciaRate.toFixed(1)}% (meta < 4%)`,
    `• Despesas Fixas / Receita: ${kpis.fixedExpenseRatio.toFixed(1)}% (meta < 45%)`,
    `• Break-even: ${fmt(kpis.breakEven)}`,
    `• Perda por cancelamento: ${fmt(kpis.cancellationLoss)}`,
    `• Perda por inadimplência: ${fmt(kpis.inadimplenciaLoss)}`,
    '',
    '🚀 MARKETING & CAPTAÇÃO',
    `• Leads Gerados: ${kpis.leads} (meta > 80)`,
    `• CPL (Custo por Lead): ${fmt(kpis.cpl)} (meta < ${fmt(kpis.avgTicket * 0.25)})`,
    `• CAC (Custo de Aquisição): ${fmt(kpis.avgCAC)}`,
    `• Investimento em Ads: ${fmt(kpis.totalAdSpend)}`,
    `• ROI Estimado: ${roi.toFixed(0)}% (meta > 200%)`,
    '',
    '⚙️ OPERAÇÃO & EXPERIÊNCIA',
    `• NPS Geral: ${kpis.avgNPS.toFixed(1)}/10 (meta > 8,5)`,
    `• Tempo Médio de Espera: ${kpis.avgWait.toFixed(0)} min (meta < 12 min)`,
    `• Taxa de Retorno 90d: ${kpis.returnRate.toFixed(1)}% (meta > 40%)`,
    `• SLA de Resposta ao Lead: ${kpis.slaLeadHours.toFixed(2)}h (meta < 1h)`,
  ];

  if (facts.length > 0) {
    lines.push('');
    lines.push('═══ CONTEXTO PERSONALIZADO DA CLÍNICA ═══');
    facts.forEach(f => lines.push(`• ${f.label}: ${f.value}`));
  }

  lines.push('');
  lines.push('═══ FIM DOS DADOS ═══');

  return lines.join('\n');
}

// ─── Suggested Questions (based on worst KPIs) ───────────────────────────────

function getSuggestions(kpis: KPISummary): string[] {
  const q: string[] = [];
  if (kpis.noShowRate > 8)         q.push('Como reduzir o no-show da clínica?');
  if (kpis.occupancyRate < 80)     q.push('Por que minha ocupação está baixa?');
  if (kpis.margin < 20)            q.push('Como melhorar minha margem líquida?');
  if (kpis.inadimplenciaRate > 4)  q.push('Estratégia para reduzir inadimplência?');
  if (kpis.avgNPS < 8.5)           q.push('Como aumentar o NPS dos pacientes?');
  if (kpis.slaLeadHours > 1)       q.push('Como melhorar o SLA de resposta?');
  q.push('Visão geral da clínica');
  q.push('Quais são as principais prioridades hoje?');
  return q.slice(0, 5);
}

// ─── Simple Markdown Renderer ─────────────────────────────────────────────────

function MD({ text }: { text: string }) {
  return (
    <div style={{ lineHeight: 1.7 }}>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('═══') || line === '') {
          return <div key={i} style={{ height: line === '' ? 6 : 'auto', fontSize: 10, color: '#a0a0a0', marginTop: 4 }}>{line}</div>;
        }
        // Bold
        const parts = line.split(/\*\*([^*]+)\*\*/g);
        const rendered = parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j} style={{ color: 'inherit' }}>{part}</strong> : part
        );
        return <div key={i}>{rendered}</div>;
      })}
    </div>
  );
}

// ─── TypingDots ───────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%', background: PURPLE,
            animation: `glxBounce 1.2s ${i * 0.2}s infinite ease-in-out`,
          }}
        />
      ))}
      <style>{`
        @keyframes glxBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-7px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIAssistantModule({ kpis, fmt }: Props) {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(STORAGE_KEY_APIKEY) ?? '');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_CHAT) || '[]')
        .map((m: Message & { timestamp: string }) => ({ ...m, timestamp: new Date(m.timestamp) }));
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [facts, setFacts] = useState<CustomFact[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_FACTS) || '[]'); }
    catch { return []; }
  });
  const [showRag, setShowRag] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const abortRef    = useRef<AbortController | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isStreaming]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_FACTS, JSON.stringify(facts)); }, [facts]);

  const saveApiKey = useCallback(() => {
    if (!apiKeyInput.trim()) return;
    localStorage.setItem(STORAGE_KEY_APIKEY, apiKeyInput.trim());
    setApiKey(apiKeyInput.trim());
    setApiKeyInput('');
  }, [apiKeyInput]);

  const clearKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_APIKEY);
    setApiKey('');
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming || !apiKey) return;
    setError(null);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    // Placeholder streaming message
    const assistantId = crypto.randomUUID();
    setStreamingId(assistantId);
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

    const abort = new AbortController();
    abortRef.current = abort;

    // Build conversation history for the API (last 20 messages to keep context window manageable)
    const history = [...messages, userMsg]
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: abort.signal,
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          stream: true,
          system: buildSystemPrompt(kpis, fmt, facts),
          messages: history,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              accumulated += parsed.delta.text;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
              );
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
      setStreamingId(null);
      abortRef.current = null;
    }
  }, [apiKey, isStreaming, kpis, fmt, facts, messages]);

  const addFact = useCallback(() => {
    if (!newLabel.trim() || !newValue.trim()) return;
    setFacts(prev => [...prev, { id: crypto.randomUUID(), label: newLabel.trim(), value: newValue.trim() }]);
    setNewLabel('');
    setNewValue('');
  }, [newLabel, newValue]);

  const suggestions = getSuggestions(kpis);
  const isEmpty = messages.length === 0;

  // ── API Key Setup Screen ───────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
        <div style={{
          background: 'var(--panel-bg, #fff)',
          borderRadius: 20,
          boxShadow: '0 8px 40px rgba(124,58,237,0.12)',
          border: `1px solid ${PURPLE}22`,
          padding: '40px 36px',
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: PURPLE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>🤖</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Assistente GLX</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 28 }}>
            Insira sua chave da API Anthropic (Claude) para ativar o assistente de IA.<br />
            A chave é salva localmente no seu navegador.
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveApiKey(); }}
              placeholder="sk-ant-api03-..."
              autoFocus
              style={{
                flex: 1,
                border: `1.5px solid ${PURPLE}44`,
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 13,
                outline: 'none',
                background: 'var(--panel-bg, #fff)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={saveApiKey}
              disabled={!apiKeyInput.trim()}
              style={{
                background: apiKeyInput.trim() ? `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})` : '#e5e7eb',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                padding: '0 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: apiKeyInput.trim() ? 'pointer' : 'default',
              }}
            >
              Ativar
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Obtenha sua chave em{' '}
            <span style={{ color: PURPLE, fontWeight: 600 }}>console.anthropic.com</span>
            {' '}→ API Keys
          </div>
        </div>
      </div>
    );
  }

  // ── Main Chat UI ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 16, height: 700, maxHeight: '80vh' }}>

      {/* ── Chat Panel ───────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--panel-bg, #fff)',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: '1px solid var(--border-card, #e5e7eb)',
        overflow: 'hidden',
        minWidth: 0,
      }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})`, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🤖</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Assistente GLX</div>
            <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', flexShrink: 0 }} />
              Claude · {kpis.total.toLocaleString()} consultas analisadas
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setShowRag(v => !v)}
              title="Base de conhecimento treinável"
              style={{ background: showRag ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              📚 RAG
            </button>
            <button
              onClick={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY_CHAT); }}
              title="Limpar conversa"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}
            >
              🗑
            </button>
            <button
              onClick={clearKey}
              title="Trocar chave API"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}
            >
              🔑
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '10px 20px', fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span>⚠️</span>
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14, fontWeight: 700 }}>×</button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isEmpty && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 20 }}>
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: PURPLE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>🤖</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Olá 👋</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 340, lineHeight: 1.65 }}>
                Como posso te ajudar hoje?<br />
                Analiso seus dados em tempo real e gero insights com IA.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 420, marginTop: 4 }}>
                {suggestions.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    style={{ background: PURPLE_LIGHT, border: `1px solid ${PURPLE}33`, color: PURPLE, borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms' }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${PURPLE}22`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = PURPLE_LIGHT; }}
                  >
                    ↗ {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 10 }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: PURPLE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>🤖</div>
              )}
              <div style={{
                maxWidth: '76%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.role === 'user'
                  ? `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})`
                  : 'var(--bg-secondary, #f8fafc)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                fontSize: 13.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                border: msg.role === 'assistant' ? '1px solid var(--border-card, #e5e7eb)' : 'none',
                wordBreak: 'break-word',
                position: 'relative',
              }}>
                {msg.role === 'assistant'
                  ? (msg.id === streamingId && msg.content === '')
                    ? <TypingDots />
                    : <MD text={msg.content} />
                  : msg.content}
                {msg.id === streamingId && msg.content !== '' && (
                  <span style={{ display: 'inline-block', width: 2, height: '1em', background: PURPLE, marginLeft: 2, animation: 'glxBlink 1s infinite', verticalAlign: 'text-bottom' }}>
                    <style>{`@keyframes glxBlink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick chips when conversation active */}
        {!isEmpty && !isStreaming && (
          <div style={{ padding: '8px 20px 0', display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
            {suggestions.slice(0, 3).map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                style={{ background: PURPLE_LIGHT, border: `1px solid ${PURPLE}33`, color: PURPLE, borderRadius: 16, padding: '5px 11px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                ↗ {q}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div style={{ padding: '12px 20px 16px', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {isStreaming && (
            <button
              onClick={() => abortRef.current?.abort()}
              style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', padding: '8px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
            >
              ■ Parar
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Pergunte algo sobre sua clínica..."
            disabled={isStreaming}
            style={{
              flex: 1,
              border: `1.5px solid ${PURPLE}44`,
              borderRadius: 24,
              padding: '11px 18px',
              fontSize: 13.5,
              outline: 'none',
              background: 'var(--panel-bg, #fff)',
              color: 'var(--text-primary)',
              transition: 'border-color 150ms',
              opacity: isStreaming ? 0.6 : 1,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = PURPLE; }}
            onBlur={e => { e.currentTarget.style.borderColor = `${PURPLE}44`; }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isStreaming}
            style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: input.trim() && !isStreaming ? `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})` : '#e5e7eb',
              border: 'none',
              cursor: input.trim() && !isStreaming ? 'pointer' : 'default',
              color: '#fff', fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 200ms',
            }}
          >
            ↑
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', paddingBottom: 10, flexShrink: 0 }}>
          O Assistente GLX pode cometer erros. Confirme os dados no dashboard.
        </div>
      </div>

      {/* ── RAG / Knowledge Panel ────────────────────────────────────────── */}
      {showRag && (
        <div style={{
          width: 290,
          flexShrink: 0,
          background: 'var(--panel-bg, #fff)',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: '1px solid var(--border-card, #e5e7eb)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-card, #e5e7eb)', background: PURPLE_LIGHT }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: PURPLE, display: 'flex', alignItems: 'center', gap: 6 }}>📚 Base de Conhecimento</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>
              Contexto enviado ao Claude em cada mensagem
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Dados Auto (dashboard)</div>
            {[
              { label: 'Consultas',   value: kpis.realized.toString() },
              { label: 'Faturamento', value: fmt(kpis.grossRevenue) },
              { label: 'Ticket Médio',value: fmt(kpis.avgTicket) },
              { label: 'NPS',         value: kpis.avgNPS.toFixed(1) },
              { label: 'Leads',       value: kpis.leads.toString() },
              { label: 'Margem',      value: `${kpis.margin.toFixed(1)}%` },
            ].map(f => (
              <div key={f.label} style={{ background: '#f8fafc', borderRadius: 7, padding: '6px 10px', fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 8, border: '1px solid #e5e7eb' }}>
                <span style={{ color: 'var(--text-muted)' }}>{f.label}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{f.value}</span>
              </div>
            ))}

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 10, marginBottom: 4 }}>Contexto Treinável</div>
            {facts.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                Nenhum contexto adicionado ainda.
              </div>
            )}
            {facts.map(f => (
              <div key={f.id} style={{ background: PURPLE_LIGHT, borderRadius: 8, padding: '8px 10px', fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 6, border: `1px solid ${PURPLE}22` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: PURPLE, marginBottom: 2 }}>{f.label}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{f.value}</div>
                </div>
                <button
                  onClick={() => setFacts(prev => prev.filter(x => x.id !== f.id))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 15, padding: 0, lineHeight: 1, flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Add fact */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-card, #e5e7eb)', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>+ Adicionar contexto</div>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Categoria (ex.: Especialidade)"
              style={{ border: '1px solid #d1d5db', borderRadius: 7, padding: '7px 10px', fontSize: 12, background: 'var(--panel-bg, #fff)', color: 'var(--text-primary)', outline: 'none' }}
            />
            <input
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="Valor (ex.: Dermatologia)"
              onKeyDown={e => { if (e.key === 'Enter') addFact(); }}
              style={{ border: '1px solid #d1d5db', borderRadius: 7, padding: '7px 10px', fontSize: 12, background: 'var(--panel-bg, #fff)', color: 'var(--text-primary)', outline: 'none' }}
            />
            <button
              onClick={addFact}
              disabled={!newLabel.trim() || !newValue.trim()}
              style={{
                background: newLabel.trim() && newValue.trim() ? PURPLE : '#e5e7eb',
                border: 'none', borderRadius: 8, color: '#fff',
                padding: '8px', fontSize: 12, fontWeight: 700,
                cursor: newLabel.trim() && newValue.trim() ? 'pointer' : 'default',
              }}
            >
              Adicionar ao RAG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
