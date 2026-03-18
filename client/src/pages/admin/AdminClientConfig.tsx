/**
 * AdminClientConfig — Configuração financeira/operacional por cliente
 * Admin-only. Cliente não acessa este formulário.
 *
 * Seções:
 *  1. Corpo Clínico       — profissionais, especialidades, tipo contrato, salário, comissão
 *  2. Serviços/Procedimentos — catálogo de procedimentos com preço, custo e duração
 *  3. OPEX                — custos fixos e variáveis mensais
 *  4. Gestão de Metas     — KPI targets por plano (START/PRO)
 *
 * Persistência: localStorage keyed por userId (sem backend schema dedicado por enquanto).
 */

import AdminLayout, { useAdminTheme } from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { MotionPageShell } from "@/animation/components/MotionPageShell";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Users, UserPlus, Stethoscope, DollarSign, Target, Save, Plus, Trash2,
  Loader2, Info, Building2, Zap, Crown, AlertCircle, Search,
  ClipboardList, TrendingUp, Activity, BarChart3, CheckCircle2,
  Settings2, Eye, EyeOff, Phone, Mail, Camera, ArrowLeftRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const planLabels: Record<string, string> = {
  essencial: "Start", pro: "Pro", enterprise: "Enterprise",
};
const planIcons: Record<string, React.ReactNode> = {
  essencial: <Zap className="h-3 w-3 mr-1" />,
  pro: <Crown className="h-3 w-3 mr-1" />,
  enterprise: <Building2 className="h-3 w-3 mr-1" />,
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ContractType = "CLT" | "PJ" | "Socio" | "Freelancer";
type ServiceType = "Consulta" | "Retorno" | "Avaliação" | "Procedimento" | "Cirurgia" | "Exame";

interface Professional {
  id: string;
  name: string;
  specialty: string;
  contract: ContractType;
  monthlyCost: number;     // salário, pró-labore ou honorário fixo (R$)
  commissionPct: number;  // % sobre atendimento
  weeklyHours: number;
}

interface Service {
  id: string;
  name: string;
  specialty: string;
  type: ServiceType;
  priceGross: number;   // Preço de venda (R$)
  costDirect: number;   // Custo direto (insumos, repasse, R$)
  durationMin: number;  // Duração (min)
  commissionPct: number; // % comissão
}

interface OpexFixed {
  personnel: number;       // Pessoal CLT/Sócios — salários, pró-labore, encargos
  rent: number;            // Aluguel + IPTU
  technology: number;      // CRM, GLX, telefonia, prontuário eletrônico
  marketingFixed: number;  // Agência, conteúdo, branding
  financial: number;       // Contador, impostos, seguros, taxas
  utilities: number;       // Luz, água, internet
  licenses: number;        // CRM/ANVISA/Assessoria jurídica
}

interface OpexVariable {
  doctorFeePct: number;           // Repasse médico/honorários (% sobre receita)
  suppliesMonthly: number;        // Insumos/materiais/exames terceirizados (R$ médio/mês)
  commercialCommissionPct: number; // Captação, vendas, indicação (%)
  marketingVariable: number;      // Mídia paga, ads, patrocínios (R$/mês)
  transactionFeePct: number;      // Maquininha, gateway, parcelamento (%)
  outsourcedMonthly: number;      // Limpeza, segurança, esterilização, labs (R$/mês)
}

interface GoalConfig {
  // ── Agenda & No-show ────────────────────────────────────────
  noShowMaxPct: number;          // < X% (START: 8, PRO: 8)
  occupancyMinPct: number;       // > X% (80)
  confirmationMinPct: number;    // > X% (85)
  weeklyConsultsTarget: number;  // ≥ X consultas/semana
  acquisitionChannelMaxPct: number; // por canal < X% (20)
  leadTimeDaysMax: number;       // lead time < X dias (3)
  // PRO:
  noShowCostMaxR$: number;       // custo no-show < R$ X (2000)
  capacityLossMaxPct: number;    // perda capacidade < X% (8)

  // ── Financeiro ───────────────────────────────────────────────
  monthlyRevenueTarget: number;  // Faturamento bruto meta mês (R$)
  netRevenuePctMin: number;      // Receita líquida > X% do bruto (92)
  grossMarginMinPct: number;     // Margem líquida total > X% (20)
  defaultRateMaxPct: number;     // Inadimplência < X% (4)
  fixedExpenseRatioMax: number;  // Despesas fixas / receita < X% (45)
  // PRO:
  ebitdaMinPct: number;          // DRE EBITDA > X% (25)
  forecastTolerancePct: number;  // Forecast ± X% do real (10)
  breakEvenDayTarget: number;    // Break-even > 90% até dia X (15)

  // ── Marketing & Captação ────────────────────────────────────
  totalLeadsMonthTarget: number; // Leads totais ≥ X/mês
  cplMaxR$: number;              // CPL ≤ R$ X (35)
  convLeadToAppMinPct: number;   // Lead → Agendamento > X% (35)
  noShowByChannelMaxPct: number; // No-show por canal < X% (25)
  roiMinPct: number;             // ROI por canal > X% (200)
  // PRO:
  convLeadToConsultMinPct: number; // Lead → Consulta > X% (22)
  ltvCacRatioMin: number;        // LTV/CAC > X (3)

  // ── Operação & UX ────────────────────────────────────────────
  npsMinGeneral: number;         // NPS geral > X (8.5)
  waitTimeMaxMin: number;        // Espera < X min (12)
  returnRateMinPct: number;      // Retorno/Fidelização > X% (40)
  slaLeadMaxHours: number;       // SLA resposta lead < X h (1)
  // PRO:
  npsByProfMin: number;          // NPS por profissional > X (8)
  marginByServiceMinPct: number; // Margem por serviço > X% (30)
}

interface ClientConfig {
  professionals: Professional[];
  services: Service[];
  opexFixed: OpexFixed;
  opexVariable: OpexVariable;
  goals: GoalConfig;
  updatedAt: string;
}

// ─── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_OPEX_FIXED: OpexFixed = {
  personnel: 0, rent: 0, technology: 0, marketingFixed: 0,
  financial: 0, utilities: 0, licenses: 0,
};
const DEFAULT_OPEX_VAR: OpexVariable = {
  doctorFeePct: 30, suppliesMonthly: 0, commercialCommissionPct: 5,
  marketingVariable: 0, transactionFeePct: 3.5, outsourcedMonthly: 0,
};
const DEFAULT_GOALS: GoalConfig = {
  noShowMaxPct: 8, occupancyMinPct: 80, confirmationMinPct: 85,
  weeklyConsultsTarget: 40, acquisitionChannelMaxPct: 20, leadTimeDaysMax: 3,
  noShowCostMaxR$: 2000, capacityLossMaxPct: 8,
  monthlyRevenueTarget: 50000, netRevenuePctMin: 92, grossMarginMinPct: 20,
  defaultRateMaxPct: 4, fixedExpenseRatioMax: 45,
  ebitdaMinPct: 25, forecastTolerancePct: 10, breakEvenDayTarget: 15,
  totalLeadsMonthTarget: 100, cplMaxR$: 35, convLeadToAppMinPct: 35,
  noShowByChannelMaxPct: 25, roiMinPct: 200,
  convLeadToConsultMinPct: 22, ltvCacRatioMin: 3,
  npsMinGeneral: 8.5, waitTimeMaxMin: 12, returnRateMinPct: 40, slaLeadMaxHours: 1,
  npsByProfMin: 8, marginByServiceMinPct: 30,
};

