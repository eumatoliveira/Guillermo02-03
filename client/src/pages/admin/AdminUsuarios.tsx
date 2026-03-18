import AdminLayout, { useAdminTheme } from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Shield,
  Search,
  Plus,
  MoreHorizontal,
  UserCheck,
  UserX,
  Key,
  History,
  Download,
  Loader2,
  Trash2,
  RefreshCw,
  Crown,
  Zap,
  Building2,
  Pencil,
  Lock,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  Settings,
  Camera,
  Phone,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MIN_PLAN_BY_SECTION, PLAN_ACCESS, type PlanTier, type SectionId } from "@shared/controlTowerRules";
import { MotionPageShell } from "@/animation/components/MotionPageShell";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const roleColors: Record<string, string> = {
  admin: "border border-red-200 bg-red-50 text-red-700",
  user: "border border-blue-200 bg-blue-50 text-blue-700",
};
const roleLabels: Record<string, string> = { admin: "Admin", user: "Usuário" };

const planColors: Record<string, string> = {
  essencial: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  pro: "border border-amber-200 bg-amber-50 text-amber-700",
  enterprise: "border border-violet-200 bg-violet-50 text-violet-700",
};
const planLabels: Record<string, string> = {
  essencial: "Start",
  pro: "Pro",
  enterprise: "Enterprise",
};
const planIcons: Record<string, React.ReactNode> = {
  essencial: <Zap className="h-3 w-3 mr-1" />,
  pro: <Crown className="h-3 w-3 mr-1" />,
  enterprise: <Building2 className="h-3 w-3 mr-1" />,
};

const DASHBOARD_SECTION_ORDER: SectionId[] = [
  "dashboard","realtime","agenda","equipe","sprints","funil","canais",
  "integracoes","dados","relatorios","configuracoes","rede","benchmark_rede",
  "valuation","investidor","governanca","api_bi","qbr",
];
const DASHBOARD_SECTION_LABELS: Record<SectionId, string> = {
  dashboard: "Dashboard Executivo",
  realtime: "Alertas Realtime / Anomalias",
  agenda: "Agenda & No-show",
  equipe: "Equipe (granular por profissional)",
  sprints: "Sprints / Rotinas",
  funil: "Marketing & Funil",
  canais: "Canais / ROI / CAC",
  integracoes: "Integrações / Saúde da Fonte",
  dados: "Qualidade de Dados",
  relatorios: "Relatórios PDF",
  configuracoes: "Configurações",
  rede: "Rede (multi-unidade consolidada)",
  benchmark_rede: "Benchmark da Rede / Percentis",
  valuation: "Valuation & Expansão",
  investidor: "Investor View / PDF institucional",
  governanca: "Governança / RBAC / Auditoria",
  api_bi: "API Enterprise para BI Externo",
  qbr: "QBR Automático (trimestral)",
};
const PLAN_ORDER: PlanTier[] = ["essencial", "pro", "enterprise"];

type AdminProvisioningIntegrationType =
  | "kommo" | "asaas" | "crm_hubspot" | "crm_rd_station"
  | "meta_pixel" | "meta_capi" | "google_ads" | "google_ads_enhanced"
  | "gtm" | "server_side_gtm" | "google_sheets" | "power_bi";

const integrationTypeLabels: Record<AdminProvisioningIntegrationType, string> = {
  kommo: "Kommo", asaas: "Asaas", crm_hubspot: "CRM HubSpot",
  crm_rd_station: "CRM RD Station", meta_pixel: "Meta Pixel",
  meta_capi: "Meta CAPI", google_ads: "Google Ads",
  google_ads_enhanced: "Google Ads Enhanced", gtm: "Google Tag Manager",
  server_side_gtm: "Server-side GTM", google_sheets: "Google Sheets",
  power_bi: "Power BI",
};
const integrationTypeOptions = (Object.keys(integrationTypeLabels) as AdminProvisioningIntegrationType[]).map(
  (value) => ({ value, label: integrationTypeLabels[value] })
);

