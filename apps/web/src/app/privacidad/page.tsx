import type { Metadata } from "next";
import { PrivacyPolicy } from "@/features/legal/privacy-policy";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos trata Lexi, para qué y cómo ejercer tus derechos.",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
