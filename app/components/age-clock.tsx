"use client";

import { useEffect, useState } from "react";

// Leo was born May 25, 2026 at 9:06 AM (local time). Month is 0-indexed.
const BIRTH = new Date(2026, 4, 25, 9, 6, 0).getTime();

function ageLabel(now: number): string {
  let s = Math.max(0, Math.floor((now - BIRTH) / 1000));
  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const mins = Math.floor(s / 60);
  const secs = s - mins * 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(days)}:${p(hours)}:${p(mins)}:${p(secs)}`;
}

/**
 * The menu-bar "clock" — but instead of the time, it ticks Leo's age as
 * DD:HH:MM:SS. Starts as a fixed-width placeholder so the first (server) paint
 * matches hydration, then updates every second on the client.
 */
export function AgeClock() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setLabel(ageLabel(Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="ml-auto tabular-nums" title="My age (days : hours : minutes : seconds)">
      {label ?? "--:--:--:--"}
    </span>
  );
}