type NewUserIntegrationDraft = {
  type: AdminProvisioningIntegrationType;
  name: string; token: string; apiUrl: string; identifier: string;
};
const createEmptyIntegrationDraft = (): NewUserIntegrationDraft => ({
  type: "crm_rd_station", name: "", token: "", apiUrl: "", identifier: "",
});
const createInitialNewUser = () => ({
  nome: "", email: "", password: "",
  role: "user" as "user" | "admin",
  plan: "essencial" as PlanTier,
  integrations: [createEmptyIntegrationDraft()],
});

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminUsuarios() {
  const { theme } = useAdminTheme();
  const isDark = theme === "dark";

  const surfaceCard = "rounded-[20px] border border-[#dbe5f0] bg-white shadow-[0_8px_32px_rgba(148,163,184,0.10)]";

  // ── State ──────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"usuarios" | "planos" | "auditoria">("usuarios");

  // Create user dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState(createInitialNewUser);

  // Edit user dialog (combined profile + password)
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "", email: "", role: "user" as "user" | "admin",
    phone: "", photoUrl: "",
    newPwd: "", confirmPwd: "",
  });
  const [showEditPwd, setShowEditPwd] = useState(false);

  // Reset password dialog (standalone, kept for dropdown)
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: usersData, isLoading, refetch } = trpc.admin.getUsers.useQuery();
  const { data: auditLogs, isLoading: auditLoading } = trpc.admin.getAuditLogs.useQuery();

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("Permissão atualizada!"); refetch(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updatePlanMutation = trpc.admin.updateUserPlan.useMutation({
    onSuccess: () => { toast.success("Plano atualizado!"); refetch(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const createUserMutation = trpc.emailAuth.createUser.useMutation({
    onSuccess: (r: any) => {
      toast.success(r.message || "Usuário criado!");
      if (r.integrationProvisioningWarning) toast.warning(r.integrationProvisioningWarning);
      setIsCreateOpen(false);
      setNewUser(createInitialNewUser());
      refetch();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const updateUserMutation = trpc.emailAuth.updateUser.useMutation({
    onSuccess: () => { toast.success("Perfil atualizado!"); setEditUser(null); refetch(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const deleteUserMutation = trpc.emailAuth.deleteUser.useMutation({
    onSuccess: (r: any) => { toast.success(r.message || "Usuário excluído!"); refetch(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const resetPasswordMutation = trpc.emailAuth.resetPassword.useMutation({
    onSuccess: (r: any) => {
      toast.success(r.message || "Senha redefinida com sucesso!");
      setResetTarget(null);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
  const toggleStatusMutation = trpc.emailAuth.toggleUserStatus.useMutation({
    onSuccess: (r: any) => { toast.success(r.message || "Status alterado!"); refetch(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  const users = usersData ?? [];
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (u.name?.toLowerCase().includes(q) ?? false) || (u.email?.toLowerCase().includes(q) ?? false);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchPlan = planFilter === "all" || (u as any).plan === planFilter;
    return matchSearch && matchRole && matchPlan;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    active: users.filter((u) => u.isActive).length,
    essencial: users.filter((u) => (u as any).plan === "essencial").length,
    pro: users.filter((u) => (u as any).plan === "pro").length,
    enterprise: users.filter((u) => (u as any).plan === "enterprise").length,
    mfa: users.filter((u) => u.mfaEnabled).length,
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleOpenEdit = (user: any) => {
    setEditUser(user);
    setShowEditPwd(false);
    setEditForm({
      name: user.name ?? "",
      email: user.email ?? "",
      role: user.role ?? "user",
      phone: (user as any).phone ?? "",
      photoUrl: (user as any).photoUrl ?? "",
      newPwd: "",
      confirmPwd: "",
    });
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    if (editForm.newPwd && editForm.newPwd.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (editForm.newPwd && editForm.newPwd !== editForm.confirmPwd) {
      toast.error("As senhas não coincidem");
      return;
    }
    updateUserMutation.mutate({
      userId: editUser.id,
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role: editForm.role,
    });
    if (editForm.newPwd) {
      resetPasswordMutation.mutate({ userId: editUser.id, newPassword: editForm.newPwd });
    }
  };

  const handleResetPassword = () => {
    if (!resetTarget) return;
    if (newPassword.length < 6) { toast.error("Senha deve ter pelo menos 6 caracteres"); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    resetPasswordMutation.mutate({ userId: resetTarget.id, newPassword });
  };

  const handleToggleActive = (user: any) => {
    const label = user.name || user.email || `ID ${user.id}`;
    const action = user.isActive ? "desativar" : "ativar";
    if (!window.confirm(`Deseja ${action} o usuário ${label}?`)) return;
    toggleStatusMutation.mutate({ userId: user.id, isActive: !user.isActive });
  };

  const handleDeleteUser = (user: any) => {
    const label = user.name || user.email || `ID ${user.id}`;
    if (!window.confirm(`Excluir usuário ${label}?\n\nEssa ação não pode ser desfeita.`)) return;
    deleteUserMutation.mutate({ userId: user.id });
  };

  const handleAddUser = () => {
    if (!newUser.nome || !newUser.email || !newUser.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (newUser.password.length < 6) { toast.error("Senha deve ter pelo menos 6 caracteres"); return; }
    const integrations = newUser.integrations
      .map((i) => ({ type: i.type, name: i.name.trim() || undefined, token: i.token.trim() || undefined, apiUrl: i.apiUrl.trim() || undefined, identifier: i.identifier.trim() || undefined }))
      .filter((i) => i.token || i.apiUrl || i.identifier);
    createUserMutation.mutate({ name: newUser.nome, email: newUser.email, password: newUser.password, role: newUser.role, plan: newUser.plan, integrations });
  };

  const addIntegrationRow = () => setNewUser((p) => ({ ...p, integrations: [...p.integrations, createEmptyIntegrationDraft()] }));
  const removeIntegrationRow = (i: number) => setNewUser((p) => ({ ...p, integrations: p.integrations.length <= 1 ? [createEmptyIntegrationDraft()] : p.integrations.filter((_, idx) => idx !== i) }));
  const updateIntegration = <K extends keyof NewUserIntegrationDraft>(i: number, key: K, val: NewUserIntegrationDraft[K]) =>
    setNewUser((p) => ({ ...p, integrations: p.integrations.map((item, idx) => idx === i ? { ...item, [key]: val } : item) }));

  const fmtDate = (d: Date | null) => {
    if (!d) return "Nunca";
    try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR }); }
    catch { return "—"; }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <MotionPageShell className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className={cn("text-[2rem] font-bold tracking-[-0.03em]", isDark ? "text-white" : "text-[#0f172a]")}>
              Controle de Usuários
            </h1>
            <p className={cn("mt-1 text-sm", isDark ? "text-white/70" : "text-[#64748b]")}>
              Gestão de contas, planos, senhas e acessos (RBAC)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" className="h-10 rounded-xl border-[#d7e1ef] bg-white px-4 text-sm text-[#334155] shadow-sm" onClick={() => refetch()}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Atualizar
            </Button>
            <Button variant="outline" className="h-10 rounded-xl border-[#d7e1ef] bg-white px-4 text-sm text-[#334155] shadow-sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button
              className="h-10 rounded-xl px-4 text-sm bg-[#ff7a1a] hover:bg-[#e86d10] text-white shadow-[0_4px_16px_rgba(255,122,26,0.30)]"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats.total, color: "#1B96FF", icon: <Users className="h-4 w-4" /> },
            { label: "Admins", value: stats.admins, color: "#EF4444", icon: <ShieldCheck className="h-4 w-4" /> },
            { label: "Start", value: stats.essencial, color: "#10B981", icon: <Zap className="h-4 w-4" /> },
            { label: "Pro", value: stats.pro, color: "#F59E0B", icon: <Crown className="h-4 w-4" /> },
            { label: "Enterprise", value: stats.enterprise, color: "#8B5CF6", icon: <Building2 className="h-4 w-4" /> },
            { label: "Ativos", value: stats.active, color: "#10B981", icon: <UserCheck className="h-4 w-4" /> },
          ].map((s) => (
            <div key={s.label} className={cn(surfaceCard, "p-4 flex flex-col gap-1")}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">{s.label}</span>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <span className="text-2xl font-bold" style={{ color: s.color }}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : s.value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-[#eef3f8] pb-0 overflow-x-auto">
          {(["usuarios", "planos", "auditoria"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                activeTab === t
                  ? "bg-[#ff7a1a] text-white shadow-sm"
                  : "text-[#64748b] hover:text-[#334155] hover:bg-[#f8fbff]"
              )}
            >
              {{ usuarios: "Gestão de Usuários", planos: "Planos e Acessos", auditoria: "Audit Log" }[t]}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            Tab: Gestão de Usuários
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "usuarios" && (
          <Card className={cn(surfaceCard, "overflow-hidden")}>
            <CardHeader className="px-6 pt-5 pb-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-[#0f172a]">Usuários</CardTitle>
                  <CardDescription className="text-sm text-[#64748b]">
                    {filteredUsers.length} de {users.length} usuário(s)
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
                    <Input
                      placeholder="Buscar nome ou email…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 w-52 rounded-xl border-[#d7e1ef] bg-[#f8fbff] pl-9 text-sm"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-10 w-32 rounded-xl border-[#d7e1ef] bg-[#f8fbff] text-sm text-[#334155]">
                      <SelectValue placeholder="Permissão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="h-10 w-36 rounded-xl border-[#d7e1ef] bg-[#f8fbff] text-sm text-[#334155]">
                      <SelectValue placeholder="Plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Planos</SelectItem>
                      <SelectItem value="essencial">Start</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="h-10 rounded-xl bg-[#FF6900] hover:bg-[#e05e00] text-white text-sm font-medium px-4 gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Novo Usuário
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-4 pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-[#94a3b8]" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#94a3b8]">
                  {searchQuery ? "Nenhum usuário encontrado para a busca" : "Nenhum usuário cadastrado"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#dbe5f0] bg-[#f8fbff]">
                      <TableHead className="pl-6 py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Usuário</TableHead>
                      <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Plano</TableHead>
                      <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Permissão</TableHead>
                      <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Integrações</TableHead>
                      <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Status</TableHead>
                      <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Último acesso</TableHead>
                      <TableHead className="pr-6 py-3 text-right text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="border-[#eef3f8] hover:bg-[#fafcff] transition-colors">
                        {/* Avatar + name/email */}
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative group flex-shrink-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#fff1e8] to-[#ffe4cc] overflow-hidden">
                                {(user as any).photoUrl ? (
                                  <img src={(user as any).photoUrl} alt={user.name ?? ""} className="h-10 w-10 object-cover rounded-full" />
                                ) : (
                                  <span className="text-sm font-bold text-[#ff7a1a]">
                                    {((user.name || user.email || "?")[0]).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleOpenEdit(user)}
                                className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border border-[#d7e1ef] shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#f1f5f9]"
                                title="Configurações do usuário"
                              >
                                <Settings className="h-3 w-3 text-[#64748b]" />
                              </button>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[#0f172a]">{user.name || "Sem nome"}</p>
                              <p className="text-xs text-[#94a3b8]">{user.email || "—"}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Plan inline select */}
                        <TableCell className="py-4">
                          <Select
                            value={(user as any).plan || "essencial"}
                            onValueChange={(v) => updatePlanMutation.mutate({ userId: user.id, plan: v as PlanTier })}
                          >
                            <SelectTrigger className="h-8 w-32 rounded-lg border-[#d7e1ef] bg-[#f8fbff] text-xs">
                              <SelectValue>
                                <Badge variant="outline" className={cn("text-xs", planColors[(user as any).plan || "essencial"])}>
                                  {planIcons[(user as any).plan || "essencial"]}
                                  {planLabels[(user as any).plan || "essencial"]}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="essencial"><span className="flex items-center gap-2 text-emerald-600"><Zap className="h-3.5 w-3.5" />Start</span></SelectItem>
                              <SelectItem value="pro"><span className="flex items-center gap-2 text-amber-600"><Crown className="h-3.5 w-3.5" />Pro</span></SelectItem>
                              <SelectItem value="enterprise"><span className="flex items-center gap-2 text-violet-600"><Building2 className="h-3.5 w-3.5" />Enterprise</span></SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Role */}
                        <TableCell className="py-4">
                          <Badge className={cn("text-xs", roleColors[user.role] || roleColors.user)}>
                            {user.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                            {roleLabels[user.role] || user.role}
                          </Badge>
                        </TableCell>

                        {/* Integrations */}
                        <TableCell className="py-4">
                          {((user as any).integrationCount ?? 0) > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs border-cyan-200 bg-cyan-50 text-cyan-700">
                                {(user as any).integrationCount} integração(ões)
                              </Badge>
                              {((user as any).integrationTypes ?? []).slice(0, 2).map((t: string) => (
                                <Badge key={t} variant="secondary" className="text-[10px] border border-slate-200 bg-slate-50 text-slate-600">
                                  {integrationTypeLabels[t as AdminProvisioningIntegrationType] ?? t}
                                </Badge>
                              ))}
                              {((user as any).integrationTypes ?? []).length > 2 && (
                                <Badge variant="secondary" className="text-[10px] border border-slate-200 bg-slate-50 text-slate-600">
                                  +{((user as any).integrationTypes ?? []).length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#cbd5e1]">Sem API</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1">
                            {user.isActive ? (
                              <Badge variant="outline" className="text-xs border-emerald-200 bg-emerald-50 text-emerald-700 w-fit">
                                <UserCheck className="h-3 w-3 mr-1" />Ativo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-slate-200 bg-slate-50 text-slate-500 w-fit">
                                <UserX className="h-3 w-3 mr-1" />Inativo
                              </Badge>
                            )}
                            {user.mfaEnabled && (
                              <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-600 w-fit">
                                <Shield className="h-3 w-3 mr-1" />MFA
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Last access */}
                        <TableCell className="py-4 text-xs text-[#94a3b8]">
                          {fmtDate(user.lastSignedIn)}
                        </TableCell>

                        {/* Actions dropdown */}
                        <TableCell className="pr-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#334155]">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel className="text-xs text-[#94a3b8] uppercase tracking-wider">Perfil</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleOpenEdit(user)}>
                                <Settings className="h-4 w-4 mr-2 text-[#ff7a1a]" />
                                Configurações
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setResetTarget(user); setNewPassword(""); setConfirmPassword(""); }}>
                                <Lock className="h-4 w-4 mr-2 text-amber-500" />
                                Redefinir senha
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs text-[#94a3b8] uppercase tracking-wider">Plano</DropdownMenuLabel>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Crown className="h-4 w-4 mr-2 text-[#94a3b8]" />
                                  Alterar plano
                                  <ChevronDown className="h-3.5 w-3.5 ml-auto" />
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem onClick={() => updatePlanMutation.mutate({ userId: user.id, plan: "essencial" })}>
                                    <Zap className="h-4 w-4 mr-2 text-emerald-500" />Start
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updatePlanMutation.mutate({ userId: user.id, plan: "pro" })}>
                                    <Crown className="h-4 w-4 mr-2 text-amber-500" />Pro
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updatePlanMutation.mutate({ userId: user.id, plan: "enterprise" })}>
                                    <Building2 className="h-4 w-4 mr-2 text-violet-500" />Enterprise
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs text-[#94a3b8] uppercase tracking-wider">Acesso</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: user.id, role: user.role === "admin" ? "user" : "admin" })}>
                                <Key className="h-4 w-4 mr-2 text-[#94a3b8]" />
                                {user.role === "admin" ? "Remover Admin" : "Tornar Admin"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                                {user.isActive
                                  ? <><ToggleLeft className="h-4 w-4 mr-2 text-slate-400" />Desativar conta</>
                                  : <><ToggleRight className="h-4 w-4 mr-2 text-emerald-500" />Ativar conta</>}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-500 focus:text-red-500 focus:bg-red-50"
                                onClick={() => handleDeleteUser(user)}
                                disabled={deleteUserMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir usuário
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            Tab: Planos e Acessos
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "planos" && (
          <Card className={cn(surfaceCard, "overflow-hidden")}>
            <CardHeader className="px-6 pt-5 pb-4">
              <CardTitle className="text-lg font-bold text-[#0f172a]">Matriz de Acesso por Plano</CardTitle>
              <CardDescription className="text-sm text-[#64748b]">
                Funcionalidades liberadas por tier. Alterações de plano impactam diretamente os módulos visíveis no dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#dbe5f0] bg-[#f8fbff]">
                    <TableHead className="pl-6 py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Funcionalidade</TableHead>
                    <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Plano Mínimo</TableHead>
                    <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-emerald-500">Start</TableHead>
                    <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-amber-500">Pro</TableHead>
                    <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-violet-500">Enterprise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DASHBOARD_SECTION_ORDER.map((sectionId) => (
                    <TableRow key={sectionId} className="border-[#eef3f8] hover:bg-[#fafcff]">
                      <TableCell className="pl-6 py-3.5 text-sm font-medium text-[#334155]">
                        {DASHBOARD_SECTION_LABELS[sectionId]}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant="outline" className={cn("text-xs", planColors[MIN_PLAN_BY_SECTION[sectionId]])}>
                          {planIcons[MIN_PLAN_BY_SECTION[sectionId]]}
                          {planLabels[MIN_PLAN_BY_SECTION[sectionId]]}
                        </Badge>
                      </TableCell>
                      {PLAN_ORDER.map((tier) => (
                        <TableCell key={`${sectionId}-${tier}`} className="py-3.5">
                          {PLAN_ACCESS[tier].includes(sectionId) ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-slate-300" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            Tab: Audit Log
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "auditoria" && (
          <Card className={cn(surfaceCard, "overflow-hidden")}>
            <CardHeader className="px-6 pt-5 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#0f172a]">
                <History className="h-5 w-5 text-[#1B96FF]" />
                Audit Log
              </CardTitle>
              <CardDescription className="text-sm text-[#64748b]">Histórico de ações administrativas no sistema</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-4 pt-0">
              {auditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-[#94a3b8]" />
                </div>
              ) : !auditLogs || auditLogs.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#94a3b8]">Nenhum registro de auditoria</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#dbe5f0] bg-[#f8fbff]">
                      <TableHead className="pl-6 py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Admin</TableHead>
                      <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Ação</TableHead>
                      <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Entidade</TableHead>
                      <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.slice(0, 50).map((log) => (
                      <TableRow key={log.id} className="border-[#eef3f8] hover:bg-[#fafcff]">
                        <TableCell className="pl-6 py-3.5 text-sm font-medium text-[#334155]">{log.userId || "Sistema"}</TableCell>
                        <TableCell className="py-3.5">
                          <Badge variant="outline" className="text-xs font-mono border-[#dbe5f0] text-[#475569]">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 text-sm text-[#94a3b8]">
                          {log.entity}{log.entityId ? ` #${log.entityId}` : ""}
                        </TableCell>
                        <TableCell className="py-3.5 text-xs text-[#94a3b8]">
                          {log.createdAt ? fmtDate(log.createdAt) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            Dialog: Criar Usuário
        ══════════════════════════════════════════════════════════════════ */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Plus className="h-5 w-5 text-[#ff7a1a]" />
                Novo Usuário
              </DialogTitle>
              <DialogDescription>Crie uma conta com plano, permissão e integrações.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="u-nome" className="text-sm font-medium">Nome *</Label>
                  <Input id="u-nome" value={newUser.nome} onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })} placeholder="Nome completo" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-email" className="text-sm font-medium">Email *</Label>
                  <Input id="u-email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@clinica.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-password" className="text-sm font-medium">Senha *</Label>
                  <Input id="u-password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Permissão</Label>
                    <Select value={newUser.role} onValueChange={(v: "user" | "admin") => setNewUser({ ...newUser, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Plano</Label>
                    <Select value={newUser.plan} onValueChange={(v) => setNewUser({ ...newUser, plan: v as PlanTier })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="essencial"><span className="flex items-center gap-2 text-emerald-600"><Zap className="h-3.5 w-3.5" />Start</span></SelectItem>
                        <SelectItem value="pro"><span className="flex items-center gap-2 text-amber-600"><Crown className="h-3.5 w-3.5" />Pro</span></SelectItem>
                        <SelectItem value="enterprise"><span className="flex items-center gap-2 text-violet-600"><Building2 className="h-3.5 w-3.5" />Enterprise</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Integrations */}
              <div className="space-y-3 rounded-xl border border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#334155]">Integrações / API do Cliente</p>
                    <p className="text-xs text-[#94a3b8] mt-0.5">Informe API/TOKEN/ID (CRM, Meta, Google Ads, etc.)</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addIntegrationRow} className="h-8 rounded-lg text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" />Adicionar
                  </Button>
                </div>
                <div className="space-y-3">
                  {newUser.integrations.map((intg, idx) => (
                    <div key={idx} className="rounded-lg border border-border/50 p-3 space-y-2.5 bg-[#fafcff]">
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs text-[#64748b]">Tipo</Label>
                          <Select value={intg.type} onValueChange={(v) => updateIntegration(idx, "type", v as AdminProvisioningIntegrationType)}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{integrationTypeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-[#64748b]">Nome / Conta</Label>
                          <Input className="h-9 text-xs" value={intg.name} onChange={(e) => updateIntegration(idx, "name", e.target.value)} placeholder="Ex.: CRM Clínica X" />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 mt-5 text-[#94a3b8] hover:text-red-500" onClick={() => removeIntegrationRow(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-[#64748b]">API / Token</Label>
                          <Input className="h-9 text-xs" value={intg.token} onChange={(e) => updateIntegration(idx, "token", e.target.value)} placeholder="Access token, API key…" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-[#64748b]">ID / Seed</Label>
                          <Input className="h-9 text-xs" value={intg.identifier} onChange={(e) => updateIntegration(idx, "identifier", e.target.value)} placeholder="Pixel ID, customer ID…" />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-[#64748b]">URL da API (opcional)</Label>
                          <Input className="h-9 text-xs" value={intg.apiUrl} onChange={(e) => updateIntegration(idx, "apiUrl", e.target.value)} placeholder="https://api.fornecedor.com/v1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4 gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddUser} disabled={createUserMutation.isPending} className="bg-[#ff7a1a] hover:bg-[#e86d10] text-white">
                {createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════════════
            Dialog: Configurações do Usuário (perfil + senha)
        ══════════════════════════════════════════════════════════════════ */}
        <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
          <DialogContent className="sm:max-w-md max-h-[92vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Settings className="h-5 w-5 text-[#ff7a1a]" />
                Configurações do Usuário
              </DialogTitle>
              <DialogDescription>
                Edite perfil, foto e senha de{" "}
                <strong className="text-[#ff7a1a]">{editUser?.name || editUser?.email}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-5 py-2 pr-1">
              {/* Photo + URL */}
              <div className="flex items-center gap-4 rounded-xl border border-[#e8f0f7] bg-[#fafcff] p-4">
                <div className="relative flex-shrink-0">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-gradient-to-br from-[#fff1e8] to-[#ffe4cc] flex items-center justify-center">
                    {editForm.photoUrl ? (
                      <img src={editForm.photoUrl} alt="" className="h-16 w-16 object-cover rounded-full" onError={() => setEditForm({ ...editForm, photoUrl: "" })} />
                    ) : (
                      <span className="text-2xl font-bold text-[#ff7a1a]">
                        {((editUser?.name || editUser?.email || "?")[0]).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#ff7a1a] flex items-center justify-center shadow-sm">
                    <Camera className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">URL da Foto (opcional)</Label>
                  <Input
                    value={editForm.photoUrl}
                    onChange={(e) => setEditForm({ ...editForm, photoUrl: e.target.value })}
                    placeholder="https://..."
                    className="h-9 text-sm bg-white"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[#94a3b8]" />Nome
                </Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nome completo" />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  E-mail
                </Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="email@clinica.com" />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#94a3b8]" />
                  Telefone <span className="text-xs text-[#94a3b8] font-normal">(informativo)</span>
                </Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>

              {/* Password reset section */}
              <div className="rounded-xl border border-[#e8f0f7] bg-[#fafcff] p-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[#64748b]">Redefinir Senha</p>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Nova senha</Label>
                  <div className="relative">
                    <Input
                      type={showEditPwd ? "text" : "password"}
                      value={editForm.newPwd}
                      onChange={(e) => setEditForm({ ...editForm, newPwd: e.target.value })}
                      placeholder="Deixe em branco para não alterar"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPwd(!showEditPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#334155]"
                    >
                      {showEditPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {editForm.newPwd.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors",
                            editForm.newPwd.length >= n * 3
                              ? n <= 1 ? "bg-red-400" : n <= 2 ? "bg-amber-400" : n <= 3 ? "bg-yellow-400" : "bg-emerald-500"
                              : "bg-[#e2e8f0]"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Confirmar nova senha</Label>
                  <Input
                    type="password"
                    value={editForm.confirmPwd}
                    onChange={(e) => setEditForm({ ...editForm, confirmPwd: e.target.value })}
                    placeholder="Repita a senha"
                  />
                  {editForm.confirmPwd && editForm.newPwd !== editForm.confirmPwd && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" />As senhas não coincidem
                    </p>
                  )}
                  {editForm.confirmPwd && editForm.newPwd === editForm.confirmPwd && editForm.newPwd.length >= 6 && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />Senhas coincidem
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4 gap-2">
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateUserMutation.isPending || resetPasswordMutation.isPending}
                className="bg-[#ff7a1a] hover:bg-[#e86d10] text-white"
              >
                {(updateUserMutation.isPending || resetPasswordMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════════════
            Dialog: Redefinir Senha
        ══════════════════════════════════════════════════════════════════ */}
        <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Lock className="h-5 w-5 text-amber-500" />
                Redefinir Senha
              </DialogTitle>
              <DialogDescription>
                Defina uma nova senha para <strong>{resetTarget?.name || resetTarget?.email}</strong>.
                O usuário será notificado e deverá fazer login novamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Strength hint */}
              <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-100 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  A senha deve ter mínimo 6 caracteres. Recomende ao usuário trocar após o primeiro login.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Nova senha *</Label>
                <div className="relative">
                  <Input
                    type={showNewPwd ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#334155]"
                  >
                    {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password strength bar */}
                {newPassword.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors",
                            newPassword.length >= n * 3
                              ? n <= 1 ? "bg-red-400" : n <= 2 ? "bg-amber-400" : n <= 3 ? "bg-yellow-400" : "bg-emerald-500"
                              : "bg-[#e2e8f0]"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-[#94a3b8]">
                      {newPassword.length < 6 ? "Muito curta" : newPassword.length < 9 ? "Fraca" : newPassword.length < 12 ? "Média" : "Forte"}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Confirmar nova senha *</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />As senhas não coincidem
                  </p>
                )}
                {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />Senhas coincidem
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="border-t pt-4 gap-2">
              <Button variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
              <Button
                onClick={handleResetPassword}
                disabled={resetPasswordMutation.isPending || newPassword !== confirmPassword || newPassword.length < 6}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Redefinir senha
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </MotionPageShell>
    </AdminLayout>
  );
}
