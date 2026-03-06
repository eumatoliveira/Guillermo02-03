import { useRef, useState, useEffect, useCallback } from "react";
import { m, type Variants, useTransform, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMotionCapabilities } from "@/animation/hooks/useMotionCapabilities";
import { useParallaxScene } from "@/animation/hooks/useParallaxScene";
import { shouldEnableParallax } from "@/animation/utils/perfGuards";

/** Animated counter that counts from 0 to target when visible */
function AnimatedCounter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayed, setDisplayed] = useState(value);

  const animate = useCallback(() => {
    // Parse prefix (+, -, etc), number, and suffix (x, d, %, etc)
    const match = value.match(/^([+\-]?)(\d+(?:\.\d+)?)(.*)$/);
    if (!match) {
      setDisplayed(value);
      return;
    }

    const prefix = match[1];
    const target = parseFloat(match[2]);
    const suffix = match[3];
    const hasDecimal = match[2].includes(".");
    const duration = 1800; // ms
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = eased * target;

      if (hasDecimal) {
        setDisplayed(`${prefix}${current.toFixed(1)}${suffix}`);
      } else {
        setDisplayed(`${prefix}${Math.round(current)}${suffix}`);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [value]);

  useEffect(() => {
    if (isInView) {
      animate();
    }
  }, [isInView, animate]);

  return <span ref={ref}>{displayed}</span>;
}

type StatItem = Readonly<{ value: string; label: string }>;

interface HeroCopy {
  readonly problemLines: readonly string[];
  readonly body: string;
  readonly ctaNote: string;
  readonly stats: readonly StatItem[];
}

const HERO_COPY = {
  pt: {
    problemLines: ["Sua clínica fatura bem.", "O lucro some.", "A gente sabe onde."],
    body: "Instalamos o sistema que transforma a operação da sua clínica em lucro previsível — com dados reais, processos que funcionam e execução que não depende de você estar presente.",
    ctaNote: "→ 30 min. Sem compromisso. Com dados do seu mercado.",
    stats: [
      { value: "3x", label: "ROI médio em 12 meses" },
      { value: "-40%", label: "No-show médio" },
      { value: "+35%", label: "Eficiência operacional" },
      { value: "30d", label: "Para os primeiros resultados" },
    ],
  },
  en: {
    problemLines: ["Your clinic generates strong revenue.", "Profit disappears.", "We know exactly where."],
    body: "We install the operating system that turns your clinic’s operation into predictable profit—using real data, working processes, and execution that doesn’t depend on you being present.",
    ctaNote: "→ 30 min. No commitment. Powered by real data from your market.",
    stats: [
      { value: "3x", label: "Average ROI in 12 months" },
      { value: "-40%", label: "Average no-show" },
      { value: "+35%", label: "Operational efficiency" },
      { value: "30d", label: "First results" },
    ],
  },
  es: {
    problemLines: ["Tu clínica factura bien.", "El lucro se evapora.", "Sabemos exactamente dónde."],
    body: "Instalamos el sistema que convierte la operación de tu clínica en lucro predecible — con datos reales, procesos que funcionan y una ejecución que no depende de tu presencia constante.",
    ctaNote: "→ 30 min. Sin compromiso. Basado em dados reales de tu mercado.",
    stats: [
      { value: "3x", label: "ROI medio en 12 meses" },
      { value: "-40%", label: "No-show medio" },
      { value: "+35%", label: "Eficiencia operativa" },
      { value: "30d", label: "Primeros resultados" },
    ],
  },
} as const satisfies Record<string, HeroCopy>;

const CALENDLY_URL = "https://wa.me/5511970837585";

function openCalendly() {
  window.open(CALENDLY_URL, "_blank", "noopener,noreferrer");
}

function scrollToPortfolio() {
  document.getElementById("portfolio")?.scrollIntoView({ behavior: "smooth" });
}

export default function Hero() {
  const { t, language } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const capabilities = useMotionCapabilities();
  const reducedMotion = capabilities.prefersReducedMotion || capabilities.motionLevel === "off";
  const parallaxEnabled = shouldEnableParallax(capabilities);

  const { ySoft, yDeep, xSoft, smoothProgress } = useParallaxScene({
    target: sectionRef,
    offset: ["start start", "end start"],
    motionLevel: capabilities.motionLevel,
    enabled: parallaxEnabled,
  });

  const videoBlur = useTransform(
    smoothProgress,
    [0, 0.45, 1],
    reducedMotion ? ["blur(0px)", "blur(0px)", "blur(0px)"] : ["blur(0px)", "blur(5px)", "blur(11px)"],
  );
  const videoScale = useTransform(smoothProgress, [0, 1], [1, reducedMotion ? 1 : 1.04]);
  const videoOpacity = useTransform(smoothProgress, [0, 0.75, 1], [0.55, 0.45, 0.35]);

  const heroContainerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const lineVariants: Variants = {
    hidden: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  const heroCopy = HERO_COPY[language];

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden bg-[#050608] pb-16 pt-24 md:pb-20 md:pt-36"
    >
      {/* ── Video Background ── */}
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ y: ySoft }}
      >
        <m.video
          className="h-full w-full object-cover object-center"
          src="/videos/3205624-hd_1920_1080_25fps.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          style={{ filter: videoBlur, scale: videoScale, opacity: videoOpacity }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/50" />
      </m.div>

      {/* ── Gradient Overlay ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(75% 95% at 14% 28%, rgba(230,126,34,0.18) 0%, rgba(230,126,34,0.06) 30%, transparent 58%), radial-gradient(70% 90% at 86% 34%, rgba(34,211,238,0.14) 0%, rgba(34,211,238,0.04) 34%, transparent 60%), linear-gradient(180deg, rgba(5,6,8,0.55) 0%, rgba(5,6,8,0.75) 100%)",
        }}
      />

      {/* ── Ambient Glow Orbs ── */}
      <m.div
        aria-hidden="true"
        style={{ y: ySoft }}
        className="pointer-events-none absolute inset-0 opacity-85"
      >
        <div className="absolute left-[-6%] top-[8%] h-[34rem] w-[34rem] rounded-full bg-orange-500/12 blur-[140px]" />
        <div className="absolute right-[-8%] top-[18%] h-[28rem] w-[28rem] rounded-full bg-cyan-400/10 blur-[140px]" />
        <div className="absolute left-[18%] top-[22%] h-56 w-56 rounded-full bg-white/5 blur-[100px]" />
      </m.div>

      {/* ── Noise + Foreground Glow ── */}
      <m.div
        aria-hidden="true"
        style={{ y: yDeep, x: xSoft }}
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.02)_0%,transparent_40%,rgba(255,255,255,0.02)_72%,transparent_100%)]" />
        <div className="absolute left-[22%] top-[21%] h-52 w-[42rem] max-w-[70vw] rounded-full bg-orange-400/8 blur-[100px]" />
      </m.div>

      {/* ── Bottom Fade ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-black/30 to-[#0A0A0B]"
      />

      {/* ── Content ── */}
      <div className="container relative z-10">
        <div className="grid items-center gap-10">
          <m.div
            variants={heroContainerVariants}
            initial="hidden"
            animate="visible"
            className="relative max-w-3xl"
          >
            {/* Badge */}
            <m.div
              variants={fadeUp}
              className="glx-pill-shell mb-7 inline-flex items-center gap-3 rounded-full border px-5 py-2.5 backdrop-blur-md"
            >
              <span className="glx-pill-line h-[1px] w-8" />
              <span className="glx-pill-text">
                {language === "en" ? "Healthcare Performance Consulting" : t.hero.badge}
              </span>
            </m.div>

            {/* Title Lines */}
            <div className="relative">
              <div className="pointer-events-none absolute -left-6 top-10 h-32 w-32 rounded-full bg-orange-500/12 blur-[60px]" />
              <m.div
                variants={heroContainerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-1"
              >
                {[t.hero.title1, t.hero.title2, t.hero.title3].map((line, i) => (
                  <m.h1
                    key={i}
                    variants={lineVariants}
                    className="text-[2.05rem] font-extrabold leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl lg:text-[5.4rem]"
                  >
                    {line}
                  </m.h1>
                ))}
              </m.div>
            </div>

            {/* Problem Lines + Body */}
            <m.div variants={fadeUp} className="mt-9 max-w-3xl space-y-5">
              <div className="space-y-1.5 text-[1.35rem] font-medium leading-tight text-white/90 sm:text-[1.75rem] lg:text-[2.44rem]">
                {heroCopy.problemLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <p className="max-w-2xl text-base leading-relaxed text-gray-300/80 md:text-[1.06rem]">
                {heroCopy.body}
              </p>
            </m.div>

            {/* CTA Buttons */}
            <m.div variants={fadeUp} className="mt-10 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
              <m.div
                whileHover={reducedMotion ? undefined : { y: -3 }}
                whileTap={reducedMotion ? undefined : { scale: 0.995 }}
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  className="h-[3.4rem] w-full rounded-xl border border-orange-400/20 bg-orange-500 px-6 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_8px_24px_rgba(230,126,34,0.24)] transition-all duration-250 hover:bg-orange-500/90 hover:shadow-[0_14px_34px_rgba(230,126,34,0.30),0_0_0_1px_rgba(255,255,255,0.06)_inset] sm:w-auto sm:px-9 sm:tracking-[0.18em]"
                  onClick={openCalendly}
                >
                  {t.hero.cta}
                </Button>
              </m.div>

              <m.div
                whileHover={reducedMotion ? undefined : { y: -3 }}
                whileTap={reducedMotion ? undefined : { scale: 0.995 }}
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full sm:w-auto"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="h-[3.4rem] w-full rounded-xl border-white/12 bg-white/[0.03] px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-lg transition-all duration-250 hover:border-orange-400/30 hover:bg-white/[0.06] hover:shadow-[0_10px_24px_rgba(0,0,0,0.2),0_0_0_1px_rgba(230,126,34,0.1)_inset] sm:w-auto sm:px-9 sm:tracking-[0.15em]"
                  onClick={scrollToPortfolio}
                >
                  {t.hero.secondary}
                </Button>
              </m.div>
            </m.div>

            <m.p variants={fadeUp} className="mt-4 text-sm text-white/50">
              {heroCopy.ctaNote}
            </m.p>



          </m.div>
        </div>
      </div>
    </section>
  );
}
