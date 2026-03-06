import { useMemo } from "react";
import { Link } from "wouter";
import { m } from "framer-motion";
import { ArrowLeft, BarChart3, Building2, Check, Layers3, Shield, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDefaultDashboardPathByRole, resolveClientDashboardRole } from "@/lib/clientDashboardRole";

type ConsultoriaPlan = {
  badge: string;
  title: string;
  summary: string;
  bullets: string[];
  indication: string;
  timeline: string;
  featured?: boolean;
};

type ControlTowerPlan = {
  title: string;
  summary: string;
  bullets: string[];
  timeline: string;
  featured?: boolean;
  icon: typeof BarChart3;
  tone: "essencial" | "pro" | "enterprise";
};

const CONSULTORIA_PLANS: ConsultoriaPlan[] = [
  {
    badge: "ENTRADA",
    title: "Start Lite",
    summary:
      "Para clinicas que precisam arrumar o basico antes de acelerar. Operacao ainda no improviso.",
    bullets: [
      "Controle de agenda e no-show",
      "Processos essenciais padronizados",
      "Dashboard minimo com KPIs criticos",
      "Gestao semanal leve (war room)",
      "Quick wins com retorno em semanas",
    ],
    indication:
      "Indicado quando a principal dor e desorganizacao operacional - buracos na agenda, no-show alto e follow-up inexistente.",
    timeline: "Setup 30-45 dias · Gestao 12 meses",
  },
  {
    badge: "MAIS CONTRATADO",
    title: "Start",
    summary:
      "Para clinicas que querem estrutura completa de base - previsibilidade e eficiencia antes de escalar.",
    bullets: [
      "Sistema operacional completo",
      "Dashboard executivo + rotina semanal",
      "Funil interno sem vazamento",
      "SOPs essenciais (agenda, vendas, follow-up)",
      "Capacidade e ocupacao otimizadas",
      "Governanca executiva mensal",
    ],
    indication:
      "Indicado quando a dor e imprevisibilidade - a clinica tem demanda, mas nao tem sistema para capturar o resultado.",
    timeline: "Setup 60 dias · Gestao 12 meses",
    featured: true,
  },
  {
    badge: "AVANCADO",
    title: "Pro",
    summary: "Para clinicas que faturam bem mas o lucro some. Agenda cheia, EBITDA baixo.",
    bullets: [
      "Tudo do Start +",
      "Mapa de margem por servico e medico",
      "Politica comercial e de desconto",
      "Precificacao e mix de servicos",
      "Estrategia de recorrencia de pacientes",
      "Automacoes avancadas e treinamento",
      "Governanca intensa (war room + board)",
    ],
    indication:
      "Indicado quando a dor e margem invisivel - existe volume, mas o lucro nao aparece no extrato.",
    timeline: "Setup 60-90 dias · Gestao 12 meses",
  },
];

const CONTROL_TOWER_PLANS: ControlTowerPlan[] = [
  {
    title: "Essencial",
    summary:
      "Para clinicas em estruturacao que precisam de visibilidade clara para tomar as primeiras decisoes por dados.",
    bullets: [
      "Dashboard executivo com 4 modulos",
      "Alertas automaticos P1/P2/P3",
      "Agenda, financeiro, marketing e operacao",
      "Benchmark setorial por especialidade",
      "Exportacao PDF executivo mensal",
      "Onboarding em 15 dias",
    ],
    timeline: "Setup 15 dias · Suporte 12 meses",
    icon: BarChart3,
    tone: "essencial",
  },
  {
    title: "Pro",
    summary: "Para clinicas que querem granularidade por profissional, servico e canal.",
    bullets: [
      "Tudo do Essencial +",
      "Drill-down por medico e procedimento",
      "Simuladores: break-even, overbooking, mix",
      "Forecast de receita com IA (P10/P50/P90)",
      "Waterfall de variacao de receita",
      "Deteccao de anomalias por ML",
      "Integracao bidirecional com CRM",
    ],
    timeline: "Setup 15 dias · Suporte 12 meses",
    featured: true,
    icon: Shield,
    tone: "pro",
  },
  {
    title: "Enterprise",
    summary:
      "Para grupos, redes e empresas se preparando para captacao, fusao ou M&A.",
    bullets: [
      "Pro em cada unidade +",
      "Consolidacao multi-unidade",
      "Valuation automatico mensal",
      "Simulador de aquisicao (M&A Engine)",
      "RBAC com 8 perfis de acesso",
      "API para Power BI / Tableau",
      "Dashboard para Investidores incluso",
    ],
    timeline: "Setup 15 dias · Suporte 12 meses",
    icon: Building2,
    tone: "enterprise",
  },
];

