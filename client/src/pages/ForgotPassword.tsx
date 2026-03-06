import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, m } from "framer-motion";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

type ForgotPasswordFormValues = {
  email: string;
  newPassword: string;
  confirmPassword: string;
};

const CONTENT = {
  pt: {
    back: "Voltar para login",
    title: "Esqueceu a senha?",
    subtitle: "Defina uma nova senha usando seu e-mail corporativo.",
    emailLabel: "E-mail",
    emailPlaceholder: "seu@email.com",
    newPasswordLabel: "Nova senha",
    newPasswordPlaceholder: "Nova senha",
    confirmPasswordLabel: "Confirmar nova senha",
    confirmPasswordPlaceholder: "Repita a nova senha",
    rulesTitle: "Regras atuais:",
    rules: [
      "E-mail deve existir",
      "Nova senha deve ter no mínimo 6 caracteres",
      "Confirmação deve ser igual à nova senha",
    ],
    submit: "Atualizar senha",
    submitting: "Atualizando senha...",
    successTitle: "Senha alterada",
    successRedirect: "Redirecionando para o login em",
    toastSuccess: "Senha atualizada com sucesso",
    toastError: "Não foi possível atualizar a senha",
    validation: {
      email: "Informe um e-mail válido",
      newPassword: "A nova senha deve ter no mínimo 6 caracteres",
      confirmPassword: "Confirme a nova senha",
      confirmMismatch: "A confirmação da senha não confere",
    },
  },
  en: {
    back: "Back to login",
    title: "Forgot password?",
    subtitle: "Set a new password using your corporate email.",
    emailLabel: "Email",
    emailPlaceholder: "your@email.com",
    newPasswordLabel: "New password",
    newPasswordPlaceholder: "New password",
    confirmPasswordLabel: "Confirm new password",
    confirmPasswordPlaceholder: "Repeat the new password",
    rulesTitle: "Current rules:",
    rules: [
      "Email must exist",
      "New password must be at least 6 characters",
      "Confirmation must match the new password",
    ],
    submit: "Update password",
    submitting: "Updating password...",
    successTitle: "Password updated",
    successRedirect: "Redirecting to login in",
    toastSuccess: "Password updated successfully",
    toastError: "Could not update password",
    validation: {
      email: "Enter a valid email",
      newPassword: "New password must be at least 6 characters",
      confirmPassword: "Confirm the new password",
      confirmMismatch: "Password confirmation does not match",
    },
  },
  es: {
    back: "Volver al login",
    title: "¿Olvidaste tu contraseña?",
    subtitle: "Define una nueva contraseña usando tu e-mail corporativo.",
    emailLabel: "E-mail",
    emailPlaceholder: "tu@email.com",
    newPasswordLabel: "Nueva contraseña",
    newPasswordPlaceholder: "Nueva contraseña",
    confirmPasswordLabel: "Confirmar nueva contraseña",
    confirmPasswordPlaceholder: "Repite la nueva contraseña",
    rulesTitle: "Reglas actuales:",
    rules: [
      "El e-mail debe existir",
      "La nueva contraseña debe tener al menos 6 caracteres",
      "La confirmación debe coincidir con la nueva contraseña",
    ],
    submit: "Actualizar contraseña",
    submitting: "Actualizando contraseña...",
    successTitle: "Contraseña actualizada",
    successRedirect: "Redirigiendo al login en",
    toastSuccess: "Contraseña actualizada con éxito",
    toastError: "No fue posible actualizar la contraseña",
    validation: {
      email: "Ingresa un e-mail válido",
      newPassword: "La nueva contraseña debe tener al menos 6 caracteres",
      confirmPassword: "Confirma la nueva contraseña",
      confirmMismatch: "La confirmación de la contraseña no coincide",
    },
  },
} as const;

export default function ForgotPassword() {
  const { language } = useLanguage();
  const t = CONTENT[language];
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(2);

  const forgotPasswordSchema = useMemo(
    () =>
      z
        .object({
          email: z.string().email(t.validation.email),
          newPassword: z.string().min(6, t.validation.newPassword),
          confirmPassword: z.string().min(6, t.validation.confirmPassword),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: t.validation.confirmMismatch,
          path: ["confirmPassword"],
        }),
    [t]
  );

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const recoverPasswordMutation = trpc.emailAuth.recoverPassword.useMutation({
    onSuccess: () => {
      toast.success(t.toastSuccess);
      setIsSuccess(true);
      setRedirectCountdown(2);
    },
    onError: (error) => {
      toast.error(error.message || t.toastError);
    },
  });

  useEffect(() => {
    if (!isSuccess) return;

    const countdownInterval = window.setInterval(() => {
      setRedirectCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(countdownInterval);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    const redirectTimeout = window.setTimeout(() => {
      form.reset();
      window.location.assign("/login");
    }, 2000);

    return () => {
      window.clearInterval(countdownInterval);
      window.clearTimeout(redirectTimeout);
    };
  }, [form, isSuccess]);

  function onSubmit(data: ForgotPasswordFormValues) {
    recoverPasswordMutation.mutate({
      email: data.email,
      newPassword: data.newPassword,
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <m.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-black/70 p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)] backdrop-blur"
      >
        <Button
          variant="ghost"
          className="mb-4 px-0 text-white hover:bg-transparent hover:text-primary"
          onClick={() => window.location.assign("/login")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.back}
        </Button>

        <div className="mb-6">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {isSuccess ? (
            <m.div
              key="success"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="rounded-3xl border border-primary/20 bg-primary/10 p-6 text-center"
            >
              <m.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.3, ease: "easeOut" }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary"
              >
                <CheckCircle2 className="h-8 w-8" />
              </m.div>
              <h2 className="text-xl font-semibold text-white">{t.successTitle}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t.successRedirect} {redirectCountdown}s.
              </p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <m.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 2, ease: "linear" }}
                />
              </div>
            </m.div>
          ) : (
            <m.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04, duration: 0.22 }}>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">{t.emailLabel}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} type="email" placeholder={t.emailPlaceholder} className="pl-10 text-white" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </m.div>

                  <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.22 }}>
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">{t.newPasswordLabel}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} type={showNewPassword ? "text" : "password"} placeholder={t.newPasswordPlaceholder} className="pl-10 pr-10 text-white" />
                              <button type="button" onClick={() => setShowNewPassword((value) => !value)} className="absolute right-3 top-3 text-muted-foreground hover:text-white">
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </m.div>

                  <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.22 }}>
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">{t.confirmPasswordLabel}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} type={showConfirmPassword ? "text" : "password"} placeholder={t.confirmPasswordPlaceholder} className="pl-10 pr-10 text-white" />
                              <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-3 top-3 text-muted-foreground hover:text-white">
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </m.div>

                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16, duration: 0.22 }}
                    className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground"
                  >
                    {t.rulesTitle}
                    {t.rules.map((rule) => (
                      <div key={rule}>{rule}</div>
                    ))}
                  </m.div>

                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.22 }}
                    className="space-y-3"
                  >
                    {recoverPasswordMutation.isPending && (
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <m.div
                          className="h-full w-1/2 rounded-full bg-primary"
                          initial={{ x: "-100%" }}
                          animate={{ x: "220%" }}
                          transition={{ duration: 1, ease: "easeInOut", repeat: Infinity }}
                        />
                      </div>
                    )}

                    <Button type="submit" className="w-full py-6 text-base font-semibold" disabled={recoverPasswordMutation.isPending}>
                      {recoverPasswordMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t.submitting}
                        </>
                      ) : (
                        t.submit
                      )}
                    </Button>
                  </m.div>
                </form>
              </Form>
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    </div>
  );
}
