/**
 * "hace 2 min", in Spanish, without `Intl.RelativeTimeFormat` (not available in every
 * JavaScript engine, e.g. Hermes on React Native).
 */
export function formatAgo(iso: string, now: Date): string {
  const seconds = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 1000));
  if (seconds < 45) return "ahora mismo";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "hace 1 min" : `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "hace 1 hora" : `hace ${hours} horas`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}