const defaultConfig = (): ClientConfig => ({
  professionals: [], services: [],
  opexFixed: { ...DEFAULT_OPEX_FIXED },
  opexVariable: { ...DEFAULT_OPEX_VAR },
  goals: { ...DEFAULT_GOALS },
  updatedAt: new Date().toISOString(),
});

const storageKey = (userId: number) => `glx:client-config:${userId}`;
const loadConfig = (userId: number): ClientConfig => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return defaultConfig();
    return { ...defaultConfig(), ...JSON.parse(raw) };
  } catch { return defaultConfig(); }
};
const saveConfig = (userId: number, cfg: ClientConfig) => {
  localStorage.setItem(storageKey(userId), JSON.stringify({ ...cfg, updatedAt: new Date().toISOString() }));
};

const uid = () => Math.random().toString(36).slice(2, 9);
const fmtR$ = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

// ─── UI Helpers ────────────────────────────────────────────────────────────────

function SectionTitle({ icon, label, description }: { icon: React.ReactNode; label: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff4ea] text-[#ff7a1a] flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-bold text-[#0f172a]">{label}</h3>
        {description && <p className="text-xs text-[#94a3b8] mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 text-[#94a3b8] cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-60 text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function NumInput({
  label, value, onChange, suffix, prefix, hint, min = 0, step = 1, placeholder,
}: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; prefix?: string; hint?: string;
  min?: number; step?: number; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-[#475569]">
        {label}{hint && <Hint text={hint} />}
      </Label>
      <div className="flex items-center gap-1.5">
        {prefix && <span className="text-xs text-[#94a3b8] whitespace-nowrap">{prefix}</span>}
        <Input
          type="number" min={min} step={step}
          placeholder={placeholder}
          value={value === 0 ? "" : value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-9 text-sm border-[#d7e1ef] bg-[#f8fbff] rounded-lg"
        />
        {suffix && <span className="text-xs text-[#94a3b8] whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

type Tab = "clinico" | "servicos" | "opex" | "metas";

export default function AdminClientConfig() {
  const { theme } = useAdminTheme();
  const isDark = theme === "dark";
  const surfaceCard = "rounded-[18px] border border-[#dbe5f0] bg-white shadow-[0_6px_24px_rgba(148,163,184,0.09)]";

  const [activeTab, setActiveTab] = useState<Tab>("metas");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [config, setConfig] = useState<ClientConfig>(defaultConfig());
  const [saved, setSaved] = useState(false);

  const { data: users = [], isLoading: usersLoading, refetch } = trpc.admin.getUsers.useQuery();

  // When user selected, load their config
  useEffect(() => {
    if (selectedUserId) setConfig(loadConfig(selectedUserId));
  }, [selectedUserId]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const update = useCallback((patch: Partial<ClientConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  }, []);

  const handleSave = () => {
    if (!selectedUserId) { toast.error("Selecione um cliente primeiro"); return; }
    saveConfig(selectedUserId, config);
    setSaved(true);
    toast.success("Configuração salva com sucesso!");
    setTimeout(() => setSaved(false), 3000);
  };

  // ── Professionals ──────────────────────────────────────────────────────────
  const addProfessional = () => update({
    professionals: [...config.professionals, {
      id: uid(), name: "", specialty: "", contract: "PJ",
      monthlyCost: 0, commissionPct: 30, weeklyHours: 40,
    }],
  });
  const updateProf = (id: string, patch: Partial<Professional>) => update({
    professionals: config.professionals.map((p) => p.id === id ? { ...p, ...patch } : p),
  });
  const removeProf = (id: string) => update({ professionals: config.professionals.filter((p) => p.id !== id) });

  // ── Services ───────────────────────────────────────────────────────────────
  const addService = () => update({
    services: [...config.services, {
      id: uid(), name: "", specialty: "", type: "Consulta",
      priceGross: 0, costDirect: 0, durationMin: 45, commissionPct: 30,
    }],
  });
  const updateSvc = (id: string, patch: Partial<Service>) => update({
    services: config.services.map((s) => s.id === id ? { ...s, ...patch } : s),
  });
  const removeSvc = (id: string) => update({ services: config.services.filter((s) => s.id !== id) });

  // ── Computed totals ────────────────────────────────────────────────────────
  const totalFixedOpex = Object.values(config.opexFixed).reduce((a, b) => a + (b as number), 0);
  const totalVarOpex = config.opexVariable.suppliesMonthly + config.opexVariable.marketingVariable + config.opexVariable.outsourcedMonthly;

  const planColors: Record<string, string> = {
    essencial: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pro: "border-amber-200 bg-amber-50 text-amber-700",
    enterprise: "border-violet-200 bg-violet-50 text-violet-700",
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "metas", label: "Gestão de Metas", icon: <Target className="h-4 w-4" /> },
    { key: "opex", label: "OPEX / Custos", icon: <DollarSign className="h-4 w-4" /> },
    { key: "clinico", label: "Corpo Clínico", icon: <Stethoscope className="h-4 w-4" /> },
    { key: "servicos", label: "Serviços / Procedimentos", icon: <ClipboardList className="h-4 w-4" /> },
  ];

  // ── Profile modal state ───────────────────────────────────────────────────
  const [profileTarget, setProfileTarget] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "", avatarUrl: "" });
  const [profilePwd, setProfilePwd] = useState({ newPwd: "", confirmPwd: "", show: false });
  const [profileSaving, setProfileSaving] = useState(false);

  const openProfile = (u: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProfileTarget(u);
    setProfileForm({ name: u.name ?? "", email: u.email ?? "", phone: (u as any).phone ?? "", avatarUrl: (u as any).avatarUrl ?? "" });
    setProfilePwd({ newPwd: "", confirmPwd: "", show: false });
  };

  const updateUserMutation = trpc.emailAuth.updateUser.useMutation({
    onSuccess: () => { toast.success("Perfil atualizado!"); refetch(); setProfileSaving(false); setProfileTarget(null); },
    onError: (e) => { toast.error(e.message); setProfileSaving(false); },
  });
  const resetPwdMutation = trpc.emailAuth.resetPassword.useMutation({
    onSuccess: () => { toast.success("Senha redefinida!"); setProfilePwd({ newPwd: "", confirmPwd: "", show: false }); },
    onError: (e) => toast.error(e.message),
  });

  const handleSaveProfile = () => {
    if (!profileTarget) return;
    setProfileSaving(true);
    updateUserMutation.mutate({ userId: profileTarget.id, name: profileForm.name.trim(), email: profileForm.email.trim() });
    if (profilePwd.newPwd) {
      if (profilePwd.newPwd !== profilePwd.confirmPwd) { toast.error("Senhas não coincidem"); setProfileSaving(false); return; }
      if (profilePwd.newPwd.length < 6) { toast.error("Senha mínimo 6 caracteres"); setProfileSaving(false); return; }
      resetPwdMutation.mutate({ userId: profileTarget.id, newPassword: profilePwd.newPwd });
    }
  };

  // ── Plan modal state ───────────────────────────────────────────────────────
  const [planModalOpen, setPlanModalOpen] = useState(false);

  const updatePlanMutation = trpc.admin.updateUserPlan.useMutation({
    onSuccess: () => { toast.success("Plano atualizado!"); refetch(); setPlanModalOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const [userSearch, setUserSearch] = useState("");

  // ── Create user modal ─────────────────────────────────────────────────────
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ nome: "", email: "", password: "", role: "user" as "user" | "admin", plan: "essencial" });
  const createUserMutation = trpc.emailAuth.createUser.useMutation({
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const handleCreateUser = async () => {
    if (!newUserForm.nome || !newUserForm.email || !newUserForm.password) { toast.error("Preencha todos os campos obrigatórios"); return; }
    if (newUserForm.password.length < 6) { toast.error("Senha deve ter pelo menos 6 caracteres"); return; }
    const emailSnap = newUserForm.email;
    try {
      const r: any = await createUserMutation.mutateAsync({ name: newUserForm.nome, email: emailSnap, password: newUserForm.password, role: newUserForm.role, plan: newUserForm.plan as any, integrations: [] });
      toast.success(r?.message || "Usuário criado!");
      const result = await refetch();
      // Pre-save default goals so the config form shows defaults immediately
      const created = result.data?.find((u) => u.email === emailSnap);
      if (created) saveConfig(created.id, defaultConfig());
      setIsCreateOpen(false);
      setNewUserForm({ nome: "", email: "", password: "", role: "user", plan: "essencial" });
    } catch { /* onError handles toast */ }
  };

  const clientUsers = users.filter((u) => u.role === "user");
  const filteredClientUsers = clientUsers.filter((u) => {
    const q = userSearch.toLowerCase();
    return (u.name?.toLowerCase().includes(q) ?? false) || (u.email?.toLowerCase().includes(q) ?? false);
  });

  return (
    <AdminLayout>
      <MotionPageShell className="space-y-0">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <h1 className={cn("text-[1.9rem] font-bold tracking-[-0.03em]", isDark ? "text-white" : "text-[#0f172a]")}>
              Configuração do Cliente
            </h1>
            <p className={cn("mt-1 text-sm", isDark ? "text-white/70" : "text-[#64748b]")}>
              Parâmetros financeiros, metas e estrutura clínica. Apenas admins podem editar.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={!selectedUserId || saved}
            className={cn(
              "h-10 px-5 rounded-xl text-sm font-semibold transition-all",
              saved
                ? "bg-emerald-500 hover:bg-emerald-500 text-white"
                : "bg-[#ff7a1a] hover:bg-[#e86d10] text-white shadow-[0_4px_16px_rgba(255,122,26,0.30)]"
            )}
          >
            {saved ? <><CheckCircle2 className="h-4 w-4 mr-2" />Salvo!</> : <><Save className="h-4 w-4 mr-2" />Salvar configuração</>}
          </Button>
        </div>

        {/* ── Layout: User list + Config panel ── */}
        <div className="flex gap-4 items-start">

          {/* ── Left: User list ── */}
          <div className={cn(surfaceCard, "w-64 flex-shrink-0 overflow-hidden flex flex-col")}>
            <div className="px-4 pt-4 pb-3 border-b border-[#eef3f8]">
              <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] mb-2">Usuários</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94a3b8]" />
                <Input
                  placeholder="Buscar..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="h-8 pl-8 text-xs rounded-lg border-[#d7e1ef] bg-[#f8fbff]"
                />
              </div>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="mt-2 w-full h-8 rounded-lg bg-[#FF6900] hover:bg-[#e05e00] text-white text-xs font-medium gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Novo Usuário
              </Button>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-240px)]">
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[#94a3b8]" />
                </div>
              ) : filteredClientUsers.length === 0 ? (
                <p className="text-xs text-[#94a3b8] text-center py-6">Nenhum usuário encontrado</p>
              ) : (
                filteredClientUsers.map((u) => {
                  const plan = (u as any).plan || "essencial";
                  const isSelected = selectedUserId === u.id;
                  const hasConfig = !!localStorage.getItem(storageKey(u.id));
                  return (
                    <div
                      key={u.id}
                      className={cn(
                        "group flex items-center gap-3 px-4 py-3 transition-colors border-b border-[#f1f5f9] last:border-0 cursor-pointer",
                        isSelected
                          ? "bg-[#fff4ea] border-l-2 border-l-[#ff7a1a]"
                          : "hover:bg-[#fafcff] border-l-2 border-l-transparent"
                      )}
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      <div className={cn(
                        "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        isSelected ? "bg-[#ff7a1a] text-white" : "bg-[#fff1e8] text-[#ff7a1a]"
                      )}>
                        {((u.name || u.email || "?")[0]).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-semibold truncate", isSelected ? "text-[#ff7a1a]" : "text-[#0f172a]")}>
                          {u.name || "Sem nome"}
                        </p>
                        <p className="text-[11px] text-[#94a3b8] truncate">{u.email}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", planColors[plan])}>
                            {plan === "pro" ? "Pro" : plan === "enterprise" ? "Enterprise" : "Start"}
                          </Badge>
                          {hasConfig && (
                            <span className="text-[9px] text-emerald-600 font-medium">● configurado</span>
                          )}
                        </div>
                      </div>
                      {/* Settings button */}
                      <button
                        onClick={(e) => openProfile(u, e)}
                        title="Editar perfil, senha e foto"
                        className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-[#cbd5e1] hover:text-[#ff7a1a] hover:bg-[#fff1e8] transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right: Config form ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* No user selected */}
            {!selectedUserId && (
              <div className={cn(surfaceCard, "flex flex-col items-center justify-center py-20 text-center gap-3")}>
                <div className="h-14 w-14 rounded-2xl bg-[#fff4ea] flex items-center justify-center">
                  <Users className="h-7 w-7 text-[#ff7a1a]" />
                </div>
                <p className="text-sm font-semibold text-[#334155]">Selecione um usuário</p>
                <p className="text-xs text-[#94a3b8] max-w-xs">Clique em um usuário na lista à esquerda para visualizar e editar sua configuração.</p>
              </div>
            )}

            {/* User selected — show tabs + form */}
            {selectedUserId && (
              <>
                {/* Selected user banner */}
                <div className={cn(surfaceCard, "flex items-center gap-4 px-5 py-3.5")}>
                  {/* Avatar */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#ff7a1a] text-white font-bold text-sm">
                    {((selectedUser?.name || selectedUser?.email || "?")[0]).toUpperCase()}
                  </div>
                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0f172a] truncate">{selectedUser?.name || "Sem nome"}</p>
                    <p className="text-xs text-[#94a3b8] truncate">{selectedUser?.email}</p>
                  </div>
                  {/* Plan badge */}
                  <Badge variant="outline" className={cn("text-xs flex-shrink-0", planColors[(selectedUser as any)?.plan || "essencial"])}>
                    {planIcons[(selectedUser as any)?.plan || "essencial"]}
                    {planLabels[(selectedUser as any)?.plan || "essencial"]}
                  </Badge>
                  {/* Last saved */}
                  {config.updatedAt && config.updatedAt !== defaultConfig().updatedAt && (
                    <p className="text-[11px] text-[#94a3b8] flex-shrink-0 hidden sm:block">
                      Salvo em {new Date(config.updatedAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => openProfile(selectedUser, e)}
                      className="h-8 px-3 rounded-xl border-[#d7e1ef] text-xs text-[#475569] hover:border-[#ff7a1a] hover:text-[#ff7a1a] gap-1.5"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Perfil
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setPlanModalOpen(true)}
                      className="h-8 px-3 rounded-xl text-xs bg-[#1B96FF] hover:bg-[#0e82e8] text-white gap-1.5"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Alterar Plano
                    </Button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-[#eef3f8] overflow-x-auto">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                        activeTab === t.key
                          ? "bg-[#ff7a1a] text-white shadow-sm"
                          : "text-[#64748b] hover:text-[#334155] hover:bg-[#f8fbff]"
                      )}
                    >
                      {t.icon}{t.label}
                    </button>
                  ))}
                </div>
              </>
            )}


            {/* ══════════════════════════════════════════════════════
                Tab: GESTÃO DE METAS
            ══════════════════════════════════════════════════════ */}
            {selectedUserId && activeTab === "metas" && (
          <div className="space-y-4">

            {/* Plan legend */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-1">
                <Zap className="h-3 w-3" />START — campos base
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-2.5 py-1">
                <Crown className="h-3 w-3" />PRO — inclui campos marcados com ⭐
              </span>
            </div>

            {/* ─ Agenda & No-Show ─ */}
            <Card className={surfaceCard}>
              <CardHeader className="px-5 pt-5 pb-3">
                <SectionTitle icon={<Activity className="h-4 w-4" />} label="Agenda & No-Show" description="Metas de ocupação, no-show e confirmações" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <NumInput label="No-show máximo (%)" value={config.goals.noShowMaxPct} onChange={(v) => update({ goals: { ...config.goals, noShowMaxPct: v } })} suffix="%" hint="Taxa máxima tolerada de no-show (padrão: 8%)" />
                  <NumInput label="Ocupação mínima (%)" value={config.goals.occupancyMinPct} onChange={(v) => update({ goals: { ...config.goals, occupancyMinPct: v } })} suffix="%" hint="Meta mínima de ocupação da agenda (padrão: 80%)" />
                  <NumInput label="Confirmações mínimas (%)" value={config.goals.confirmationMinPct} onChange={(v) => update({ goals: { ...config.goals, confirmationMinPct: v } })} suffix="%" hint="% de agendamentos com confirmação ativa (padrão: 85%)" />
                  <NumInput label="Consultas/semana (meta)" value={config.goals.weeklyConsultsTarget} onChange={(v) => update({ goals: { ...config.goals, weeklyConsultsTarget: v } })} suffix="consultas" hint="Número de consultas realizadas ≥ meta semanal definida aqui" />
                  <NumInput label="Canal de aquisição máx. (%)" value={config.goals.acquisitionChannelMaxPct} onChange={(v) => update({ goals: { ...config.goals, acquisitionChannelMaxPct: v } })} suffix="%" hint="Nenhum canal deve responder por mais de X% dos agendamentos (padrão: 20%)" />
                  <NumInput label="Lead time máximo (dias)" value={config.goals.leadTimeDaysMax} onChange={(v) => update({ goals: { ...config.goals, leadTimeDaysMax: v } })} suffix="dias" hint="Tempo máximo entre criação e realização do agendamento (padrão: 3 dias)" />
                  <div className="col-span-2 md:col-span-1 space-y-1.5">
                    <Label className="text-xs font-semibold text-amber-600 flex items-center gap-1"><Crown className="h-3 w-3" />⭐ Custo no-show máximo (R$)</Label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#94a3b8]">R$</span>
                      <Input type="number" min={0} value={config.goals.noShowCostMaxR$ || ""} onChange={(e) => update({ goals: { ...config.goals, noShowCostMaxR$: Number(e.target.value) || 0 } })} className="h-9 text-sm border-amber-200 bg-amber-50 rounded-lg" placeholder="2000" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-amber-600 flex items-center gap-1"><Crown className="h-3 w-3" />⭐ Perda capacidade máx. (%)</Label>
                    <div className="flex items-center gap-1.5">
                      <Input type="number" min={0} value={config.goals.capacityLossMaxPct || ""} onChange={(e) => update({ goals: { ...config.goals, capacityLossMaxPct: Number(e.target.value) || 0 } })} className="h-9 text-sm border-amber-200 bg-amber-50 rounded-lg" placeholder="8" />
                      <span className="text-xs text-[#94a3b8]">%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ─ Financeiro ─ */}
            <Card className={surfaceCard}>
              <CardHeader className="px-5 pt-5 pb-3">
                <SectionTitle icon={<DollarSign className="h-4 w-4" />} label="Financeiro Executivo" description="Faturamento, margens, inadimplência e despesas" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <NumInput label="Faturamento bruto/mês (R$)" value={config.goals.monthlyRevenueTarget} onChange={(v) => update({ goals: { ...config.goals, monthlyRevenueTarget: v } })} prefix="R$" hint="Meta de faturamento bruto mensal. Base para cálculo de break-even." />
                  <NumInput label="Receita líquida mín. (% bruto)" value={config.goals.netRevenuePctMin} onChange={(v) => update({ goals: { ...config.goals, netRevenuePctMin: v } })} suffix="%" hint="Receita líquida deve ser > X% do bruto. Padrão: 92% (8% dedução)" />
                  <NumInput label="Margem líquida mín. (%)" value={config.goals.grossMarginMinPct} onChange={(v) => update({ goals: { ...config.goals, grossMarginMinPct: v } })} suffix="%" hint="Margem líquida total mínima aceita (padrão: 20%)" />
                  <NumInput label="Inadimplência máxima (%)" value={config.goals.defaultRateMaxPct} onChange={(v) => update({ goals: { ...config.goals, defaultRateMaxPct: v } })} suffix="%" hint="Taxa de inadimplência máxima tolerada (padrão: 4%)" />
                  <NumInput label="Desp. fixas / Receita máx. (%)" value={config.goals.fixedExpenseRatioMax} onChange={(v) => update({ goals: { ...config.goals, fixedExpenseRatioMax: v } })} suffix="%" hint="Despesas fixas não devem superar X% da receita (padrão: 45%)" />

                  {/* PRO */}
                  {[
                    { key: "ebitdaMinPct" as const, label: "⭐ EBITDA mín. (%)", placeholder: "25", hint: "DRE Gerencial: EBITDA % mínimo (padrão: 25%)" },
                    { key: "forecastTolerancePct" as const, label: "⭐ Tolerância Forecast (±%)", placeholder: "10", hint: "Forecast de receita: desvio máximo ± X% do real (padrão: 10%)" },
                    { key: "breakEvenDayTarget" as const, label: "⭐ Break-even até dia", placeholder: "15", hint: "Meta: 90%+ do faturamento mensal atingido até o dia X (padrão: 15)" },
                  ].map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                        <Crown className="h-3 w-3" />{f.label}<Hint text={f.hint} />
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <Input type="number" min={0} placeholder={f.placeholder}
                          value={(config.goals[f.key] as number) || ""}
                          onChange={(e) => update({ goals: { ...config.goals, [f.key]: Number(e.target.value) || 0 } })}
                          className="h-9 text-sm border-amber-200 bg-amber-50 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ─ Marketing ─ */}
            <Card className={surfaceCard}>
              <CardHeader className="px-5 pt-5 pb-3">
                <SectionTitle icon={<TrendingUp className="h-4 w-4" />} label="Marketing & Captação" description="Leads, CPL, conversão e ROI por canal" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <NumInput label="Leads totais/mês (meta)" value={config.goals.totalLeadsMonthTarget} onChange={(v) => update({ goals: { ...config.goals, totalLeadsMonthTarget: v } })} suffix="leads" />
                  <NumInput label="CPL máximo (R$)" value={config.goals.cplMaxR$} onChange={(v) => update({ goals: { ...config.goals, cplMaxR$: v } })} prefix="R$" hint="Custo por Lead máximo aceitável (padrão: R$35)" />
                  <NumInput label="Conversão Lead→Agend. mín. (%)" value={config.goals.convLeadToAppMinPct} onChange={(v) => update({ goals: { ...config.goals, convLeadToAppMinPct: v } })} suffix="%" hint="Taxa mínima de conversão de lead em agendamento (padrão: 35%)" />
                  <NumInput label="No-show por canal máx. (%)" value={config.goals.noShowByChannelMaxPct} onChange={(v) => update({ goals: { ...config.goals, noShowByChannelMaxPct: v } })} suffix="%" hint="No-show segmentado por canal de origem < X% (padrão: 25%)" />
                  <NumInput label="ROI por canal mín. (%)" value={config.goals.roiMinPct} onChange={(v) => update({ goals: { ...config.goals, roiMinPct: v } })} suffix="%" hint="Retorno sobre investimento de marketing mínimo por canal (padrão: 200%)" />

                  {[
                    { key: "convLeadToConsultMinPct" as const, label: "⭐ Conversão Lead→Consulta mín. (%)", placeholder: "22", hint: "PRO: Taxa mínima de Lead → Consulta Realizada (padrão: 22%)" },
                    { key: "ltvCacRatioMin" as const, label: "⭐ LTV / CAC mín. (ratio)", placeholder: "3", hint: "PRO: LTV deve ser no mínimo X vezes o CAC (padrão: 3x)" },
                  ].map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                        <Crown className="h-3 w-3" />{f.label}<Hint text={f.hint} />
                      </Label>
                      <Input type="number" min={0} placeholder={f.placeholder}
                        value={(config.goals[f.key] as number) || ""}
                        onChange={(e) => update({ goals: { ...config.goals, [f.key]: Number(e.target.value) || 0 } })}
                        className="h-9 text-sm border-amber-200 bg-amber-50 rounded-lg" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ─ Operação & UX ─ */}
            <Card className={surfaceCard}>
              <CardHeader className="px-5 pt-5 pb-3">
                <SectionTitle icon={<BarChart3 className="h-4 w-4" />} label="Operação & UX" description="NPS, tempo de espera, fidelização e SLA" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <NumInput label="NPS geral mín. (0–10)" value={config.goals.npsMinGeneral} onChange={(v) => update({ goals: { ...config.goals, npsMinGeneral: v } })} step={0.1} hint="NPS geral mínimo aceitável (padrão: 8,5)" />
                  <NumInput label="Espera máxima (min)" value={config.goals.waitTimeMaxMin} onChange={(v) => update({ goals: { ...config.goals, waitTimeMaxMin: v } })} suffix="min" hint="Tempo médio de espera máximo (padrão: 12 min)" />
                  <NumInput label="Taxa de retorno mín. (%)" value={config.goals.returnRateMinPct} onChange={(v) => update({ goals: { ...config.goals, returnRateMinPct: v } })} suffix="%" hint="Fidelização: % de pacientes que retornam em 90 dias (padrão: 40%)" />
                  <NumInput label="SLA lead máximo (horas)" value={config.goals.slaLeadMaxHours} onChange={(v) => update({ goals: { ...config.goals, slaLeadMaxHours: v } })} suffix="h" step={0.5} hint="Tempo máximo de resposta ao lead (padrão: 1h)" />

                  {[
                    { key: "npsByProfMin" as const, label: "⭐ NPS por profissional mín.", placeholder: "8", hint: "PRO: NPS individual mínimo para cada profissional (padrão: 8,0)" },
                    { key: "marginByServiceMinPct" as const, label: "⭐ Margem por serviço mín. (%)", placeholder: "30", hint: "PRO: Margem mínima por procedimento/serviço (padrão: 30%)" },
                  ].map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                        <Crown className="h-3 w-3" />{f.label}<Hint text={f.hint} />
                      </Label>
                      <Input type="number" min={0} step={0.1} placeholder={f.placeholder}
                        value={(config.goals[f.key] as number) || ""}
                        onChange={(e) => update({ goals: { ...config.goals, [f.key]: Number(e.target.value) || 0 } })}
                        className="h-9 text-sm border-amber-200 bg-amber-50 rounded-lg" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

            {/* ══════════════════════════════════════════════════════
                Tab: OPEX
            ══════════════════════════════════════════════════════ */}
            {selectedUserId && activeTab === "opex" && (
          <div className="space-y-4">

            {/* Totals banner */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Total Custos Fixos", value: fmtR$(totalFixedOpex), color: "#EF4444" },
                { label: "Total Custos Variáveis (fixo)", value: fmtR$(totalVarOpex), color: "#F59E0B" },
                { label: "Total OPEX Fixo", value: fmtR$(totalFixedOpex + totalVarOpex), color: "#1B96FF" },
              ].map((s) => (
                <div key={s.label} className={cn(surfaceCard, "p-4")}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">{s.label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Custos Fixos */}
            <Card className={surfaceCard}>
              <CardHeader className="px-5 pt-5 pb-3">
                <SectionTitle
                  icon={<Building2 className="h-4 w-4" />}
                  label="Custos Fixos Mensais"
                  description="Independentes do volume de atendimentos — sempre incidem"
                />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { key: "personnel" as const, label: "1. Pessoal CLT/Sócios", hint: "Salários, Pró-Labore, encargos (FGTS, INSS)" },
                    { key: "rent" as const, label: "2. Aluguel / IPTU", hint: "Aluguel mensal + IPTU proporcional" },
                    { key: "technology" as const, label: "3. Sistemas de Tecnologia", hint: "CRM, GLX, telefonia, prontuário eletrônico" },
                    { key: "marketingFixed" as const, label: "4. Marketing Fixo", hint: "Agência, conteúdo, branding — valores contratuais fixos" },
                    { key: "financial" as const, label: "5. Financeiro / Fiscal", hint: "Contador, impostos fixos, seguros, taxas" },
                    { key: "utilities" as const, label: "6. Utilidades", hint: "Luz, água, internet — média mensal" },
                    { key: "licenses" as const, label: "7. Licenças e Assessorias", hint: "CRM, ANVISA, assessoria jurídica" },
                  ].map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#475569]">
                        {f.label}<Hint text={f.hint} />
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[#94a3b8]">R$</span>
                        <Input type="number" min={0} step={100}
                          value={config.opexFixed[f.key] || ""}
                          onChange={(e) => update({ opexFixed: { ...config.opexFixed, [f.key]: Number(e.target.value) || 0 } })}
                          className="h-9 text-sm border-[#d7e1ef] bg-[#f8fbff] rounded-lg"
                          placeholder="0" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm">
                    <span className="text-[#94a3b8] mr-2">Total fixos:</span>
                    <span className="font-bold text-red-500 text-base">{fmtR$(totalFixedOpex)}</span>
                    <span className="text-xs text-[#94a3b8] ml-2">/mês</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custos Variáveis */}
            <Card className={surfaceCard}>
              <CardHeader className="px-5 pt-5 pb-3">
                <SectionTitle
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Custos Variáveis"
                  description="Atrelados ao volume de atendimentos — crescem com a receita"
                />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#475569]">
                      1. Repasse médico / Honorários (%)<Hint text="% da receita repassado aos médicos/profissionais (padrão: 30%)" />
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input type="number" min={0} max={100} step={0.5}
                        value={config.opexVariable.doctorFeePct || ""}
                        onChange={(e) => update({ opexVariable: { ...config.opexVariable, doctorFeePct: Number(e.target.value) || 0 } })}
                        className="h-9 text-sm border-[#d7e1ef] bg-[#f8fbff] rounded-lg" placeholder="30" />
                      <span className="text-xs text-[#94a3b8]">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#475569]">
                      2. Insumos/Materiais/Exames (R$/mês)<Hint text="Medicamentos, materiais, exames terceirizados — estimativa mensal" />
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#94a3b8]">R$</span>
                      <Input type="number" min={0} step={100}
                        value={config.opexVariable.suppliesMonthly || ""}
                        onChange={(e) => update({ opexVariable: { ...config.opexVariable, suppliesMonthly: Number(e.target.value) || 0 } })}
                        className="h-9 text-sm border-[#d7e1ef] bg-[#f8fbff] rounded-lg" placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#475569]">
                      3. Comissões comerciais (%)<Hint text="Captação, vendas, indicação de pacientes (% sobre receita gerada)" />
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input type="number" min={0} max={100} step={0.5}
                        value={config.opexVariable.commercialCommissionPct || ""}
                        onChange={(e) => update({ opexVariable: { ...config.opexVariable, commercialCommissionPct: Number(e.target.value) || 0 } })}
                        className="h-9 text-sm border-[#d7e1ef] bg-[#f8fbff] rounded-lg" placeholder="5" />
                      <span className="text-xs text-[#94a3b8]">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#475569]">
                      4. Marketing variável (R$/mês)<Hint text="Mídia paga, ads, patrocínios por campanha — variável mês a mês" />
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#94a3b8]">R$</span>
                      <Input type="number" min={0} step={100}
                        value={config.opexVariable.marketingVariable || ""}
                        onChange={(e) => update({ opexVariable: { ...config.opexVariable, marketingVariable: Number(e.target.value) || 0 } })}
                        className="h-9 text-sm border-[#d7e1ef] bg-[#f8fbff] rounded-lg" placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#475569]">
                      5. Taxas de transação (%)<Hint text="Maquininha, parcelamento, gateway, planos de saúde (padrão: 3,5%)" />
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input type="number" min={0} max={20} step={0.1}
                        value={config.opexVariable.transactionFeePct || ""}
                        onChange={(e) => update({ opexVariable: { ...config.opexVariable, transactionFeePct: Number(e.target.value) || 0 } })}
                        className="h-9 text-sm border-[#d7e1ef] bg-[#f8fbff] rounded-lg" placeholder="3.5" />
                      <span className="text-xs text-[#94a3b8]">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#475569]">
                      6. Serviços terceirizados (R$/mês)<Hint text="Limpeza, segurança, esterilização, laboratórios — média mensal" />
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#94a3b8]">R$</span>
                      <Input type="number" min={0} step={100}
                        value={config.opexVariable.outsourcedMonthly || ""}
                        onChange={(e) => update({ opexVariable: { ...config.opexVariable, outsourcedMonthly: Number(e.target.value) || 0 } })}
                        className="h-9 text-sm border-[#d7e1ef] bg-[#f8fbff] rounded-lg" placeholder="0" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

            {/* ══════════════════════════════════════════════════════
                Tab: CORPO CLÍNICO
            ══════════════════════════════════════════════════════ */}
            {selectedUserId && activeTab === "clinico" && (
          <Card className={surfaceCard}>
            <CardHeader className="px-5 pt-5 pb-3">
              <div className="flex items-start justify-between">
                <SectionTitle
                  icon={<Stethoscope className="h-4 w-4" />}
                  label="Corpo Clínico"
                  description="Cadastro de profissionais, especialidades e modelo de remuneração"
                />
                <Button size="sm" onClick={addProfessional} className="h-8 rounded-xl bg-[#ff7a1a] hover:bg-[#e86d10] text-white text-xs">
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />Adicionar Profissional
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {config.professionals.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#94a3b8] border-2 border-dashed border-[#e2e8f0] rounded-xl">
                  Nenhum profissional cadastrado. Clique em "Adicionar Profissional" para começar.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Header row */}
                  <div className="hidden md:grid md:grid-cols-[1fr_1fr_120px_100px_100px_80px_40px] gap-2 px-3 py-1.5 rounded-lg bg-[#f8fbff]">
                    {["Nome", "Especialidade", "Contrato", "Custo/mês R$", "Comissão %", "Hrs/sem", ""].map((h) => (
                      <span key={h} className="text-xs font-bold uppercase tracking-wide text-[#94a3b8]">{h}</span>
                    ))}
                  </div>
                  {config.professionals.map((p) => (
                    <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px_100px_100px_80px_40px] gap-2 items-center p-3 rounded-xl border border-[#eef3f8] bg-[#fafcff] hover:border-[#d7e1ef] transition-colors">
                      <Input value={p.name} onChange={(e) => updateProf(p.id, { name: e.target.value })} placeholder="Nome completo" className="h-9 text-sm border-[#d7e1ef] bg-white rounded-lg" />
                      <Input value={p.specialty} onChange={(e) => updateProf(p.id, { specialty: e.target.value })} placeholder="Ex.: Clínica Geral, Dermatologia" className="h-9 text-sm border-[#d7e1ef] bg-white rounded-lg" />
                      <Select value={p.contract} onValueChange={(v) => updateProf(p.id, { contract: v as ContractType })}>
                        <SelectTrigger className="h-9 text-xs border-[#d7e1ef] bg-white rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CLT">CLT</SelectItem>
                          <SelectItem value="PJ">PJ</SelectItem>
                          <SelectItem value="Socio">Sócio</SelectItem>
                          <SelectItem value="Freelancer">Freelancer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="number" min={0} step={100} value={p.monthlyCost || ""} onChange={(e) => updateProf(p.id, { monthlyCost: Number(e.target.value) || 0 })} placeholder="0" className="h-9 text-sm border-[#d7e1ef] bg-white rounded-lg" />
                      <div className="flex items-center gap-1">
                        <Input type="number" min={0} max={100} step={1} value={p.commissionPct || ""} onChange={(e) => updateProf(p.id, { commissionPct: Number(e.target.value) || 0 })} placeholder="30" className="h-9 text-sm border-[#d7e1ef] bg-white rounded-lg" />
                        <span className="text-xs text-[#94a3b8]">%</span>
                      </div>
                      <Input type="number" min={0} max={80} step={1} value={p.weeklyHours || ""} onChange={(e) => updateProf(p.id, { weeklyHours: Number(e.target.value) || 0 })} placeholder="40" className="h-9 text-sm border-[#d7e1ef] bg-white rounded-lg" />
                      <button onClick={() => removeProf(p.id)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94a3b8] hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="flex justify-end gap-4 pt-2">
                    <div className="rounded-xl bg-[#f8fbff] border border-[#dbe5f0] px-4 py-2.5 text-sm">
                      <span className="text-[#94a3b8] mr-2">{config.professionals.length} profissional(is) — Custo total:</span>
                      <span className="font-bold text-[#1B96FF]">
                        {fmtR$(config.professionals.reduce((s, p) => s + p.monthlyCost, 0))} /mês
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

            {/* ══════════════════════════════════════════════════════
                Tab: SERVIÇOS / PROCEDIMENTOS
            ══════════════════════════════════════════════════════ */}
            {selectedUserId && activeTab === "servicos" && (
          <Card className={surfaceCard}>
            <CardHeader className="px-5 pt-5 pb-3">
              <div className="flex items-start justify-between">
                <SectionTitle
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Serviços e Procedimentos"
                  description="Catálogo de procedimentos com preço, custo direto, duração e comissão"
                />
                <Button size="sm" onClick={addService} className="h-8 rounded-xl bg-[#ff7a1a] hover:bg-[#e86d10] text-white text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Adicionar Serviço
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {config.services.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#94a3b8] border-2 border-dashed border-[#e2e8f0] rounded-xl">
                  Nenhum serviço cadastrado. Clique em "Adicionar Serviço" para começar.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="hidden lg:grid lg:grid-cols-[1fr_1fr_110px_95px_95px_70px_80px_40px] gap-2 px-3 py-1.5 rounded-lg bg-[#f8fbff]">
                    {["Nome", "Especialidade", "Tipo", "Preço R$", "Custo R$", "Min", "Comissão %", ""].map((h) => (
                      <span key={h} className="text-xs font-bold uppercase tracking-wide text-[#94a3b8]">{h}</span>
                    ))}
                  </div>
                  {config.services.map((s) => {
                    const margin = s.priceGross > 0 ? Math.round(((s.priceGross - s.costDirect) / s.priceGross) * 100) : 0;
                    return (
                      <div key={s.id} className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_110px_95px_95px_70px_80px_40px] gap-2 items-center p-3 rounded-xl border border-[#eef3f8] bg-[#fafcff] hover:border-[#d7e1ef] transition-colors">
                        <Input value={s.name} onChange={(e) => updateSvc(s.id, { name: e.target.value })} placeholder="Ex.: Consulta Padrão" className="h-9 text-sm border-[#d7e1ef] bg-white rounded-lg" />
                        <Input value={s.specialty} onChange={(e) => updateSvc(s.id, { specialty: e.target.value })} placeholder="Ex.: Dermatologia" className="h-9 text-sm border-[#d7e1ef] bg-white rounded-lg" />
                        <Select value={s.type} onValueChange={(v) => updateSvc(s.id, { type: v as ServiceType })}>
                          <SelectTrigger className="h-9 text-xs border-[#d7e1ef] bg-white rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["Consulta","Retorno","Avaliação","Procedimento","Cirurgia","Exame"] as ServiceType[]).map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[#94a3b8]">R$</span>
                          <Input type="number" min={0} step={10} value={s.priceGross || ""} onChange={(e) => updateSvc(s.id, { priceGross: Number(e.target.value) || 0 })} placeholder="0" className="h-9 text-sm border-[#d7e1ef] bg-white rounded-lg" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[#94a3b8]">R$</span>
                          <Input type="number" min={0} step={10} value={s.costDirect || ""} onChange={(e) => updateSvc(s.id, { costDirect: Number(e.target.value) || 0 })} placeholder="0" className="h-9 text-sm border-[#d7e1ef] bg-white rounded-lg" />
                        </div>
                        <Input type="number" min={5} max={480} step={5} value={s.durationMin || ""} onChange={(e) => updateSvc(s.id, { durationMin: Number(e.target.value) || 0 })} placeholder="45" className="h-9 text-sm border-[#d7e1ef] bg-white rounded-lg" />
                        <div className="flex items-center gap-1">
                          <Input type="number" min={0} max={100} step={1} value={s.commissionPct || ""} onChange={(e) => updateSvc(s.id, { commissionPct: Number(e.target.value) || 0 })} placeholder="30" className="h-9 text-sm border-[#d7e1ef] bg-white rounded-lg" />
                          <span className="text-xs text-[#94a3b8]">%</span>
                        </div>
                        <button onClick={() => removeSvc(s.id)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94a3b8] hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Summary */}
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Serviços cadastrados", value: config.services.length.toString(), color: "#1B96FF" },
                      { label: "Ticket médio", value: fmtR$(config.services.length ? config.services.reduce((s, i) => s + i.priceGross, 0) / config.services.length : 0), color: "#10B981" },
                      { label: "Margem média", value: `${config.services.length ? Math.round(config.services.reduce((s, i) => s + (i.priceGross > 0 ? ((i.priceGross - i.costDirect) / i.priceGross) * 100 : 0), 0) / config.services.length) : 0}%`, color: "#FF6900" },
                      { label: "Duração média", value: `${config.services.length ? Math.round(config.services.reduce((s, i) => s + i.durationMin, 0) / config.services.length) : 0} min`, color: "#8B5CF6" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-[#dbe5f0] bg-[#f8fbff] px-3 py-2.5">
                        <p className="text-[11px] text-[#94a3b8] font-medium">{s.label}</p>
                        <p className="text-lg font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

          </div>{/* end right panel */}
        </div>{/* end flex layout */}

        {/* ══════════════════════════════════════════════════════
            Modal: Perfil do Usuário
        ══════════════════════════════════════════════════════ */}
        <Dialog open={!!profileTarget} onOpenChange={(o) => !o && setProfileTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Settings2 className="h-4 w-4 text-[#ff7a1a]" />
                Configurações do Usuário
              </DialogTitle>
              <DialogDescription className="text-xs text-[#94a3b8]">
                Edite perfil, foto e senha de <strong>{profileTarget?.name || profileTarget?.email}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-1">

              {/* Avatar section */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#f8fbff] border border-[#dbe5f0]">
                <div className="relative flex-shrink-0">
                  <div className="h-16 w-16 rounded-full bg-[#ff7a1a] flex items-center justify-center text-white text-xl font-bold">
                    {((profileTarget?.name || profileTarget?.email || "?")[0] ?? "?").toUpperCase()}
                  </div>
                  <button className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white border-2 border-[#dbe5f0] flex items-center justify-center text-[#64748b] hover:text-[#ff7a1a] transition-colors">
                    <Camera className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-[#64748b] font-medium">URL da Foto (opcional)</Label>
                  <Input
                    value={profileForm.avatarUrl}
                    onChange={(e) => setProfileForm((p) => ({ ...p, avatarUrl: e.target.value }))}
                    placeholder="https://..."
                    className="h-8 text-xs border-[#d7e1ef] bg-white rounded-lg"
                  />
                </div>
              </div>

              {/* Name + Email */}
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#475569] flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-[#94a3b8]" />Nome
                  </Label>
                  <Input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nome completo"
                    className="h-9 text-sm border-[#d7e1ef] bg-[#f8fbff] rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#475569] flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#94a3b8]" />E-mail
                  </Label>
                  <Input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@clinica.com"
                    className="h-9 text-sm border-[#d7e1ef] bg-[#f8fbff] rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#475569] flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-[#94a3b8]" />Telefone
                    <span className="text-[10px] text-[#94a3b8] font-normal">(informativo)</span>
                  </Label>
                  <Input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="h-9 text-sm border-[#d7e1ef] bg-[#f8fbff] rounded-lg"
                  />
                </div>
              </div>

              {/* Password section */}
              <div className="space-y-3 p-4 rounded-xl border border-[#dbe5f0] bg-[#fafcff]">
                <p className="text-xs font-bold text-[#475569] uppercase tracking-wide">Redefinir Senha</p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#64748b]">Nova senha</Label>
                  <div className="relative">
                    <Input
                      type={profilePwd.show ? "text" : "password"}
                      value={profilePwd.newPwd}
                      onChange={(e) => setProfilePwd((p) => ({ ...p, newPwd: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="h-9 text-sm border-[#d7e1ef] bg-white rounded-lg pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setProfilePwd((p) => ({ ...p, show: !p.show }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569]"
                    >
                      {profilePwd.show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {profilePwd.newPwd && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#64748b]">Confirmar nova senha</Label>
                    <Input
                      type="password"
                      value={profilePwd.confirmPwd}
                      onChange={(e) => setProfilePwd((p) => ({ ...p, confirmPwd: e.target.value }))}
                      placeholder="Repita a senha"
                      className={cn(
                        "h-9 text-sm rounded-lg",
                        profilePwd.confirmPwd && profilePwd.newPwd !== profilePwd.confirmPwd
                          ? "border-red-300 bg-red-50"
                          : profilePwd.confirmPwd && profilePwd.newPwd === profilePwd.confirmPwd
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-[#d7e1ef] bg-white"
                      )}
                    />
                    {profilePwd.confirmPwd && profilePwd.newPwd !== profilePwd.confirmPwd && (
                      <p className="text-[11px] text-red-500">Senhas não coincidem</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="border-t pt-4 gap-2">
              <Button variant="outline" onClick={() => setProfileTarget(null)} className="rounded-xl">Cancelar</Button>
              <Button
                onClick={handleSaveProfile}
                disabled={profileSaving || updateUserMutation.isPending}
                className="rounded-xl bg-[#ff7a1a] hover:bg-[#e86d10] text-white"
              >
                {(profileSaving || updateUserMutation.isPending) && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                Salvar alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════
            Modal: Alterar Plano
        ══════════════════════════════════════════════════════ */}
        <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <ArrowLeftRight className="h-4 w-4 text-[#1B96FF]" />
                Alterar Plano
              </DialogTitle>
              <DialogDescription className="text-xs text-[#94a3b8]">
                Selecione o novo plano para <strong>{selectedUser?.name || selectedUser?.email}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {([
                {
                  key: "essencial",
                  label: "Start",
                  icon: <Zap className="h-5 w-5" />,
                  color: "#10B981",
                  bg: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
                  activeBg: "bg-emerald-100 border-emerald-500 ring-2 ring-emerald-200",
                  desc: "Dashboard executivo, agenda, financeiro e marketing básico",
                },
                {
                  key: "pro",
                  label: "Pro",
                  icon: <Crown className="h-5 w-5" />,
                  color: "#F59E0B",
                  bg: "bg-amber-50 border-amber-200 hover:border-amber-400",
                  activeBg: "bg-amber-100 border-amber-500 ring-2 ring-amber-200",
                  desc: "Tudo do Start + DRE, Forecast, Break-even, LTV/CAC, NPS por profissional",
                },
                {
                  key: "enterprise",
                  label: "Enterprise",
                  icon: <Building2 className="h-5 w-5" />,
                  color: "#8B5CF6",
                  bg: "bg-violet-50 border-violet-200 hover:border-violet-400",
                  activeBg: "bg-violet-100 border-violet-500 ring-2 ring-violet-200",
                  desc: "Tudo do Pro + Rede multi-unidade, Valuation, Investor View, API BI, QBR",
                },
              ] as const).map((p) => {
                const currentPlan = (selectedUser as any)?.plan || "essencial";
                const isActive = currentPlan === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => {
                      if (!selectedUserId || isActive) return;
                      updatePlanMutation.mutate({ userId: selectedUserId, plan: p.key });
                    }}
                    disabled={isActive || updatePlanMutation.isPending}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                      isActive ? p.activeBg : p.bg,
                      isActive ? "cursor-default" : "cursor-pointer"
                    )}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm" style={{ color: p.color }}>
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: p.color }}>{p.label}</span>
                        {isActive && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border" style={{ color: p.color, borderColor: p.color }}>
                            Plano atual
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#64748b] mt-0.5 leading-relaxed">{p.desc}</p>
                    </div>
                    {isActive && <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: p.color }} />}
                    {updatePlanMutation.isPending && !isActive && (
                      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[#94a3b8]" />
                    )}
                  </button>
                );
              })}
            </div>

            <DialogFooter className="border-t pt-3">
              <Button variant="outline" onClick={() => setPlanModalOpen(false)} className="w-full rounded-xl">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══ CREATE USER DIALOG ══════════════════════════════════════════════ */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0f172a]">Novo Usuário</DialogTitle>
              <DialogDescription className="text-xs text-[#94a3b8]">Crie um novo acesso para um cliente.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Nome *</Label>
                <Input value={newUserForm.nome} onChange={(e) => setNewUserForm({ ...newUserForm, nome: e.target.value })} placeholder="Nome completo" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Email *</Label>
                <Input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} placeholder="email@clinica.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Senha *</Label>
                <Input type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Permissão</Label>
                  <Select value={newUserForm.role} onValueChange={(v: "user" | "admin") => setNewUserForm({ ...newUserForm, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Plano</Label>
                  <Select value={newUserForm.plan} onValueChange={(v) => setNewUserForm({ ...newUserForm, plan: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="essencial">Start</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="border-t pt-4 gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateUser} disabled={createUserMutation.isPending} className="bg-[#FF6900] hover:bg-[#e05e00] text-white">
                {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-1.5" />Criar Usuário</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </MotionPageShell>
    </AdminLayout>
  );
}
