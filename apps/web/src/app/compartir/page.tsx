import type { Metadata } from "next";
import { ShareView } from "@/features/share/share-view";

export const metadata: Metadata = {
  title: "Comparte Lexi",
  description: "Comparte Lexi con un enlace, por WhatsApp o redes, o con su código QR.",
  alternates: { canonical: "/compartir" },
};

export default function SharePage() {
  return <ShareView />;
}
