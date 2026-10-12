import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/empty-state";
import { getWord, WORDS } from "@lexi/core/data/catalog";
import { WordSheet } from "@/features/vocabulary/word-sheet";

export function generateStaticParams() {
  return WORDS.map((word) => ({ id: word.id }));
}

export async function generateMetadata({ params }: PageProps<"/vocabulario/[id]">): Promise<Metadata> {
  const { id } = await params;
  const word = getWord(id);
  return word
    ? { title: `${word.term}: ${word.translation}`, description: word.definition }
    : { title: "Palabra no encontrada" };
}

export default function WordPage({ params }: PageProps<"/vocabulario/[id]">) {
  // Reading params inside Suspense keeps client navigations instant.
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-2xl" />}>
      <WordEntry params={params} />
    </Suspense>
  );
}

async function WordEntry({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const word = getWord(id);
  if (!word) notFound();
  return <WordSheet word={word} />;
}
