import { getPack } from "@lexi/core/data/packs";
import { Stack, useLocalSearchParams } from "expo-router";
import { PackScreen } from "@/screens/pack";

export default function PackRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: getPack(id)?.name ?? "Paquete" }} />
      <PackScreen id={id} />
    </>
  );
}
