// Placeholder content for the three apps, just enough to test the window chrome
// and the Platinum vocabulary inside a window. Real data wiring comes later.
import type { ReactNode } from "react";

const INK = "#000000";
const SHADOW = "#808080";
const HIGHLIGHT = "#ffffff";

// A recessed paper well — dark bevel top-left, light bottom-right — for list and
// content areas, per DESIGN.md "pressed / recessed".
function Well({ children }: { children: ReactNode }) {
  return (
    <div
      className="bg-paper"
      style={{
        border: `1px solid ${INK}`,
        boxShadow: `inset 1px 1px 0 ${SHADOW}, inset -1px -1px 0 ${HIGHLIGHT}`,
      }}
    >
      {children}
    </div>
  );
}

export function ScheduleApp() {
  const rows = [
    { time: "6:02 AM", label: "Woke up" },
    { time: "6:20 AM", label: "Bottle — 90 ml" },
    { time: "7:15 AM", label: "Diaper — wet" },
    { time: "8:40 AM", label: "Down for a nap" },
    { time: "10:05 AM", label: "Woke up" },
  ];
  return (
    <div className="flex flex-col gap-2" style={{ width: "18rem", maxWidth: "100%" }}>
      <p className="text-small text-platinumDark">Today, so far</p>
      <Well>
        <ul>
          {rows.map((r, i) => (
            <li
              key={r.time}
              className="flex items-baseline gap-2 px-2 py-1 text-body"
              style={{ borderTop: i === 0 ? "none" : `1px solid #e0e0e0` }}
            >
              <span className="w-20 shrink-0 text-small text-platinumDark">{r.time}</span>
              <span>{r.label}</span>
            </li>
          ))}
        </ul>
      </Well>
    </div>
  );
}

export function PhotosApp() {
  const cells = Array.from({ length: 9 });
  return (
    <div className="flex flex-col gap-2" style={{ width: "18rem", maxWidth: "100%" }}>
      <p className="text-small text-platinumDark">My Photos · 9 pictures</p>
      <Well>
        <div className="grid grid-cols-3 gap-1 p-1">
          {cells.map((_, i) => (
            <div
              key={i}
              className="grid aspect-square place-items-center text-small text-platinumDark"
              style={{ background: "#dededb", border: `1px solid #b8b8b3` }}
            >
              ◍
            </div>
          ))}
        </div>
      </Well>
    </div>
  );
}

export function MilestonesApp() {
  const items = [
    { done: true, label: "First smile" },
    { done: true, label: "Held head up" },
    { done: false, label: "Rolled over" },
    { done: false, label: "First laugh" },
  ];
  return (
    <div className="flex flex-col gap-2" style={{ width: "16rem", maxWidth: "100%" }}>
      <p className="text-small text-platinumDark">What I&apos;ve done</p>
      <Well>
        <ul>
          {items.map((m, i) => (
            <li
              key={m.label}
              className="flex items-center gap-2 px-2 py-1 text-body"
              style={{ borderTop: i === 0 ? "none" : `1px solid #e0e0e0` }}
            >
              <span aria-hidden>{m.done ? "☑" : "☐"}</span>
              <span style={{ color: m.done ? INK : "#777" }}>{m.label}</span>
            </li>
          ))}
        </ul>
      </Well>
    </div>
  );
}
