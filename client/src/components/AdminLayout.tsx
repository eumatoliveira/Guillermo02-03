import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/i18n/index";
import { getAdminLayoutCopy, resolveAdminLegend } from "@/lib/dashboardLocale";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Settings,
  Circle,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { AnimatePresence, m } from "framer-motion";
import { useMotionCapabilities } from "@/animation/hooks/useMotionCapabilities";
import { hoverLift, tapPress } from "@/animation/config/motionPresets";
import { shouldEnableHoverMotion } from "@/animation/utils/perfGuards";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useState, createContext, useContext, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => { },
});

export const useAdminTheme = () => useContext(ThemeContext);

interface AdminLayoutProps {
  children: React.ReactNode;
}

type NavKey = "dashboard" | "users" | "errors";

const NAV_ITEMS: Array<{ key: NavKey; href: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "dashboard", href: "/admin", icon: LayoutDashboard },
  { key: "users", href: "/admin/usuarios", icon: Users },
  { key: "errors", href: "/admin/erros", icon: AlertTriangle },
];

const LANGUAGE_OPTIONS: Array<{ code: Language; label: string }> = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { language, setLanguage } = useLanguage();
  const copy = getAdminLayoutCopy(language);
  const currentSearch = typeof window !== "undefined" ? window.location.search : "";
  const legend = resolveAdminLegend(
    language,
    location === "/admin" && currentSearch ? `${location}${currentSearch}` : location,
  );
  const showLegend = !(location === "/admin" && !currentSearch);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || "GLX Admin");
  const [profileEmail, setProfileEmail] = useState(user?.email || "admin@glx.local");
  const [profileLogo, setProfileLogo] = useState<string | null>(null);
  const motionCaps = useMotionCapabilities();
  const hoverEnabled = shouldEnableHoverMotion(motionCaps);
  const sharedHover = hoverEnabled ? hoverLift(motionCaps.motionLevel) : undefined;
  const sharedTap = tapPress(motionCaps.motionLevel);

  const notifications = [
    { id: 1, type: "warning", time: "2min", title: language === "en" ? "Churn above 5%" : language === "es" ? "Churn arriba de 5%" : "Churn acima de 5%" },
    { id: 2, type: "info", time: "15min", title: language === "en" ? "New user created" : language === "es" ? "Nuevo usuario creado" : "Novo usuario cadastrado" },
    { id: 3, type: "error", time: "1h", title: language === "en" ? "HTTP 500 spikes detected" : language === "es" ? "Picos de error 500 detectados" : "Picos de erro 500 detectados" },
  ];

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
    await logout({ redirectTo: "/" });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/admin/usuarios?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleExportCsv = () => {
    window.dispatchEvent(new CustomEvent("glx-admin-export-csv"));
  };

  const handleExportPdf = () => {
    window.dispatchEvent(new CustomEvent("glx-admin-export-pdf"));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("glx-admin-profile");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { name?: string; email?: string; logo?: string | null };
      if (parsed.name) setProfileName(parsed.name);
      if (parsed.email) setProfileEmail(parsed.email);
      if (parsed.logo) setProfileLogo(parsed.logo);
    } catch {
      window.localStorage.removeItem("glx-admin-profile");
    }
  }, []);

  const handleProfileLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "glx-admin-profile",
        JSON.stringify({
          name: profileName.trim() || "GLX Admin",
          email: profileEmail.trim() || "admin@glx.local",
          logo: profileLogo,
        }),
      );
    }
    setProfileDialogOpen(false);
  };

  const sidebarBg = theme === "dark" ? "bg-[#1a1410]" : "bg-[#fffdfa]";
  const sidebarText = theme === "dark" ? "text-gray-300" : "text-[#6b7280]";
  const sidebarHover = theme === "dark" ? "hover:bg-white/5" : "hover:bg-[#fff3eb]";
  const accentColor = "bg-[#ff7a1a]";

  const contentBg = theme === "dark"
    ? "bg-[#0f0d0a]"
    : "bg-[radial-gradient(circle_at_top_left,_rgba(255,201,153,0.2),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(191,235,255,0.22),_transparent_24%),linear-gradient(180deg,_#fcfdff_0%,_#f5f7fb_100%)]";
  const contentText = theme === "dark" ? "text-white" : "text-gray-900";
  const contentTextSecondary = theme === "dark" ? "text-gray-400" : "text-gray-600";
  const headerBg = theme === "dark" ? "bg-[#1a1410]/95" : "bg-white/88";
  const borderColor = theme === "dark" ? "border-white/10" : "border-[#e9edf5]";
  const inputBg = theme === "dark" ? "bg-white/5" : "bg-[#f4f7fb]";

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={cn("min-h-screen", contentBg, contentText)}>
        <AnimatePresence>
          {sidebarOpen ? (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          ) : null}
        </AnimatePresence>

        <m.aside
          layout
          className={cn(
            "fixed top-0 left-0 z-50 h-full w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
            sidebarBg,
            theme === "dark" ? "border-r border-white/5" : "border-r border-[#edf1f7]",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex flex-col h-full">
            <div className={cn("flex items-center justify-between h-[76px] px-4", theme === "dark" ? "border-b border-white/5" : "border-b border-[#edf1f7]")}>
              <Link href="/admin" className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#ff7a1a] flex items-center justify-center shadow-[0_12px_28px_rgba(255,122,26,0.22)]">
                  <span className="text-white font-bold text-sm">GLX</span>
                </div>
                <div className="flex flex-col">
                  <span className={cn("font-semibold text-sm", theme === "dark" ? "text-white" : "text-[#121826]")}>PERFORMANCE</span>
                  <span className={cn("text-[10px] uppercase tracking-wider", theme === "dark" ? "text-gray-500" : "text-[#94a3b8]")}>{copy.panelSubtitle}</span>
                </div>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className={cn("lg:hidden p-1 rounded", sidebarHover, sidebarText)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-3">
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
                  return (
                    <li key={item.key}>
                      <Link href={item.href}>
                        <m.div
                          layout
                          whileHover={sharedHover}
                          whileTap={sharedTap}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all cursor-pointer",
                            isActive
                              ? cn(accentColor, "text-white shadow-lg shadow-orange-500/20")
                              : cn(sidebarText, sidebarHover, theme === "dark" ? "hover:text-white" : "hover:text-[#121826]"),
                          )}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {copy.navigation[item.key]}
                        </m.div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className={cn("px-4 pb-5 pt-3", theme === "dark" ? "border-t border-white/5" : "border-t border-[#edf1f7]")}>
              <div className="rounded-[28px] bg-white/90 p-4 shadow-[0_18px_40px_rgba(148,163,184,0.16)]">
                <div className="mb-4 flex items-start gap-3">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#e2e8f0] bg-white">
                    {profileLogo ? (
                      <img src={profileLogo} alt="Logo do perfil" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-[#0f172a]">{profileName.slice(0, 1) || "G"}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#94a3b8]">Perfil</div>
                    <div className="mt-2 truncate text-[1.7rem] font-bold leading-none tracking-[-0.04em] text-[#0f172a]">
                      {profileName}
                    </div>
                    <div className="mt-2 truncate text-sm text-[#94a3b8]">{profileEmail}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileDialogOpen(true)}
                  className="mb-5 w-full rounded-2xl border border-[#dde6f1] bg-[#fff7f0] px-4 py-3 text-left text-sm font-semibold text-[#0f172a] transition hover:border-[#ffb280] hover:bg-[#fff2e6]"
                >
                  Configurar perfil
                </button>

                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#94a3b8]">Idioma</div>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as Language)}
                  className="mb-5 h-12 w-full rounded-2xl border border-[#dde6f1] bg-[#f3f7fb] px-4 text-[15px] font-medium text-[#0f172a] outline-none transition focus:border-[#ffb280]"
                >
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>

                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#94a3b8]">Tema</div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="relative flex h-14 w-[108px] items-center rounded-full border border-[#dde6f1] bg-white px-2 shadow-[0_12px_26px_rgba(148,163,184,0.12)]"
                  aria-label="Alternar tema"
                >
                  <span className="flex h-10 w-10 items-center justify-center text-[#94a3b8]">
                    <Sun className="h-4 w-4" />
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center text-[#94a3b8]">
                    <Moon className="h-4 w-4" />
                  </span>
                  <span className={cn(
                    "absolute top-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-[#ff7a1a] text-white shadow-[0_10px_18px_rgba(255,122,26,0.26)] transition-transform duration-300",
                    theme === "light" ? "translate-x-0" : "translate-x-[52px]",
                  )}>
                    {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </m.aside>

        <div className="lg:pl-64">
          <header className={cn("sticky top-0 z-30 border-b backdrop-blur-xl", headerBg, borderColor)}>
            <div className="mx-auto flex min-h-[88px] w-full max-w-[1920px] flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <button onClick={() => setSidebarOpen(true)} className={cn("lg:hidden p-2 rounded-lg", theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-100")}>
                <Menu className="h-5 w-5" />
              </button>

              <form onSubmit={handleSearch} className="order-3 basis-full sm:order-2 sm:mx-0 sm:max-w-xl sm:flex-1">
                <div className="relative">
                  <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", contentTextSecondary)} />
                  <Input
                    type="search"
                    placeholder={copy.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn("h-12 rounded-full border", theme === "dark" ? "border-white/10" : "border-[#eef2f7]", inputBg, "pl-10 shadow-none focus:ring-2 focus:ring-[#e67e22]/30")}
                  />
                </div>
              </form>

              <div className="order-2 ml-auto flex flex-wrap items-center justify-end gap-2 sm:order-3 sm:gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    "hidden xl:flex h-12 items-center gap-2 rounded-full border px-4",
                    theme === "dark" ? "border-white/10 bg-white/5 text-white" : "border-[#ffd6bd] bg-[#fff8f3] text-[#0f172a]",
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-[#50d18d]" />
                  Dados ao vivo
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn("relative rounded-full", theme === "dark" ? "hover:bg-white/5" : "border border-[#e8edf5] bg-white shadow-sm hover:bg-gray-50")}>
                      <Bell className="h-5 w-5" />
                      {notifications.length > 0 ? <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#e67e22]" /> : null}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>{copy.notificationsTitle}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifications.map((notif) => (
                      <DropdownMenuItem key={notif.id} className="flex items-start gap-3 py-3">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full mt-1.5 flex-shrink-0",
                            notif.type === "error" ? "bg-red-500" : notif.type === "warning" ? "bg-[#e67e22]" : "bg-blue-500",
                          )}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {notif.time} {copy.agoSuffix}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {notifications.length === 0 ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">{copy.noNotifications}</div>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("rounded-full", theme === "dark" ? "hover:bg-white/5" : "border border-[#e8edf5] bg-white shadow-sm hover:bg-gray-50")}
                >
                  <Settings className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleExportCsv}
                  className={cn("hidden xl:flex h-12 rounded-full px-5", theme === "dark" ? "hover:bg-white/5" : "border border-[#e8edf5] bg-white shadow-sm hover:bg-gray-50")}
                >
                  Exportar CSV
                </Button>

                <Button
                  type="button"
                  onClick={handleExportPdf}
                  className="hidden md:flex h-12 rounded-full bg-[#ff7a1a] px-5 lg:px-6 text-white shadow-[0_18px_34px_rgba(255,122,26,0.24)] hover:bg-[#f06a09]"
                >
                  PDF Executivo
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleLogout}
                  className={cn("hidden xl:flex h-12 rounded-full px-5", theme === "dark" ? "hover:bg-white/5" : "border border-[#e8edf5] bg-white shadow-sm hover:bg-gray-50")}
                >
                  Sair
                </Button>

              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1920px] p-4 sm:p-6 lg:p-7 xl:p-8">
            {showLegend ? (
              <div className={cn("mb-5 rounded-[28px] border p-5 shadow-sm", theme === "dark" ? "border-white/10 bg-[#1a1410]/50" : "border-[#e8edf5] bg-white")}>
                <h2 className={cn("text-base md:text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-900")}>{legend.title}</h2>
                <p className={cn("text-sm mt-1", theme === "dark" ? "text-gray-400" : "text-gray-600")}>{legend.description}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {legend.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      className={cn(
                        "rounded-2xl border px-4 py-2.5 text-xs",
                        theme === "dark" ? "border-white/10 bg-white/5 text-gray-300" : "border-[#edf2f7] bg-[#fcfdff] text-gray-700",
                      )}
                    >
                      {bullet}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {children}
          </main>
        </div>

        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="border-[#e8edf5] bg-white sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-[#0f172a]">Configurar perfil</DialogTitle>
              <DialogDescription className="text-[#667085]">
                Atualize a logo em PNG, o nome exibido e o e-mail do dashboard admin.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 py-2">
              <div className="flex items-center gap-4 rounded-[24px] border border-[#edf2f7] bg-[#fbfcfe] p-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#e2e8f0] bg-white">
                  {profileLogo ? (
                    <img src={profileLogo} alt="Preview da logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-[#0f172a]">{profileName.slice(0, 1) || "G"}</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-semibold text-[#0f172a]">Logo em PNG</label>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleProfileLogoChange}
                    className="block w-full text-sm text-[#667085] file:mr-4 file:rounded-full file:border-0 file:bg-[#ff7a1a] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-[#f06a09]"
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <label htmlFor="admin-profile-name" className="mb-2 block text-sm font-semibold text-[#0f172a]">
                    Nome
                  </label>
                  <Input
                    id="admin-profile-name"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    className="h-12 rounded-2xl border-[#dde6f1] bg-[#f4f7fb]"
                  />
                </div>

                <div>
                  <label htmlFor="admin-profile-email" className="mb-2 block text-sm font-semibold text-[#0f172a]">
                    E-mail
                  </label>
                  <Input
                    id="admin-profile-email"
                    type="email"
                    value={profileEmail}
                    onChange={(event) => setProfileEmail(event.target.value)}
                    className="h-12 rounded-2xl border-[#dde6f1] bg-[#f4f7fb]"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setProfileDialogOpen(false)}
                className="rounded-full border border-[#e8edf5] bg-white px-5 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleProfileSave}
                className="rounded-full bg-[#ff7a1a] px-6 text-white hover:bg-[#f06a09]"
              >
                Salvar perfil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ThemeContext.Provider>
  );
}

