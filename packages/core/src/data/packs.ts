import type { PackId } from "../domain/types";

export interface Pack {
  id: PackId;
  name: string;
  description: string;
  /** The core pack is always active and cannot be removed. */
  core: boolean;
}

export const CORE_PACK_ID: PackId = "essentials";

export const PACKS: readonly Pack[] = [
  { id: "essentials", name: "Esenciales", description: "Las 150 palabras más usadas del inglés", core: true },
  { id: "technology", name: "Tecnología", description: "Dispositivos, internet y datos", core: false },
  { id: "food", name: "Comida", description: "Cocina, sabores y compras", core: false },
  { id: "work", name: "Trabajo y oficina", description: "Reuniones, correos y proyectos", core: false },
  { id: "travel", name: "Viajes", description: "Aeropuertos, reservas y turismo", core: false },
  { id: "phrasal-verbs", name: "Phrasal verbs", description: "Los verbos con partícula más comunes", core: false },
  { id: "emotions", name: "Emociones y personalidad", description: "Sentimientos, carácter y relaciones", core: false },
];

export const PACK_IDS: readonly PackId[] = PACKS.map((p) => p.id);

export function getPack(id: string): Pack | undefined {
  return PACKS.find((p) => p.id === id);
}

export function isPackId(value: unknown): value is PackId {
  return typeof value === "string" && PACK_IDS.includes(value as PackId);
}

/** Packs a learner can add or remove (every pack but the core one). */
export function isOptionalPackId(value: unknown): value is PackId {
  return isPackId(value) && value !== CORE_PACK_ID;
}
