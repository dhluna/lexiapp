import { formatPoints, LEVELS, POINTS_PER_WORD, type LevelStatus, type PackBadge } from "@lexi/core/domain/levels";
import { BookOpen, Check, Compass, Crown, Footprints, Gem, MessagesSquare, Rocket, Zap, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { PackIcon } from "@/components/pack-icon";
import { AppText, Card, ProgressBar } from "@/components/ui";
import { FONTS, RADIUS, useTheme } from "@/theme";

const ICONS: Record<number, LucideIcon> = {
  1: Footprints,
  2: BookOpen,
  3: Compass,
  4: MessagesSquare,
  5: Zap,
  6: Rocket,
  7: Gem,
  8: Crown,
};

/** Round badge of a level (same as the web): brand colors when earned, muted while locked. */
export function LevelBadge({ level, earned = true, size = 48 }: { level: number; earned?: boolean; size?: number }) {
  const { colors } = useTheme();
  const Icon = ICONS[level] ?? Footprints;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: earned ? colors["accent-soft"] : colors["surface-sunken"],
        borderWidth: earned ? 2 : 0,
        borderColor: colors.accent + "40",
      }}
    >
      <Icon size={size / 2} color={earned ? colors.accent : colors["ink-soft"]} strokeWidth={2.25} />
    </View>
  );
}

/** Current level, points and what is left for the next one (home). */
export function LevelSummary({ status }: { status: LevelStatus }) {
  const { level, next, points, wordsToNext } = status;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <LevelBadge level={level.number} size={56} />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="subheading" style={{ fontFamily: FONTS.display, fontSize: 18 }}>
          Nivel {level.number} · {level.name}
        </AppText>
        <AppText variant="small">{formatPoints(points)} puntos</AppText>
        <ProgressBar
          value={next ? status.achieved - level.words : 1}
          max={next ? next.words - level.words : 1}
          label={next ? `Progreso hacia el nivel ${next.name}` : "Nivel máximo"}
        />
        <AppText variant="small">
          {next && wordsToNext !== null
            ? `${wordsToNext} ${wordsToNext === 1 ? "palabra" : "palabras"} para ${next.name}`
            : "¡Nivel máximo! Has aprendido todo el catálogo."}
        </AppText>
      </View>
    </View>
  );
}

/** Progress screen: every level and one badge per completed pack. */
export function BadgesCard({ status, packs }: { status: LevelStatus; packs: PackBadge[] }) {
  const { colors } = useTheme();
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        Insignias
      </AppText>
      <AppText variant="muted">
        Ganas {POINTS_PER_WORD} puntos por cada palabra aprendida. Llevas {formatPoints(status.points)}.
      </AppText>

      <AppText variant="label">Niveles</AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {LEVELS.map((level) => {
          const earned = status.achieved >= level.words;
          return (
            <View
              key={level.number}
              accessible
              accessibilityLabel={`Nivel ${level.number}, ${level.name}: ${earned ? "conseguido" : `${level.words} palabras`}`}
              style={{
                width: "47%",
                alignItems: "center",
                gap: 6,
                padding: 12,
                borderRadius: RADIUS.lg,
                borderWidth: 1,
                borderColor: level.number === status.level.number ? colors.accent : colors.line,
              }}
            >
              <LevelBadge level={level.number} earned={earned} />
              <AppText variant="label" color={earned ? colors.ink : colors["ink-soft"]}>
                {level.name}
              </AppText>
              <AppText variant="small">{level.words === 0 ? "Al empezar" : `${level.words} palabras`}</AppText>
            </View>
          );
        })}
      </View>

      <AppText variant="label">Paquetes completados</AppText>
      <View style={{ gap: 8 }}>
        {packs.map((pack) => (
          <View
            key={pack.packId}
            accessible
            accessibilityLabel={`${pack.name}: ${pack.complete ? "completado" : `${pack.achieved} de ${pack.total}`}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 10,
              borderRadius: RADIUS.lg,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pack.complete ? colors["accent-soft"] : colors["surface-sunken"],
              }}
            >
              <PackIcon id={pack.packId} color={pack.complete ? colors.accent : colors["ink-soft"]} />
            </View>
            <AppText variant="subheading" style={{ flex: 1 }} color={pack.complete ? colors.ink : colors["ink-soft"]}>
              {pack.name}
            </AppText>
            {pack.complete ? (
              <Check size={20} color={colors.learned} strokeWidth={3} />
            ) : (
              <AppText variant="small">
                {pack.achieved}/{pack.total}
              </AppText>
            )}
          </View>
        ))}
      </View>
    </Card>
  );
}
