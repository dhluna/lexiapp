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
} from "lucide-react";
import type { CategoryId } from "@lexi/core/domain/types";

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

export function CategoryIcon({ id, className = "size-5" }: { id: CategoryId; className?: string }) {
  const Icon = ICONS[id];
  return <Icon aria-hidden className={className} />;
}
