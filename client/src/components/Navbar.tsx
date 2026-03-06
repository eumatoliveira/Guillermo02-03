import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Globe, Check, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language, languageNames } from "@/i18n";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { useMotionCapabilities } from "@/animation/hooks/useMotionCapabilities";
import SplitText from "@/animation/components/SplitText";

function AnimatedNavLabel({
  text,
  splitType = "chars",
  className,
}: {
  text: string;
  splitType?: "chars" | "words";
  className?: string;
}) {
  return (
    <SplitText
      text={text}
      tag="span"
      splitType={splitType}
      className={cn("inline-block", className)}
      delay={splitType === "chars" ? 8 : 12}
      duration={0.22}
      threshold={0.01}
      rootMargin="0px"
      from={{ opacity: 0, transform: "translateY(4px)" }}
      to={{ opacity: 1, transform: "translateY(0px)" }}
    />
  );
}

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const motionCaps = useMotionCapabilities();
  const reducedMotion = motionCaps.prefersReducedMotion || motionCaps.motionLevel === "off";

  useEffect(() => {
    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const doc = document.documentElement;
        const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
        setIsScrolled(y > 8);
        setScrollProgress(Math.max(0, Math.min(1, y / maxScroll)));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const scrollToSection = (id: string) => {
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = `/#${id}`;
      setMobileMenuOpen(false);
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      const navOffset = 108;
      const top = element.getBoundingClientRect().top + window.scrollY - navOffset;
      window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    }

    setMobileMenuOpen(false);
  };

  const languages: Language[] = ["pt", "en", "es"];

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-[120] isolate overflow-hidden border-b transition-all duration-300",
        "supports-[backdrop-filter]:backdrop-saturate-150",
        isScrolled
          ? "border-orange-500/25 bg-black/82 backdrop-blur-xl supports-[backdrop-filter]:bg-black/34 supports-[backdrop-filter]:backdrop-blur-3xl shadow-[0_14px_36px_rgba(0,0,0,0.48)]"
          : "border-white/10 bg-black/74 backdrop-blur-md supports-[backdrop-filter]:bg-black/22 supports-[backdrop-filter]:backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[2px] overflow-hidden">
        <div className="absolute inset-0 bg-white/[0.02]" />
        <div
          className="h-full origin-left bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 transition-transform duration-100"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        animate={reducedMotion ? undefined : { opacity: isScrolled ? 1 : 0.72 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.0) 55%)",
        }}
      />
      <div className="container flex h-16 items-center justify-between px-3 pt-[env(safe-area-inset-top)] md:h-20 md:px-4">
        <a href="/#home" className="flex items-center gap-2 cursor-pointer">
          <m.img
            src="/images/logo-transparent.png"
            alt="GLX Partners"
            className="h-12 w-auto sm:h-14 md:h-24"
            animate={
              reducedMotion
                ? undefined
                : {
                    y: [0, -1.5, 0],
                    filter: [
                      "drop-shadow(0 0 0px rgba(249,115,22,0.0))",
                      "drop-shadow(0 0 10px rgba(249,115,22,0.18))",
                      "drop-shadow(0 0 0px rgba(249,115,22,0.0))",
                    ],
                  }
            }
            transition={reducedMotion ? undefined : { duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </a>

        <div className="hidden lg:flex items-center gap-5 xl:gap-8">
          <m.button
            type="button"
            onClick={() => scrollToSection("why")}
            className="whitespace-nowrap text-sm xl:text-base font-medium text-white hover:text-primary transition-colors tracking-wide"
            whileHover={{ y: -1.5 }}
            whileTap={{ scale: 0.99 }}
          >
            <AnimatedNavLabel text={t.nav.about} />
          </m.button>
          <m.button
            type="button"
            onClick={() => scrollToSection("what")}
            className="whitespace-nowrap text-sm xl:text-base font-medium text-white hover:text-primary transition-colors tracking-wide"
            whileHover={{ y: -1.5 }}
            whileTap={{ scale: 0.99 }}
          >
            <AnimatedNavLabel text={t.nav.services} />
          </m.button>
          <Link href="/planos">
            <m.span
              className="whitespace-nowrap text-sm xl:text-base font-medium text-white hover:text-primary transition-colors tracking-wide cursor-pointer"
              whileHover={{ y: -1.5 }}
              whileTap={{ scale: 0.99 }}
            >
              <AnimatedNavLabel text={t.nav.plans} />
            </m.span>
          </Link>
          <m.button
            type="button"
            onClick={() => scrollToSection("portfolio")}
            className="whitespace-nowrap text-sm xl:text-base font-medium text-white hover:text-primary transition-colors tracking-wide"
            whileHover={{ y: -1.5 }}
            whileTap={{ scale: 0.99 }}
          >
            <AnimatedNavLabel text={t.nav.cases} />
          </m.button>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-primary hover:bg-transparent h-9 w-9 md:h-10 md:w-10"
              >
                <Globe className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[140] bg-black/90 border-white/10 text-white">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className="hover:bg-white/10 cursor-pointer flex items-center justify-between"
                >
                  <AnimatedNavLabel text={languageNames[lang]} splitType="words" />
                  {language === lang && <Check className="h-4 w-4 ml-2 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/login">
            <Button
              variant="outline"
              className="hidden xl:flex neon-btn-outline border-white/20 text-white hover:bg-white/10 font-bold uppercase tracking-wider px-5 text-xs whitespace-nowrap"
            >
              <AnimatedNavLabel text={t.nav.membersArea} splitType="words" />
            </Button>
          </Link>

          <Button
            onClick={() => window.open("https://wa.me/5511970837585", "_blank", "noopener,noreferrer")}
            className="hidden xl:flex neon-btn-solid bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider px-5 text-xs whitespace-nowrap"
          >
            <AnimatedNavLabel text={t.nav.schedule} splitType="words" />
          </Button>

          <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-white hover:text-primary hover:bg-transparent h-9 w-9"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[140] mr-2 w-[min(92vw,20rem)] bg-black/95 text-white border-white/10">
              <DropdownMenuItem
                onClick={() => scrollToSection("why")}
                className="hover:bg-white/10 cursor-pointer py-3"
              >
                <AnimatedNavLabel text={t.nav.about} />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => scrollToSection("what")}
                className="hover:bg-white/10 cursor-pointer py-3"
              >
                <AnimatedNavLabel text={t.nav.services} />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.location.href = "/planos";
                }}
                className="hover:bg-white/10 cursor-pointer py-3"
              >
                <AnimatedNavLabel text={t.nav.plans} />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => scrollToSection("portfolio")}
                className="hover:bg-white/10 cursor-pointer py-3"
              >
                <AnimatedNavLabel text={t.nav.cases} />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.location.href = "/login";
                }}
                className="hover:bg-white/10 cursor-pointer py-3 border-t border-white/10 mt-2"
              >
                <AnimatedNavLabel text={t.nav.membersArea} splitType="words" />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.open("https://wa.me/5511970837585", "_blank", "noopener,noreferrer");
                }}
                className="hover:bg-primary/20 cursor-pointer py-3 text-primary font-bold"
              >
                <AnimatedNavLabel text={t.nav.schedule} splitType="words" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
