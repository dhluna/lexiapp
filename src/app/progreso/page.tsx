import type { Metadata } from "next";
import { ProgressView } from "@/features/progress/progress-view";

export const metadata: Metadata = { title: "Progreso" };

export default function ProgressPage() {
  return <ProgressView />;
}
