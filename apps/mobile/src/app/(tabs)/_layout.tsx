import { Tabs, useRouter } from "expo-router";
import { BookOpen, ChartNoAxesColumn, House, Layers, Settings, type LucideIcon } from "lucide-react-native";
import { achievedCount, levelFor } from "@lexi/core/domain/levels";
import { View, type ColorValue } from "react-native";
import { LevelBadge } from "@/components/levels";
import { IconButton } from "@/components/ui";
import { useSync } from "@/hooks/use-account";
import { useProgress } from "@/hooks/use-progress";
import { FONTS, useTheme } from "@/theme";

function SettingsButton() {
  const router = useRouter();
  const { colors } = useTheme();
  const failed = useSync().snapshot?.status === "error";
  return (
    <IconButton label={failed ? "Ajustes: no se pudo sincronizar" : "Ajustes"} onPress={() => router.push("/ajustes")}>
      <Settings size={22} color={failed ? colors.danger : colors.ink} />
    </IconButton>
  );
}

/** Current level, always in sight: opens the badges in Progreso. */
function LevelButton() {
  const router = useRouter();
  const { level } = levelFor(achievedCount(useProgress().state));
  return (
    <IconButton label={`Nivel ${level.number}, ${level.name}: ver insignias`} onPress={() => router.navigate("/progreso")}>
      <LevelBadge level={level.number} size={32} />
    </IconButton>
  );
}

function HeaderActions() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <LevelButton />
      <SettingsButton />
    </View>
  );
}

function icon(Icon: LucideIcon) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    // The tab bar passes plain color strings (we never use PlatformColor here).
    return <Icon size={24} color={color as string} strokeWidth={focused ? 2.5 : 2} />;
  };
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: FONTS.display, fontSize: 22 },
        headerShadowVisible: false,
        headerRight: () => <HeaderActions />,
        headerRightContainerStyle: { paddingRight: 8 },
        sceneStyle: { backgroundColor: colors.paper },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors["ink-soft"],
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: FONTS.bodySemi, fontSize: 12 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio", headerTitle: "lexi.", tabBarIcon: icon(House) }} />
      {/* The practice card has its own header (progress, arrows, audio). */}
      <Tabs.Screen name="practicar" options={{ title: "Practicar", headerShown: false, tabBarIcon: icon(Layers) }} />
      <Tabs.Screen name="vocabulario" options={{ title: "Vocabulario", tabBarIcon: icon(BookOpen) }} />
      <Tabs.Screen name="progreso" options={{ title: "Progreso", tabBarIcon: icon(ChartNoAxesColumn) }} />
    </Tabs>
  );
}
