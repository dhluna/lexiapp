import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/empty-state";
import { SignInView } from "@/features/account/sign-in-view";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-md" />}>
      <SignInView />
    </Suspense>
  );
}
