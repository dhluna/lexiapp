// One import per weight: importing the package root would bundle every weight (~14 MB).
import { AtkinsonHyperlegibleNext_400Regular } from "@expo-google-fonts/atkinson-hyperlegible-next/400Regular";
import { AtkinsonHyperlegibleNext_600SemiBold } from "@expo-google-fonts/atkinson-hyperlegible-next/600SemiBold";
import { AtkinsonHyperlegibleNext_700Bold } from "@expo-google-fonts/atkinson-hyperlegible-next/700Bold";
import { BricolageGrotesque_600SemiBold } from "@expo-google-fonts/bricolage-grotesque/600SemiBold";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { NotoSans_400Regular } from "@expo-google-fonts/noto-sans/400Regular";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useServices } from "@/hooks/services-context";
import { FONTS, useTheme } from "@/theme";

/** Starts background services once: account sync and the daily reminder. */
function Bootstrap() {
  const { sync, reminders } = useServices();
  useEffect(() => {
    sync();
    reminders();
  }, [sync, reminders]);
  return null;
}

export default function RootLayout() {
  const { colors, dark } = useTheme();
  const [loaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_600SemiBold,
    AtkinsonHyperlegibleNext_700Bold,
    NotoSans_400Regular,
  });
  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar style={dark ? "light" : "dark"} />
      <Bootstrap />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: FONTS.displaySemi },
          headerShadowVisible: false,
          headerBackTitle: "Atrás",
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="palabra/[id]" options={{ title: "Palabra" }} />
        <Stack.Screen name="paquete/[id]" options={{ title: "Paquete" }} />
        <Stack.Screen name="ajustes" options={{ title: "Ajustes" }} />
        <Stack.Screen name="entrar" options={{ title: "Entra en Lexi" }} />
        <Stack.Screen name="restablecer" options={{ title: "Nueva contraseña" }} />
        <Stack.Screen name="auth/callback" options={{ title: "Iniciando sesión" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
