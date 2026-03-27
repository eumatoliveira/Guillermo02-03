import { useMemo, useCallback, memo, useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from '../i18n';
import { getChartTheme } from '../utils/chartOptions';
import FilterBar from './FilterBar';
import IntegrationSection from './IntegrationSection';
import { AgendaNoShowModule } from './modules/AgendaNoShowModule';
import { FinanceiroModule } from './modules/FinanceiroModule';
import { MarketingModule } from './modules/MarketingModule';
import { OperacaoUXModule } from './modules/OperacaoUXModule';
import {
  type Appointment, Filters, getAllAppointments, applyFilters, computeKPIs,
  computeByProfessional, computeByChannel, computeByProcedure,
  computeWeeklyTrend, getFilterOptions,
} from '../data/mockData';

interface Props {
  activeTab: number;
  lang?: "PT" | "EN" | "ES";
  theme: 'dark' | 'light' | 'night';
  visualScale: 'normal' | 'large' | 'xl';
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  appointments?: Appointment[];
  integrationHealth?: {
    integrations?: Array<{
      key: string;
      label: string;
      provider: string;
      status: 'connected' | 'degraded' | 'disconnected';
      lastSyncAt: string | null;
      slaMinutes: number;
      failures24h: number;
    }>;
    technical?: {
      lastSyncAt?: string | null;
      apiFailures24h?: number;
      volumeRegistrosDia?: number;
    };
  } | null;
}

type Priority = 'P1' | 'P2' | 'P3' | 'OK';
type ProfessionalRow = ReturnType<typeof computeByProfessional>[number];

const KPI_INFO: Record<string, { formula: string; explanation: string }> = {
  ocupacao:     { formula: 'Ocupação (%) = Consultas realizadas ÷ Capacidade disponível × 100', explanation: 'Some as consultas realizadas no período, some a capacidade disponível dos slots/profissionais/unidades e divida realizadas por capacidade.' },
  noshow:       { formula: 'No-Show (%) = No-Shows ÷ Total agendado × 100', explanation: 'Conte os pacientes que não compareceram sem aviso prévio e divida pelo total de agendamentos do período.' },
  confirmacoes: { formula: 'Confirmações (%) = Confirmados ÷ Total agendado × 100', explanation: 'Pacientes que responderam "sim" à confirmação (WhatsApp, ligação ou sistema) divididos pelo total de agendamentos.' },
  leadtime:     { formula: 'Lead Time = Média dos dias entre solicitação e consulta realizada', explanation: 'Para cada agendamento, calcule a diferença em dias entre a data do pedido e a data da consulta. Some tudo e divida pelo número de agendamentos.' },
  faturamento:  { formula: 'Faturamento Bruto = Soma de todos os recebimentos no período', explanation: 'Some todos os valores recebidos (consultas, procedimentos, convênios) sem descontar nenhuma despesa.' },
  margem:       { formula: 'Margem (%) = (Receita Líquida − Despesas Totais) ÷ Receita Líquida × 100', explanation: 'Receita líquida é o bruto menos glosas, cancelamentos e inadimplência. Despesas totais incluem fixas e variáveis. Divida o lucro pela receita líquida.' },
  inadimplencia:{ formula: 'Inadimplência (%) = Valor não recebido ÷ Valor total emitido × 100', explanation: 'Some os valores emitidos (notas/cobranças) e subtraia o que foi efetivamente recebido. Divida a diferença pelo total emitido.' },
  despesasfixas:{ formula: 'Despesas Fixas (%) = Total de Despesas Fixas ÷ Receita Líquida × 100', explanation: 'Some aluguel, folha, contratos e outros custos que não variam com o volume. Divida pela receita líquida do período.' },
  leads:        { formula: 'Leads = Soma de todos os contatos iniciais no período', explanation: 'Conte todos os novos contatos recebidos por canal (WhatsApp, Instagram, Google, indicação etc.) no período selecionado.' },
  conversao:    { formula: 'Conversão (%) = Agendamentos efetivados ÷ Leads recebidos × 100', explanation: 'De todos os leads que entraram em contato, quantos chegaram a marcar uma consulta? Divida agendamentos por leads.' },
  cpl:          { formula: 'CPL = Investimento em marketing ÷ Leads gerados', explanation: 'Some o total investido em anúncios, agência e produção no período e divida pelo número de leads captados.' },
  roi:          { formula: 'ROI (%) = (Receita atribuída − Custo do canal) ÷ Custo do canal × 100', explanation: 'Para cada canal, some a receita gerada pelos pacientes captados, subtraia o custo e divida pelo custo. 200% significa R$3 de retorno para cada R$1 investido.' },
  nps:          { formula: 'NPS (0–10) = (% Promotores − % Detratores) × 10', explanation: 'Notas 9–10 são promotores; 0–6 são detratores; 7–8 são neutros. Subtraia % detratores de % promotores e converta para escala 0–10.' },
  espera:       { formula: 'Espera média = Soma dos tempos de espera ÷ Total de atendimentos', explanation: 'Registre o tempo entre chegada do paciente e início do atendimento para cada consulta. Some todos e divida pelo número de atendimentos.' },
  retorno:      { formula: 'Retorno (%) = Pacientes que retornaram ÷ Total atendidos × 100', explanation: 'Conte quantos pacientes atendidos voltaram em uma segunda consulta dentro da janela (30, 90 ou 180 dias). Divida pelo total atendido no período.' },
  sla:          { formula: 'SLA = Soma dos tempos de resposta ÷ Total de leads respondidos', explanation: 'Para cada lead, calcule o tempo entre o primeiro contato e a primeira resposta da equipe. Some tudo e divida pelo número de leads atendidos.' },
};

type MemberGoals = {
  consultas: string;
  receita: string;
  nps: string;
  noShow: string;
  ocupacao: string;
  espera: string;
};

const EMPTY_MEMBER_GOALS: MemberGoals = { consultas: '', receita: '', nps: '', noShow: '', ocupacao: '', espera: '' };

type TeamMemberForm = {
  name: string;
  role: string;
  realized: string;
  grossRevenue: string;
  avgTicket: string;
  avgNPS: string;
  noShowRate: string;
  occupancyRate: string;
  avgWait: string;
  goals: MemberGoals;
};

function weekKey(dateStr: string) {
  const d = new Date(dateStr);
  const ws = new Date(d);
  ws.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ws.toISOString().slice(0, 10);
}


const EMPTY_TEAM_MEMBER_FORM: TeamMemberForm = {
  name: '',
  role: '',
  realized: '',
  grossRevenue: '',
  avgTicket: '',
  avgNPS: '',
  noShowRate: '',
  occupancyRate: '',
  avgWait: '',
  goals: { ...EMPTY_MEMBER_GOALS },
};

type ClinicGoals = {
  npsP1: string;
  waitP1: string;
  noShowP1: string;
  occupancyP1: string;
  ticketP1: string;
  returnP1: string;
};

const DEFAULT_CLINIC_GOALS: ClinicGoals = {
  npsP1: '8.5',
  waitP1: '12',
  noShowP1: '10',
  occupancyP1: '70',
  ticketP1: '',
  returnP1: '40',
};

// ── Marketing KPI strip card ──────────────────────────────────────────────────
interface MkCardProps {
  label: string; value: string; meta: string; color: string;
  isFiltered: boolean; filterLabel: string;
  hasData?: boolean; isLeads?: boolean;
  onClick?: () => void;
}
function MkCard({ label, value, meta, color, isFiltered, filterLabel, hasData = true, isLeads = false, onClick }: MkCardProps) {
  const [visible, setVisible]     = useState(true);
  const [displayed, setDisplayed] = useState(value);
  const [dotHov, setDotHov]       = useState(false);

  useEffect(() => {
    if (displayed === value) return;
    setVisible(false);
    const t = setTimeout(() => { setDisplayed(value); setVisible(true); }, 120);
    return () => clearTimeout(t);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardColor    = hasData ? color : '#D1D5DB';
  const showDot      = !isLeads && isFiltered && hasData;

  return (
    <div className="overview-card" onClick={onClick}
      style={{ borderTop: `3px solid ${cardColor}`, padding: '12px 14px', cursor: 'pointer', opacity: hasData ? 1 : 0.5, position: 'relative' }}
    >
      {showDot && (
        <div onMouseEnter={() => setDotHov(true)} onMouseLeave={() => setDotHov(false)}
          style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: '#3B82F6' }}
        >
          {dotHov && (
            <div style={{
              position: 'absolute', top: -32, right: 0,
              background: '#1f2937', color: '#fff', fontSize: 10,
              padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap',
              pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', zIndex: 50,
            }}>Exibindo dado filtrado</div>
          )}
        </div>
      )}
      <div className="overview-card-label" style={{ fontSize: 10, marginBottom: 6 }}>{label}</div>
      <div className="overview-card-value" style={{
        color: cardColor, fontSize: 24, lineHeight: 1.1,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 200ms ease, transform 200ms ease',
      }}>
        {hasData ? displayed : '—'}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>
        {hasData ? meta : 'Sem dados para o filtro'}
      </div>
      {!isLeads && (
        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {isFiltered ? filterLabel : 'Média do período'}
          </span>
          <span style={{
            background: isFiltered ? '#EFF6FF' : '#F3F4F6',
            color: isFiltered ? '#3B82F6' : '#94A3B8',
            borderRadius: 999, padding: '1px 6px', fontSize: 10,
            fontWeight: isFiltered ? 600 : 400, whiteSpace: 'nowrap',
          }}>
            {isFiltered ? 'filtrado' : 'sem filtro ativo'}
          </span>
        </div>
      )}
      {isLeads && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>Total no período</div>
      )}
    </div>
  );
}

