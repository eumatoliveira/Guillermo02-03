import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Code2,
  BookOpen,
  Shield,
  Zap,
  Globe,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "live" | "sandbox";
type Scope = "kpis" | "appointments" | "finance" | "nps" | "channels" | "*";

const SCOPES: { value: Scope; label: string; description: string }[] = [
  { value: "*",            label: "Todos",        description: "Acesso completo a todos os endpoints" },
  { value: "kpis",         label: "KPIs",         description: "Métricas e indicadores principais" },
  { value: "appointments", label: "Agendamentos",  description: "Dados de consultas e agendamentos" },
  { value: "finance",      label: "Financeiro",    description: "Receita, custos e margens" },
  { value: "nps",          label: "NPS",           description: "Satisfação e feedback de pacientes" },
  { value: "channels",     label: "Canais",        description: "Performance por canal de aquisição" },
];

// ─── Helper: Copy to clipboard ────────────────────────────────────────────────

function useCopyText() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };
  return { copied, copy };
}

// ─── Code examples ────────────────────────────────────────────────────────────

function buildCurlExample(key: string) {
  return `# KPIs
curl -H "Authorization: Bearer ${key}" \\
     https://app.glx.com/api/v1/kpis

# Agendamentos (paginado)
curl -H "Authorization: Bearer ${key}" \\
     "https://app.glx.com/api/v1/appointments?page=1&limit=20"

# Financeiro
curl -H "Authorization: Bearer ${key}" \\
     https://app.glx.com/api/v1/finance`;
}

function buildJsExample(key: string) {
  return `const GLX_API_KEY = "${key}";
const BASE_URL = "https://app.glx.com/api/v1";

async function fetchKPIs() {
  const res = await fetch(\`\${BASE_URL}/kpis\`, {
    headers: { Authorization: \`Bearer \${GLX_API_KEY}\` },
  });
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  const { mode, data } = await res.json();
  console.log(\`Mode: \${mode}\`, data);
  return data;
}

async function fetchAppointments(page = 1, limit = 20) {
  const res = await fetch(
    \`\${BASE_URL}/appointments?page=\${page}&limit=\${limit}\`,
    { headers: { Authorization: \`Bearer \${GLX_API_KEY}\` } }
  );
  return res.json();
}

fetchKPIs().then(console.log);`;
}

function buildPythonExample(key: string) {
  return `import httpx

GLX_API_KEY = "${key}"
BASE_URL = "https://app.glx.com/api/v1"
HEADERS = {"Authorization": f"Bearer {GLX_API_KEY}"}

# KPIs
with httpx.Client() as client:
    r = client.get(f"{BASE_URL}/kpis", headers=HEADERS)
    r.raise_for_status()
    kpis = r.json()
    print(f"Mode: {kpis['mode']}")
    print(kpis["data"])

    # Agendamentos
    appts = client.get(
        f"{BASE_URL}/appointments",
        headers=HEADERS,
        params={"page": 1, "limit": 20},
    ).json()
    print(f"Total appointments: {appts['total']}")`;
}

// ─── Create Key Modal ─────────────────────────────────────────────────────────

interface CreateKeyModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (rawKey: string, keyName: string) => void;
}

