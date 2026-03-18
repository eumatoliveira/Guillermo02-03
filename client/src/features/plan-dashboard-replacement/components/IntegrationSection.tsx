import { memo, useEffect, useMemo, useState } from 'react';

type Plan = 'ESSENTIAL' | 'PRO' | 'ENTERPRISE';
type IntegrationStatus = 'connected' | 'degraded' | 'disconnected';
type InstallationStage = 'idle' | 'installing' | 'installed';

type IntegrationItem = {
  key: string;
  label: string;
  provider: string;
  status: IntegrationStatus;
  lastSyncAt: string | null;
  slaMinutes: number;
  failures24h: number;
};

type IntegrationHealth = {
  integrations?: IntegrationItem[];
  technical?: {
    lastSyncAt?: string | null;
    apiFailures24h?: number;
    volumeRegistrosDia?: number;
  };
};

type IntegrationField = {
  id: string;
  label: string;
  placeholder: string;
};

type IntegrationFormSpec = {
  endpoint: string;
  fields: IntegrationField[];
};

type IntegrationFormState = Record<string, string>;

type IntegrationReview = {
  author: string;
  role: string;
  quote: string;
  helpful: number;
  rating?: number;
};

type IntegrationReviewDraft = {
  rating: number;
  comment: string;
};

type IntegrationCatalogMeta = {
  category: string;
  summary: string;
  description: string;
  heroTitle: string;
  heroCopy: string;
  accentClass: string;
  iconText: string;
  heroImageUrl?: string;
  compatibility: string;
  docs: string[];
  bullets: string[];
  rating: number;
  reviewsCount: string;
  setupTime: string;
  installNote: string;
  reviews: IntegrationReview[];
};

type MarketplaceApp = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  image?: string;
  badge: string;
  installTime: string;
  compatibility: string;
  ctaLabel?: string;
  iconText: string;
  accentClass: string;
};

type InstallationState = {
  stage: InstallationStage;
  progress: number;
};

interface Props {
  plan: Plan;
  totalRecords: number;
  leads: number;
  realized: number;
  integrationHealth?: IntegrationHealth | null;
}

const DEFAULT_CATALOG: Record<Plan, Array<Omit<IntegrationItem, 'status' | 'lastSyncAt' | 'failures24h'>>> = {
  ESSENTIAL: [
    { key: 'agenda', label: 'Agenda', provider: 'Clinicorp / iClinic / Omie', slaMinutes: 15 },
    { key: 'kommo', label: 'Kommo CRM', provider: 'OAuth + Webhook + REST Sync', slaMinutes: 5 },
    { key: 'asaas', label: 'Asaas Billing', provider: 'Webhook + REST Sync', slaMinutes: 5 },
    { key: 'google-sheets', label: 'Google Sheets', provider: 'Sheets API / CSV bridge', slaMinutes: 60 },
    { key: 'financeiro', label: 'Financeiro / ERP', provider: 'ERP/API', slaMinutes: 60 },
    { key: 'nps', label: 'NPS / Forms', provider: 'Forms/API', slaMinutes: 120 },
  ],
  PRO: [
    { key: 'agenda', label: 'Agenda', provider: 'Clinicorp / iClinic / Omie', slaMinutes: 15 },
    { key: 'kommo', label: 'Kommo CRM', provider: 'OAuth + Webhook + REST Sync', slaMinutes: 5 },
    { key: 'asaas', label: 'Asaas Billing', provider: 'Webhook + REST Sync', slaMinutes: 5 },
    { key: 'crm-api', label: 'Outros CRMs via API', provider: 'Pipedrive / RD / HubSpot (adapter)', slaMinutes: 30 },
    { key: 'google-sheets', label: 'Google Sheets', provider: 'Sheets API / CSV bridge', slaMinutes: 60 },
    { key: 'financeiro', label: 'Financeiro / ERP', provider: 'ERP/API', slaMinutes: 60 },
    { key: 'nps', label: 'NPS / Forms', provider: 'Forms/API', slaMinutes: 120 },
    { key: 'meta-ads', label: 'Meta Ads', provider: 'Marketing API', slaMinutes: 30 },
    { key: 'google-ads', label: 'Google Ads', provider: 'Google Ads API', slaMinutes: 30 },
  ],
  ENTERPRISE: [
    { key: 'agenda', label: 'Agenda', provider: 'Clinicorp / iClinic / Omie', slaMinutes: 15 },
    { key: 'kommo', label: 'Kommo CRM', provider: 'OAuth + Webhook + REST Sync', slaMinutes: 5 },
    { key: 'asaas', label: 'Asaas Billing', provider: 'Webhook + REST Sync', slaMinutes: 5 },
    { key: 'crm-api', label: 'Outros CRMs via API', provider: 'Pipedrive / RD / HubSpot (adapter)', slaMinutes: 30 },
    { key: 'google-sheets', label: 'Google Sheets', provider: 'Sheets API / CSV bridge', slaMinutes: 60 },
    { key: 'financeiro', label: 'Financeiro / ERP', provider: 'ERP/API', slaMinutes: 60 },
    { key: 'nps', label: 'NPS / Forms', provider: 'Forms/API', slaMinutes: 120 },
    { key: 'meta-ads', label: 'Meta Ads', provider: 'Marketing API', slaMinutes: 30 },
    { key: 'google-ads', label: 'Google Ads', provider: 'Google Ads API', slaMinutes: 30 },
    { key: 'google-tag-manager', label: 'Google Tag Manager', provider: 'GTM API / Data Layer', slaMinutes: 30 },
  ],
};

