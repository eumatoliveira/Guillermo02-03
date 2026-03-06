import { Button } from "@/components/ui/button";
import { Linkedin, Instagram, Mail, Youtube } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { m } from "framer-motion";
import SplitText from "@/animation/components/SplitText";
import BlurText from "@/animation/components/BlurText";
import { useMotionCapabilities } from "@/animation/hooks/useMotionCapabilities";

// Ícone do WhatsApp SVG inline para garantir visualização correta
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export default function Footer() {
  const { language } = useLanguage();
  const motionCaps = useMotionCapabilities();
  const reducedMotion = motionCaps.prefersReducedMotion || motionCaps.motionLevel === "off";

  const content = {
    pt: {
      description: "Consultoria premium de crescimento e eficiência operacional para empresas de saúde. Unimos estratégia, Lean, tecnologia e IA para transformar performance em rotina — com margem e previsibilidade.",
      menu: "Menu",
      menuItems: {
        about: "A GLX",
        services: "O Que Fazemos",
        method: "Nosso Método",
        cases: "Cases"
      },
      contact: "Contato",
      scheduleBtn: "Agendar Reunião",
      copyright: "2026 GLX Partners Enablement LTDA. CNPJ 63944929/000199. Todos os direitos reservados.",
      privacy: "Privacidade",
      terms: "Termos"
    },
    en: {
      description: "Premium growth and operational efficiency consulting for healthcare companies. We combine strategy, Lean, technology, and AI to turn performance into routine — with margin and predictability.",
      menu: "Menu",
      menuItems: {
        about: "About GLX",
        services: "What We Do",
        method: "Our Method",
        cases: "Cases"
      },
      contact: "Contact",
      scheduleBtn: "BOOK A DIAGNOSTIC CALL",
      copyright: "2026 GLX Partners Enablement LTDA. CNPJ 63944929/000199. All rights reserved.",
      privacy: "Privacy",
      terms: "Terms"
    },
    es: {
      description: "Consultoría premium de crecimiento y eficiencia operativa para empresas de salud. Unimos estrategia, Lean, tecnología e IA para convertir performance en rutina—con margen y previsibilidad.",
      menu: "Menú",
      menuItems: {
        about: "GLX",
        services: "Qué Hacemos",
        method: "Nuestro Método",
        cases: "Casos"
      },
      contact: "Contacto",
      scheduleBtn: "Agendar Reunión",
      copyright: "2026 GLX Partners Enablement LTDA. CNPJ 63944929/000199. Todos los derechos reservados.",
      privacy: "Privacidad",
      terms: "Términos"
    }
  };

  const t = content[language];

  return (
    <footer className="relative overflow-hidden bg-background border-t border-white/5 py-16">
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-orange-500/8 blur-[110px]"
        animate={reducedMotion ? undefined : { x: [0, 18, 0], y: [0, -10, 0], opacity: [0.35, 0.7, 0.35] }}
        transition={reducedMotion ? undefined : { duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-5%] bottom-4 h-52 w-52 rounded-full bg-cyan-400/6 blur-[110px]"
        animate={reducedMotion ? undefined : { x: [0, -14, 0], y: [0, 12, 0] }}
        transition={reducedMotion ? undefined : { duration: 9.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400/30 to-transparent"
        animate={reducedMotion ? undefined : { opacity: [0.25, 0.9, 0.25] }}
        transition={reducedMotion ? undefined : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <m.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="col-span-1 md:col-span-2"
          >
            <a href="/#home" className="inline-flex">
              <img
                src="/images/logo-white-on-black.jpg"
                alt="GLX Partners"
                className="mb-8 h-24 w-24 rounded-lg object-cover mix-blend-screen md:h-32 md:w-32"
              />
            </a>
            <p className="mb-6 max-w-sm text-muted-foreground">
              {t.description}
            </p>
            <div className="flex gap-4">
              <m.a href="https://linkedin.com/company/glxpartners" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors" whileHover={reducedMotion ? undefined : { y: -3, scale: 1.08 }} whileTap={{ scale: 0.96 }}>
                <Linkedin className="h-6 w-6" />
              </m.a>
              <m.a href="https://instagram.com/glxpartners" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors" whileHover={reducedMotion ? undefined : { y: -3, scale: 1.08 }} whileTap={{ scale: 0.96 }}>
                <Instagram className="h-6 w-6" />
              </m.a>
              <m.a href="https://wa.me/5511970837585" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors" whileHover={reducedMotion ? undefined : { y: -3, scale: 1.08 }} whileTap={{ scale: 0.96 }}>
                <WhatsAppIcon className="h-6 w-6" />
              </m.a>
              <m.a href="https://www.youtube.com/@glxpartners" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors" whileHover={reducedMotion ? undefined : { y: -3, scale: 1.08 }} whileTap={{ scale: 0.96 }}>
                <Youtube className="h-6 w-6" />
              </m.a>
            </div>
          </m.div>
          
          <m.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.06, duration: 0.38, ease: "easeOut" }}
          >
            <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">
              <SplitText
                text={t.menu}
                tag="span"
                splitType="words"
                className="inline-block"
                delay={16}
                duration={0.28}
                threshold={0.2}
                rootMargin="-40px"
                from={{ opacity: 0, transform: "translateY(5px)" }}
                to={{ opacity: 1, transform: "translateY(0px)" }}
              />
            </h4>
            <ul className="space-y-4">
                {[
                  { href: "#why", label: t.menuItems.about },
                  { href: "#what", label: t.menuItems.services },
                  { href: "#how", label: t.menuItems.method },
                  { href: "/planos", label: language === "pt" ? "Planos" : language === "en" ? "Plans" : "Planes", isRoute: true },
                  { href: "#portfolio", label: t.menuItems.cases },
                ].map((item, index) => (
                <m.li
                  key={item.href}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ delay: 0.05 * index, duration: 0.25 }}
                >
                  <a href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                    <SplitText
                      text={item.label}
                      tag="span"
                      splitType="words"
                      className="inline-block"
                      delay={12}
                      duration={0.24}
                      threshold={0.2}
                      rootMargin="-30px"
                      from={{ opacity: 0, transform: "translateY(4px)" }}
                      to={{ opacity: 1, transform: "translateY(0px)" }}
                    />
                  </a>
                </m.li>
              ))}
            </ul>
          </m.div>
          
          <m.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.1, duration: 0.38, ease: "easeOut" }}
          >
            <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">
              <SplitText
                text={t.contact}
                tag="span"
                splitType="words"
                className="inline-block"
                delay={16}
                duration={0.28}
                threshold={0.2}
                rootMargin="-40px"
                from={{ opacity: 0, transform: "translateY(5px)" }}
                to={{ opacity: 1, transform: "translateY(0px)" }}
              />
            </h4>
            <ul className="space-y-4 mb-6">
              <li className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:contato@glxpartners.io" className="break-all hover:text-white transition-colors">
                  <SplitText
                    text="contato@glxpartners.io"
                    tag="span"
                    splitType="chars"
                    className="inline-block text-sm"
                    delay={8}
                    duration={0.2}
                    threshold={0.2}
                    rootMargin="-30px"
                    from={{ opacity: 0, transform: "translateY(4px)" }}
                    to={{ opacity: 1, transform: "translateY(0px)" }}
                  />
                </a>
              </li>
            </ul>
            <m.div whileHover={reducedMotion ? undefined : { y: -2, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button 
              variant="outline" 
              className="group relative w-full overflow-hidden border-white/10 hover:bg-white/5 text-white"
              onClick={() => window.open("https://wa.me/5511970837585", "_blank", "noopener,noreferrer")}
            >
              <m.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={reducedMotion ? undefined : { x: ["-140%", "500%"] }}
                transition={reducedMotion ? undefined : { duration: 2.4, repeat: Infinity, repeatDelay: 2, ease: "linear" }}
              />
              <SplitText
                text={t.scheduleBtn}
                tag="span"
                splitType="words"
                className="inline-block"
                delay={14}
                duration={0.24}
                threshold={0.2}
                rootMargin="-30px"
                from={{ opacity: 0, transform: "translateY(4px)" }}
                to={{ opacity: 1, transform: "translateY(0px)" }}
              />
            </Button>
            </m.div>
          </m.div>
        </div>
        
        <m.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: 0.12, duration: 0.35 }}
          className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <BlurText
            as="p"
            text={t.copyright}
            className="text-xs text-muted-foreground justify-center md:justify-start"
            animateBy="words"
            direction="bottom"
            delay={6}
            threshold={0.2}
            rootMargin="-20px"
            stepDuration={0.14}
          />
          <div className="flex gap-6">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-white transition-colors">
              <SplitText
                text={t.privacy}
                tag="span"
                splitType="words"
                className="inline-block"
                delay={10}
                duration={0.2}
                threshold={0.2}
                rootMargin="-20px"
                from={{ opacity: 0, transform: "translateY(3px)" }}
                to={{ opacity: 1, transform: "translateY(0px)" }}
              />
            </Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-white transition-colors">
              <SplitText
                text={t.terms}
                tag="span"
                splitType="words"
                className="inline-block"
                delay={10}
                duration={0.2}
                threshold={0.2}
                rootMargin="-20px"
                from={{ opacity: 0, transform: "translateY(3px)" }}
                to={{ opacity: 1, transform: "translateY(0px)" }}
              />
            </Link>
          </div>
        </m.div>
      </div>
    </footer>
  );
}
