import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/empty-state";
import { AuthCallbackView } from "@/features/account/auth-callback-view";

export const metadata: Metadata = { title: "Iniciando sesión", robots: { index: false } };

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-24 max-w-md" />}>
      <AuthCallbackView />
    </Suspense>
  );
}
