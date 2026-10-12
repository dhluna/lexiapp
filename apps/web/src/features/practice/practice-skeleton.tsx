/** Placeholder with the same shape as the practice card, so loading doesn't jump. */
export function PracticeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Preparando la práctica" className="mx-auto grid max-w-2xl gap-5">
      <div className="flex h-11 items-center gap-3 px-1">
        <div className="size-6 rounded-full bg-sunken" />
        <div className="h-1.5 flex-1 rounded-full bg-sunken" />
        <div className="h-4 w-10 rounded bg-sunken" />
      </div>
      <div className="rounded-3xl bg-surface p-6 shadow-[0_1px_0_var(--line)] sm:p-8">
        <div className="h-6 w-40 rounded-full bg-sunken" />
        <div className="mt-3 h-14 w-56 max-w-full rounded-xl bg-sunken" />
        <div className="mt-6 border-t border-line pt-6">
          <div className="h-7 w-36 rounded-lg bg-sunken" />
          <div className="mt-3 h-5 w-full rounded bg-sunken" />
          <div className="mt-6 h-24 rounded-xl bg-sunken" />
          <div className="mt-3 h-24 rounded-xl bg-sunken" />
        </div>
      </div>
    </div>
  );
}
