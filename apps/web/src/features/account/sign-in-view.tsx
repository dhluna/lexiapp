"use client";

import { Eye, EyeOff, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { useAuth } from "@/hooks/use-account";
import { cn } from "@/lib/cn";
import { MIN_PASSWORD_LENGTH, safeNextPath, type AuthResult } from "@lexi/core/services/auth";

type Mode = "signin" | "signup" | "reset";
type Notice = { kind: "confirm" | "reset-sent"; email: string } | null;

const inputClass =
  "mt-1.5 min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-base focus-visible:border-accent";

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function SignInView() {
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const router = useRouter();
  const { available, snapshot, service } = useAuth();

  const [mode, setMode] = useState<Mode>(params.get("modo") === "recuperar" ? "reset" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  if (available === null || (available && (!snapshot || snapshot.status === "loading"))) {
    return <Skeleton className="mx-auto h-96 max-w-md" />;
  }

  if (!available || !service) {
    return (
      <div className="mx-auto max-w-md">
        <EmptyState title="Las cuentas no están activadas">
          <p>Puedes seguir usando Lexi sin cuenta: tu progreso se guarda en este navegador.</p>
          <ButtonLink href="/" className="mt-4">
            Volver al inicio
          </ButtonLink>
        </EmptyState>
      </div>
    );
  }

  if (snapshot?.status === "signed-in") {
    return (
      <div className="mx-auto max-w-md">
        <EmptyState title="Ya has iniciado sesión">
          <p className="break-all">{snapshot.user?.email}</p>
          <ButtonLink href={next} className="mt-4">
            Continuar
          </ButtonLink>
        </EmptyState>
      </div>
    );
  }

  const switchMode = (value: Mode) => {
    setMode(value);
    setError(null);
    setNotice(null);
  };

  const handle = async (action: () => Promise<AuthResult>, onOk: () => void) => {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (result.ok) onOk();
    else setError({ message: result.message, code: result.code });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "signin") {
      void handle(() => service.signInWithPassword(email, password), () => router.replace(next));
    } else if (mode === "signup") {
      void handle(
        async () => {
          const result = await service.signUp(email, password, next);
          if (result.ok && result.needsConfirmation) setNotice({ kind: "confirm", email });
          else if (result.ok) router.replace(next);
          return result;
        },
        () => {},
      );
    } else {
      void handle(() => service.sendPasswordReset(email), () => setNotice({ kind: "reset-sent", email }));
    }
  };

  if (notice) {
    return (
      <div className="mx-auto grid max-w-md gap-4 rounded-3xl bg-surface p-6 sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Mail aria-hidden className="size-6" />
        </span>
        <h1 className="font-display text-2xl font-bold">Revisa tu correo</h1>
        <p className="text-ink-soft">
          {notice.kind === "confirm"
            ? `Te enviamos un enlace a ${notice.email} para confirmar tu cuenta. Ábrelo en este navegador.`
            : `Si hay una cuenta con ${notice.email}, recibirás un enlace para elegir una contraseña nueva.`}
        </p>
        {notice.kind === "confirm" && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => void handle(() => service.resendConfirmation(notice.email), () => {})}
          >
            Reenviar el correo
          </Button>
        )}
        <Button variant="ghost" onClick={() => switchMode("signin")}>
          Volver a iniciar sesión
        </Button>
        {error && (
          <p role="alert" className="font-semibold text-danger">
            {error.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-md gap-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          {mode === "reset" ? "Recupera tu contraseña" : "Entra en Lexi"}
        </h1>
        <p className="mt-2 text-ink-soft">
          {mode === "reset"
            ? "Te enviaremos un enlace para elegir una contraseña nueva."
            : "Guarda tu progreso y úsalo en todos tus dispositivos."}
        </p>
      </div>

      <div className="grid gap-5 rounded-3xl bg-surface p-6 sm:p-8">
        {mode !== "reset" && (
          <>
            <Button
              variant="secondary"
              size="lg"
              disabled={pending}
              onClick={() => void handle(() => service.signInWithGoogle(next), () => {})}
            >
              <GoogleMark />
              Continuar con Google
            </Button>
            <div className="flex items-center gap-3 text-sm text-ink-soft">
              <span className="h-px flex-1 bg-line" /> o con tu email <span className="h-px flex-1 bg-line" />
            </div>
            <div role="tablist" aria-label="Tipo de acceso" className="grid grid-cols-2 gap-1 rounded-xl bg-sunken p-1">
              {(
                [
                  ["signin", "Iniciar sesión"],
                  ["signup", "Crear cuenta"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => switchMode(value)}
                  className={cn(
                    "min-h-11 rounded-lg font-semibold transition-colors",
                    mode === value ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        <form onSubmit={submit} className="grid gap-4">
          <label className="block font-semibold">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>

          {mode !== "reset" && (
            <div>
              <label htmlFor="contrasena" className="block font-semibold">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="contrasena"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(inputClass, "pr-12")}
                  aria-describedby={mode === "signup" ? "ayuda-contrasena" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-1 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-soft hover:text-ink"
                >
                  {showPassword ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
                </button>
              </div>
              {mode === "signup" && (
                <p id="ayuda-contrasena" className="mt-1 text-sm text-ink-soft">
                  Al menos {MIN_PASSWORD_LENGTH} caracteres.
                </p>
              )}
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl bg-danger-soft p-3 font-semibold text-danger">
              {error.message}
              {error.code === "email_not_confirmed" && (
                <button
                  type="button"
                  className="mt-1 block font-semibold underline underline-offset-4"
                  onClick={() => void handle(() => service.resendConfirmation(email), () => setNotice({ kind: "confirm", email }))}
                >
                  Reenviar el correo de confirmación
                </button>
              )}
            </div>
          )}

          <Button type="submit" size="lg" disabled={pending}>
            {mode === "signin" ? "Iniciar sesión" : mode === "signup" ? "Crear cuenta" : "Enviar enlace"}
          </Button>
        </form>

        {mode !== "reset" && (
          <p className="text-sm text-ink-soft">
            Al continuar, aceptas que Lexi guarde tu email y tu progreso según la{" "}
            <Link href="/privacidad" className="font-semibold text-accent underline-offset-4 hover:underline">
              política de privacidad
            </Link>
            .
          </p>
        )}

        {mode === "signin" && (
          <button
            type="button"
            onClick={() => switchMode("reset")}
            className="min-h-11 justify-self-start font-semibold text-accent underline-offset-4 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}
        {mode === "reset" && (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="min-h-11 justify-self-start font-semibold text-accent underline-offset-4 hover:underline"
          >
            Volver a iniciar sesión
          </button>
        )}
      </div>

      <p className="text-center text-sm text-ink-soft">
        También puedes{" "}
        <Link href="/" className="font-semibold text-accent underline-offset-4 hover:underline">
          seguir sin cuenta
        </Link>
        : tu progreso se guarda en este navegador.
      </p>
    </div>
  );
}
