import { useRef, useState } from "react";
import { m, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlowPulse } from "@/animation/components/GlowPulse";
import SplitText from "@/animation/components/SplitText";
import BlurText from "@/animation/components/BlurText";
import { cn } from "@/lib/utils";
import { useMotionCapabilities } from "@/animation/hooks/useMotionCapabilities";

export default function HowSection() {
  const { language } = useLanguage();
  const stepsContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const motionCaps = useMotionCapabilities();
  const reducedMotion = motionCaps.prefersReducedMotion || motionCaps.motionLevel === "off";

  const content = {
    pt: {
      badge: "Como Fazemos",
      title1: "Nosso Método",
      title2: "GLX",
      cta: "AGENDAR SPRINT DIAGNÓSTICA",
      dashboard: {
        subtitle: "Painel Executivo",
        live: "Ao vivo",
        revenue: "Receita",
        noShow: "No-show",
        conversion: "Conversão",
        revenueVsCost: "Faturamento x Custo",
        realtimeFlow: "Fluxo em Tempo Real",
      },
      steps: [
        {
          step: "01",
          title: "Diagnóstico Baseado em Dados",
          desc: "Auditamos a operação de ponta a ponta para revelar os vazamentos de margem e os gargalos que travam o crescimento.",
        },
        {
          step: "02",
          title: "Setup e Implementação",
          desc: "Instalamos processos, dashboards e automações para a operação rodar com previsibilidade. Aplicamos IA para capturar dados, gerar alertas e recomendar ações — reduzindo retrabalho e acelerando decisões.",
        },
        {
          step: "03",
          title: "Execução & Sprints",
          desc: "Cadência semanal de gestão com metas claras, responsáveis definidos e correção de rota orientada a dados. Prioridades da semana, decisões rápidas e tracking do impacto em receita, capacidade e margem.",
        },
        {
          step: "04",
          title: "Gestão Contínua / Partners",
          desc: "Acompanhamento recorrente para sustentar performance, proteger margem e escalar com previsibilidade — trimestre após trimestre. Governança de indicadores, prioridades e alocação de capacidade para manter o time no eixo e o resultado em alta performance.",
        },
      ],
    },
    en: {
      badge: "How We Do It",
      title1: "Our Method",
      title2: "GLX",
      cta: "Request a Diagnostic Sprint",
      dashboard: {
        subtitle: "Executive Dashboard",
        live: "Live",
        revenue: "Revenue",
        noShow: "No-show",
        conversion: "Conversion",
        revenueVsCost: "Revenue vs Cost",
        realtimeFlow: "Real-Time Flow",
      },
      steps: [
        {
          step: "01",
          title: "Data-Based Diagnosis",
          desc: "We audit the operation end to end to uncover margin leakage and the bottlenecks that block growth.",
        },
        {
          step: "02",
          title: "Setup & Implementation",
          desc: "We install processes, dashboards, and automations so the operation runs with predictability. We apply AI to capture data, trigger alerts, and recommend actions—reducing rework and accelerating decisions.",
        },
        {
          step: "03",
          title: "Execution & Sprints",
          desc: "Weekly management cadence with clear targets, defined owners, and data-driven course correction. Weekly priorities, fast decisions, and tracking of impact on revenue, capacity, and margin.",
        },
        {
          step: "04",
          title: "Management / Partnership",
          desc: "Ongoing support to sustain performance, protect margin, and scale with predictability—quarter after quarter. Governance of KPIs, priorities, and capacity allocation to keep the team aligned and results at high performance.",
        },
      ],
    },
    es: {
      badge: "Cómo Lo Hacemos",
      title1: "Nuestro Método",
      title2: "GLX",
      cta: "AGENDAR SPRINT DIAGNÓSTICA",
      dashboard: {
        subtitle: "Panel Ejecutivo",
        live: "En vivo",
        revenue: "Ingresos",
        noShow: "No-show",
        conversion: "Conversión",
        revenueVsCost: "Ingresos vs Costo",
        realtimeFlow: "Flujo en Tiempo Real",
      },
      steps: [
        {
          step: "01",
          title: "Diagnóstico basado en datos",
          desc: "Auditamos la operación de punta a punta para revelar fugas de margen y los cuellos de botella que frenan el crecimiento.",
        },
        {
          step: "02",
          title: "Setup & Implementación",
          desc: "Instalamos procesos, dashboards y automatizaciones para que la operación funcione con previsibilidad. Aplicamos IA para capturar datos, generar alertas y recomendar acciones — reduciendo retrabajo y acelerando decisiones.",
        },
        {
          step: "03",
          title: "Ejecución & Sprints",
          desc: "Cadencia semanal de gestión con metas claras, responsables definidos y corrección de ruta basada en datos. Prioridades de la semana, decisiones rápidas y seguimiento del impacto en ingresos, capacidad y margen.",
        },
        {
          step: "04",
          title: "Gestión Continua / Partnership",
          desc: "Acompañamiento recurrente para sostener performance, proteger margen y escalar con previsibilidad—trimestre tras trimestre. Gobernanza de KPIs, prioridades y asignación de capacidad para mantener al equipo alineado y el resultado en alta performance.",
        },
      ],
    },
  };

  const t = content[language];

  const { scrollYProgress } = useScroll({
    target: stepsContainerRef,
    offset: ["start 78%", "end 20%"],
  });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 160, damping: 28, mass: 0.5 });
  const timelineFillScaleY = useTransform(smoothProgress, [0, 1], [0, 1]);
  const timelineGlowOpacity = useTransform(smoothProgress, [0, 0.12, 1], [0, 0.35, 0.85]);

  useMotionValueEvent(smoothProgress, "change", (value) => {
    const normalized = Math.max(0, Math.min(1, value));
    const nextStep = Math.min(t.steps.length - 1, Math.floor(normalized * t.steps.length));
    setActiveStep((current) => (current === nextStep ? current : nextStep));
  });

  return (
    <section id="how" className="py-24 bg-[#0A0A0B] relative overflow-hidden border-t border-white/5">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute right-0 top-1/2 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[150px] -translate-y-1/2" />
      </div>

      <div className="container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div>
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="glx-pill-shell mb-6 inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1"
          >
            <SplitText
              text={t.badge}
              tag="h2"
              splitType="words"
              className="glx-pill-text"
              delay={18}
              duration={0.35}
              threshold={0.2}
              rootMargin="-80px"
              from={{ opacity: 0, transform: "translateY(5px)" }}
              to={{ opacity: 1, transform: "translateY(0px)" }}
            />
          </m.div>

            <m.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.1, type: "spring", stiffness: 100, damping: 20 }}
              className="text-4xl md:text-5xl lg:text-5xl font-extrabold mb-10 leading-[1.1] tracking-tight"
            >
              <SplitText
                text={t.title1}
                tag="span"
                splitType="chars"
                className="inline-block text-gray-400 font-light"
                delay={14}
                duration={0.36}
                threshold={0.12}
                rootMargin="-80px"
                from={{ opacity: 0, transform: "translateY(12px)" }}
                to={{ opacity: 1, transform: "translateY(0px)" }}
              />{" "}
              <m.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.12, duration: 0.01 }}
              >
                <SplitText
                  text={t.title2}
                  tag="span"
                  splitType="chars"
                  className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60"
                  delay={12}
                  duration={0.38}
                  threshold={0.12}
                  rootMargin="-80px"
                  from={{ opacity: 0, transform: "translateY(12px)" }}
                  to={{ opacity: 1, transform: "translateY(0px)" }}
                />
              </m.span>
            </m.h3>

            <div ref={stepsContainerRef} className="space-y-4 relative">
              <div className="absolute left-6 lg:left-8 top-10 bottom-10 hidden sm:block">
                <div className="absolute inset-0 w-[1px] bg-white/10" />
                <m.div
                  aria-hidden="true"
                  className="absolute top-0 left-0 h-full w-[1px] origin-top bg-gradient-to-b from-orange-400 via-orange-500 to-orange-500/30"
                  style={{ scaleY: timelineFillScaleY }}
                />
                <m.div
                  aria-hidden="true"
                  className="absolute top-0 left-0 h-full w-[3px] -translate-x-[1px] origin-top bg-gradient-to-b from-orange-400/70 via-orange-500/50 to-transparent blur-[2px]"
                  style={{ scaleY: timelineFillScaleY, opacity: timelineGlowOpacity }}
                />
              </div>

              {t.steps.map((item, index) => {
                const isActive = index <= activeStep;

                return (
                  <m.div
                    key={index}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: index * 0.15, type: "spring", stiffness: 100, damping: 20 }}
                    className={cn(
                      "flex gap-6 sm:gap-8 group relative p-6 rounded-2xl border transition-all duration-500",
                      isActive
                        ? "bg-[#111113] border-orange-500/45 shadow-[0_0_30px_rgba(249,115,22,0.08)]"
                        : "bg-[#111113]/50 border-white/5 hover:border-orange-500/30 hover:bg-[#111113]",
                    )}
                  >
                    <div
                      className={cn(
                        "relative z-10 flex-shrink-0 w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-[#0A0A0B] border flex items-center justify-center text-xl lg:text-2xl font-bold shadow-lg transition-all duration-500 font-mono",
                        isActive
                          ? "text-orange-400 border-orange-500/60 shadow-[0_0_26px_rgba(249,115,22,0.24)]"
                          : "text-gray-500 border-white/10 group-hover:text-orange-500 group-hover:border-orange-500/50",
                      )}
                    >
                      {item.step}
                    </div>
                    <div className="pt-2 lg:pt-3 flex flex-col justify-center">
                      <h4
                        className={cn(
                          "text-xl font-bold mb-2 transition-all",
                          isActive
                            ? "text-white"
                            : "text-white/60 group-hover:text-white/80",
                        )}
                      >
                        <SplitText
                          text={item.title}
                          tag="span"
                          splitType="words"
                          className="block"
                          delay={18}
                          duration={0.4}
                          threshold={0.2}
                          rootMargin="-50px"
                          from={{ opacity: 0, transform: "translateY(8px)" }}
                          to={{ opacity: 1, transform: "translateY(0px)" }}
                        />
                      </h4>
                      <BlurText
                        as="p"
                        text={item.desc}
                        className={cn("font-light leading-relaxed text-sm md:text-base", isActive ? "text-gray-300" : "text-gray-400")}
                        animateBy="words"
                        direction="bottom"
                        delay={14}
                        threshold={0.16}
                        rootMargin="-40px"
                        stepDuration={0.18}
                      />
                    </div>
                  </m.div>
                );
              })}
            </div>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, type: "spring", stiffness: 100, damping: 20 }}
              className="mt-12"
            >
              <GlowPulse intensity="medium">
                <Button
                  size="lg"
                  className="group relative bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-widest h-14 px-10 text-sm transition-all duration-300 w-full sm:w-auto overflow-hidden"
                  onClick={() => window.open("https://wa.me/5511970837585", "_blank")}
                >
                  <span className="relative z-10">
                    <SplitText
                      text={t.cta}
                      tag="span"
                      splitType="words"
                      className="inline-block"
                      delay={14}
                      duration={0.28}
                      threshold={0.2}
                      rootMargin="-60px"
                      from={{ opacity: 0, transform: "translateY(4px)" }}
                      to={{ opacity: 1, transform: "translateY(0px)" }}
                    />
                  </span>
                  <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                </Button>
              </GlowPulse>
            </m.div>
          </div>

          <m.div
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
            whileInView={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block [perspective:1000px]"
          >
            <div className="relative z-10 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(160deg,#0b111d_0%,#0a0f1a_45%,#111727_100%)] p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold tracking-tight text-white">GLX Control Tower</h4>
                  <p className="text-sm text-white/55">{t.dashboard.subtitle}</p>
                </div>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-cyan-200">
                  {t.dashboard.live}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/45">{t.dashboard.revenue}</div>
                  <div className="mt-1 text-lg font-bold text-cyan-300">R$ 2.4M</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/45">{t.dashboard.noShow}</div>
                  <div className="mt-1 text-lg font-bold text-orange-300">18.3%</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-white/45">{t.dashboard.conversion}</div>
                  <div className="mt-1 text-lg font-bold text-emerald-300">81.7%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="group/table rounded-lg border border-white/10 bg-black/20 p-3 transition-colors duration-250 hover:border-cyan-300/45 hover:bg-cyan-400/[0.06]">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-0 w-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent border-b-cyan-300/80 transition-colors group-hover/table:border-b-cyan-200" />
                    <div className="text-xs uppercase tracking-[0.12em] text-white/60">{t.dashboard.revenueVsCost}</div>
                  </div>
                  <div className="flex h-28 items-end gap-2">
                    {[36, 55, 48, 68, 74].map((h, i) => (
                      <div
                        key={i}
                        className="w-5 rounded-t bg-gradient-to-t from-cyan-500/55 to-cyan-300/80 opacity-75 transition-opacity group-hover/table:opacity-100"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="group/table rounded-lg border border-white/10 bg-black/20 p-3 transition-colors duration-250 hover:border-emerald-300/45 hover:bg-emerald-400/[0.06]">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-0 w-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent border-b-emerald-300/80 transition-colors group-hover/table:border-b-emerald-200" />
                    <div className="text-xs uppercase tracking-[0.12em] text-white/60">{t.dashboard.realtimeFlow}</div>
                  </div>
                  <svg viewBox="0 0 210 110" className="h-28 w-full">
                    <path d="M8 78 L42 66 L74 50 L108 44 L142 58 L176 70 L202 62" fill="none" stroke="rgba(52,211,153,0.9)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  );
}
