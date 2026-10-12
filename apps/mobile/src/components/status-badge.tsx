import { STATUS_LABELS } from "@lexi/core/domain/labels";
import type { LearningStatus } from "@lexi/core/domain/types";
import { View } from "react-native";
import { RADIUS, useTheme } from "@/theme";
import { AppText } from "./ui";

export function StatusBadge({ status }: { status: LearningStatus }) {
  const { colors } = useTheme();
  const tone = {
    new: { bg: colors["surface-sunken"], fg: colors["ink-soft"] },
    review: { bg: colors["review-soft"], fg: colors.review },
    learned: { bg: colors["learned-soft"], fg: colors.learned },
  }[status];
  return (
    <View style={{ backgroundColor: tone.bg, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 }}>
      <AppText variant="label" color={tone.fg}>
        {STATUS_LABELS[status]}
      </AppText>
    </View>
  );
}