function openCalendly() {
  window.open("https://wa.me/5511970837585", "_blank", "noopener,noreferrer");
}

function toneClasses(tone: ControlTowerPlan["tone"], featured?: boolean) {
  if (tone === "pro") {
    return {
      card: "border-orange-400/40 bg-gradient-to-b from-orange-500/12 to-white/[0.02]",
      icon: "bg-orange-500/12 text-orange-300 border-orange-400/25",
      accent: "text-orange-300",
      button: "bg-orange-500 hover:bg-orange-400 text-white",
      ring: featured ? "ring-1 ring-orange-400/35" : "",
    };
  }

  if (tone === "enterprise") {
    return {
      card: "border-cyan-300/20 bg-gradient-to-b from-cyan-400/8 to-white/[0.02]",
      icon: "bg-cyan-300/10 text-cyan-200 border-cyan-300/20",
      accent: "text-cyan-200",
      button: "bg-white/10 hover:bg-white/15 text-white",
      ring: "",
    };
  }

  return {
    card: "border-white/10 bg-white/[0.02]",
    icon: "bg-white/5 text-white/80 border-white/10",
    accent: "text-white/70",
    button: "bg-white/10 hover:bg-white/15 text-white",
    ring: "",
  };
}

export default function Plans() {
  const { user } = useAuth();
  const dashboardHref = user ? getDefaultDashboardPathByRole(resolveClientDashboardRole(user as any)) : "/";
  const backButtonLabel = user ? "Voltar ao Dashboard do Cliente" : "Voltar ao Site";

  const phaseSteps = useMemo(
    () => ["1 SPRINT DIAGNOSTICA", "2 SETUP", "3 GESTAO CONTINUA"],
    [],
  );

  return (
    <div className="min-h-screen bg-[#070708] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#070708]/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4 md:h-20">
          <a href="/#home" className="flex items-center gap-2">
            <img src="/images/logo-transparent.png" alt="GLX Partners" className="h-12 w-auto md:h-20" />
          </a>

          <Link href={dashboardHref}>
            <m.div whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }}>
              <Button
                variant="ghost"
                className="group relative rounded-full border border-orange-500/30 bg-orange-500/5 px-4 text-white hover:bg-orange-500/10 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                  {backButtonLabel}
                </span>
              </Button>
            </m.div>
          </Link>
        </div>
      </header>

      <main className="px-4 pb-20 pt-28 md:pt-36">
        <section className="container">
          <m.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-10"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(249,115,22,0.14),transparent_45%),radial-gradient(circle_at_88%_12%,rgba(34,211,238,0.08),transparent_42%)]" />
            <div className="relative z-10 max-w-5xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300/90">
                GLX Partners - Portfolio & Planos
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
                O sistema certo para onde sua
                <br />
                clinica esta agora.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg">
                Cada clinica chega com um estagio diferente de maturidade. A GLX nao forca um modelo unico - escolhemos
                juntos o caminho com maior ROI para o seu momento.
              </p>
              <p className="mt-5 text-lg font-medium tracking-tight text-white/85 md:text-xl">
                Growth. Lean. Execution.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/45">
                Versao 2026 | Uso interno e comercial
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {phaseSteps.map((step) => (
                  <span
                    key={step}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75"
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </m.div>
        </section>

        <section className="container mt-14 border-t border-white/10 pt-14">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300/90">
              GLX Partners - Consultoria
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
              Tres profundidades. Um unico objetivo: lucro previsivel.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/70 md:text-lg">
              A Sprint Diagnostica define qual plano faz mais sentido. Voce nunca compra no escuro - compra com business
              case na mao.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {CONSULTORIA_PLANS.map((plan, index) => (
              <m.div
                key={plan.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border p-6 md:p-7",
                  plan.featured
                    ? "border-orange-400/35 bg-gradient-to-b from-orange-500/10 to-white/[0.02] shadow-[0_10px_30px_rgba(249,115,22,0.08)]"
                    : "border-white/10 bg-white/[0.02]",
                )}
              >
                {plan.featured ? (
                  <div className="absolute -top-3 left-6 rounded-full border border-orange-300/30 bg-orange-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-200">
                    ★ MAIS CONTRATADO
                  </div>
                ) : null}

                <div className="mb-4">
                  <p className={cn("text-[11px] font-semibold uppercase tracking-[0.2em]", plan.featured ? "text-orange-200" : "text-white/55")}>
                    {plan.badge}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight">{plan.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">{plan.summary}</p>
                </div>

                <ul className="space-y-2.5">
                  {plan.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-sm text-white/80">
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", plan.featured ? "text-orange-300" : "text-white/50")} />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/50">Indicado quando</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{plan.indication}</p>
                </div>

                <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                  {plan.timeline}
                </div>
              </m.div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm leading-relaxed text-white/70">
              * A Sprint Diagnostica e a porta de entrada de todos os planos. Em 10-15 dias entregamos o baseline,
              o mapa de vazamentos e o business case com ROI projetado. O valor da Sprint e 100% creditado no Setup
              se voce decidir seguir em ate 10 dias apos a devolutiva.
            </p>
          </div>
        </section>

        <section id="control-tower-product" className="container mt-16 scroll-mt-28 border-t border-white/10 pt-14">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300/90">
              GLX Control Tower - Produto
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
              O painel que todo CEO de clinica privada deveria ter na segunda-feira de manha.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/70 md:text-lg">
              Nao e um relatorio. E um sistema de decisao com dados atualizados - com alertas automaticos, forecast de
              receita e mapa de margem. Disponivel separado da consultoria ou integrado ao seu plano.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {CONTROL_TOWER_PLANS.map((plan, index) => {
              const Icon = plan.icon;
              const tone = toneClasses(plan.tone, plan.featured);
              return (
                <m.div
                  key={plan.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.45, delay: index * 0.07, ease: "easeOut" }}
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border p-6 md:p-7",
                    tone.card,
                    tone.ring,
                  )}
                >
                  {plan.featured ? (
                    <div className="absolute -top-3 left-6 rounded-full border border-orange-300/30 bg-orange-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-200">
                      RECOMENDADO
                    </div>
                  ) : null}

                  <div className={cn("mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border", tone.icon)}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight">{plan.title}</h3>
                  <p className={cn("mt-2 text-sm font-semibold uppercase tracking-[0.14em]", tone.accent)}>
                    {plan.timeline}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-white/70">{plan.summary}</p>

                  <ul className="mt-5 space-y-2.5">
                    {plan.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2.5 text-sm text-white/80">
                        <Check className={cn("mt-0.5 h-4 w-4 shrink-0", plan.featured ? "text-orange-300" : "text-white/50")} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6">
                    <Button
                      onClick={openCalendly}
                      className={cn("w-full rounded-full font-semibold uppercase tracking-[0.14em]", tone.button)}
                    >
                      Falar com especialista
                    </Button>
                  </div>
                </m.div>
              );
            })}
          </div>
        </section>

        <section className="container mt-16">
          <m.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-10"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(249,115,22,0.14),transparent_44%),radial-gradient(circle_at_88%_82%,rgba(34,211,238,0.06),transparent_40%)]" />
            <div className="relative z-10 mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-orange-400/25 bg-orange-500/10 text-orange-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-lg leading-relaxed text-white/85">
                Nao sabe qual plano faz mais sentido para o momento da sua clinica?
              </p>
              <p className="mt-2 text-base leading-relaxed text-white/65 md:text-lg">
                A Sprint Diagnostica responde essa pergunta com dados - nao com suposicao.
              </p>

              <div className="mt-7">
                <Button
                  onClick={openCalendly}
                  className="h-auto rounded-full bg-orange-500 px-8 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white hover:bg-orange-400 md:px-10"
                >
                  Agendar Sprint Diagnostica
                </Button>
                <p className="mt-3 text-xs uppercase tracking-[0.15em] text-white/50 md:text-sm">
                  30 minutos. Com dados do seu mercado e do seu perfil de clinica.
                </p>
              </div>
            </div>
          </m.div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8">
        <div className="container text-center text-sm text-white/45">
          GLX Partners | glxpartners.io | Growth. Lean. Execution.
        </div>
      </footer>
    </div>
  );
}
