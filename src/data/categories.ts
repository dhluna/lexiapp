import type { CategoryId } from "@/domain/types";

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: "daily-life", name: "Vida cotidiana", description: "Casa, rutinas y vecindario" },
  { id: "business", name: "Negocios", description: "Oficina, dinero y reuniones" },
  { id: "travel", name: "Viajes", description: "Aeropuertos, reservas y turismo" },
  { id: "technology", name: "Tecnología", description: "Dispositivos, internet y datos" },
  { id: "health", name: "Salud", description: "Cuerpo, síntomas y médicos" },
  { id: "food", name: "Alimentación", description: "Cocina, sabores y compras" },
  { id: "education", name: "Educación", description: "Escuela, estudio y títulos" },
  { id: "communication", name: "Comunicación", description: "Hablar, escuchar y entenderse" },
];

export const CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((c) => c.id);

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && CATEGORY_IDS.includes(value as CategoryId);
}
