import { addDays } from "@/domain/dates";
import { cn } from "@/lib/cn";

const WEEKDAY = new Intl.DateTimeFormat("es", { weekday: "narrow", timeZone: "UTC" });
const LONG = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function toUtcDate(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

interface PracticeCalendarProps {
  practiceDays: readonly string[];
  today: string;
  days?: number;
}

/** Last `days` days ending today; practiced days are filled in. */
export function PracticeCalendar({ practiceDays, today, days = 7 }: PracticeCalendarProps) {
  const practiced = new Set(practiceDays);
  const keys = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));

  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label={`Práctica de los últimos ${days} días`}>
      {keys.map((key) => {
        const done = practiced.has(key);
        const isToday = key === today;
        const date = toUtcDate(key);
        return (
          <li key={key} className="flex flex-col items-center gap-1">
            {days <= 7 && (
              <span aria-hidden className="text-xs font-semibold text-ink-soft uppercase">
                {WEEKDAY.format(date)}
              </span>
            )}
            <span
              className={cn(
                "flex aspect-square w-full max-w-11 items-center justify-center rounded-lg text-sm font-semibold",
                done ? "bg-learned text-surface" : "bg-sunken text-ink-soft",
                isToday && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
              )}
            >
              <span aria-hidden>{date.getUTCDate()}</span>
              <span className="sr-only">
                {LONG.format(date)}: {done ? "practicado" : "sin práctica"}
                {isToday ? " (hoy)" : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
