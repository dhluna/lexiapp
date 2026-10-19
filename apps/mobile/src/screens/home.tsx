import { activePackIds } from "@lexi/core/data/catalog";
import { achievedCount, levelFor } from "@lexi/core/domain/levels";
import { PACKS } from "@lexi/core/data/packs";
import { toDayKey } from "@lexi/core/domain/dates";
import { planSession, planText } from "@lexi/core/planning/session-plan";
import { useRouter } from "expo-router";
import { Flame, Plus } from "lucide-react-native";
import { View } from "react-native";
import { LevelSummary } from "@/components/levels";
import { PracticeCalendar } from "@/components/practice-calendar";
import { AppText, Button, Card, ProgressBar, Screen } from "@/components/ui";
import { useProgress, useStats } from "@/hooks/use-progress";
import { FONTS, useTheme } from "@/theme";

function Figure({ term, value, color }: { term: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1 }} accessible accessibilityLabel={`${term}: ${value}`}>
      <AppText variant="small">{term}</AppText>
      <AppText style={{ fontFamily: FONTS.display, fontSize: 30, lineHeight: 36 }} color={color}>
        {value}
      </AppText>
    </View>
  );
}

export function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state } = useProgress();
  const stats = useStats();
  const { streak } = stats;
  const firstTime = stats.studied === 0;
  const activePacks = activePackIds(state).length;
  const plan = planSession(state, state.preferences.sessionSize);

  const title = firstTime ? "Tus primeras palabras" : streak.practicedToday ? "Hoy ya practicaste" : "Tu práctica de hoy";
  const streakTitle =
    streak.current === 0 ? "Sin racha activa" : `Racha de ${streak.current} ${streak.current === 1 ? "día" : "días"}`;
  const streakHint =
    (streak.current === 0
      ? "Practica hoy para empezar una."
      : streak.practicedToday
        ? "Vuelve mañana para mantenerla."
        : "Practica hoy para no perderla.") +
    (streak.best > streak.current ? ` Tu mejor racha: ${streak.best} días.` : "");

  return (
    <Screen>
      <Card>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="muted">
          {streak.practicedToday && !firstTime ? "Puedes hacer otra ronda. " : ""}
          {planText(plan)}
        </AppText>
        <Button
          title={streak.practicedToday ? "Practicar otra vez" : "Empezar práctica"}
          onPress={() => router.push({ pathname: "/practicar", params: { empezar: "1", t: String(Date.now()) } })}
        />
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Flame size={20} color={streak.current > 0 ? colors.review : colors["ink-soft"]} />
          <AppText variant="heading">{streakTitle}</AppText>
        </View>
        <AppText variant="muted">{streakHint}</AppText>
        <PracticeCalendar practiceDays={state.practiceDays} today={toDayKey(new Date())} />
      </Card>

      <Card>
        <LevelSummary status={levelFor(achievedCount(state))} />
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <AppText variant="heading">Tu vocabulario</AppText>
        <AppText variant="muted">
          Has estudiado {stats.studied} de {stats.totalWords} palabras
          {activePacks === 1 ? " del paquete Esenciales." : ` de tus ${activePacks} paquetes.`}
        </AppText>
        <ProgressBar
          value={stats.learned}
          secondary={stats.review}
          max={stats.totalWords}
          label="Palabras aprendidas del catálogo"
          height={12}
        />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Figure term="Aprendidas" value={stats.learned} color={colors.learned} />
          <Figure term="Por repasar" value={stats.review} color={colors.review} />
          <Figure term="Sesiones" value={stats.sessionsCompleted} color={colors.ink} />
        </View>
        {activePacks < PACKS.length && (
          <Button
            title="Añade un paquete de palabras"
            variant="ghost"
            icon={<Plus color={colors["ink-soft"]} size={16} />}
            onPress={() => router.navigate("/vocabulario")}
          />
        )}
      </Card>
    </Screen>
  );
}
