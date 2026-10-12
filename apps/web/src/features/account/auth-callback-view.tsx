"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { useServices } from "@/hooks/services-context";
import { safeNextPath } from "@lexi/core/services/auth";

/**
 * Landing page for Google and for the email confirmation link. supabase-js exchanges the
 * one-time code from the URL when it starts; here we wait for that and move on.
 */
export function AuthCallbackView() {
  const params = useSearchParams();
  const router = useRouter();
  const { auth } = useServices();
  const [failed, setFailed] = useState(false);
  const providerError = params.get("error_description") ?? params.get("error");
  const next = safeNextPath(params.get("next"));

  useEffect(() => {
    if (providerError) return;
    const service = auth();
    if (!service) return;
    let cancelled = false;
    void service.ready().then((snapshot) => {
      if (cancelled) return;
      if (snapshot.status === "signed-in") router.replace(next);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [auth, next, providerError, router]);

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
