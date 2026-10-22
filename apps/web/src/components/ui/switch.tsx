/** On/off setting with its label and a short explanation (a checkbox with role="switch"). */
export function Switch({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 has-disabled:cursor-default has-disabled:opacity-60">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-ink-soft">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-8 w-14 shrink-0 rounded-full bg-sunken ring-1 ring-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:size-6 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:after:translate-x-6"
      />
    </label>
  );
}
