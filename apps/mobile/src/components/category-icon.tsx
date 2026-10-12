import type { CategoryId } from "@lexi/core/domain/types";
import {
  Briefcase,
  Cpu,
  GraduationCap,
  HeartPulse,
  House,
  MessagesSquare,
  Plane,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react-native";

const ICONS: Record<CategoryId, LucideIcon> = {
  "daily-life": House,
  business: Briefcase,
  travel: Plane,
  technology: Cpu,
  health: HeartPulse,
  food: UtensilsCrossed,
  education: GraduationCap,
  communication: MessagesSquare,
};

export function CategoryIcon({ id, color, size = 20 }: { id: CategoryId; color: string; size?: number }) {
  const Icon = ICONS[id];
  return <Icon color={color} size={size} accessibilityElementsHidden importantForAccessibility="no" />;
}
