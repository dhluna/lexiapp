import { CATEGORIES } from "@lexi/core/data/categories";
import type { CategoryId, UserProgressState } from "@lexi/core/domain/types";
import { planSession, planText, poolCounts } from "@lexi/core/planning/session-plan";
import { Link } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { CategoryIcon } from "@/components/category-icon";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { RADIUS, useTheme } from "@/theme";

/** One obvious action (today's session) and one tap per category. No filters (same as the web). */
export function PracticeSetup({ state, onStart }: { state: UserProgressState; onStart: (c: CategoryId | null) => void }) {
  const { colors } = useTheme();
  const size = state.preferences.sessionSize;

  return (
    <Screen>
      <Card>
        <AppText variant="title" accessibilityRole="header">
          Practicar
        </AppText>
        <AppText variant="muted">{planText(planSession(state, size))}</AppText>
        <Button title="Empezar" onPress={() => onStart(null)} />
        <AppText variant="small">
          Primero salen las palabras por repasar y luego las nuevas.{" "}
          <Link href="/ajustes" style={{ color: colors.accent, fontWeight: "600" }}>
            Cambiar palabras por sesión
          </Link>
        </AppText>
      </Card>

      <AppText variant="heading">O practica una categoría</AppText>
      <View style={{ gap: 10 }}>
        {CATEGORIES.map((category) => {
          const counts = poolCounts(state, category.id);
          const summary =
            counts.pending > 0
              ? `${counts.pending} por repasar`
              : counts.fresh > 0
                ? `${counts.fresh} ${counts.fresh === 1 ? "nueva" : "nuevas"}`
                : "Todo aprendido";
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={`Practicar ${category.name}: ${summary}`}
              onPress={() => onStart(category.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 14,
                borderRadius: RADIUS.lg,
                borderWidth: 1,
                borderColor: pressed ? colors.accent : colors.line,
                backgroundColor: colors.surface,
              })}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: RADIUS.md,
                  backgroundColor: colors["accent-soft"],
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CategoryIcon id={category.id} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="subheading">{category.name}</AppText>
                <AppText variant="small" color={counts.pending > 0 ? colors.review : colors["ink-soft"]}>
                  {summary}
                </AppText>
              </View>
              <ChevronRight size={20} color={colors["ink-soft"]} />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