function ProDashboard({ activeTab, theme, visualScale, filters, onFiltersChange, lang = "PT", appointments, integrationHealth }: Props) {
  const { formatCompactMoney, moneyTitle } = useCurrency();
  const { t } = useTranslation();
  const fmt = useCallback((value: number) => formatCompactMoney(value), [formatCompactMoney]);
  const ct = useMemo(() => getChartTheme(theme, visualScale), [theme, visualScale]);
  const allData = useMemo(() => appointments ?? getAllAppointments(), [appointments]);
  const filterOptions = useMemo(() => getFilterOptions(allData), [allData]);
  const filtered = useMemo(() => applyFilters(allData, filters), [allData, filters]);
  const kpis = useMemo(() => computeKPIs(filtered), [filtered]);
  const byProf = useMemo(() => computeByProfessional(filtered), [filtered]);
  const byChannel = useMemo(() => computeByChannel(filtered), [filtered]);
  const byProc    = useMemo(() => computeByProcedure(filtered), [filtered]);
  const byProcAll = useMemo(() => computeByProcedure(allData),  [allData]);

  // ── Base data WITHOUT canal filter — used by all Ops scorecards except SLA Lead ──
  const filteredNoCanal = useMemo(() =>
    filters.channel ? applyFilters(allData, { ...filters, channel: '' }) : filtered,
  [allData, filters, filtered]);
  const kpisNoCanal   = useMemo(() => computeKPIs(filteredNoCanal),             [filteredNoCanal]);
  const byProfNoCanal = useMemo(() => computeByProfessional(filteredNoCanal),   [filteredNoCanal]);
  const byProcNoCanal    = useMemo(() => computeByProcedure(filteredNoCanal),   [filteredNoCanal]);
  const byChannelNoCanal = useMemo(() => computeByChannel(filteredNoCanal),     [filteredNoCanal]);
  const weeklyTrend = useMemo(() => computeWeeklyTrend(filtered), [filtered]);
  const [teamMemberForm, setTeamMemberForm] = useState<TeamMemberForm>(EMPTY_TEAM_MEMBER_FORM);
  const [manualTeamMembers, setManualTeamMembers] = useState<ProfessionalRow[]>([]);
  const [editingManualTeamMemberIndex, setEditingManualTeamMemberIndex] = useState<number | null>(null);
  const [editingBaseTeamMemberName, setEditingBaseTeamMemberName] = useState<string | null>(null);
  const [deletedBaseTeamMemberNames, setDeletedBaseTeamMemberNames] = useState<string[]>([]);
  const [baseTeamMemberOverrides, setBaseTeamMemberOverrides] = useState<Record<string, ProfessionalRow>>({});
  const [memberGoals, setMemberGoals] = useState<Record<string, MemberGoals>>({});
  const [clinicGoals, setClinicGoals] = useState<ClinicGoals>(DEFAULT_CLINIC_GOALS);
  const [goalsForm, setGoalsForm] = useState<ClinicGoals>(DEFAULT_CLINIC_GOALS);
  const [goalsSaved, setGoalsSaved] = useState(false);
  const [kpiModal, setKpiModal] = useState<{ title: string; formula: string; explanation: string } | null>(null);
  const openKpiModal = useCallback((title: string, kpiKey: string) => {
    const info = KPI_INFO[kpiKey];
    if (info) setKpiModal({ title, ...info });
  }, []);
  const activeChannels = useMemo(() => byChannel.filter(c => c.total > 0), [byChannel]);
  const displayedTeamMembers = useMemo(() => [
    ...byProf
      .filter((member) => !deletedBaseTeamMemberNames.includes(member.name))
      .map((member) => baseTeamMemberOverrides[member.name] ?? member),
    ...manualTeamMembers,
  ], [baseTeamMemberOverrides, byProf, deletedBaseTeamMemberNames, manualTeamMembers]);
  const sortedFiltered = useMemo(() => [...filtered].sort((a,b) => a.date.localeCompare(b.date)), [filtered]);
  const agendaWeeksForModule = useMemo(() => {
    const buckets = new Map<string, typeof filtered>();
    sortedFiltered.forEach((row) => {
      const key = weekKey(row.date);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(row);
    });
    return Array.from(buckets.entries()).sort((a,b)=>a[0].localeCompare(b[0])).slice(-8).map(([key, rows], idx) => {
      const total = rows.length;
      const realized = rows.filter(r => r.status === 'Realizada').length;
      const noShows = rows.filter(r => r.status === 'No-Show').length;
      const canceled = rows.filter(r => r.status === 'Cancelada').length;
      const confirmed = rows.filter(r => r.status === 'Confirmada').length;
      const weeklyTarget = Math.max(16, Math.round(total * 0.85));
      const cancelNoticeRate = canceled ? Math.min(92, Math.max(22, 52 + idx * 4 - (canceled % 3) * 2)) : 0;
      const leadTimeDays = total ? rows.reduce((s, r, i) => s + 0.9 + (r.waitMinutes/60)*0.9 + (i%4)*0.45, 0) / total : 0;
      const d = new Date(key + 'T00:00:00');
      const label = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      return { label, weekKey: key, total, realized, noShows, canceled, confirmed, noShowRate: total ? (noShows/total)*100 : 0, occupancyRate: total ? (realized/Math.max(total, Math.ceil(total*1.04)))*100 : 0, confirmationRate: total ? (confirmed/total)*100 : 0, cancelNoticeRate, weeklyTarget, leadTimeDays };
    });
  }, [sortedFiltered]);
  const financeWeeksForModule = useMemo(() => {
    return weeklyTrend.map((w, idx) => {
      const gross = w.grossRevenue;
      const conventionGlosas = gross * (0.015 + (idx % 3) * 0.004);
      const cancelLoss = gross * (0.035 + (idx % 4) * 0.006);
      const delinquency = gross * (0.03 + (idx % 5) * 0.007);
      const chargebacks = gross * (0.01 + (idx % 3) * 0.003);
      const net = Math.max(0, gross - cancelLoss - delinquency - chargebacks - conventionGlosas);
      const fixedExpenses = net * (0.42 + (idx % 4) * 0.045);
      const variableCosts = w.totalCost * 0.55;
      const profit = net - fixedExpenses - variableCosts;
      return { label: w.label, gross, net, cancelLoss, delinquency, chargebacks, conventionGlosas, netPctGross: gross > 0 ? (net / gross) * 100 : 0, marginPct: net > 0 ? (profit / net) * 100 : 0, ticketAvg: w.avgTicket, ticketBenchmark: 700 + (idx % 2) * 35, delinquencyPct: gross > 0 ? (delinquency / gross) * 100 : 0, fixedPct: net > 0 ? (fixedExpenses / net) * 100 : 0, receiptsCount: Math.max(1, w.realized), consultations: Math.max(1, w.realized), d20ProgressPct: 62 + idx * 4, d20ThresholdPct: 80 };
    });
  }, [weeklyTrend]);
  const financeAdvWeeks = useMemo(() => {
    const weeks = weeklyTrend.slice(-8);
    return weeks.map((w, idx) => {
      const cmv = w.grossRevenue * (0.18 + (idx % 3) * 0.015);
      const variable = w.grossRevenue * (0.11 + (idx % 2) * 0.01);
      const fixedProrata = Math.max(2500, w.grossRevenue * 0.22);
      const ebitda = w.netRevenue - cmv - variable - fixedProrata;
      const ebitdaMargin = w.netRevenue > 0 ? (ebitda / w.netRevenue) * 100 : 0;
      const forecastP50 = (w.realized + w.noShows + Math.round(w.canceled * 0.5)) * (w.avgTicket || kpis.avgTicket || 300);
      return {
        ...w,
        cmv, variable, fixedProrata, ebitda, ebitdaMargin,
        forecastP10: forecastP50 * 0.88,
        forecastP50,
        forecastP90: forecastP50 * 1.12,
      };
    });
  }, [weeklyTrend, kpis.avgTicket]);
  const agingReceivables = useMemo(() => {
    const gross = Math.max(1, kpis.grossRevenue);
    const totalRecv = gross * 0.42;
    const f0_30 = totalRecv * 0.58;
    const f31_60 = totalRecv * 0.25;
    const f61_90 = totalRecv * 0.11;
    const f90p = totalRecv - f0_30 - f31_60 - f61_90;
    return { totalRecv, buckets: [{ label: '0-30d', value: f0_30 }, { label: '31-60d', value: f31_60 }, { label: '61-90d', value: f61_90 }, { label: '>90d', value: f90p }] };
  }, [kpis.grossRevenue]);
  const breakEven = useMemo(() => {
    const fixedMonthly = Math.max(20000, kpis.totalCost * 0.65);
    const contributionMarginPct = Math.max(0.15, Math.min(0.8, (kpis.netRevenue - kpis.totalCost * 0.35) / Math.max(kpis.netRevenue, 1)));
    const breakEvenRevenue = fixedMonthly / contributionMarginPct;
    const day15Coverage = (kpis.grossRevenue * 0.52) / breakEvenRevenue * 100;
    const day20Coverage = (kpis.grossRevenue * 0.72) / breakEvenRevenue * 100;
    const sim = [
      { ticket: Math.round(kpis.avgTicket * 0.9), volume: Math.max(10, Math.round(kpis.realized * 0.9)) },
      { ticket: Math.round(kpis.avgTicket), volume: Math.max(10, kpis.realized) },
      { ticket: Math.round(kpis.avgTicket * 1.1), volume: Math.max(10, Math.round(kpis.realized * 1.1)) },
    ].map((s) => ({ ...s, revenue: s.ticket * s.volume, coversPct: (s.ticket * s.volume) / breakEvenRevenue * 100 }));
    return { fixedMonthly, contributionMarginPct: contributionMarginPct * 100, breakEvenRevenue, day15Coverage, day20Coverage, sim };
  }, [kpis.totalCost, kpis.netRevenue, kpis.grossRevenue, kpis.avgTicket, kpis.realized]);
  const marketingProWeeks = useMemo(() => {
    const base = weeklyTrend.slice(-8);
    return base.map((w, idx) => {
      const channelRows = activeChannels.map((c, cIdx) => {
        const share = c.total / Math.max(1, activeChannels.reduce((s, x) => s + x.total, 0));
        const leads = Math.max(1, Math.round((w.total * 0.55 + idx * 2) * share * (0.92 + (cIdx % 3) * 0.08)));
        const contacts = Math.max(1, Math.round(leads * (0.72 - (cIdx % 2) * 0.05)));
        const booked = Math.max(1, Math.round(contacts * (0.63 - (cIdx % 3) * 0.04)));
        const attended = Math.max(1, Math.round(booked * (0.78 - (c.noShowRate / 200))));
        const newPatients = Math.max(1, Math.round(attended * 0.78));
        const ticket = Math.max(180, Math.round(c.avgTicket * (0.9 + (cIdx % 4) * 0.06)));
        const spend = Math.max(0, Math.round(c.avgCAC * newPatients * (0.9 + (idx % 3) * 0.07)));
        const revenue = Math.round(newPatients * ticket * (1.05 + (cIdx % 2) * 0.12));
        return { name: c.name, leads, contacts, booked, attended, newPatients, ticket, spend, revenue };
      });
      const leadsTotal = channelRows.reduce((s, r) => s + r.leads, 0);
      const contacts = channelRows.reduce((s, r) => s + r.contacts, 0);
      const booked = channelRows.reduce((s, r) => s + r.booked, 0);
      const attended = channelRows.reduce((s, r) => s + r.attended, 0);
      const revenue = channelRows.reduce((s, r) => s + r.revenue, 0);
      const spend = channelRows.reduce((s, r) => s + r.spend, 0);
      return { label: w.label, channelRows, leadsTotal, contacts, booked, attended, revenue, spend };
    });
  }, [weeklyTrend, activeChannels]);
  const marketingChannelStats = useMemo(() => {
    const rows = activeChannels.map((c) => {
      const agg = marketingProWeeks.reduce((acc, w) => {
        const row = w.channelRows.find((x) => x.name === c.name);
        if (!row) return acc;
        acc.leads += row.leads; acc.contacts += row.contacts; acc.booked += row.booked; acc.attended += row.attended; acc.newPatients += row.newPatients; acc.spend += row.spend; acc.revenue += row.revenue; acc.ticket += row.ticket;
        return acc;
      }, { leads:0, contacts:0, booked:0, attended:0, newPatients:0, spend:0, revenue:0, ticket:0 });
      const avgTicket = agg.newPatients ? agg.revenue / agg.newPatients : c.avgTicket;
      const cac = agg.newPatients ? agg.spend / agg.newPatients : 0;
      const funnelRate = agg.leads ? (agg.attended / agg.leads) * 100 : 0;
      const roi = agg.spend ? ((agg.revenue - agg.spend) / agg.spend) * 100 : 0;
      const speedDays = Math.max(2, 4 + (c.noShowRate / 8) + (c.avgCAC / 80));
      const retention = 1.8 + (c.returnRate / 100) * 2.2;
      const ltv = avgTicket * retention;
      return { name: c.name, ...agg, avgTicket, cac, funnelRate, roi, speedDays, ltv, ltvCac: cac ? ltv / cac : 0 };
    });
    return rows;
  }, [activeChannels, marketingProWeeks]);
  const opsProByProfessional = useMemo(() => {
    return byProfNoCanal.map((p, idx) => ({
      ...p,
      npsResponses: p.promoters + p.neutrals + p.detractors,
      waitByDoctor: Math.max(4, Math.round(p.avgWait + (idx === 1 ? 7 : idx === 0 ? 2 : -1))),
      return90: Math.max(10, Math.min(70, p.returnRate + (idx === 0 ? 4 : idx === 1 ? -6 : 2))),
      slaLeadH: +(0.7 + idx * 0.9 + (idx === 1 ? 2.2 : 0)).toFixed(1),
      rcaHint: p.avgNPS < 7.5 ? 'Atraso + handoff recepcao + expectativa' : 'Sem RCA critica',
    }));
  }, [byProfNoCanal]);
  const receptionSLARanking = useMemo(() => {
    const names = ['Julia (Recepcao)', 'Marina (Recepcao)', 'Paula (Recepcao)'];
    return names.map((name, idx) => ({
      name,
      slaH: +(0.8 + idx * 1.1 + (idx === 2 ? 2.4 : 0)).toFixed(1),
      leadsResponded: Math.max(10, Math.round(kpis.leads / 3) + idx * 3),
    }));
  }, [kpis.leads]);
  const handleTeamMemberFormChange = useCallback((field: keyof Omit<TeamMemberForm,'goals'>, value: string) => {
    setTeamMemberForm((current) => ({ ...current, [field]: value }));
  }, []);
  const handleGoalChange = useCallback((field: keyof MemberGoals, value: string) => {
    setTeamMemberForm((current) => ({ ...current, goals: { ...current.goals, [field]: value } }));
  }, []);

  const handleAddTeamMember = useCallback(() => {
    if (!teamMemberForm.name.trim()) return;
    const realized = Number(teamMemberForm.realized) || 0;
    const grossRevenue = Number(teamMemberForm.grossRevenue) || 0;
    const avgTicket = Number(teamMemberForm.avgTicket) || (realized > 0 ? grossRevenue / realized : 0);
    const avgNPS = Number(teamMemberForm.avgNPS) || 0;
    const noShowRate = Number(teamMemberForm.noShowRate) || 0;
    const occupancyRate = Number(teamMemberForm.occupancyRate) || 0;
    const avgWait = Number(teamMemberForm.avgWait) || 0;
    const leads = Math.max(0, Math.round(realized * 0.35));
    const noShows = Math.max(0, Math.round((realized * noShowRate) / Math.max(1, 100 - noShowRate)));
    const total = realized + noShows;
    const totalCost = grossRevenue * 0.48;
    const fixedExpenses = grossRevenue * 0.18;
    const netRevenue = grossRevenue * 0.92;

    const nextMember = {
      name: teamMemberForm.name.trim(),
      total,
      realized,
      noShows,
      canceled: Math.max(0, Math.round(total * 0.05)),
      grossRevenue,
      netRevenue,
      totalCost,
      fixedExpenses,
      margin: grossRevenue > 0 ? ((netRevenue - totalCost) / grossRevenue) * 100 : 0,
      ebitda: netRevenue - fixedExpenses,
      avgTicket,
      noShowRate,
      occupancyRate,
      cancelRate: 5,
      confirmationRate: 88,
      lostCapacityRate: Math.max(0, 100 - occupancyRate),
      noShowEstimatedCost: noShows * avgTicket,
      leadTimeDays: 1.8,
      inadimplenciaRate: 3.2,
      fixedExpenseRatio: netRevenue > 0 ? (fixedExpenses / netRevenue) * 100 : 0,
      breakEven: fixedExpenses > 0 ? fixedExpenses / Math.max(avgTicket * 0.45, 1) : 0,
      avgNPS,
      avgWait,
      returnRate: 32,
      avgCAC: 110,
      leads,
      cpl: leads > 0 ? 65 : 0,
      capacityAvailable: occupancyRate > 0 ? Math.round((realized / occupancyRate) * 100) : total,
      totalAdSpend: leads * 65,
      cancellationLoss: grossRevenue * 0.03,
      inadimplenciaLoss: grossRevenue * 0.02,
      estornoLoss: grossRevenue * 0.01,
      slaLeadHours: 1.2,
      promoters: Math.max(0, Math.round(realized * 0.45)),
      neutrals: Math.max(0, Math.round(realized * 0.35)),
      detractors: Math.max(0, Math.round(realized * 0.2)),
      complaints: Math.max(0, Math.round(realized * 0.06)),
    };

    setManualTeamMembers((current) => {
      if (editingBaseTeamMemberName) {
        return current;
      }

      if (editingManualTeamMemberIndex === null) {
        return [...current, nextMember];
      }

      return current.map((member, index) => (
        index === editingManualTeamMemberIndex ? nextMember : member
      ));
    });
    if (editingBaseTeamMemberName) {
      setBaseTeamMemberOverrides((current) => ({ ...current, [editingBaseTeamMemberName]: nextMember }));
      setDeletedBaseTeamMemberNames((current) => current.filter((name) => name !== editingBaseTeamMemberName));
    }
    // Save individual goals keyed by member name
    setMemberGoals(current => ({ ...current, [nextMember.name]: { ...teamMemberForm.goals } }));
    setTeamMemberForm(EMPTY_TEAM_MEMBER_FORM);
    setEditingManualTeamMemberIndex(null);
    setEditingBaseTeamMemberName(null);
  }, [editingBaseTeamMemberName, editingManualTeamMemberIndex, teamMemberForm]);

  const handleEditManualTeamMember = useCallback((index: number) => {
    const member = manualTeamMembers[index];
    if (!member) return;

    setTeamMemberForm({
      name: member.name,
      role: '',
      realized: String(member.realized),
      grossRevenue: String(Math.round(member.grossRevenue)),
      avgTicket: String(Math.round(member.avgTicket)),
      avgNPS: member.avgNPS.toFixed(1),
      noShowRate: member.noShowRate.toFixed(1),
      occupancyRate: member.occupancyRate.toFixed(1),
      avgWait: member.avgWait.toFixed(0),
      goals: memberGoals[member.name] ?? { ...EMPTY_MEMBER_GOALS },
    });
    setEditingManualTeamMemberIndex(index);
    setEditingBaseTeamMemberName(null);
  }, [manualTeamMembers, memberGoals]);

  const handleEditBaseTeamMember = useCallback((name: string) => {
    const member = displayedTeamMembers.find((current) => current.name === name);
    if (!member) return;

    setTeamMemberForm({
      name: member.name,
      role: '',
      realized: String(member.realized),
      grossRevenue: String(Math.round(member.grossRevenue)),
      avgTicket: String(Math.round(member.avgTicket)),
      avgNPS: member.avgNPS.toFixed(1),
      noShowRate: member.noShowRate.toFixed(1),
      occupancyRate: member.occupancyRate.toFixed(1),
      avgWait: member.avgWait.toFixed(0),
      goals: memberGoals[member.name] ?? { ...EMPTY_MEMBER_GOALS },
    });
    setEditingBaseTeamMemberName(name);
    setEditingManualTeamMemberIndex(null);
  }, [displayedTeamMembers, memberGoals]);

  const handleDeleteManualTeamMember = useCallback((index: number) => {
    setManualTeamMembers((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setEditingManualTeamMemberIndex((current) => (current === index ? null : current));
  }, []);

  const handleDeleteBaseTeamMember = useCallback((name: string) => {
    setDeletedBaseTeamMemberNames((current) => current.includes(name) ? current : [...current, name]);
    setBaseTeamMemberOverrides((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setEditingBaseTeamMemberName((current) => current === name ? null : current);
  }, []);

  const handleCancelTeamMemberEdit = useCallback(() => {
    setTeamMemberForm(EMPTY_TEAM_MEMBER_FORM);
    setEditingManualTeamMemberIndex(null);
    setEditingBaseTeamMemberName(null);
  }, []);

  const showFilterBar = activeTab !== 5 && activeTab !== 6;

  return (
    <div className="animate-fade-in" key={activeTab}>
      {showFilterBar ? <FilterBar filters={filters} onChange={onFiltersChange} options={filterOptions} /> : null}

      {/* ===== VISÃO CEO PRO — SCORE CARDS ===== */}
      {activeTab === 0 && (() => {
        const CL = { green:'#1D9E75', amber:'#EF9F27', red:'#E24B4A' };
        // color helper: inverted=true means lower is better
        const cl = (v:number, good:number, warn:number, inverted=false): string =>
          inverted ? (v <= good ? CL.green : v <= warn ? CL.amber : CL.red)
                   : (v >= good ? CL.green : v >= warn ? CL.amber : CL.red);

        // Period-aware label suffix — translated via i18n
        const pSuffix = t(filters.period === '7d'  ? '/ Semana'
                        : filters.period === '15d' ? '/ Quinzena'
                        : filters.period === '30d' ? '/ Mês'
                        : filters.period === '3m'  ? '/ Trimestre'
                        : filters.period === '6m'  ? '/ Semestre'
                        : '/ Ano');
        const periodReturnLabel = filters.period === '7d'  ? '7 Dias'
                                : filters.period === '15d' ? '15 Dias'
                                : filters.period === '30d' ? '30 Dias'
                                : filters.period === '3m'  ? '3 Meses'
                                : filters.period === '6m'  ? '6 Meses'
                                : '12 Meses';

        const convLeadToAppt = (() => {
          const latest = marketingProWeeks[marketingProWeeks.length - 1];
          return latest?.leadsTotal > 0 ? (latest.booked / latest.leadsTotal) * 100 : 0;
        })();
        const totalSpend   = marketingChannelStats.reduce((s, c) => s + c.spend,   0);
        const totalRevenue = marketingChannelStats.reduce((s, c) => s + c.revenue, 0);
        const activeRoi    = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
        const activeRoiLabel = 'Todos';
        const roiColor = activeRoi >= 200 ? CL.green : activeRoi >= 100 ? CL.amber : CL.red;
        const roiLabel = `${activeRoi.toFixed(0)}% (${activeRoiLabel})`;

        const cols = [
          {
            icon: '📋', title: t('Agenda & No-Show'),
            cards: [
              { label:t('Taxa de Ocupação (%)'),              value:`${kpis.occupancyRate.toFixed(1)}%`,      color:cl(kpis.occupancyRate,80,60),                              desc:t('Meta > 80% — agenda preenchida?'),           kpiKey:'ocupacao' },
              { label:t('Taxa de No-Show (%)'),               value:`${kpis.noShowRate.toFixed(1)}%`,         color:cl(kpis.noShowRate,8,12,true),                             desc:t('Meta < 8% — 1 em cada 12 pode faltar'),      kpiKey:'noshow' },
              { label:t('Confirmações Realizadas (%)'),        value:`${kpis.confirmationRate.toFixed(1)}%`,   color:cl(kpis.confirmationRate,85,70),                           desc:t('Meta > 85% — pacientes confirmaram?'),       kpiKey:'confirmacoes' },
              { label:t('Lead Time do Agendamento (dias)'),    value:`${kpis.leadTimeDays.toFixed(1)}d`,       color:cl(kpis.leadTimeDays,3,7,true),                            desc:t('Meta < 3 dias de espera'),                   kpiKey:'leadtime' },
            ],
          },
          {
            icon: '💰', title: t('Financeiro'),
            cards: [
              { label:`${moneyTitle('Faturamento Bruto')} ${pSuffix}`, value:fmt(kpis.grossRevenue),          color:CL.amber,                                                  desc:t('Total recebido no período'),                 kpiKey:'faturamento' },
              { label:t('Margem Líquida (%)'),                 value:`${kpis.margin.toFixed(1)}%`,            color:cl(kpis.margin,25,15),                                     desc:t('Meta > 20% — seu lucro real por R$100'),     kpiKey:'margem' },
              { label:t('Inadimplência (%)'),                  value:`${kpis.inadimplenciaRate.toFixed(1)}%`, color:cl(kpis.inadimplenciaRate,4,8,true),                       desc:t('Meta < 4% — quem não pagou?'),               kpiKey:'inadimplencia' },
              { label:t('Despesas Fixas / Receita (%)'),       value:`${kpis.fixedExpenseRatio.toFixed(1)}%`, color:cl(kpis.fixedExpenseRatio,45,55,true),                     desc:t('Meta < 45% — custo fixo sobre receita'),     kpiKey:'despesasfixas' },
            ],
          },
          {
            icon: '🚀', title: t('Marketing & Captação'),
            cards: [
              { label:`${t('Leads Gerados')} ${pSuffix}`,      value:`${kpis.leads}`,                         color:kpis.leads>=80?CL.green:kpis.leads>=40?CL.amber:CL.red,   desc:t('Novos interessados — crescendo?'),            kpiKey:'leads' },
              { label:t('Conversão Lead → Agendamento (%)'),   value:`${convLeadToAppt.toFixed(1)}%`,         color:cl(convLeadToAppt,22,15),                                  desc:t('Meta > 25% — quantos viraram consulta?'),    kpiKey:'conversao' },
              { label:t('CPL — Custo por Paciente'),           value:fmt(kpis.cpl),                           color:cl(kpis.cpl,kpis.avgTicket/4,kpis.avgTicket*0.6,true),    desc:t('Custo por novo paciente captado'),            kpiKey:'cpl' },
              { label:t('ROI Total e por Canal (%)'),            value:roiLabel,                                color:roiColor,                                                  desc:filters.channel ? `Canal: ${filters.channel}` : t('Meta > 200% — marketing compensa?'), kpiKey:'roi' },
            ],
          },
          {
            icon: '⚙️', title: t('Operação & UX'),
            cards: [
              { label:t('NPS Geral (0–10)'),                   value:`${kpis.avgNPS.toFixed(1)}`,             color:cl(kpis.avgNPS,8.5,7),                                     desc:t('Meta > 8,5 — paciente indicaria você?'),     kpiKey:'nps' },
              { label:t('Tempo Médio de Espera (min)'),        value:`${kpis.avgWait.toFixed(0)} min`,        color:cl(kpis.avgWait,12,20,true),                               desc:t('Meta < 12 min em sala de espera'),            kpiKey:'espera' },
              { label:`${t('Taxa de Retorno')} ${periodReturnLabel} (%)`, value:`${kpis.returnRate.toFixed(1)}%`, color:cl(kpis.returnRate,40,25), desc:`${t('Meta > 40% — paciente voltou em')} ${periodReturnLabel}?`, kpiKey:'retorno' },
              { label:t('SLA de Resposta ao Lead (h)'),        value:`${kpis.slaLeadHours.toFixed(2)}h`,      color:cl(kpis.slaLeadHours,1,2,true),                            desc:t('Meta < 1h para responder o paciente'),       kpiKey:'sla' },
            ],
          },
        ];

        return (<>
          <div className="section-header"><h2><span className="orange-bar" /> Visão CEO — Painel Executivo Completo</h2></div>
          <div className="kpi-ceo-grid" style={{ marginBottom: 8 }}>
            {cols.map(col => (
              <div key={col.title}>
                {/* Column header */}
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--border-card,#e5e7eb)' }}>
                  <span style={{ fontSize:13 }}>{col.icon}</span>
                  <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:'var(--text-muted)', textTransform:'uppercase' }}>{col.title}</span>
                </div>
                {/* Score cards */}
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {col.cards.map(card => (
                    <div key={card.label} onClick={() => openKpiModal(card.label, card.kpiKey)} style={{
                      background:'var(--panel-bg,#fff)',
                      borderRadius:12,
                      boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
                      border:'1px solid var(--border-card,#e5e7eb)',
                      borderTop:`4px solid ${card.color}`,
                      padding:'14px 16px',
                      transition:'box-shadow 200ms ease',
                      cursor:'pointer',
                      position:'relative',
                    }}>
                      <span style={{position:'absolute',top:8,right:10,fontSize:13,color:'var(--text-muted)',opacity:0.45}}>?</span>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:0.8, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:8, lineHeight:1.3 }}>
                        {card.label}
                      </div>
                      <div style={{ fontSize:28, fontWeight:800, color:card.color, lineHeight:1.1, marginBottom:6, wordBreak:'break-word' }}>
                        {card.value}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.4 }}>
                        {card.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>);
      })()}

      {/* ===== FINANCEIRO AVANCADO ===== */}
      {activeTab === 2 && (<>
        <div className="section-header"><h2><span className="orange-bar" /> Financeiro Avançado</h2></div>
        {(() => {
          const G = 'var(--green)', Y = 'var(--yellow)', R = 'var(--red)';
          const lastFin = financeWeeksForModule.length ? financeWeeksForModule[financeWeeksForModule.length - 1] : null;
          const lastAdv = financeAdvWeeks.length ? financeAdvWeeks[financeAdvWeeks.length - 1] : null;
          const netPct          = kpis.grossRevenue > 0 ? (kpis.netRevenue / kpis.grossRevenue) * 100 : 0;
          const marginPct       = lastFin?.marginPct ?? 0;
          const delinqPct       = lastFin?.delinquencyPct ?? 0;
          const fixedPct        = lastFin?.fixedPct ?? 0;
          const ebitdaPct       = lastAdv?.ebitdaMargin ?? 0;
          const forecastP50     = lastAdv?.forecastP50 ?? kpis.grossRevenue;
          const posicaoCaixa    = kpis.grossRevenue - kpis.totalCost;
          const breakEvenCov    = breakEven.breakEvenRevenue > 0 ? (kpis.grossRevenue / breakEven.breakEvenRevenue) * 100 : 100;
          const cards = [
            {
              label: 'Faturamento Bruto Mensal',
              value: fmt(kpis.grossRevenue),
              color: breakEvenCov >= 100 ? G : breakEvenCov >= 80 ? Y : R,
              meta: `${breakEvenCov.toFixed(0)}% do break-even`,
              kpiKey: 'faturamento',
            },
            {
              label: 'Receita Líquida',
              value: fmt(kpis.netRevenue),
              color: netPct >= 70 ? G : netPct >= 55 ? Y : R,
              meta: `${netPct.toFixed(1)}% do faturamento bruto`,
              kpiKey: 'margem',
            },
            {
              label: 'Margem Líquida Total (%)',
              value: `${marginPct.toFixed(1)}%`,
              color: marginPct >= 20 ? G : marginPct >= 10 ? Y : R,
              meta: 'P1 ≥ 20% | P2 10–20% | P3 < 10%',
              kpiKey: 'margem',
            },
            {
              label: 'Ticket Médio',
              value: fmt(kpis.avgTicket),
              color: kpis.avgTicket >= 700 ? G : kpis.avgTicket >= 550 ? Y : R,
              meta: 'P1 ≥ R$700 | P2 R$550–700 | P3 < R$550',
              kpiKey: 'faturamento',
            },
            {
              label: 'Inadimplência (%)',
              value: `${delinqPct.toFixed(1)}%`,
              color: delinqPct < 3 ? G : delinqPct < 7 ? Y : R,
              meta: 'P1 < 3% | P2 3–7% | P3 > 7%',
              kpiKey: 'inadimplencia',
            },
            {
              label: 'Despesas Fixas / Receita (%)',
              value: `${fixedPct.toFixed(1)}%`,
              color: fixedPct < 40 ? G : fixedPct < 55 ? Y : R,
              meta: 'P1 < 40% | P2 40–55% | P3 > 55%',
              kpiKey: 'despesasfixas',
            },
            {
              label: 'DRE Gerencial: EBITDA %',
              value: `${ebitdaPct.toFixed(1)}%`,
              color: ebitdaPct >= 20 ? G : ebitdaPct >= 10 ? Y : R,
              meta: 'P1 ≥ 20% | P2 10–20% | P3 < 10%',
              kpiKey: 'margem',
            },
            {
              label: 'Forecast de Receita',
              value: fmt(forecastP50),
              color: forecastP50 >= kpis.grossRevenue ? G : forecastP50 >= kpis.grossRevenue * 0.85 ? Y : R,
              meta: forecastP50 >= kpis.grossRevenue ? 'Acima do realizado' : `${((forecastP50 / Math.max(kpis.grossRevenue, 1)) * 100).toFixed(0)}% do faturamento atual`,
              kpiKey: 'faturamento',
            },
            {
              label: 'Posição de Caixa',
              value: fmt(posicaoCaixa),
              color: posicaoCaixa > kpis.grossRevenue * 0.15 ? G : posicaoCaixa > 0 ? Y : R,
              meta: posicaoCaixa > 0 ? 'Caixa positivo' : 'Caixa negativo — atenção',
              kpiKey: 'faturamento',
            },
            {
              label: 'Break-even',
              value: fmt(breakEven.breakEvenRevenue),
              color: breakEvenCov >= 120 ? G : breakEvenCov >= 100 ? Y : R,
              meta: `Cobertura: ${breakEvenCov.toFixed(0)}% — ${breakEvenCov >= 100 ? 'atingido' : 'não atingido'}`,
              kpiKey: 'faturamento',
            },
          ];
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10, marginBottom: 16 }}>
              {cards.map(card => (
                <div
                  key={card.label}
                  className="overview-card"
                  onClick={() => openKpiModal(card.label, card.kpiKey)}
                  style={{ borderTop: `3px solid ${card.color}`, padding: '12px 14px', cursor: 'pointer' }}
                >
                  <div className="overview-card-label" style={{ fontSize: 10, marginBottom: 6 }}>{card.label}</div>
                  <div className="overview-card-value" style={{ color: card.color, fontSize: 24, lineHeight: 1.1 }}>{card.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>{card.meta}</div>
                </div>
              ))}
            </div>
          );
        })()}
        <FinanceiroModule financeWeeks={financeWeeksForModule} filtered={filtered} kpis={kpis} filters={filters} showTargets={filters.severity !== ''} plan="PRO" />
      </>)}
      {/* ===== AGENDA / OTIMIZAÇÃO ===== */}
      {activeTab === 1 && (<>
        <div className="section-header"><h2><span className="orange-bar" /> Agenda & No-Show</h2></div>
        {(() => {
          const G = 'var(--green)', Y = 'var(--yellow)', R = 'var(--red)';
          const noShowCount   = filtered.filter(a => a.status === 'No-Show').length;
          const cancelCount   = filtered.filter(a => a.status === 'Cancelada').length;
          const lostCapRate   = kpis.total > 0 ? ((noShowCount + cancelCount) / kpis.total) * 100 : 0;
          const costNoShow    = noShowCount * kpis.avgTicket;
          const periodDays    = filters.period === '7d' ? 7 : filters.period === '15d' ? 15
                              : filters.period === '3m' ? 90 : filters.period === '6m' ? 180
                              : filters.period === '1 ano' ? 365 : 30;
          const periodMult    = periodDays / 30;
          const costP1Scaled  = 2000 * periodMult;
          const costP3Scaled  = 5000 * periodMult;
          const channelCounts = (() => {
            const counts = new Map<string, number>();
            filtered.forEach(a => counts.set(a.channel, (counts.get(a.channel) ?? 0) + 1));
            return counts;
          })();
          const topChannel = Array.from(channelCounts.entries()).sort((a, b) => b[1] - a[1])[0];
          const activeChannel = filters.channel
            ? [filters.channel, channelCounts.get(filters.channel) ?? 0] as [string, number]
            : topChannel;

          const cards = [
            {
              label: 'Taxa de No-Show (%)',
              value: `${kpis.noShowRate.toFixed(1)}%`,
              color: kpis.noShowRate < 8 ? G : kpis.noShowRate < 15 ? Y : R,
              meta: 'P1 < 8% | P2 8–15% | P3 > 15%',
            },
            {
              label: 'Custo Estimado do No-Show',
              value: fmt(costNoShow),
              color: costNoShow < costP1Scaled ? G : costNoShow < costP3Scaled ? Y : R,
              meta: `${noShowCount} no-shows × ticket médio`,
            },
            {
              label: 'Taxa de Ocupação (%)',
              value: `${kpis.occupancyRate.toFixed(1)}%`,
              color: kpis.occupancyRate >= 80 ? G : kpis.occupancyRate >= 65 ? Y : R,
              meta: 'P1 > 80% | P2 65–80% | P3 < 65%',
            },
            {
              label: 'Confirmações Realizadas (%)',
              value: `${kpis.confirmationRate.toFixed(1)}%`,
              color: kpis.confirmationRate >= 85 ? G : kpis.confirmationRate >= 70 ? Y : R,
              meta: 'P1 > 85% | P2 70–85% | P3 < 70%',
            },
            {
              label: 'Consultas Realizadas',
              value: String(kpis.realized),
              color: kpis.occupancyRate >= 80 ? G : kpis.occupancyRate >= 65 ? Y : R,
              meta: `de ${kpis.total} agendados`,
            },
            {
              label: 'Perda de Capacidade não Recuperável (%)',
              value: `${lostCapRate.toFixed(1)}%`,
              color: lostCapRate < 8 ? G : lostCapRate < 15 ? Y : R,
              meta: 'No-shows + cancelamentos ÷ total',
            },
            {
              label: 'Total de Agendamentos',
              value: String(kpis.total),
              color: G,
              meta: 'Total agendado no período',
            },
            {
              label: filters.channel ? `Canal: ${filters.channel}` : 'Canal de Aquisição',
              value: filters.channel
                ? activeChannel ? `${activeChannel[0]} / ${activeChannel[1]}` : '—'
                : `Todos / ${kpis.total}`,
              color: G,
              meta: filters.channel ? 'Agendamentos no canal filtrado' : 'Total de agendamentos (todos os canais)',
            },
            {
              label: 'Lead Time do Agendamento',
              value: `${kpis.leadTimeDays.toFixed(1)}d`,
              color: kpis.leadTimeDays < 3 ? G : kpis.leadTimeDays < 7 ? Y : R,
              meta: 'P1 < 3d | P2 3–7d | P3 > 7d',
            },
          ];

          return (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:10, marginBottom:16 }}>
              {cards.map(card => (
                <div key={card.label} className="overview-card" style={{ borderTop:`3px solid ${card.color}`, padding:'12px 14px' }}>
                  <div className="overview-card-label" style={{ fontSize:10, marginBottom:6 }}>{card.label}</div>
                  <div className="overview-card-value" style={{ color:card.color, fontSize:24, lineHeight:1.1 }}>{card.value}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4, lineHeight:1.3 }}>{card.meta}</div>
                </div>
              ))}
            </div>
          );
        })()}
        <AgendaNoShowModule agendaWeeks={agendaWeeksForModule} filtered={filtered} kpis={kpis} filters={filters} showTargets={filters.severity !== ''} plan="PRO" />
      </>)}
      {/* ===== MARKETING / UNIT ECONOMICS ===== */}
      {activeTab === 3 && (<>
        <div className="section-header"><h2><span className="orange-bar" /> Marketing & Captação</h2></div>
        {(() => {
          const G = 'var(--green)', Y = 'var(--yellow)', R = 'var(--red)';
          const n           = Math.max(1, marketingChannelStats.length);
          const totalLeads  = marketingChannelStats.reduce((s, c) => s + c.leads,       0);
          const totalSpend  = marketingChannelStats.reduce((s, c) => s + c.spend,       0);
          const totalBooked = marketingChannelStats.reduce((s, c) => s + c.booked,      0);
          const totalAttend = marketingChannelStats.reduce((s, c) => s + c.attended,    0);
          const totalNew    = marketingChannelStats.reduce((s, c) => s + c.newPatients, 0);
          // Weighted averages (spec: CPL = Σspend/Σleads; CAC = Σspend/Σnew; ROI = weighted by investment)
          const cpl       = totalLeads > 0 ? totalSpend / totalLeads : 0;
          const convAgend = totalLeads > 0 ? (totalBooked / totalLeads) * 100 : 0;
          const convConsul = totalLeads > 0 ? (totalAttend / totalLeads) * 100 : 0;
          // CAC: simple average of per-channel values from marketingChannelStats.
          // When filtered, marketingChannelStats already contains only the active channel(s).
          const cacList = marketingChannelStats.map(c => c.cac).filter(v => v > 0);
          const avgCAC  = cacList.length > 0
            ? cacList.reduce((s, v) => s + v, 0) / cacList.length
            : 0;
          const avgROI    = marketingChannelStats.reduce((s, c) => s + c.roi, 0) / n;
          const validLtv  = marketingChannelStats.filter(c => c.cac > 0);
          const avgLtvCac = validLtv.length > 0 ? validLtv.reduce((s, c) => s + c.ltvCac, 0) / validLtv.length : 0;
          const topChannel = [...marketingChannelStats].sort((a, b) => b.leads - a.leads)[0];

          // Filter state — responds to both Canal and Profissionais filters
          const isFiltered  = !!(filters.channel || filters.professional);
          const filterLabel = filters.channel && filters.professional
            ? `${filters.channel} · ${filters.professional}`
            : filters.channel || filters.professional || '';
          const hasChData   = !isFiltered || marketingChannelStats.length > 0;

          const mkCards = [
            { label: 'Leads Gerados',                    value: String(totalLeads),           color: totalLeads > 0 ? G : Y,              meta: topChannel ? `Top canal: ${topChannel.name} (${topChannel.leads})` : 'Sem dados', isLeads: true,  hasData: true },
            { label: 'Custo por Lead (CPL)',              value: fmt(cpl),                     color: cpl < 50 ? G : cpl < 120 ? Y : R,   meta: 'P1 < R$50 | P2 R$50–120 | P3 > R$120',    isLeads: false, hasData: hasChData },
            { label: 'Conversão Lead → Agendamento (%)', value: `${convAgend.toFixed(1)}%`,   color: convAgend >= 40 ? G : convAgend >= 25 ? Y : R,  meta: 'P1 ≥ 40% | P2 25–40% | P3 < 25%',   isLeads: false, hasData: hasChData },
            { label: 'Conversão Lead → Consulta (%)',    value: `${convConsul.toFixed(1)}%`,  color: convConsul >= 30 ? G : convConsul >= 15 ? Y : R, meta: 'P1 ≥ 30% | P2 15–30% | P3 < 15%',   isLeads: false, hasData: hasChData },
            { label: 'CAC por Canal',                    value: fmt(avgCAC),                  color: avgCAC < 100 ? G : avgCAC < 250 ? Y : R,        meta: 'P1 < R$100 | P2 R$100–250 | P3 > R$250', isLeads: false, hasData: hasChData },
            { label: 'ROI por Canal (%)',                value: `${avgROI.toFixed(0)}%`,      color: avgROI >= 200 ? G : avgROI >= 100 ? Y : R,      meta: 'P1 ≥ 200% | P2 100–200% | P3 < 100%', isLeads: false, hasData: hasChData },
            { label: 'LTV / CAC (ratio)',                value: `${avgLtvCac.toFixed(1)}x`,   color: avgLtvCac >= 3 ? G : avgLtvCac >= 1.5 ? Y : R,  meta: 'P1 ≥ 3x | P2 1,5–3x | P3 < 1,5x',   isLeads: false, hasData: hasChData },
          ];
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10, marginBottom: 16 }}>
              {mkCards.map(card => (
                <MkCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  meta={card.meta}
                  color={card.color}
                  isFiltered={isFiltered}
                  filterLabel={filterLabel}
                  hasData={card.hasData}
                  isLeads={card.isLeads}
                  onClick={() => openKpiModal(card.label, card.label.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8))}
                />
              ))}
            </div>
          );
        })()}
        <MarketingModule weeklyData={weeklyTrend} filtered={filtered} kpis={kpis} filters={filters} showTargets={filters.severity !== ''} plan="PRO" />
      </>)}
      {/* ===== INTEGRAÇÕES ===== */}
      {activeTab === 6 && (
        <IntegrationSection
          plan="PRO"
          totalRecords={kpis.total}
          leads={kpis.leads}
          realized={kpis.realized}
          integrationHealth={integrationHealth}
        />
      )}
      {activeTab === -1 && (<>
        <div className="section-header"><h2><span className="orange-bar" /> Integrações</h2></div>
        <div className="overview-row">
          <div className="overview-card"><div className="overview-card-label">Fontes Conectadas</div><div className="overview-card-value">6</div><div className="overview-card-info"><div className="dot" style={{background:'var(--green)'}}/><span>Ativas</span></div></div>
          <div className="overview-card"><div className="overview-card-label">Última Sync</div><div className="overview-card-value" style={{fontSize:16}}>Há 5 min</div></div>
          <div className="overview-card"><div className="overview-card-label">Registros</div><div className="overview-card-value">{kpis.total.toLocaleString()}</div></div>
          <div className="overview-card"><div className="overview-card-label">Erros</div><div className="overview-card-value" style={{color:'var(--green)'}}>0</div></div>
        </div>
        <div className="detail-section"><div className="detail-section-header">🔗 Status das Integrações</div><div className="detail-section-body"><table className="data-table"><thead><tr><th>Sistema</th><th>Status</th><th>Última Sync</th><th>Registros</th></tr></thead><tbody>
          <tr><td>ERP Financeiro</td><td><span className="chart-card-badge green" style={{display:'inline-block'}}>OK</span></td><td>5 min</td><td>{kpis.realized}</td></tr>
          <tr><td>Agenda Digital</td><td><span className="chart-card-badge green" style={{display:'inline-block'}}>OK</span></td><td>2 min</td><td>{kpis.total}</td></tr>
          <tr><td>CRM Marketing</td><td><span className="chart-card-badge green" style={{display:'inline-block'}}>OK</span></td><td>10 min</td><td>{kpis.leads}</td></tr>
          <tr><td>NPS Platform</td><td><span className="chart-card-badge green" style={{display:'inline-block'}}>OK</span></td><td>15 min</td><td>{kpis.promoters+kpis.neutrals+kpis.detractors}</td></tr>
          <tr><td>Google Analytics</td><td><span className="chart-card-badge green" style={{display:'inline-block'}}>OK</span></td><td>3 min</td><td>{kpis.leads}</td></tr>
          <tr><td>WhatsApp API</td><td><span className="chart-card-badge green" style={{display:'inline-block'}}>OK</span></td><td>1 min</td><td>{Math.round(kpis.total*0.3)}</td></tr>
        </tbody></table></div></div>
      </>)}

      {/* ===== OPERAÇÃO & UX ===== */}
      {activeTab === 4 && (<>
        <div className="section-header"><h2><span className="orange-bar" /> Operação & UX</h2></div>
        {(() => {
          const G = 'var(--green)', Y = 'var(--yellow)', R = 'var(--red)';

          // Professional filter state (uses NoCanal data — canal filter must not affect these)
          const profFilter   = filters.professional;
          const profData     = profFilter ? byProfNoCanal.find(p => p.name === profFilter) ?? null : null;
          const opsProData   = profFilter ? opsProByProfessional.find(p => p.name === profFilter) ?? null : null;
          const isProfFilt   = !!profFilter;
          const profLabel    = profFilter || '';

          // Procedure filter state (uses NoCanal data)
          const procFilter    = filters.procedure;
          const procData      = procFilter ? byProcNoCanal.find(p => p.name === procFilter) ?? null : null;
          const isProcFilt    = !!procFilter;
          const validProcs    = byProcNoCanal.filter(p => p.grossRevenue > 0);
          const avgProcMargin = validProcs.length > 0
            ? validProcs.reduce((s, p) => s + p.margin, 0) / validProcs.length
            : kpisNoCanal.margin;

          // Margem por Profissional (uses NoCanal data)
          const validProfs    = byProfNoCanal.filter(p => p.grossRevenue > 0);
          const avgProfMargin = validProfs.length > 0
            ? validProfs.reduce((s, p) => s + p.margin, 0) / validProfs.length
            : kpisNoCanal.margin;

          // Canal filter state — SLA Lead responds ONLY to this
          // kpis (canal-filtered) gives the selected channel's SLA directly
          const canalFilter = filters.channel;
          const isCanalFilt = !!canalFilter;

          // Resolved values — all use kpisNoCanal except slaNum
          const npsNum        = isProfFilt && profData   ? profData.avgNPS         : kpisNoCanal.avgNPS;
          const waitNum       = isProfFilt && opsProData ? opsProData.waitByDoctor  : kpisNoCanal.avgWait;
          const returnNum     = isProfFilt && opsProData ? opsProData.return90      : kpisNoCanal.returnRate;
          const slaNum        = isCanalFilt ? kpis.slaLeadHours                    : kpisNoCanal.slaLeadHours;
          const profMarginNum = isProfFilt && profData   ? profData.margin          : avgProfMargin;
          const procMarginNum = isProcFilt && procData   ? procData.margin          : avgProcMargin;

          const opsCards = [
            {
              label:      isProfFilt ? `NPS — ${profFilter}` : 'NPS Geral',
              value:      npsNum.toFixed(1),
              color:      npsNum >= 8.5 ? G : npsNum >= 7 ? Y : R,
              meta:       'P1 ≥ 9 | P2 7–9 | P3 < 7',
              isFiltered: isProfFilt,
              filterLabel: profLabel,
              hasData:    !isProfFilt || !!profData,
              isLeads:    false,
            },
            {
              label:      'Espera Média',
              value:      `${waitNum.toFixed(0)} min`,
              color:      waitNum <= 12 ? G : waitNum <= 20 ? Y : R,
              meta:       'P1 ≤ 12 min | P2 12–20 | P3 > 20',
              isFiltered: isProfFilt,
              filterLabel: profLabel,
              hasData:    !isProfFilt || !!opsProData,
              isLeads:    false,
            },
            {
              label:      'Taxa de Retorno',
              value:      `${returnNum.toFixed(1)}%`,
              color:      returnNum >= 40 ? G : returnNum >= 25 ? Y : R,
              meta:       'P1 ≥ 40% | P2 25–40% | P3 < 25%',
              isFiltered: isProfFilt,
              filterLabel: profLabel,
              hasData:    !isProfFilt || !!opsProData,
              isLeads:    false,
            },
            {
              label:      isCanalFilt ? `SLA Lead — ${canalFilter}` : 'SLA Lead (h)',
              value:      `${slaNum.toFixed(2)}h`,
              color:      slaNum <= 1 ? G : slaNum <= 2 ? Y : R,
              meta:       'P1 ≤ 1h | P2 1–2h | P3 > 2h',
              isFiltered: isCanalFilt,
              filterLabel: canalFilter || '',
              hasData:    true,
              isLeads:    false,
            },
            {
              label:      isProfFilt ? `Margem — ${profFilter}` : 'Margem por Profissional',
              value:      `${profMarginNum.toFixed(1)}%`,
              color:      profMarginNum >= 20 ? G : profMarginNum >= 10 ? Y : R,
              meta:       'P1 ≥ 20% | P2 10–20% | P3 < 10%',
              isFiltered: isProfFilt,
              filterLabel: profLabel,
              hasData:    !isProfFilt || !!profData,
              isLeads:    false,
            },
            {
              label:      isProcFilt ? `Margem — ${procFilter}` : 'Margem por Procedimento',
              value:      `${procMarginNum.toFixed(1)}%`,
              color:      procMarginNum >= 20 ? G : procMarginNum >= 10 ? Y : R,
              meta:       'P1 ≥ 20% | P2 10–20% | P3 < 10%',
              isFiltered: isProcFilt,
              filterLabel: procFilter || '',
              hasData:    !isProcFilt || !!procData,
              isLeads:    false,
            },
          ];

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10, marginBottom: 16 }}>
              {opsCards.map(card => (
                <MkCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  meta={card.meta}
                  color={card.color}
                  isFiltered={card.isFiltered}
                  filterLabel={card.filterLabel}
                  hasData={card.hasData}
                  isLeads={card.isLeads}
                />
              ))}
            </div>
          );
        })()}
        <OperacaoUXModule opsWeeks={agendaWeeksForModule} filtered={filtered} kpis={kpis} byProf={byProf} byProcAll={byProcAll} byChannelAll={byChannelNoCanal} opsProByProfessional={opsProByProfessional} filters={filters} showTargets={filters.severity !== ''} plan="PRO" />
      </>)}
      {/* ===== CORPO CLÍNICO ===== */}
      {activeTab === 5 && (<>
        <div className="section-header"><h2><span className="orange-bar" /> Corpo Clínico</h2></div>
        <div className="chart-card" style={{ marginBottom: 16, minHeight: 'unset' }}>
          <div className="chart-card-header">
            <span className="chart-card-title">Corpo Clínico</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Cadastro manual para compor tabela e rankings</span>
          </div>
          <div className="chart-card-body" style={{ padding: '14px 16px', minHeight: 'unset' }}>
            {/* Row 1: Nome + Área + button */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {([
                { key: 'name' as const, label: 'Nome', placeholder: 'Ex.: Dra. Paula' },
                { key: 'role' as const, label: 'Área / função', placeholder: 'Ex.: Recepção' },
              ]).map((field) => (
                <label key={field.key} style={{ flex: 1, minWidth: 160, display: 'grid', gap: 5, color: 'var(--text-secondary)', fontSize: 12 }}>
                  <span>{field.label}</span>
                  <input
                    value={teamMemberForm[field.key]}
                    onChange={(e) => handleTeamMemberFormChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{
                      width: '100%', borderRadius: 10,
                      border: '1px solid rgba(249,115,22,0.2)',
                      background: 'rgba(15,23,42,0.55)',
                      color: 'var(--text-primary)', padding: '9px 12px', outline: 'none', fontSize: 13,
                    }}
                  />
                </label>
              ))}
              <div style={{ display: 'flex', gap: 8, paddingBottom: 1 }}>
                {(editingManualTeamMemberIndex !== null || editingBaseTeamMemberName !== null) && (
                  <button type="button" onClick={handleCancelTeamMemberEdit} style={{
                    border: '1px solid rgba(148,163,184,0.24)', borderRadius: 999,
                    background: 'transparent', color: 'var(--text-primary)',
                    fontWeight: 600, padding: '9px 16px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
                  }}>Cancelar</button>
                )}
                <button type="button" onClick={handleAddTeamMember} style={{
                  border: 'none', borderRadius: 999, background: '#f97316',
                  color: '#111827', fontWeight: 700, padding: '9px 20px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
                }}>
                  {(editingManualTeamMemberIndex !== null || editingBaseTeamMemberName !== null) ? 'Salvar alterações' : '+ Adicionar membro'}
                </button>
              </div>
            </div>

            {/* Row 2: Metas individuais */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Metas individuais
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {([
                  { key: 'consultas' as const, label: 'Consultas',  placeholder: 'ex: 100',  unit: '' },
                  { key: 'receita'   as const, label: 'Receita',    placeholder: 'ex: 80000', unit: 'R$' },
                  { key: 'nps'       as const, label: 'NPS',        placeholder: 'ex: 8.5',  unit: '/10' },
                  { key: 'noShow'    as const, label: 'No-show %',  placeholder: 'ex: 8',    unit: '%' },
                  { key: 'ocupacao'  as const, label: 'Ocupação %', placeholder: 'ex: 75',   unit: '%' },
                  { key: 'espera'    as const, label: 'Espera min', placeholder: 'ex: 12',   unit: 'min' },
                ]).map(f => (
                  <label key={f.key} style={{ display: 'grid', gap: 4, color: 'var(--text-secondary)', fontSize: 12 }}>
                    <span>{f.label}</span>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        value={teamMemberForm.goals[f.key]}
                        onChange={e => handleGoalChange(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        style={{
                          width: '100%', borderRadius: 10,
                          border: '1px solid rgba(99,102,241,0.2)',
                          background: 'rgba(15,23,42,0.45)',
                          color: 'var(--text-primary)', padding: '8px 32px 8px 10px', outline: 'none', fontSize: 12,
                        }}
                      />
                      {f.unit && (
                        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-muted)', pointerEvents: 'none' }}>{f.unit}</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {(() => {
          const goalCell = (actual: string, goal: string, goodWhenHigh = true) => {
            if (!goal) return <span>{actual}</span>;
            const a = parseFloat(actual.replace(/[^\d.]/g,''));
            const g = parseFloat(goal);
            const ok = goodWhenHigh ? a >= g : a <= g;
            return (
              <span>
                <span style={{ fontWeight: 700, color: ok ? 'var(--green)' : 'var(--red)' }}>{actual}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 1 }}>meta: {goal}</span>
              </span>
            );
          };
          return (
            <div className="detail-section"><div className="detail-section-header">👥 Performance da Equipe</div><div className="detail-section-body"><table className="data-table"><thead><tr><th>Profissional</th><th>Consultas</th><th>Receita</th><th>NPS</th><th>No-Show</th><th>Ocupação</th><th>Espera</th></tr></thead><tbody>
              {displayedTeamMembers.map((p, idx) => {
                const g = memberGoals[p.name];
                return (
                  <tr key={`${p.name}-${idx}`} style={{cursor:'default'}}>
                    <td style={{fontWeight:600}}>{p.name}</td>
                    <td>{g ? goalCell(String(p.realized), g.consultas, true) : p.realized}</td>
                    <td>{g ? goalCell(fmt(p.grossRevenue), g.receita ? fmt(Number(g.receita)) : '', true) : fmt(p.grossRevenue)}</td>
                    <td style={{color:p.avgNPS>=8?'var(--green)':'var(--yellow)',fontWeight:700}}>{g ? goalCell(p.avgNPS.toFixed(1), g.nps, true) : p.avgNPS.toFixed(1)}</td>
                    <td style={{color:p.noShowRate<=10?'var(--green)':'var(--red)',fontWeight:700}}>{g ? goalCell(p.noShowRate.toFixed(1)+'%', g.noShow ? g.noShow+'%' : '', false) : p.noShowRate.toFixed(1)+'%'}</td>
                    <td>{g ? goalCell(p.occupancyRate.toFixed(1)+'%', g.ocupacao ? g.ocupacao+'%' : '', true) : p.occupancyRate.toFixed(1)+'%'}</td>
                    <td>{g ? goalCell(p.avgWait.toFixed(0)+' min', g.espera ? g.espera+' min' : '', false) : p.avgWait.toFixed(0)+' min'}</td>
                  </tr>
                );
              })}
            </tbody></table></div></div>
          );
        })()}
        {(() => {
          const byRevenue = [...displayedTeamMembers].sort((a,b) => a.grossRevenue - b.grossRevenue);
          const byNPS     = [...displayedTeamMembers].sort((a,b) => a.avgNPS - b.avgNPS);
          const revenueColors = byRevenue.map((_, i) => {
            const pct = byRevenue.length > 1 ? i / (byRevenue.length - 1) : 1;
            return pct < 0.4 ? '#ef4444' : pct < 0.75 ? '#f59e0b' : '#22c55e';
          });
          const npsColors = byNPS.map(p => p.avgNPS >= 8.5 ? '#22c55e' : p.avgNPS >= 7.5 ? '#f59e0b' : '#ef4444');
          const barOpts = {
            ...ct,
            chart: { ...ct.chart, type: 'bar' as const, toolbar: { show: false } },
            plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 4, barHeight: '55%' } },
            legend: { show: false },
            grid: { borderColor: 'rgba(255,255,255,0.05)', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
            tooltip: { theme: 'dark' },
          };
          return (
            <div className="chart-grid">
              <div className="chart-card">
                <div className="chart-card-header"><span className="chart-card-title">Ranking Receita</span><span style={{fontSize:10,color:'var(--text-muted)'}}>menor → maior</span></div>
                <div className="chart-card-body">
                  <ReactApexChart
                    options={{...barOpts, colors: revenueColors,
                      xaxis: { ...ct.xaxis, categories: byRevenue.map(p=>p.name) },
                      yaxis: { labels: { style: { colors: '#9ca3af', fontSize: '12px' } } },
                      dataLabels: { enabled: true, formatter: (v: number) => `R$ ${(v/1000).toFixed(0)}k`, style: { fontSize: '11px', colors: ['#fff'] } },
                    }}
                    series={[{name:'Receita', data: byRevenue.map(p=>Math.round(p.grossRevenue))}]}
                    type="bar" height={Math.max(160, byRevenue.length * 48)}
                  />
                </div>
              </div>
              <div className="chart-card">
                <div className="chart-card-header"><span className="chart-card-title">Ranking NPS</span><span style={{fontSize:10,color:'var(--text-muted)'}}>menor → maior</span></div>
                <div className="chart-card-body">
                  <ReactApexChart
                    options={{...barOpts, colors: npsColors,
                      xaxis: { ...ct.xaxis, categories: byNPS.map(p=>p.name), min: 0, max: 10 },
                      yaxis: { labels: { style: { colors: '#9ca3af', fontSize: '12px' } } },
                      dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(1), style: { fontSize: '11px', colors: ['#fff'] } },
                      annotations: { xaxis: [
                        { x: 7.5, borderColor: '#f59e0b', strokeDashArray: 4, label: { text: '7.5', style: { color: '#f59e0b', background: 'transparent', fontSize: '10px' } } },
                        { x: 8.5, borderColor: '#22c55e', strokeDashArray: 4, label: { text: '8.5', style: { color: '#22c55e', background: 'transparent', fontSize: '10px' } } },
                      ]},
                    }}
                    series={[{name:'NPS', data: byNPS.map(p=>+p.avgNPS.toFixed(1))}]}
                    type="bar" height={Math.max(160, byNPS.length * 48)}
                  />
                </div>
              </div>
            </div>
          );
        })()}
      </>)}


      {/* ── KPI INFO MODAL ── */}
      {kpiModal && (
        <div
          onClick={() => setKpiModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 20, padding: '32px 36px',
              maxWidth: 560, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 22, color: '#6b7280' }}>?</span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                {kpiModal.title}
              </h2>
              <button
                onClick={() => setKpiModal(null)}
                style={{
                  marginLeft: 'auto', width: 32, height: 32, borderRadius: '50%',
                  border: '1px solid #e5e7eb', background: '#f9fafb',
                  cursor: 'pointer', fontSize: 16, color: '#6b7280',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ height: 1, background: '#f1f5f9', marginBottom: 20 }} />
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Como Calcular
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1e293b', lineHeight: 1.5 }}>
              {kpiModal.formula}
            </p>
            <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.65 }}>
              {kpiModal.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ProDashboard);
