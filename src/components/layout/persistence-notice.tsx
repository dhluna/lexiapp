"use client";

import { CircleAlert } from "lucide-react";
import { useProgress } from "@/hooks/use-progress";

const MESSAGES = {
  unavailable:
    "Tu navegador no permite guardar datos en este sitio. Puedes practicar, pero el progreso se perderá al cerrar la pestaña.",
  "write-failed":
    "No se pudo guardar el último cambio: el almacenamiento del navegador está lleno o bloqueado.",
  recovered:
    "Encontramos datos guardados que no se podían leer. Guardamos una copia y empezamos un progreso nuevo.",
} as const;

export function PersistenceNotice() {
  const snapshot = useProgress();
  if (!snapshot?.issue) return null;
  return (
    <div role="status" className="mb-6 flex gap-3 rounded-2xl bg-review-soft p-4 text-review">
      <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
      <p>{MESSAGES[snapshot.issue]}</p>
    </div>
  );
}
