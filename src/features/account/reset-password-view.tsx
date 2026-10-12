"use client";

import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { useAuth } from "@/hooks/use-account";
import { MIN_PASSWORD_LENGTH } from "@/services/auth";

/** Opened from the password-reset email: the link signs the user in, then they pick a password. */
export function ResetPasswordView() {
  const { available, snapshot, service } = useAuth();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (available === null || (available && (!snapshot || snapshot.status === "loading"))) {
    return <Skeleton className="mx-auto h-72 max-w-md" />;
  }

  if (!available || !service || snapshot?.status !== "signed-in") {
    return (
      <div className="mx-auto max-w-md">
        <EmptyState title="El enlace caducó o no es válido">
          <p>Pide un enlace nuevo para restablecer tu contraseña.</p>
          <ButtonLink href="/entrar?modo=recuperar" className="mt-4">
            Pedir otro enlace
          </ButtonLink>
        </EmptyState>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md">
        <EmptyState title="Contraseña actualizada">
          <p>Ya puedes usarla para entrar en todos tus dispositivos.</p>
          <ButtonLink href="/ajustes" className="mt-4">
            Ir a Ajustes
          </ButtonLink>
        </EmptyState>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== repeat) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await service.updatePassword(password);
    setPending(false);
    if (result.ok) setDone(true);
    else setError(result.message);
  };

  const input = "mt-1.5 min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-base focus-visible:border-accent";

  return (
    <div className="mx-auto grid max-w-md gap-6">
      <h1 className="font-display text-4xl font-bold tracking-tight">Nueva contraseña</h1>
      <form onSubmit={submit} className="grid gap-4 rounded-3xl bg-surface p-6 sm:p-8">
        <div>
          <label htmlFor="nueva" className="block font-semibold">
            Contraseña nueva
          </label>
          <input
            id="nueva"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            aria-describedby="ayuda-nueva"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
          <p id="ayuda-nueva" className="mt-1 text-sm text-ink-soft">
            Al menos {MIN_PASSWORD_LENGTH} caracteres.
          </p>
        </div>
        <label className="block font-semibold">
          Repite la contraseña
          <input
            type="password"
            required
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className={input}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft p-3 font-semibold text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          Guardar contraseña
        </Button>
      </form>
    </div>
  );
}
