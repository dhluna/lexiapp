import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/empty-state";
import { VocabularyView } from "@/features/vocabulary/vocabulary-view";

export const metadata: Metadata = { title: "Vocabulario" };

export default function VocabularyPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <VocabularyView />
    </Suspense>
  );
}