const FORM_SPECS: Record<string, IntegrationFormSpec> = {
  agenda: {
    endpoint: 'https://api.clinica.com/agenda',
    fields: [
      { id: 'apiUrl', label: 'API URL', placeholder: 'https://api.clinica.com/agenda' },
      { id: 'apiKey', label: 'API Key', placeholder: 'agenda-api-key' },
      { id: 'accountId', label: 'Conta / Unidade', placeholder: 'clinicorp-main' },
    ],
  },
  kommo: {
    endpoint: '/crm/kommo/webhook',
    fields: [
      { id: 'accountDomain', label: 'Account Domain', placeholder: 'empresa.kommo.com' },
      { id: 'accessToken', label: 'Access Token', placeholder: 'access_token' },
      { id: 'refreshToken', label: 'Refresh Token', placeholder: 'refresh_token' },
      { id: 'webhookSecret', label: 'Webhook Secret', placeholder: 'x-signature secret' },
    ],
  },
  asaas: {
    endpoint: '/billing/asaas/webhook',
    fields: [
      { id: 'apiBaseUrl', label: 'API Base URL', placeholder: 'https://api.asaas.com/v3' },
      { id: 'accessToken', label: 'Access Token', placeholder: 'asaas-access-token' },
      { id: 'webhookToken', label: 'Webhook Token', placeholder: 'asaas-webhook-token' },
    ],
  },
  'google-sheets': {
    endpoint: 'https://sheets.googleapis.com',
    fields: [
      { id: 'sheetId', label: 'Sheet ID', placeholder: '1AbCdEfGhIjKlMn' },
      { id: 'worksheet', label: 'Aba / Worksheet', placeholder: 'Base Principal' },
      { id: 'serviceAccount', label: 'Service Account', placeholder: 'service@project.iam.gserviceaccount.com' },
    ],
  },
  financeiro: {
    endpoint: 'https://erp.empresa.com/api',
    fields: [
      { id: 'erpUrl', label: 'ERP URL', placeholder: 'https://erp.empresa.com/api' },
      { id: 'erpToken', label: 'Token', placeholder: 'erp-token' },
      { id: 'companyCode', label: 'Empresa / Tenant', placeholder: 'glx-finance' },
    ],
  },
  nps: {
    endpoint: 'https://forms.provider.com/api',
    fields: [
      { id: 'formUrl', label: 'Forms URL', placeholder: 'https://forms.provider.com/api' },
      { id: 'apiToken', label: 'API Token', placeholder: 'forms-token' },
      { id: 'queueName', label: 'Fila / Lista', placeholder: 'nps-main' },
    ],
  },
  'crm-api': {
    endpoint: 'https://crm.provider.com/api',
    fields: [
      { id: 'providerName', label: 'CRM', placeholder: 'Pipedrive / RD / HubSpot' },
      { id: 'apiUrl', label: 'API URL', placeholder: 'https://crm.provider.com/api' },
      { id: 'apiToken', label: 'Token', placeholder: 'crm-token' },
    ],
  },
  'meta-ads': {
    endpoint: 'https://graph.facebook.com',
    fields: [
      { id: 'adAccount', label: 'Ad Account', placeholder: 'act_123456789' },
      { id: 'accessToken', label: 'Access Token', placeholder: 'meta-access-token' },
      { id: 'pixelId', label: 'Pixel / Dataset', placeholder: 'pixel-123' },
    ],
  },
  'google-ads': {
    endpoint: 'https://googleads.googleapis.com',
    fields: [
      { id: 'customerId', label: 'Customer ID', placeholder: '123-456-7890' },
      { id: 'developerToken', label: 'Developer Token', placeholder: 'google-ads-dev-token' },
      { id: 'refreshToken', label: 'Refresh Token', placeholder: 'google-refresh-token' },
    ],
  },
  'google-tag-manager': {
    endpoint: 'https://tagmanager.googleapis.com',
    fields: [
      { id: 'containerId', label: 'Container ID', placeholder: 'GTM-XXXXXXX' },
      { id: 'workspace', label: 'Workspace', placeholder: 'Default Workspace' },
      { id: 'apiToken', label: 'API Token', placeholder: 'gtm-api-token' },
    ],
  },
};

