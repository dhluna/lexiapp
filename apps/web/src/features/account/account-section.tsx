"use client";

import { ChevronRight, CircleAlert, CloudCheck, CloudOff, LogOut, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty-state";
import { LevelBadge } from "@/components/level-badge";
import { cn } from "@/lib/cn";
import { useAuth, useSync } from "@/hooks/use-account";
import { useProgress } from "@/hooks/use-progress";
import { achievedCount, formatPoints, levelFor } from "@lexi/core/domain/levels";
import type { SyncSnapshot } from "@lexi/core/services/sync-service";

const RELATIVE = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function formatAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((Date.parse(iso) - now.getTime()) / 1000);
  if (Math.abs(seconds) < 45) return "ahora mismo";
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RELATIVE.format(hours, "hour");
  return RELATIVE.format(Math.round(hours / 24), "day");
}

const SYNC_TONES: Record<SyncSnapshot["status"], string> = {
  disabled: "bg-sunken text-ink-soft",
  idle: "bg-learned-soft text-learned",
  syncing: "bg-sunken text-ink-soft",
  offline: "bg-sunken text-ink-soft",
  error: "bg-danger-soft text-danger",
};

function syncText(sync: SyncSnapshot) {
  if (sync.status === "syncing") return "Sincronizando…";
  if (sync.status === "offline") return "Sin conexión: se sincronizará al volver.";
  if (sync.status === "error") return sync.error ?? "No se pudo sincronizar.";
  return sync.lastSyncedAt ? `Sincronizado ${formatAgo(sync.lastSyncedAt)}.` : "Preparando la sincronización…";
}

/** Sync state as a tinted strip, with the button to sync now. */
function SyncPanel({ sync, disabled, onSync }: { sync: SyncSnapshot; disabled: boolean; onSync: () => void }) {
  const Icon =
    sync.status === "syncing" ? RefreshCw : sync.status === "offline" ? CloudOff : sync.status === "error" ? CircleAlert : CloudCheck;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl p-2 pl-4", SYNC_TONES[sync.status])}>
      <p className="flex min-w-48 flex-1 items-center gap-2 py-2 font-semibold">
        <Icon aria-hidden className={cn("size-5 shrink-0", sync.status === "syncing" && "animate-spin")} />
        {syncText(sync)}
      </p>
      <Button variant="secondary" disabled={disabled || sync.status === "syncing"} onClick={onSync}>
        <RefreshCw aria-hidden className="size-4" />
        Sincronizar ahora
      </Button>
    </div>
  );
}

/** Level badge next to the account: who you are and how far you got. */
function AccountLevel({ achieved }: { achieved: number }) {
  const { level, points } = levelFor(achieved);
  return (
    <Link
      href="/progreso#insignias"
      aria-label={`Nivel ${level.number}, ${level.name}, ${formatPoints(points)} puntos: ver insignias`}
      className="flex min-h-11 items-center gap-3 rounded-2xl border border-line py-2 pr-2 pl-2 transition-colors hover:bg-sunken"
    >
      <LevelBadge level={level.number} />
      <span aria-hidden className="flex-1">
        <span className="block text-sm leading-tight font-semibold">
          Nivel {level.number} · {level.name}
        </span>
        <span className="block text-sm text-ink-soft tabular-nums">{formatPoints(points)} puntos</span>
      </span>
      <ChevronRight aria-hidden className="size-4 text-ink-soft" />
    </Link>
  );
}

