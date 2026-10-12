import { addDays } from "@lexi/core/domain/dates";
import { View } from "react-native";
import { RADIUS, useTheme } from "@/theme";
import { AppText } from "./ui";

const WEEKDAY = new Intl.DateTimeFormat("es", { weekday: "narrow", timeZone: "UTC" });
const LONG = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const toUtcDate = (dayKey: string) => {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/** Last `days` days ending today; practiced days are filled in (same as the web). */
export function PracticeCalendar({ practiceDays, today, days = 7 }: { practiceDays: readonly string[]; today: string; days?: number }) {
  const { colors } = useTheme();
  const practiced = new Set(practiceDays);
  const keys = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));
  const rows = Array.from({ length: Math.ceil(keys.length / 7) }, (_, r) => keys.slice(r * 7, r * 7 + 7));

  return (
    <View style={{ gap: 6 }} accessibilityLabel={`Práctica de los últimos ${days} días`}>
      {rows.map((row) => (
        <View key={row[0]} style={{ flexDirection: "row", gap: 6 }}>
          {row.map((key) => {
            const done = practiced.has(key);
            const isToday = key === today;
            const date = toUtcDate(key);
            return (
              <View
                key={key}
                style={{ flex: 1, alignItems: "center", gap: 4 }}
                accessible
                accessibilityLabel={`${LONG.format(date)}: ${done ? "practicado" : "sin práctica"}${isToday ? " (hoy)" : ""}`}
              >
                {days <= 7 && (
                  <AppText variant="small" style={{ textTransform: "uppercase" }}>
                    {WEEKDAY.format(date)}
                  </AppText>
                )}
                <View
                  style={{
                    width: "100%",
                    aspectRatio: 1,
                    maxWidth: 44,
                    borderRadius: RADIUS.sm,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: done ? colors.learned : colors["surface-sunken"],
                    borderWidth: isToday ? 2 : 0,
                    borderColor: colors.accent,
                  }}
                >
                  <AppText variant="label" color={done ? colors.surface : colors["ink-soft"]}>
                    {date.getUTCDate()}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