function CreateKeyModal({ open, onClose, onCreated }: CreateKeyModalProps) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("sandbox");
  const [selectedScopes, setSelectedScopes] = useState<Scope[]>(["*"]);
  const [expiresInDays, setExpiresInDays] = useState<string>("");

  const utils = trpc.useUtils();
  const createMutation = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      utils.apiKeys.list.invalidate();
      onCreated(data.rawKey, data.name);
      resetForm();
    },
  });

  const resetForm = () => {
    setName("");
    setMode("sandbox");
    setSelectedScopes(["*"]);
    setExpiresInDays("");
  };

  const toggleScope = (scope: Scope) => {
    if (scope === "*") {
      setSelectedScopes(["*"]);
      return;
    }
    setSelectedScopes(prev => {
      const without = prev.filter(s => s !== "*");
      if (without.includes(scope)) {
        const next = without.filter(s => s !== scope);
        return next.length === 0 ? ["*"] : next;
      }
      return [...without, scope];
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      mode,
      scopes: selectedScopes,
      expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm(); } }}>
      <DialogContent
        className="max-w-lg"
        style={{ fontFamily: "Inter, SF Pro, system-ui, sans-serif" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Key size={20} style={{ color: "#1B96FF" }} />
            Nova Chave de API
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Nome da chave</Label>
            <Input
              placeholder="Ex: Integração BI, Script Python..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Mode */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Modo</Label>
            <div className="flex gap-3">
              {(["sandbox", "live"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all"
                  style={{
                    borderColor: mode === m ? (m === "live" ? "#1B96FF" : "#6B7280") : "#E5E7EB",
                    background: mode === m ? (m === "live" ? "#EFF6FF" : "#F9FAFB") : "#fff",
                    color: mode === m ? (m === "live" ? "#1B96FF" : "#374151") : "#9CA3AF",
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    {m === "live" ? <Zap size={14} /> : <Shield size={14} />}
                    {m === "live" ? "Live" : "Sandbox"}
                  </div>
                  <div className="text-xs mt-0.5 font-normal" style={{ color: mode === m ? "inherit" : "#9CA3AF" }}>
                    {m === "live" ? "Dados reais" : "Dados simulados"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scopes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Escopos de acesso</Label>
            <div className="space-y-2">
              {SCOPES.map((s) => {
                const checked = selectedScopes.includes(s.value);
                return (
                  <label
                    key={s.value}
                    className="flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all"
                    style={{
                      borderColor: checked ? "#1B96FF" : "#E5E7EB",
                      background: checked ? "#EFF6FF" : "#fff",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleScope(s.value)}
                      className="mt-0.5 accent-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{s.label}</div>
                      <div className="text-xs text-gray-500">{s.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Expiry */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Expiração <span className="font-normal text-gray-400">(opcional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="90"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                className="h-9 w-28"
              />
              <span className="text-sm text-gray-500">dias — vazio = sem expiração</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createMutation.isPending}
            style={{ background: "#FF6900", border: "none" }}
            className="text-white hover:opacity-90"
          >
            {createMutation.isPending ? "Criando..." : "Criar chave"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Raw Key Display Modal ────────────────────────────────────────────────────

interface RawKeyModalProps {
  open: boolean;
  rawKey: string;
  keyName: string;
  onClose: () => void;
}

function RawKeyModal({ open, rawKey, keyName, onClose }: RawKeyModalProps) {
  const { copied, copy } = useCopyText();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-lg"
        style={{ fontFamily: "Inter, SF Pro, system-ui, sans-serif" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Check size={20} style={{ color: "#2E844A" }} />
            Chave criada: {keyName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Warning */}
          <div
            className="flex items-start gap-3 p-3.5 rounded-xl"
            style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}
          >
            <AlertTriangle size={18} style={{ color: "#FF6900", flexShrink: 0, marginTop: 1 }} />
            <div>
              <div className="text-sm font-semibold text-orange-800">Salve agora — não será exibida novamente</div>
              <div className="text-xs text-orange-700 mt-0.5">
                Esta chave é exibida uma única vez por segurança. Copie e guarde em local seguro.
              </div>
            </div>
          </div>

          {/* Key display */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Sua chave de API</Label>
            <div
              className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
            >
              <code className="flex-1 text-xs font-mono text-gray-800 break-all select-all">{rawKey}</code>
              <button
                onClick={() => copy(rawKey, "raw")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                style={{
                  background: copied === "raw" ? "#DCFCE7" : "#EFF6FF",
                  color: copied === "raw" ? "#15803D" : "#1B96FF",
                }}
              >
                {copied === "raw" ? <Check size={12} /> : <Copy size={12} />}
                {copied === "raw" ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} style={{ background: "#1B96FF", border: "none" }} className="text-white hover:opacity-90">
            Entendido, já salvei
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Code Examples Section ────────────────────────────────────────────────────

function CodeExamples({ apiKey }: { apiKey: string }) {
  const { copied, copy } = useCopyText();

  const examples = {
    curl: buildCurlExample(apiKey),
    javascript: buildJsExample(apiKey),
    python: buildPythonExample(apiKey),
  };

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "#fff", boxShadow: "0 1px 8px 0 rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Code2 size={18} style={{ color: "#1B96FF" }} />
        <h2 className="text-base font-bold text-gray-900">Exemplos de uso</h2>
      </div>

      <Tabs defaultValue="curl">
        <TabsList className="mb-4">
          <TabsTrigger value="curl">cURL</TabsTrigger>
          <TabsTrigger value="javascript">JavaScript</TabsTrigger>
          <TabsTrigger value="python">Python</TabsTrigger>
        </TabsList>

        {(["curl", "javascript", "python"] as const).map((lang) => (
          <TabsContent key={lang} value={lang}>
            <div className="relative">
              <pre
                className="rounded-xl p-4 text-xs font-mono overflow-x-auto leading-relaxed"
                style={{ background: "#0F172A", color: "#E2E8F0" }}
              >
                <code>{examples[lang]}</code>
              </pre>
              <button
                onClick={() => copy(examples[lang], lang)}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: copied === lang ? "#DCFCE7" : "rgba(255,255,255,0.12)",
                  color: copied === lang ? "#15803D" : "#CBD5E1",
                }}
              >
                {copied === lang ? <Check size={11} /> : <Copy size={11} />}
                {copied === lang ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DeveloperApiPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [rawKeyInfo, setRawKeyInfo] = useState<{ key: string; name: string } | null>(null);
  const [selectedKeyForExamples, setSelectedKeyForExamples] = useState<string | null>(null);
  const { copied, copy } = useCopyText();

  const { data: keys = [], isLoading } = trpc.apiKeys.list.useQuery();
  const utils = trpc.useUtils();

  const revokeMutation = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => utils.apiKeys.list.invalidate(),
  });

  const handleCreated = (rawKey: string, keyName: string) => {
    setCreateOpen(false);
    setRawKeyInfo({ key: rawKey, name: keyName });
    setSelectedKeyForExamples(rawKey);
  };

  const activeKeys = keys.filter(k => k.isActive);
  const exampleKey = selectedKeyForExamples ?? "glx_sandbox_YOUR_API_KEY";

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{
        background: "#F3F3F3",
        fontFamily: "Inter, SF Pro, system-ui, sans-serif",
      }}
    >
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "#EFF6FF" }}
              >
                <Globe size={18} style={{ color: "#1B96FF" }} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Developer API</h1>
            </div>
            <p className="text-sm text-gray-500 ml-11">
              Acesse os dados do seu dashboard via REST API. Modo sandbox para testes, live para produção.
            </p>
          </div>

          <Button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 font-medium text-white h-10 px-5 rounded-xl transition-opacity hover:opacity-90 flex-shrink-0"
            style={{ background: "#FF6900", border: "none" }}
          >
            <Plus size={16} />
            Criar Chave
          </Button>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Chaves ativas",    value: activeKeys.length,                         color: "#1B96FF" },
            { label: "Live",             value: activeKeys.filter(k => k.mode === "live").length,    color: "#2E844A" },
            { label: "Sandbox",          value: activeKeys.filter(k => k.mode === "sandbox").length, color: "#6B7280" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl p-5"
              style={{ background: "#fff", boxShadow: "0 1px 8px 0 rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
            >
              <div className="text-3xl font-bold" style={{ color }}>{value}</div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* ── API Keys Table ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#fff", boxShadow: "0 1px 8px 0 rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Key size={16} style={{ color: "#1B96FF" }} />
              <span className="text-sm font-bold text-gray-900">Suas chaves de API</span>
            </div>
            <span className="text-xs text-gray-400">{activeKeys.length} / 10 ativas</span>
          </div>

          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">Carregando chaves...</div>
          ) : keys.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Key size={32} className="mx-auto mb-3" style={{ color: "#D1D5DB" }} />
              <div className="text-sm font-medium text-gray-500">Nenhuma chave criada ainda</div>
              <div className="text-xs text-gray-400 mt-1">Crie sua primeira chave para começar a integrar</div>
              <Button
                onClick={() => setCreateOpen(true)}
                className="mt-4 text-white text-sm"
                style={{ background: "#FF6900", border: "none" }}
              >
                <Plus size={14} className="mr-1.5" /> Criar primeira chave
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-gray-50/50"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: key.mode === "live" ? "#EFF6FF" : "#F9FAFB" }}
                    >
                      {key.mode === "live"
                        ? <Zap size={14} style={{ color: "#1B96FF" }} />
                        : <Shield size={14} style={{ color: "#6B7280" }} />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 truncate">{key.name}</span>
                        <Badge
                          className="text-xs px-2 py-0 font-bold uppercase tracking-wide"
                          style={{
                            background: key.mode === "live" ? "#EFF6FF" : "#F3F4F6",
                            color: key.mode === "live" ? "#1B96FF" : "#6B7280",
                            border: "none",
                          }}
                        >
                          {key.mode}
                        </Badge>
                        {!key.isActive && (
                          <Badge
                            className="text-xs px-2 py-0 font-medium"
                            style={{ background: "#FEF2F2", color: "#EF4444", border: "none" }}
                          >
                            Revogada
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <code
                            className="text-xs font-mono px-2 py-0.5 rounded"
                            style={{ background: "#F8FAFC", color: "#475569" }}
                          >
                            {key.keyPrefix}...
                          </code>
                          <button
                            onClick={() => copy(key.keyPrefix, `prefix-${key.id}`)}
                            className="text-gray-300 hover:text-gray-500 transition-colors"
                          >
                            {copied === `prefix-${key.id}` ? <Check size={12} style={{ color: "#2E844A" }} /> : <Copy size={12} />}
                          </button>
                        </div>
                        <span className="text-xs text-gray-400">
                          Criada em {new Date(key.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                        {key.expiresAt && (
                          <span className="text-xs text-gray-400">
                            Expira em {new Date(key.expiresAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                      {key.scopes && key.scopes.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {key.scopes.map((s) => (
                            <span
                              key={s}
                              className="text-xs px-1.5 py-0.5 rounded font-medium"
                              style={{ background: "#F0F9FF", color: "#0369A1" }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {key.isActive && (
                    <button
                      onClick={() => revokeMutation.mutate({ id: key.id })}
                      disabled={revokeMutation.isPending}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all hover:bg-red-50 flex-shrink-0"
                      style={{ color: "#EF4444", borderColor: "#FECACA" }}
                    >
                      <Trash2 size={12} />
                      Revogar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── API Reference strip ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "#fff", boxShadow: "0 1px 8px 0 rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} style={{ color: "#1B96FF" }} />
            <span className="text-sm font-bold text-gray-900">Endpoints disponíveis</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { method: "GET", path: "/api/v1/kpis",          desc: "Métricas e KPIs",         scope: "kpis" },
              { method: "GET", path: "/api/v1/appointments",   desc: "Agendamentos (paginado)",  scope: "appointments" },
              { method: "GET", path: "/api/v1/channels",       desc: "Canais de aquisição",      scope: "channels" },
              { method: "GET", path: "/api/v1/finance",        desc: "Dados financeiros",        scope: "finance" },
              { method: "GET", path: "/api/v1/nps",            desc: "NPS e satisfação",         scope: "nps" },
              { method: "GET", path: "/api/v1/",               desc: "Info e health check",      scope: null },
            ].map(({ method, path, desc, scope }) => (
              <div
                key={path}
                className="flex items-start gap-2.5 p-2.5 rounded-xl"
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
              >
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                  style={{ background: "#DCFCE7", color: "#15803D" }}
                >
                  {method}
                </span>
                <div className="min-w-0">
                  <code className="text-xs font-mono text-gray-700 break-all">{path}</code>
                  <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                  {scope && (
                    <span
                      className="inline-block text-xs mt-0.5 px-1.5 py-0 rounded font-medium"
                      style={{ background: "#F0F9FF", color: "#0369A1" }}
                    >
                      scope: {scope}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Code Examples ── */}
        <CodeExamples apiKey={exampleKey} />

        {/* ── Auth note ── */}
        <div
          className="rounded-2xl p-4 flex items-start gap-3 text-sm"
          style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
        >
          <Shield size={16} style={{ color: "#1B96FF", flexShrink: 0, marginTop: 1 }} />
          <div className="text-blue-800">
            <span className="font-semibold">Autenticação:</span> Inclua o header{" "}
            <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-xs">Authorization: Bearer glx_...</code>{" "}
            em todas as requisições. As chaves são hash SHA-256 no servidor — a chave raw nunca é armazenada.
          </div>
        </div>

      </div>

      {/* ── Modals ── */}
      <CreateKeyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      {rawKeyInfo && (
        <RawKeyModal
          open={!!rawKeyInfo}
          rawKey={rawKeyInfo.key}
          keyName={rawKeyInfo.name}
          onClose={() => setRawKeyInfo(null)}
        />
      )}
    </div>
  );
}
