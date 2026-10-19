import { getActiveWords } from "@lexi/core/data/catalog";
import { achievedCount, levelFor, packBadges } from "@lexi/core/domain/levels";
import { PACKS } from "@lexi/core/data/packs";
import { toDayKey } from "@lexi/core/domain/dates";
import { useRouter } from "expo-router";
import { Flame } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { BadgesCard } from "@/components/levels";
import { PackIcon } from "@/components/pack-icon";
import { PracticeCalendar } from "@/components/practice-calendar";
import { AppText, Button, Card, ProgressBar, Screen } from "@/components/ui";
import { useProgress, useStats } from "@/hooks/use-progress";
import { FONTS, RADIUS, useTheme } from "@/theme";

const days = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

function Figure({ term, value, suffix, color, icon }: { term: string; value: number; suffix?: string; color: string; icon?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }} accessible accessibilityLabel={`${term}: ${value}${suffix ?? ""}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {icon}
        <AppText style={{ fontFamily: FONTS.display, fontSize: 30, lineHeight: 36 }} color={color}>
          {value}
        </AppText>
        {suffix && (
          <AppText variant="label" color={colors["ink-soft"]}>
            {suffix}
          </AppText>
        )}
      </View>
      <AppText variant="small">{term}</AppText>
    </View>
  );
}

export function ProgressScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state } = useProgress();
  const stats = useStats();
  const { streak } = stats;

  if (stats.studied === 0 && state.practiceDays.length === 0) {
    return (
      <Screen>
        <Card>
          <AppText variant="heading">Aún no hay progreso</AppText>
          <AppText variant="muted">Completa tu primera sesión y aquí verás tu racha y tus palabras aprendidas.</AppText>
          <Button
            title="Empezar práctica"
            onPress={() => router.navigate({ pathname: "/practicar", params: { empezar: "1", t: String(Date.now()) } })}
          />
        </Card>
      </Screen>
    );
  }

  const pending = getActiveWords(state).filter((w) => state.words[w.id]?.status === "review");

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Figure
            term={streak.current === 1 ? "Día de racha" : "Días de racha"}
            value={streak.current}
            color={colors.ink}
            icon={<Flame size={20} color={streak.current > 0 ? colors.review : colors["ink-soft"]} />}
          />
          <Figure term="Aprendidas" value={stats.learned} suffix={`/${stats.totalWords}`} color={colors.learned} />
          <Figure term="Por repasar" value={stats.review} color={colors.review} />
        </View>
        <ProgressBar value={stats.learned} secondary={stats.review} max={stats.totalWords} label="Palabras aprendidas del catálogo" height={10} />
        <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 4 }} />
        <AppText variant="label" color={colors["ink-soft"]}>
          Últimas cuatro semanas
        </AppText>
        <PracticeCalendar practiceDays={state.practiceDays} today={toDayKey(new Date())} days={28} />
        <AppText variant="small">
          Mejor racha: {days(streak.best)}. Sesiones completadas: {stats.sessionsCompleted}.
        </AppText>
      </Card>

      {pending.length > 0 && (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <AppText variant="heading">Por repasar</AppText>
            <Button
              title="Repasar ahora"
              variant="secondary"
              onPress={() => router.navigate({ pathname: "/practicar", params: { empezar: "1", t: String(Date.now()) } })}
            />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {pending.map((word) => (
              <Pressable
                key={word.id}
                accessibilityRole="link"
                accessibilityLabel={`${word.term}: ${word.translation}`}
                onPress={() => router.push({ pathname: "/palabra/[id]", params: { id: word.id } })}
                style={{
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  borderRadius: RADIUS.md,
                  backgroundColor: colors["surface-sunken"],
                }}
              >
                <AppText variant="subheading">{word.term}</AppText>
                <AppText variant="muted">{word.translation}</AppText>
              </Pressable>
            ))}
          </View>
        </Card>
      )}

      <Card>
        <AppText variant="heading">Por paquete</AppText>
        {PACKS.map((pack) => {
          const c = stats.byPack[pack.id];
          if (!c) return null;
          return (
            <Pressable
              key={pack.id}
              accessibilityRole="link"
              accessibilityLabel={`${pack.name}: ${c.learned} de ${c.total} aprendidas`}
              onPress={() => router.push({ pathname: "/paquete/[id]", params: { id: pack.id } })}
              style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <PackIcon id={pack.id} color={colors.accent} />
              <AppText variant="subheading" numberOfLines={1} style={{ width: 118 }}>
                {pack.name}
              </AppText>
              <View style={{ flex: 1 }}>
                <ProgressBar value={c.learned} secondary={c.review} max={c.total} label={`Progreso en ${pack.name}`} />
              </View>
              <AppText variant="small" style={{ width: 42, textAlign: "right" }}>
                {c.learned}/{c.total}
              </AppText>
            </Pressable>
          );
        })}
        {Object.keys(stats.byPack).length < PACKS.length && (
          <Button title="Añadir más paquetes" variant="ghost" onPress={() => router.navigate("/vocabulario")} />
        )}
      </Card>

      <BadgesCard status={levelFor(achievedCount(state))} packs={packBadges(state)} />
    </Screen>
  );
}
