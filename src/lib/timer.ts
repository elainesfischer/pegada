export const TIMER_PRESETS: { label: string; seconds: number | null }[] = [
  { label: "Sem limite", seconds: null },
  { label: "2 minutos", seconds: 120 },
  { label: "3 minutos", seconds: 180 },
  { label: "5 minutos", seconds: 300 },
  { label: "10 minutos", seconds: 600 },
];

export type TimerPhase = "off" | "running" | "warn60" | "warn30" | "final10" | "expired";

export function remainingSeconds(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function phaseOf(remaining: number | null): TimerPhase {
  if (remaining === null) return "off";
  if (remaining <= 0) return "expired";
  if (remaining <= 10) return "final10";
  if (remaining <= 30) return "warn30";
  if (remaining <= 60) return "warn60";
  return "running";
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
