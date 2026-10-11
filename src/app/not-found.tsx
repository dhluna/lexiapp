import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState title="Esta página no existe">
        <p>Puede que la palabra ya no esté en el catálogo o que el enlace tenga un error.</p>
        <ButtonLink href="/vocabulario" className="mt-4">
          Ver vocabulario
        </ButtonLink>
      </EmptyState>
    </div>
  );
}
