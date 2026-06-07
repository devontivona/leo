// Pure formatting helpers for the schedule. No React, no server imports — all
// display logic in the viewer's local timezone (we store UTC; see AGENTS.md).
import type { EventDTO } from "./types";

/** A Date → the value a native datetime-local input expects (local, no tz). */
export function toLocalInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** ISO → local clock time, e.g. "2:40 PM". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** A stable per-local-day key for grouping. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** "Today" / "Yesterday" / "Wed, Jun 4" heading for a day group. */
export function dayHeading(iso: string): string {
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/** A finished duration in words: "18 min" / "1h 12m". */
export function formatDurationWords(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Feed sources as a phrase: "Left + Right", "Bottle 90 ml", "Left + Bottle". */
export function feedSources(e: EventDTO): string {
  const parts: string[] = [];
  if (e.fedLeft) parts.push("Left");
  if (e.fedRight) parts.push("Right");
  if (e.fedBottle) parts.push(e.bottleMl != null ? `Bottle ${e.bottleMl} ml` : "Bottle");
  return parts.join(" + ");
}

/** Diaper contents: "wet" / "dirty" / "wet + dirty" / "dry". */
export function diaperWord(e: EventDTO): string {
  if (e.pee && e.poo) return "wet + dirty";
  if (e.pee) return "wet";
  if (e.poo) return "dirty";
  return "dry";
}

export function rowTitle(e: EventDTO): string {
  return e.type === "feed" ? "Fed" : e.type === "sleep" ? "Nap" : "Diaper";
}

/** The detail line for a timeline row (handles in-progress timers). */
export function rowDetail(e: EventDTO): string {
  if (e.type === "diaper") return diaperWord(e);
  const running = e.endAt === null;
  if (e.type === "feed") {
    const src = feedSources(e);
    if (running) return src ? `${src} · feeding…` : "feeding…";
    const dur = formatDurationWords(Date.parse(e.endAt!) - Date.parse(e.startAt));
    return src ? `${src} · ${dur}` : dur;
  }
  // sleep
  return running ? "napping…" : formatDurationWords(Date.parse(e.endAt!) - Date.parse(e.startAt));
}
