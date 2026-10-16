"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { useServices } from "@/hooks/services-context";
import { safeNextPath } from "@lexi/core/services/auth";

/**
 * Landing page for Google and for the email confirmation link.
 * - Google returns `?code=`: supabase-js exchanges it when it starts; here we wait for that.
 * - The confirmation email links `?token_hash=&type=`: verified here, so the link works even
 *   in another browser or device than the one used to sign up.
 */
export function AuthCallbackView() {
  const params = useSearchParams();
  const router = useRouter();
  const { auth } = useServices();
  const [failed, setFailed] = useState(false);
  const providerError = params.get("error_description") ?? params.get("error");
  const next = safeNextPath(params.get("next"));
  const tokenHash = params.get("token_hash");
  const verified = useRef<string | null>(null);

  useEffect(() => {
    if (providerError) return;
    const service = auth();
    if (!service) return;
    if (tokenHash) {
      // Single-use token: verify it once, even if the effect runs again.
      if (verified.current === tokenHash) return;
      verified.current = tokenHash;
      void service.completeRedirect(window.location.href).then((result) => {
        if (result.ok) router.replace(next);
        else setFailed(true);
      });
      return;
    }
    let cancelled = false;
    void service.ready().then((snapshot) => {
      if (cancelled) return;
      if (snapshot.status === "signed-in") router.replace(next);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [auth, next, providerError, router, tokenHash]);

  if (providerError || failed) {
    return (
      <div className="mx-auto max-w-md">
        <EmptyState title="No se pudo iniciar sesión">
          <p>El enlace caducó, ya se usó o se canceló el acceso. Vuelve a intentarlo.</p>
          <ButtonLink href={`/entrar?next=${encodeURIComponent(next)}`} className="mt-4">
            Volver a entrar
          </ButtonLink>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-md gap-3" aria-busy="true">
      <p className="text-center font-semibold text-ink-soft">Iniciando sesión…</p>
      <Skeleton className="h-24" />
    </div>
  );
}
