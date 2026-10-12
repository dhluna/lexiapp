"use client";

import { CircleAlert, CloudCheck, CloudOff, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty-state";
import { useAuth, useSync } from "@/hooks/use-account";
import type { SyncSnapshot } from "@/services/sync-service";

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

function SyncLine({ sync }: { sync: SyncSnapshot }) {
  if (sync.status === "syncing") {
    return (
      <p className="flex items-center gap-2 text-ink-soft">
        <RefreshCw aria-hidden className="size-4 animate-spin" /> Sincronizando…
      </p>
    );
  }
  if (sync.status === "offline") {
    return (
      <p className="flex items-center gap-2 text-ink-soft">
        <CloudOff aria-hidden className="size-4" /> Sin conexión: se sincronizará al volver.
      </p>
    );
  }
  if (sync.status === "error") {
    return (
      <p className="flex items-center gap-2 text-danger">
        <CircleAlert aria-hidden className="size-4" /> {sync.error ?? "No se pudo sincronizar."}
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-learned">
      <CloudCheck aria-hidden className="size-4" />
      {sync.lastSyncedAt ? `Sincronizado ${formatAgo(sync.lastSyncedAt)}.` : "Preparando la sincronización…"}
    </p>
  );
}

/** First group of Ajustes. Hidden when accounts are not configured. */
export function AccountSection() {
  const { available, snapshot } = useAuth();
  const sync = useSync();
  const [confirm, setConfirm] = useState<null | "sign-out-offline" | "delete">(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  if (available !== true) return null;

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>, done: string) => {
    setBusy(true);
    setMessage(null);
    const result = await action();
    setBusy(false);
    setConfirm(null);
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
          <div>
            <p className="font-semibold break-all">{snapshot.user!.email ?? "Cuenta sin email"}</p>
            <p className="text-sm text-ink-soft">
              {snapshot.user!.provider === "google" ? "Con tu cuenta de Google" : "Con email y contraseña"}
            </p>
          </div>

          {sync.snapshot && <SyncLine sync={sync.snapshot} />}

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={busy || sync.snapshot?.status === "syncing"}
              onClick={() => void sync.service?.syncNow()}
            >
              <RefreshCw aria-hidden className="size-4" />
              Sincronizar ahora
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (sync.snapshot?.status === "offline" || sync.snapshot?.status === "error") {
                  setConfirm("sign-out-offline");
                  return;
                }
                void run(
                  () => sync.service!.signOut(),
                  "Sesión cerrada. Tu progreso sigue guardado en tu cuenta.",
                );
              }}
            >
              Cerrar sesión
            </Button>
          </div>

          {confirm === "sign-out-offline" && (
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
                <Button variant="secondary" onClick={() => setConfirm(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="border-t border-line pt-4">
            {confirm === "delete" ? (
              <div role="alertdialog" aria-labelledby="aviso-eliminar">
                <p id="aviso-eliminar" className="font-semibold">
                  Se borrarán tu cuenta y todo tu progreso guardado en ella. No se puede deshacer.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => void run(() => sync.service!.deleteAccount(), "Cuenta eliminada.")}
                  >
                    Eliminar mi cuenta y todo mi progreso
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirm(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirm("delete")}>
                Eliminar cuenta
              </Button>
            )}
          </div>
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