/** First group of Ajustes. Hidden when accounts are not configured. */
export function AccountSection() {
  const { available, snapshot } = useAuth();
  const sync = useSync();
  const progress = useProgress();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  if (available !== true) return null;

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>, done: string) => {
    setBusy(true);
    setMessage(null);
    const result = await action();
    setBusy(false);
    setConfirm(false);
    setMessage(result.ok ? { tone: "ok", text: done } : { tone: "error", text: result.message ?? "Inténtalo de nuevo." });
  };

  const signedIn = snapshot?.status === "signed-in" && snapshot.user;

  return (
    <section aria-labelledby="cuenta" className="grid gap-5 rounded-3xl bg-surface p-6 sm:p-8">
      <h2 id="cuenta" className="font-display text-xl font-semibold">
        Cuenta
      </h2>

      {!snapshot || snapshot.status === "loading" ? (
        <Skeleton className="h-20" />
      ) : !signedIn ? (
        <div>
          <p className="text-ink-soft">Guarda tu progreso y úsalo en todos tus dispositivos.</p>
          <ButtonLink href="/entrar?next=/ajustes" className="mt-4">
            Iniciar sesión
          </ButtonLink>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden
                className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-xl font-semibold text-accent-ink uppercase font-display"
              >
                {(snapshot.user!.email ?? "?").charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="font-semibold break-all">{snapshot.user!.email ?? "Cuenta sin email"}</p>
                <p className="text-sm text-ink-soft">
                  {snapshot.user!.provider === "google" ? "Con tu cuenta de Google" : "Con email y contraseña"}
                </p>
              </div>
            </div>
            {progress && <AccountLevel achieved={achievedCount(progress.state)} />}
          </div>

          {sync.snapshot && (
            <SyncPanel sync={sync.snapshot} disabled={busy} onSync={() => void sync.service?.syncNow()} />
          )}

          <div className="border-t border-line pt-4">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (sync.snapshot?.status === "offline" || sync.snapshot?.status === "error") {
                  setConfirm(true);
                  return;
                }
                void run(
                  () => sync.service!.signOut(),
                  "Sesión cerrada. Tu progreso sigue guardado en tu cuenta.",
                );
              }}
            >
              <LogOut aria-hidden className="size-4" />
              Cerrar sesión
            </Button>
          </div>

          {confirm && (
            <div role="alertdialog" aria-labelledby="aviso-salir" className="rounded-2xl bg-review-soft p-4 text-review">
              <p id="aviso-salir" className="font-semibold">
                Hay cambios que aún no se han sincronizado y se perderán al cerrar sesión.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => void run(() => sync.service!.signOut(), "Sesión cerrada.")}
                >
                  Cerrar sesión igualmente
                </Button>
                <Button variant="secondary" onClick={() => setConfirm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <p
        role="status"
        aria-live="polite"
        className={message?.tone === "error" ? "font-semibold text-danger empty:hidden" : "font-semibold text-learned empty:hidden"}
      >
        {message?.text}
      </p>
    </section>
  );
}

/** "Eliminar cuenta", in the Datos group next to "Borrar progreso". Only when signed in. */
export function DeleteAccount() {
  const { snapshot } = useAuth();
  const sync = useSync();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const signedIn = snapshot?.status === "signed-in" && snapshot.user;

  const remove = async () => {
    setBusy(true);
    setMessage(null);
    const result = await sync.service!.deleteAccount();
    setBusy(false);
    setConfirm(false);
    setMessage(result.ok ? { tone: "ok", text: "Cuenta eliminada." } : { tone: "error", text: result.message ?? "Inténtalo de nuevo." });
  };

  if (!signedIn && !message) return null;

  return (
    <div className="border-t border-line pt-5">
      {signedIn && (
        <>
          <p className="font-semibold">Eliminar cuenta</p>
          <p className="mt-1 text-ink-soft">
            Borra tu cuenta y todo el progreso guardado en ella, en todos tus dispositivos. No se puede deshacer.
          </p>
          {confirm ? (
            <div role="alertdialog" aria-labelledby="aviso-eliminar" className="mt-4">
              <p id="aviso-eliminar" className="font-semibold text-danger">
                Se borrarán tu cuenta y todo tu progreso guardado en ella. No se puede deshacer.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="danger" disabled={busy} onClick={() => void remove()}>
                  Eliminar mi cuenta y todo mi progreso
                </Button>
                <Button variant="secondary" onClick={() => setConfirm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" className="mt-4" onClick={() => setConfirm(true)}>
              Eliminar cuenta
            </Button>
          )}
        </>
      )}
      <p
        role="status"
        aria-live="polite"
        className={cn("mt-3 font-semibold empty:hidden", message?.tone === "error" ? "text-danger" : "text-learned")}
      >
        {message?.text}
      </p>
    </div>
  );
}
