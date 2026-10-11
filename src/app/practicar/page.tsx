import type { Metadata } from "next";
import { Suspense } from "react";
import { PracticeSkeleton } from "@/features/practice/practice-skeleton";
import { PracticeView } from "@/features/practice/practice-view";

export const metadata: Metadata = { title: "Practicar" };

export default function PracticePage() {
  return (
    <Suspense fallback={<PracticeSkeleton />}>
      <PracticeView />
    </Suspense>
  );
}
