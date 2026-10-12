import { getCategory } from "@lexi/core/data/categories";
import { Stack, useLocalSearchParams } from "expo-router";
import { CategoryScreen } from "@/screens/category";

export default function CategoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: getCategory(id)?.name ?? "Categoría" }} />
      <CategoryScreen id={id} />
    </>
  );
}
