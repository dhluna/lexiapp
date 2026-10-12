import type { Metadata } from "next";
import { ResetPasswordView } from "@/features/account/reset-password-view";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false } };

export default function ResetPasswordPage() {
  return <ResetPasswordView />;
}