const APP_CONTENT: Record<string, IntegrationCatalogMeta> = {
  agenda: {
    category: 'Prontuario e agenda',
    summary: 'Sincronize agenda clinica, status de comparecimento e capacidade em poucos passos.',
    description: 'Conecta sua base operacional de agenda para alimentar no-show, ocupacao, lead time e produtividade por unidade.',
    heroTitle: 'Agenda conectada com SLA e setup guiado',
    heroCopy: 'Instale a integracao, configure a rota e deixe o dashboard receber agenda, status e dados de comparecimento com acompanhamento visual.',
    accentClass: 'agenda',
    iconText: 'AG',
    heroImageUrl: 'https://images.pexels.com/photos/5998442/pexels-photo-5998442.jpeg?cs=srgb&dl=pexels-pavel-danilyuk-5998442.jpg&fm=jpg',
    compatibility: 'Clinicorp, iClinic, Omie ou API propria',
    docs: ['Guia de autenticacao', 'Payload de agendamento', 'Campos minimos para no-show'],
    bullets: ['Webhook para mudancas em tempo real', 'Mapeamento de unidade e profissional', 'Auto sync para reconciliacao'],
    rating: 0,
    reviewsCount: '0 avaliacoes',
    setupTime: '10 min',
    installNote: 'Ideal para ativar metricas operacionais sem upload manual.',
    reviews: [],
  },
  kommo: {
    category: 'CRM e leads',
    summary: 'Leads, estagios, origem e conversao em uma integracao pronta para ativar.',
    description: 'Conecta o Kommo com OAuth, webhook e sync REST para refletir pipeline, origem, agendamento e performance comercial.',
    heroTitle: 'Kommo CRM com instalacao visual e documentacao embutida',
    heroCopy: 'Configure dominio, tokens e segredo do webhook. A tela acompanha a instalacao em tempo real e deixa claro o que ja esta pronto.',
    accentClass: 'kommo',
    iconText: 'KM',
    heroImageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80',
    compatibility: 'Kommo CRM + webhook assinado',
    docs: ['OAuth e refresh token', 'Eventos de lead', 'Assinatura do webhook'],
    bullets: ['Sincroniza novos leads e updates', 'Mantem historico de conversao', 'Traz origem comercial para o funil'],
    rating: 0,
    reviewsCount: '0 avaliacoes',
    setupTime: '7 min',
    installNote: 'Recomendado para ligar marketing, vendas e agenda em um fluxo so.',
    reviews: [],
  },
  asaas: {
    category: 'Billing',
    summary: 'Cobrancas, eventos financeiros e reconciliacao para paineis executivos.',
    description: 'Instala o conector de billing para puxar cobrancas, pagamentos e inadimplencia com atualizacao por webhook e REST.',
    heroTitle: 'Billing com webhook transacional e leitura de cobranca',
    heroCopy: 'Cadastre o token de acesso, o token de webhook e acompanhe o progresso de instalacao com animacao de provisionamento.',
    accentClass: 'asaas',
    iconText: 'AS',
    heroImageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80',
    compatibility: 'Asaas API v3',
    docs: ['Tokens e permissoes', 'Eventos de cobranca', 'Tabela de status financeiros'],
    bullets: ['Atualiza cobranca e pagamento', 'Envia receita para o painel financeiro', 'Reduz reconciliacao manual'],
    rating: 0,
    reviewsCount: '0 avaliacoes',
    setupTime: '6 min',
    installNote: 'Bom para clinicas que querem previsibilidade de caixa no dashboard.',
    reviews: [],
  },
  'google-sheets': {
    category: 'Planilhas',
    summary: 'Conecte planilhas vivas ao painel sem sair do fluxo de app store.',
    description: 'Permite usar Google Sheets como origem operacional para metas, bases auxiliares, cadastros e controles manuais.',
    heroTitle: 'Sheets como app nativo do seu ecossistema GLX',
    heroCopy: 'Informe planilha, aba e service account. A instalacao valida acesso e ja prepara a sincronizacao recorrente.',
    accentClass: 'sheets',
    iconText: 'GS',
    heroImageUrl: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?auto=format&fit=crop&w=1400&q=80',
    compatibility: 'Google Sheets API',
    docs: ['Permissoes da service account', 'Modelo de aba recomendado', 'Chaves para importacao incremental'],
    bullets: ['Aceita base principal e abas auxiliares', 'Conecta controles operacionais', 'Ajuda a acelerar MVPs internos'],
    rating: 0,
    reviewsCount: '0 avaliacoes',
    setupTime: '5 min',
    installNote: 'Util para operacoes que ainda centralizam dados em planilhas.',
    reviews: [],
  },
  financeiro: {
    category: 'ERP',
    summary: 'Receita, titulos e dados financeiros em uma instalacao guiada por credenciais.',
    description: 'Integra o ERP para alimentar receita bruta, inadimplencia, ticket medio e leituras executivas por empresa ou tenant.',
    heroTitle: 'Financeiro e ERP em um banner dinamico com instalacao guiada',
    heroCopy: 'Conecte ERP, receita e tenant em uma experiencia visual de marketplace com documentacao e setup operacional no mesmo fluxo.',
    accentClass: 'financeiro',
    iconText: 'ERP',
    heroImageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80',
    compatibility: 'ERP/API privado ou multi-tenant',
    docs: ['Escopo de autenticacao', 'Tenant e empresa', 'Eventos recomendados para receita'],
    bullets: ['Mapeia empresa e unidade', 'Suporta endpoint privado', 'Conecta dados financeiros ao painel'],
    rating: 0,
    reviewsCount: '0 avaliacoes',
    setupTime: '12 min',
    installNote: 'Ideal para consolidar receita, titulos e performance financeira.',
    reviews: [],
  },
  nps: {
    category: 'Experiencia',
    summary: 'Forms, NPS e filas de respostas integradas com visao de operacao e experiencia.',
    description: 'Recebe respostas, notas e comentarios para alimentar NPS, percepcao de atendimento e qualidade por unidade.',
    heroTitle: 'NPS e Forms com feedback visual direto no marketplace',
    heroCopy: 'Transforme formularios e filas de respostas em um conector com documentacao, setup e ativacao em uma unica jornada.',
    accentClass: 'nps',
    iconText: 'NPS',
    heroImageUrl: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1400&q=80',
    compatibility: 'Forms/API e filas de processamento',
    docs: ['Modelo de resposta NPS', 'Mapeamento de fila', 'Boas praticas para tags de experiencia'],
    bullets: ['Traz notas e comentarios', 'Liga experiencia ao dashboard executivo', 'Ajuda a criar alertas de satisfacao'],
    rating: 0,
    reviewsCount: '0 avaliacoes',
    setupTime: '4 min',
    installNote: 'Perfeito para acompanhar satisfacao e comentarios em tempo real.',
    reviews: [],
  },
  'crm-api': {
    category: 'CRM customizado',
    summary: 'Adapters para outros CRMs com token, URL e provedor customizado.',
    description: 'Use este app para conectar Pipedrive, RD Station, HubSpot ou qualquer CRM com API REST e eventos customizados.',
    heroTitle: 'Adapter flexivel para CRMs alem do Kommo',
    heroCopy: 'Uma experiencia de catalogo para sistemas que antes ficavam escondidos em formularios tecnicos.',
    accentClass: 'crm-api',
    iconText: 'CRM',
    compatibility: 'Pipedrive, RD, HubSpot ou API REST compativel',
    docs: ['Campos essenciais de lead', 'Eventos minimos para conversao', 'Estrategia de adapter'],
    bullets: ['Flexivel para multiplos provedores', 'Mantem o mesmo padrao visual da loja', 'Facilita onboarding de novas fontes'],
    rating: 0,
    reviewsCount: '0 avaliacoes',
    setupTime: '9 min',
    installNote: 'Boa opcao para contas com stack comercial variada.',
    reviews: [],
  },
  'meta-ads': {
    category: 'Midia paga',
    summary: 'Conta de anuncios, token e pixel em uma instalacao visual.',
    description: 'Conecta midia de Meta para leitura de leads, custo e eventos, com suporte para pixel ou dataset.',
    heroTitle: 'Meta Ads como app instalavel dentro do software',
    heroCopy: 'A equipe visualiza status, setup, documentacao e o impacto esperado antes mesmo de instalar.',
    accentClass: 'meta-ads',
    iconText: 'MA',
    compatibility: 'Meta Marketing API',
    docs: ['Acesso da conta', 'Pixel ou dataset', 'Campos de campanha e conjunto'],
    bullets: ['Traz custos e leads', 'Ajuda a comparar canal e conversao', 'Prepara base para atribuicao'],
    rating: 0,
    reviewsCount: '0 avaliacoes',
    setupTime: '8 min',
    installNote: 'Ative quando quiser cruzar investimento com funil comercial.',
    reviews: [],
  },
  'google-ads': {
    category: 'Midia paga',
    summary: 'Conecte Google Ads com developer token e credenciais prontas.',
    description: 'Instala o conector de Google Ads para alimentar campanhas, grupos, custo e oportunidades geradas.',
    heroTitle: 'Google Ads com setup tecnico dentro de uma experiencia premium',
    heroCopy: 'A tela detalha documentacao, avaliacao e progresso para reduzir atrito na ativacao do conector.',
    accentClass: 'google-ads',
    iconText: 'GA',
    compatibility: 'Google Ads API',
    docs: ['Developer token', 'Customer ID', 'Escopo e refresh token'],
    bullets: ['Suporta estruturas multi-conta', 'Traz custo e oportunidades', 'Fortalece leitura de CAC'],
    rating: 0,
    reviewsCount: '0 avaliacoes',
    setupTime: '8 min',
    installNote: 'Ideal para times que acompanham CAC por canal no painel.',
    reviews: [],
  },
  'google-tag-manager': {
    category: 'Mensuracao',
    summary: 'Gerencie container, workspace e token de forma centralizada.',
    description: 'Conector para GTM com foco em governanca de tracking, eventos e sincronizacao com o ecossistema de midia.',
    heroTitle: 'GTM pronto para governanca de dados e eventos',
    heroCopy: 'Instale o app, configure container e workspace e use a secao de docs para padronizar seu tracking.',
    accentClass: 'gtm',
    iconText: 'GTM',
    compatibility: 'Google Tag Manager API',
    docs: ['Container e workspace', 'Permissoes minimas', 'Fluxo sugerido para eventos'],
    bullets: ['Centraliza tracking', 'Suporta governanca de mensuracao', 'Combina com Ads e CRM'],
    rating: 0,
    reviewsCount: '0 avaliacoes',
    setupTime: '6 min',
    installNote: 'Melhor usado junto com midia paga e eventos do funil.',
    reviews: [],
  },
};

