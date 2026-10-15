import type { PackId } from "@lexi/core/domain/types";
import {
  Briefcase,
  Cpu,
  Plane,
  Puzzle,
  Smile,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react-native";

const ICONS: Record<PackId, LucideIcon> = {
  essentials: Sparkles,
  technology: Cpu,
  food: UtensilsCrossed,
  work: Briefcase,
  travel: Plane,
  "phrasal-verbs": Puzzle,
  emotions: Smile,
};

export function PackIcon({ id, color, size = 20 }: { id: PackId; color: string; size?: number }) {
  const Icon = ICONS[id];
  return <Icon color={color} size={size} accessibilityElementsHidden importantForAccessibility="no" />;
}
