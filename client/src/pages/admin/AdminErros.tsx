import AdminLayout from "@/components/AdminLayout";
import {
  AlertTriangle,
  AlertCircle,
  XCircle,
  Terminal,
  RefreshCw,
  Download,
  Filter,
  Bell,
  BellOff,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import { MotionPageShell } from "@/animation/components/MotionPageShell";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const errorRateData = {
  labels: ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
  datasets: [
    {
      label: "Erros 4xx",
      data: [12, 8, 5, 3, 15, 28, 45, 38, 52, 35, 22, 18],
      borderColor: "#eab308",
      backgroundColor: "rgba(234, 179, 8, 0.1)",
      tension: 0.4,
    },
    {
      label: "Erros 5xx",
      data: [2, 1, 0, 1, 3, 8, 12, 15, 18, 10, 5, 3],
      borderColor: "#ef4444",
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      tension: 0.4,
    },
  ],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        usePointStyle: true,
        boxWidth: 10,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: "rgba(148, 163, 184, 0.18)",
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
};

const alerts = [
  { id: 1, type: "critical", module: "API", message: "Taxa de erro 5xx acima de 10% no módulo de pagamentos", time: "5 min atrás", active: true },
  { id: 2, type: "warning", module: "Database", message: "Latência do banco de dados acima de 100ms", time: "15 min atrás", active: true },
  { id: 3, type: "warning", module: "Workers", message: "Fila de processamento com 500+ itens pendentes", time: "30 min atrás", active: false },
  { id: 4, type: "info", module: "CDN", message: "Cache invalidado para /api/v2/*", time: "1h atrás", active: false },
];

const initialLogs = [
  { timestamp: "16:37:28", level: "ERROR", module: "payment", message: "Failed to process payment for user_id=12345: Card declined" },
  { timestamp: "16:37:25", level: "WARN", module: "auth", message: "Multiple failed login attempts for email=test@example.com" },
  { timestamp: "16:37:22", level: "INFO", module: "api", message: "Request completed: POST /api/v2/appointments (200) - 145ms" },
  { timestamp: "16:37:18", level: "ERROR", module: "database", message: "Connection timeout after 30000ms - retrying..." },
  { timestamp: "16:37:15", level: "INFO", module: "worker", message: "Job completed: send_email_batch (processed: 250, failed: 2)" },
  { timestamp: "16:37:12", level: "DEBUG", module: "cache", message: "Cache miss for key: user_preferences_12345" },
  { timestamp: "16:37:08", level: "WARN", module: "api", message: "Rate limit approaching for client_id=abc123 (80/100 requests)" },
  { timestamp: "16:37:05", level: "INFO", module: "system", message: "Health check passed - all services operational" },
];

function StatCard({
  title,
  value,
  helper,
  icon,
  valueClassName,
  extra,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  valueClassName?: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card className="border-border/60 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="pr-3 text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={valueClassName ?? "text-3xl font-semibold tracking-[-0.04em] text-[#0f172a]"}>{value}</div>
        {extra}
        <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminErros() {
  const [periodo, setPeriodo] = useState("24h");
  const [logFilter, setLogFilter] = useState("all");
  const [logs, setLogs] = useState(initialLogs);
  const [isLive, setIsLive] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLive) return;

    const newLogMessages = [
      { level: "INFO", module: "api", message: "Request completed: GET /api/v2/users (200) - 45ms" },
      { level: "WARN", module: "auth", message: "Token refresh required for session_id=xyz789" },
      { level: "ERROR", module: "payment", message: "Webhook delivery failed: timeout after 5000ms" },
      { level: "DEBUG", module: "cache", message: "Cache hit for key: clinic_settings_456" },
      { level: "INFO", module: "worker", message: "Starting job: generate_monthly_report" },
    ];

    const interval = setInterval(() => {
      const randomLog = newLogMessages[Math.floor(Math.random() * newLogMessages.length)];
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      setLogs((prev) => [{ timestamp, ...randomLog }, ...prev.slice(0, 49)]);
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  const filteredLogs = logs.filter((log) => {
    if (logFilter === "all") return true;
    return log.level.toLowerCase() === logFilter;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "ERROR":
        return "text-red-500";
      case "WARN":
        return "text-yellow-500";
      case "INFO":
        return "text-blue-500";
      case "DEBUG":
        return "text-gray-500";
      default:
        return "text-white";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <MotionPageShell className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-[1.9rem] font-semibold tracking-[-0.04em] text-[#0f172a]">Identificação de Erros</h1>
            <p className="text-muted-foreground">Observabilidade e monitoramento em tempo real</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 hora</SelectItem>
                <SelectItem value="6h">6 horas</SelectItem>
                <SelectItem value="24h">24 horas</SelectItem>
                <SelectItem value="7d">7 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <StatCard
            title="Erros 4xx (24h)"
            value="287"
            helper="+12% vs ontem"
            icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
            valueClassName="text-3xl font-semibold tracking-[-0.04em] text-yellow-500"
          />
          <StatCard
            title="Erros 5xx (24h)"
            value="78"
            helper="-5% vs ontem"
            icon={<XCircle className="h-4 w-4 text-red-500" />}
            valueClassName="text-3xl font-semibold tracking-[-0.04em] text-red-500"
          />
          <StatCard
            title="Error Rate"
            value="0.8%"
            helper="Dentro do intervalo saudável"
            icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
            extra={<Badge className="mt-2 bg-green-500/15 text-green-600 hover:bg-green-500/15">Saudável</Badge>}
          />
          <StatCard
            title="Alertas Ativos"
            value={String(alerts.filter((alert) => alert.active).length)}
            helper="Requerem atenção imediata"
            icon={<Bell className="h-4 w-4 text-primary" />}
          />
        </div>

        <Card className="border-border/60 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
          <CardHeader>
            <CardTitle>Taxa de Erros (24h)</CardTitle>
            <CardDescription>Distribuição de erros 4xx e 5xx ao longo do dia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] sm:h-[340px] xl:h-[380px] 2xl:h-[420px]">
              <Line data={errorRateData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas Inteligentes
            </CardTitle>
            <CardDescription>Notificações automáticas de anomalias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-4 rounded-[22px] border p-4 ${
                  alert.active ? "border-border bg-muted/40" : "border-border/60 bg-muted/15 opacity-70"
                }`}
              >
                {getAlertIcon(alert.type)}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{alert.module}</Badge>
                    {alert.active ? <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/15">Ativo</Badge> : null}
                  </div>
                  <p className="mt-2 break-words text-sm leading-6 text-[#0f172a]">{alert.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{alert.time}</p>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0">
                  {alert.active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
          <CardHeader>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Live Logs
                </CardTitle>
                <CardDescription>Feed em tempo real dos eventos do sistema</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Select value={logFilter} onValueChange={setLogFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant={isLive ? "default" : "outline"} size="sm" onClick={() => setIsLive(!isLive)} className="w-full sm:w-auto">
                  {isLive ? (
                    <>
                      <span className="mr-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      Live
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Pausado
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] overflow-y-auto rounded-[20px] bg-[#0d1117] p-3 font-mono text-xs sm:h-[380px] sm:p-4 sm:text-sm 2xl:h-[460px]">
              {filteredLogs.map((log, index) => (
                <div key={index} className="flex flex-col gap-1 rounded-md px-2 py-2 hover:bg-white/5 sm:flex-row sm:gap-4">
                  <span className="shrink-0 text-gray-500">{log.timestamp}</span>
                  <span className={`shrink-0 sm:w-14 ${getLevelColor(log.level)}`}>[{log.level}]</span>
                  <span className="shrink-0 text-cyan-400 sm:w-20">[{log.module}]</span>
                  <span className="break-words text-gray-300">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      </MotionPageShell>
    </AdminLayout>
  );
}