function statusBadge(status: IntegrationStatus) {
  if (status === 'connected') return { label: 'Instalado', className: 'green' };
  if (status === 'degraded') return { label: 'Atenção', className: 'yellow' };
  return { label: 'Disponível', className: 'blue' };
}

function formatLastSync(lastSyncAt: string | null) {
  if (!lastSyncAt) return 'n/a';
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(lastSyncAt).getTime()) / 60000));
  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function buildStorageKey(plan: Plan, key: string) {
  return `glx.integration-form.${plan}.${key}`;
}

function buildReviewStorageKey(plan: Plan, key: string) {
  return `glx.integration-review.${plan}.${key}`;
}

function buildInitialState(key: string) {
  const spec = FORM_SPECS[key];
  const state: IntegrationFormState = {};
  if (!spec) return state;
  for (const field of spec.fields) state[field.id] = '';
  state.autoSync = 'true';
  return state;
}

function toStars(rating: number) {
  const full = Math.round(rating);
  return `${'★'.repeat(full)}${'☆'.repeat(Math.max(0, 5 - full))}`;
}

function IntegrationSection({
  plan,
  totalRecords,
  leads,
  realized,
  integrationHealth,
}: Props) {
  const [localStatuses, setLocalStatuses] = useState<Record<string, IntegrationStatus>>({});
  const [forms, setForms] = useState<Record<string, IntegrationFormState>>(() => {
    const initial: Record<string, IntegrationFormState> = {};
    for (const row of DEFAULT_CATALOG[plan]) initial[row.key] = buildInitialState(row.key);
    return initial;
  });
  const [selectedAppId, setSelectedAppId] = useState(DEFAULT_CATALOG[plan][0]?.key ?? '');
  const [bannerDirection, setBannerDirection] = useState<'forward' | 'backward'>('forward');
  const [installations, setInstallations] = useState<Record<string, InstallationState>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saved' | 'error'>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [showInstalledAppsView, setShowInstalledAppsView] = useState(false);
  const [showAppDetailView, setShowAppDetailView] = useState(false);
  const [userReviews, setUserReviews] = useState<Record<string, IntegrationReview[]>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, IntegrationReviewDraft>>({});

  const rows = useMemo(() => {
    const merged = new Map<string, IntegrationItem>();

    for (const item of DEFAULT_CATALOG[plan]) {
      merged.set(item.key, {
        ...item,
        status: localStatuses[item.key] ?? 'disconnected',
        lastSyncAt: integrationHealth?.technical?.lastSyncAt ?? null,
        failures24h: 0,
      });
    }

    for (const item of integrationHealth?.integrations ?? []) {
      if (merged.has(item.key)) {
        merged.set(item.key, {
          ...item,
          status: localStatuses[item.key] ?? item.status,
        });
      }
    }

    return Array.from(merged.values());
  }, [integrationHealth?.integrations, integrationHealth?.technical?.lastSyncAt, localStatuses, plan]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const next: Record<string, IntegrationFormState> = {};
    for (const row of rows) {
      const fallback = buildInitialState(row.key);
      const saved = window.localStorage.getItem(buildStorageKey(plan, row.key));
      next[row.key] = saved ? { ...fallback, ...(JSON.parse(saved) as IntegrationFormState) } : fallback;
    }
    setForms(next);
  }, [plan, rows]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextReviews: Record<string, IntegrationReview[]> = {};
    const nextDrafts: Record<string, IntegrationReviewDraft> = {};
    for (const row of rows) {
      const saved = window.localStorage.getItem(buildReviewStorageKey(plan, row.key));
      nextReviews[row.key] = saved ? (JSON.parse(saved) as IntegrationReview[]) : [];
      nextDrafts[row.key] = { rating: 0, comment: '' };
    }
    setUserReviews(nextReviews);
    setReviewDrafts(nextDrafts);
  }, [plan, rows]);

  useEffect(() => {
    if (!rows.some((row) => row.key === selectedAppId)) setSelectedAppId(rows[0]?.key ?? '');
  }, [rows, selectedAppId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const activeInstall = Object.entries(installations).find(([, value]) => value.stage === 'installing');
    if (!activeInstall) return;
    const [integrationKey] = activeInstall;

    const timer = window.setInterval(() => {
      setInstallations((current) => {
        const snapshot = current[integrationKey];
        if (!snapshot || snapshot.stage !== 'installing') return current;
        const nextProgress = Math.min(snapshot.progress + 17, 100);
        return {
          ...current,
          [integrationKey]: {
            stage: nextProgress >= 100 ? 'installed' : 'installing',
            progress: nextProgress,
          },
        };
      });
    }, 280);

    return () => window.clearInterval(timer);
  }, [installations]);

  useEffect(() => {
    const finishedKey = Object.entries(installations).find(([, value]) => value.stage === 'installed')?.[0];
    if (!finishedKey) return;
    setLocalStatuses((current) => ({ ...current, [finishedKey]: 'connected' }));
  }, [installations]);

  const connectedCount = rows.filter((row) => row.status === 'connected').length;
  const failures24h = integrationHealth?.technical?.apiFailures24h ?? rows.reduce((sum, row) => sum + row.failures24h, 0);
  const volumeRegistrosDia = integrationHealth?.technical?.volumeRegistrosDia ?? totalRecords;
  const lastSyncLabel = formatLastSync(integrationHealth?.technical?.lastSyncAt ?? rows[0]?.lastSyncAt ?? null);
  const selectedRow = rows.find((row) => row.key === selectedAppId) ?? rows[0];
  const selectedMeta = selectedRow ? APP_CONTENT[selectedRow.key] : undefined;
  const selectedForm = selectedRow ? forms[selectedRow.key] ?? buildInitialState(selectedRow.key) : {};
  const selectedInstall = selectedRow ? installations[selectedRow.key] ?? { stage: 'idle', progress: 0 } : { stage: 'idle', progress: 0 };
  const selectedSpec = selectedRow ? FORM_SPECS[selectedRow.key] : undefined;
  const selectedReviews = selectedRow
    ? [...(selectedMeta?.reviews ?? []), ...(userReviews[selectedRow.key] ?? [])]
    : [];
  const selectedDraft = selectedRow ? reviewDrafts[selectedRow.key] ?? { rating: 0, comment: '' } : { rating: 0, comment: '' };
  const selectedAverageRating = selectedReviews.length > 0
    ? selectedReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / selectedReviews.length
    : 0;

  const recordsByKey: Record<string, string> = {
    agenda: `${totalRecords} registros`,
    kommo: `${leads} leads`,
    asaas: `${realized} cobranças`,
    'crm-api': `${leads} leads`,
    'google-sheets': `${volumeRegistrosDia} linhas/dia`,
    financeiro: `${realized} titulos`,
    'meta-ads': `${leads} leads`,
    'google-ads': `${leads} oportunidades`,
    'google-tag-manager': `${volumeRegistrosDia} eventos`,
    nps: `${totalRecords} respostas`,
  };

  const marketplaceApps = useMemo<MarketplaceApp[]>(
    () =>
      rows.map((row) => {
        const meta = APP_CONTENT[row.key];
        const badge = statusBadge(row.status);
        return {
          id: row.key,
          name: row.label,
          subtitle: meta?.category ?? row.provider,
          description: meta?.summary ?? row.provider,
          image: meta?.heroImageUrl,
          badge: badge.label,
          installTime: meta?.setupTime ?? `${row.slaMinutes} min`,
          compatibility: meta?.compatibility ?? row.provider,
          ctaLabel: 'Instalar',
          iconText: meta?.iconText ?? 'API',
          accentClass: meta?.accentClass ?? 'agenda',
        };
      }),
    [rows],
  );

  const selectApp = (integrationKey: string) => {
    const currentIndex = rows.findIndex((row) => row.key === selectedAppId);
    const nextIndex = rows.findIndex((row) => row.key === integrationKey);
    setBannerDirection(nextIndex >= currentIndex ? 'forward' : 'backward');
    setSelectedAppId(integrationKey);
  };

  const updateField = (integrationKey: string, fieldId: string, value: string) => {
    setForms((current) => ({
      ...current,
      [integrationKey]: {
        ...(current[integrationKey] ?? buildInitialState(integrationKey)),
        [fieldId]: value,
      },
    }));
  };

  const saveForm = (integrationKey: string) => {
    if (typeof window === 'undefined') return;
    const payload = forms[integrationKey] ?? buildInitialState(integrationKey);
    const spec = FORM_SPECS[integrationKey];

    // Validate required fields (any field whose placeholder looks like a URL or key)
    const emptyFields = spec?.fields
      .filter((f) => !payload[f.id]?.trim())
      .map((f) => f.label) ?? [];

    if (emptyFields.length > 0) {
      setSaveErrors((prev) => ({ ...prev, [integrationKey]: `Preencha: ${emptyFields.join(', ')}` }));
      setSaveStatus((prev) => ({ ...prev, [integrationKey]: 'error' }));
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [integrationKey]: 'idle' }));
        setSaveErrors((prev) => ({ ...prev, [integrationKey]: '' }));
      }, 3000);
      return;
    }

    window.localStorage.setItem(buildStorageKey(plan, integrationKey), JSON.stringify(payload));
    setSaveErrors((prev) => ({ ...prev, [integrationKey]: '' }));
    setSaveStatus((prev) => ({ ...prev, [integrationKey]: 'saved' }));
    setTimeout(() => setSaveStatus((prev) => ({ ...prev, [integrationKey]: 'idle' })), 2500);
  };

  const updateReviewDraft = (integrationKey: string, updates: Partial<IntegrationReviewDraft>) => {
    setReviewDrafts((current) => ({
      ...current,
      [integrationKey]: {
        rating: current[integrationKey]?.rating ?? 0,
        comment: current[integrationKey]?.comment ?? '',
        ...updates,
      },
    }));
  };

  const submitReview = (integrationKey: string) => {
    if (typeof window === 'undefined') return;
    const draft = reviewDrafts[integrationKey] ?? { rating: 0, comment: '' };
    const comment = draft.comment.trim();
    if (draft.rating <= 0 || !comment) return;

    const newReview: IntegrationReview = {
      author: 'Cliente GLX',
      role: 'Avaliação enviada',
      quote: comment,
      helpful: 0,
      rating: draft.rating,
    };

    setUserReviews((current) => {
      const next = {
        ...current,
        [integrationKey]: [...(current[integrationKey] ?? []), newReview],
      };
      window.localStorage.setItem(buildReviewStorageKey(plan, integrationKey), JSON.stringify(next[integrationKey]));
      return next;
    });

    setReviewDrafts((current) => ({
      ...current,
      [integrationKey]: { rating: 0, comment: '' },
    }));
  };

  const installIntegration = (integrationKey: string) => {
    saveForm(integrationKey);
    setInstallations((current) => ({
      ...current,
      [integrationKey]: { stage: 'installing', progress: 8 },
    }));
  };

  const removeIntegration = (integrationKey: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(buildStorageKey(plan, integrationKey));
    }
    setLocalStatuses((current) => ({ ...current, [integrationKey]: 'disconnected' }));
    setInstallations((current) => ({
      ...current,
      [integrationKey]: { stage: 'idle', progress: 0 },
    }));
  };

  const openInstalledAppsView = () => {
    setShowInstalledAppsView(true);
  };

  const openAppDetailView = (integrationKey: string) => {
    selectApp(integrationKey);
    setShowAppDetailView(true);
  };

  const installedRows = rows.filter((row) => row.status === 'connected');

  if (showInstalledAppsView) {
    return (
      <>
        <div className="section-header">
          <h2><span className="orange-bar" /> Apps instalados</h2>
        </div>

        <section className="integration-installed-screen">
          <div className="integration-installed-screen-header">
            <div>
              <span className="integration-store-eyebrow">Gestão de conectores ativos</span>
              <h3>Apps instalados</h3>
              <p>Veja os conectores já ativos, exclua um app ou reinstale a integração quando precisar renovar a configuração.</p>
            </div>
            <button type="button" className="topbar-btn text-btn" onClick={() => setShowInstalledAppsView(false)}>
              Voltar para a loja
            </button>
          </div>

          <div className="integration-installed-screen-grid">
            {installedRows.length > 0 ? (
              installedRows.map((row) => {
                const meta = APP_CONTENT[row.key];
                const installState = installations[row.key] ?? { stage: 'idle', progress: 0 };
                return (
                  <article
                    key={`${row.key}-installed`}
                    className={`integration-installed-card integration-accent-${meta?.accentClass ?? 'agenda'}`}
                  >
                    <div className="integration-app-card-top">
                      <div className="integration-app-icon">{meta?.iconText ?? 'API'}</div>
                      <span className="chart-card-badge green">Instalado</span>
                    </div>
                    <div className="integration-app-card-body">
                      <strong>{row.label}</strong>
                      <span>{meta?.category ?? row.provider}</span>
                      <p>{meta?.summary ?? row.provider}</p>
                    </div>
                    <div className="integration-installed-card-meta">
                      <span>Última sync: {formatLastSync(row.lastSyncAt)}</span>
                      <span>{recordsByKey[row.key] ?? `${totalRecords} registros`}</span>
                    </div>
                    {installState.stage === 'installing' ? (
                      <div className="integration-mini-progress">
                        <div className="integration-mini-progress-bar" style={{ width: `${installState.progress}%` }} />
                      </div>
                    ) : null}
                    <div className="integration-installed-card-actions">
                      <button
                        type="button"
                        className="topbar-btn export-pdf"
                        onClick={(event) => {
                          event.stopPropagation();
                          selectApp(row.key);
                          installIntegration(row.key);
                        }}
                      >
                        {installState.stage === 'installing' ? 'Reinstalando...' : 'Reinstalar'}
                      </button>
                      <button
                        type="button"
                        className="topbar-btn integration-danger-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeIntegration(row.key);
                        }}
                      >
                        Excluir app
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="integration-installed-empty">
                <strong>Nenhum app instalado no momento.</strong>
                <p>Volte para a loja de integrações para instalar o primeiro conector.</p>
                <button type="button" className="topbar-btn text-btn" onClick={() => setShowInstalledAppsView(false)}>
                  Ir para a loja
                </button>
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  if (showAppDetailView && selectedRow && selectedMeta) {
    return (
      <>
        <section className="integration-detail-screen">
          <div className="integration-detail-screen-toolbar">
            <button type="button" className="topbar-btn text-btn" onClick={() => setShowAppDetailView(false)}>
              Voltar para apps
            </button>
          </div>
          <div className="integration-detail-panel integration-detail-panel-full">
            <div className="integration-detail-columns">
              <section className="integration-section-card">
                <div className="integration-section-card-header">
                  <span>Descrição</span>
                  <small>Como funciona</small>
                </div>
                <p>{selectedMeta.description}</p>
                <ul className="integration-bullet-list">
                  {selectedMeta.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </section>

              <section className="integration-section-card">
                <div className="integration-section-card-header">
                  <span>Documentação</span>
                  <small>Checklist recomendado</small>
                </div>
                <ul className="integration-doc-list">
                  {selectedMeta.docs.map((doc) => (
                    <li key={doc}>{doc}</li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="integration-section-card">
              <div className="integration-section-card-header">
                <span>Instalação e credenciais</span>
                <small>APIs, tokens e webhooks em formulário</small>
              </div>

              <div className="integration-form-grid">
                {selectedSpec?.fields.map((field) => (
                  <label key={field.id} className="integration-form-field">
                    <span>{field.label}</span>
                    <input
                      className="filter-select"
                      value={selectedForm[field.id] ?? ''}
                      onChange={(event) => updateField(selectedRow.key, field.id, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  </label>
                ))}

                <label className="integration-form-field">
                  <span>Endpoint / rota</span>
                  <input className="filter-select" value={selectedSpec?.endpoint ?? ''} readOnly />
                </label>

                <label className="integration-form-field">
                  <span>Auto sync</span>
                  <select
                    className="filter-select"
                    value={selectedForm.autoSync ?? 'true'}
                    onChange={(event) => updateField(selectedRow.key, 'autoSync', event.target.value)}
                  >
                    <option value="true">Ativado</option>
                    <option value="false">Desativado</option>
                  </select>
                </label>

                <label className="integration-form-field">
                  <span>Cadência</span>
                  <input className="filter-select" value={`${selectedRow.slaMinutes} min`} readOnly />
                </label>
              </div>

              <div className={`integration-install-card ${selectedInstall.stage === 'installing' ? 'is-installing' : ''} ${selectedInstall.stage === 'installed' ? 'is-installed' : ''}`}>
                <div className="integration-install-card-copy">
                  <strong>
                    {selectedInstall.stage === 'installing'
                      ? 'Instalação em andamento'
                      : selectedInstall.stage === 'installed'
                        ? 'Instalação concluída'
                        : 'Pronto para instalar'}
                  </strong>
                  <p>
                    {selectedInstall.stage === 'installing'
                      ? 'Validando credenciais, preparando webhook e ativando sincronização.'
                      : selectedInstall.stage === 'installed'
                        ? 'Credenciais salvas e conector marcado como instalado nesta sessão.'
                        : 'Preencha os campos acima e instale a integração com uma animação de progresso.'}
                  </p>
                </div>
                <div className="integration-install-meter">
                  <div className="integration-install-progress-track">
                    <div className="integration-install-progress-bar" style={{ width: `${selectedInstall.progress}%` }} />
                  </div>
                  <div className="integration-install-steps">
                    <span className={selectedInstall.progress >= 10 ? 'done' : ''}>Credenciais</span>
                    <span className={selectedInstall.progress >= 45 ? 'done' : ''}>Webhook</span>
                    <span className={selectedInstall.progress >= 80 ? 'done' : ''}>Sync</span>
                  </div>
                </div>
                <div className="integration-install-actions">
                  <button type="button" className="topbar-btn export-pdf" onClick={() => installIntegration(selectedRow.key)}>
                    {selectedInstall.stage === 'installing' ? 'Instalando...' : selectedInstall.stage === 'installed' ? 'Reinstalar' : 'Instalar agora'}
                  </button>
                  <button
                    type="button"
                    className={`topbar-btn text-btn${saveStatus[selectedRow.key] === 'error' ? ' save-btn-error' : saveStatus[selectedRow.key] === 'saved' ? ' save-btn-saved' : ''}`}
                    onClick={() => saveForm(selectedRow.key)}
                    disabled={saveStatus[selectedRow.key] === 'saved'}
                    style={{
                      transition: 'all 200ms ease',
                      color: saveStatus[selectedRow.key] === 'saved' ? '#1D9E75'
                        : saveStatus[selectedRow.key] === 'error' ? '#E24B4A'
                        : undefined,
                    }}
                  >
                    {saveStatus[selectedRow.key] === 'saved' ? '✓ Salvo!'
                      : saveStatus[selectedRow.key] === 'error' ? '⚠ Campos obrigatórios'
                      : 'Salvar formulário'}
                  </button>
                </div>
                {saveErrors[selectedRow.key] && (
                  <p style={{ fontSize: 12, color: '#E24B4A', marginTop: 6, marginLeft: 2 }}>
                    {saveErrors[selectedRow.key]}
                  </p>
                )}
              </div>
            </section>

            <section className="integration-section-card">
              <div className="integration-section-card-header">
                <span>Avaliações</span>
                <small>Percepção de quem já instalou</small>
              </div>
              <div className="integration-review-form">
                <div className="integration-review-form-header">
                  <strong>Avalie este app</strong>
                  <span>Dê uma nota e deixe um comentário rápido.</span>
                </div>
                <div className="integration-review-stars" role="radiogroup" aria-label="Avaliação por estrelas">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={`${selectedRow.key}-star-${star}`}
                      type="button"
                      className={`integration-review-star ${selectedDraft.rating >= star ? 'active' : ''}`}
                      onClick={() => updateReviewDraft(selectedRow.key, { rating: star })}
                      aria-pressed={selectedDraft.rating >= star}
                      aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="integration-review-score">{selectedDraft.rating > 0 ? `${selectedDraft.rating}/5` : 'Selecione uma nota'}</span>
                </div>
                <textarea
                  className="integration-review-textarea"
                  value={selectedDraft.comment}
                  onChange={(event) => updateReviewDraft(selectedRow.key, { comment: event.target.value })}
                  placeholder="Conte como foi a instalação, configuração ou uso deste app."
                  rows={4}
                />
                <div className="integration-review-form-actions">
                  <button
                    type="button"
                    className="topbar-btn export-pdf"
                    onClick={() => submitReview(selectedRow.key)}
                    disabled={selectedDraft.rating <= 0 || selectedDraft.comment.trim().length === 0}
                  >
                    Enviar avaliação
                  </button>
                  <span className="integration-review-summary">
                    Média atual: {selectedAverageRating.toFixed(1)} {toStars(selectedAverageRating)}
                  </span>
                </div>
              </div>
              <div className="integration-review-grid">
                {selectedReviews.length > 0 ? (
                  selectedReviews.map((review, index) => (
                    <article key={`${review.author}-${review.role}-${index}`} className="integration-review-card">
                      <div className="integration-review-header">
                        <div className="integration-review-identity">
                          <strong>{review.author}</strong>
                          <span>{review.role}</span>
                        </div>
                        <span className="integration-review-rating">{toStars(review.rating ?? 0)}</span>
                      </div>
                      <p>{review.quote}</p>
                      <small>{review.helpful} pessoas acharam útil · #{index + 1}</small>
                    </article>
                  ))
                ) : (
                  <div className="integration-review-empty">
                    <strong>Sem avaliações ainda</strong>
                    <p>As notas e comentários serão preenchidos pelos clientes no formulário de avaliação.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="integration-store-shell">
        <div className={`integration-store-hero integration-accent-${selectedMeta?.accentClass ?? 'agenda'}`}>
          <div key={`hero-copy-${selectedAppId}`} className={`integration-store-hero-copy integration-hero-slide integration-hero-slide-${bannerDirection}`}>
            <span className="integration-store-eyebrow">Marketplace de APIs, webhooks e apps</span>
            <h3>{selectedMeta?.heroTitle ?? 'Integra??es para o seu ecossistema operacional'}</h3>
            <p>{selectedMeta?.heroCopy ?? 'Centralize instala??o, documenta??o e configura??o t?cnica em uma experi?ncia de app store.'}</p>
            <div className="integration-store-hero-actions">
              <button type="button" className="topbar-btn export-pdf" onClick={() => selectedRow && openAppDetailView(selectedRow.key)}>
                {selectedRow ? `Instalar ${selectedRow.label}` : 'Instalar'}
              </button>
              <button type="button" className="topbar-btn integration-installed-apps-btn" onClick={openInstalledAppsView}>
                Ver apps instalados
              </button>
            </div>
          </div>

          <div key={`hero-preview-${selectedAppId}`} className={`integration-store-hero-preview integration-hero-slide integration-hero-slide-${bannerDirection}`}>
            <div className="integration-preview-window">
              {selectedMeta?.heroImageUrl ? (
                <div className="integration-preview-image-wrap">
                  <img
                    className="integration-preview-image"
                    src={selectedMeta.heroImageUrl}
                    alt={`${selectedRow?.label ?? 'Integra??o'} banner`}
                  />
                </div>
              ) : null}
              <div className="integration-preview-toolbar">
                <span />
                <span />
                <span />
              </div>
              <div className="integration-preview-body">
                <div className="integration-preview-icon">{selectedMeta?.iconText ?? 'API'}</div>
                <div className="integration-preview-title">{selectedRow?.label}</div>
                <div className="integration-preview-subtitle">{selectedMeta?.compatibility}</div>
                <div className="integration-preview-pills">
                  <span>{selectedMeta?.setupTime}</span>
                  <span>{recordsByKey[selectedRow?.key ?? 'agenda'] ?? `${totalRecords} registros`}</span>
                  <span>SLA {selectedRow?.slaMinutes ?? 0} min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="integration-store-layout">
          <aside className="integration-store-grid">
            {marketplaceApps.map((app) => {
              const row = rows.find((item) => item.key === app.id);
              const badge = row ? statusBadge(row.status) : { label: app.badge, className: 'blue' };
              const installState = installations[app.id] ?? { stage: 'idle', progress: 0 };

              return (
                <button
                  key={app.id}
                  type="button"
                  aria-pressed={selectedAppId === app.id}
                  className={`integration-app-card ${selectedAppId === app.id ? 'active' : ''} integration-accent-${app.accentClass}`}
                  onClick={() => selectApp(app.id)}
                >
                  <div className="integration-app-card-top">
                    <div className="integration-app-icon">{app.iconText}</div>
                    <span className={`chart-card-badge ${badge.className}`}>{badge.label}</span>
                  </div>
                  <div className="integration-app-card-body">
                    <strong>{app.name}</strong>
                    <span>{app.subtitle}</span>
                    <p>{app.description}</p>
                  </div>
                  <div className="integration-app-card-actions">
                    <button
                      type="button"
                      className="topbar-btn export-pdf"
                      onClick={(event) => {
                        event.stopPropagation();
                        openAppDetailView(app.id);
                      }}
                    >
                      {app.ctaLabel ?? 'Instalar'}
                    </button>
                  </div>
                  <div className="integration-app-card-meta">
                    <span>{APP_CONTENT[app.id]?.rating.toFixed(1) ?? '0.0'} {toStars(APP_CONTENT[app.id]?.rating ?? 0)}</span>
                    <span>{app.installTime}</span>
                  </div>
                  {installState.stage === 'installing' ? (
                    <div className="integration-mini-progress">
                      <div className="integration-mini-progress-bar" style={{ width: `${installState.progress}%` }} />
                    </div>
                  ) : null}
                </button>
              );
            })}
          </aside>
        </div>

      </section>

    </>
  );
}

export default memo(IntegrationSection);
