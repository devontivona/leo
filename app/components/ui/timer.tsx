"use client";

import { useEffect, useState } from "react";

/** Milliseconds elapsed since an ISO timestamp, ticking each second. Null until
 *  mounted (placeholder-first, like age-clock) to avoid hydration mismatch. The
 *  source of truth is the timestamp, so it resumes exactly after a reload. */
export function useElapsed(startAtISO: string | null): number | null {
  // Track a ticking "now" and derive elapsed at render time — this keeps the
  // effect free of synchronous setState (it only updates via the tick closure).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!startAtISO) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startAtISO]);
  if (!startAtISO || now === null) return null;
  return now - Date.parse(startAtISO);
}

/** Clock format for a live, ticking duration: M:SS, or H:MM:SS past an hour. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
}

/** A live ticking elapsed-time display for a running timer. */
export function Timer({ startAt, className }: { startAt: string; className?: string }) {
  const ms = useElapsed(startAt);
  return <span className={`tabular-nums ${className ?? ""}`}>{ms == null ? "0:00" : formatClock(ms)}</span>;
}
