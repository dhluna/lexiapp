import { activePackIds } from "@lexi/core/data/catalog";
import { getPack, PACKS } from "@lexi/core/data/packs";
import type { PackId, UserProgressState } from "@lexi/core/domain/types";
import { planSession, planText, poolCounts, quizCount, quizText } from "@lexi/core/planning/session-plan";
import { Link, useRouter } from "expo-router";
import { ChevronRight, PencilLine, Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { PackIcon } from "@/components/pack-icon";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { RADIUS, useTheme } from "@/theme";

/** One obvious action (today's session) and one tap per active pack. No filters (same as the web). */
export function PracticeSetup({
  state,
  onStart,
  onStartQuiz,
}: {
  state: UserProgressState;
  onStart: (p: PackId | null) => void;
  onStartQuiz: () => void;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const size = state.preferences.sessionSize;
  const packs = activePackIds(state).flatMap((id) => getPack(id) ?? []);

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

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <PencilLine size={20} color={colors.accent} />
          <AppText variant="heading" accessibilityRole="header">
            Ponerme a prueba
          </AppText>
        </View>
        <AppText variant="muted">
          Escucha y escribe, o completa frases con las palabras que ya has visto. Si aciertas, quedan aprendidas.
        </AppText>
        <AppText variant="label">{quizText(state, size)}</AppText>
        <Button title="Ponerme a prueba" variant="secondary" disabled={quizCount(state) === 0} onPress={onStartQuiz} />
      </Card>

      <AppText variant="heading">O practica un paquete</AppText>
      <View style={{ gap: 10 }}>
        {packs.map((pack) => {
          const counts = poolCounts(state, pack.id);
          const summary =
            counts.pending > 0
              ? `${counts.pending} por repasar`
              : counts.fresh > 0
                ? `${counts.fresh} ${counts.fresh === 1 ? "nueva" : "nuevas"}`
                : "Todo aprendido";
          return (
            <Pressable
              key={pack.id}
              accessibilityRole="button"
              accessibilityLabel={`Practicar ${pack.name}: ${summary}`}
              onPress={() => onStart(pack.id)}
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
                <PackIcon id={pack.id} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="subheading">{pack.name}</AppText>
                <AppText variant="small" color={counts.pending > 0 ? colors.review : colors["ink-soft"]}>
                  {summary}
                </AppText>
              </View>
              <ChevronRight size={20} color={colors["ink-soft"]} />
            </Pressable>
          );
        })}
      </View>
      {packs.length < PACKS.length && (
        <Button
          title="Añadir más paquetes"
          variant="ghost"
          icon={<Plus color={colors["ink-soft"]} size={16} />}
          onPress={() => router.navigate("/vocabulario")}
        />
      )}
    </Screen>
  );
}
