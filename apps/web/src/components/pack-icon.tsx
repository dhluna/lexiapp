import {
  Briefcase,
  Cpu,
  Plane,
  Puzzle,
  Smile,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { PackId } from "@lexi/core/domain/types";

const ICONS: Record<PackId, LucideIcon> = {
  essentials: Sparkles,
  technology: Cpu,
  food: UtensilsCrossed,
  work: Briefcase,
  travel: Plane,
  "phrasal-verbs": Puzzle,
  emotions: Smile,
};

export function PackIcon({ id, className = "size-5" }: { id: PackId; className?: string }) {
  const Icon = ICONS[id];
  return <Icon aria-hidden className={className} />;
}
