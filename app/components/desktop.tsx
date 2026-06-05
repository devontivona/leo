"use client";

import { useState } from "react";
import { AgeClock } from "./age-clock";
import { AppleLogo } from "./apple-logo";
import { Window } from "./window";
import { MilestonesApp, PhotosApp, ScheduleApp } from "./placeholder-apps";

type AppId = "schedule" | "photos" | "milestones";

const APPS: { id: AppId; name: string; icon: string }[] = [
  { id: "schedule", name: "My Schedule", icon: "🗓️" },
  { id: "photos", name: "My Photos", icon: "📷" },
  { id: "milestones", name: "My Milestones", icon: "⭐" },
];

// Stagger windows so a fresh launch of all three doesn't stack exactly.
const INITIAL_POS: Record<AppId, { x: number; y: number }> = {
  schedule: { x: 16, y: 16 },
  photos: { x: 44, y: 52 },
  milestones: { x: 72, y: 88 },
};

const APP_BODY: Record<AppId, () => React.ReactNode> = {
  schedule: ScheduleApp,
  photos: PhotosApp,
  milestones: MilestonesApp,
};

function bringToFront(order: AppId[], id: AppId): AppId[] {
  return [...order.filter((x) => x !== id), id];
}

export function Desktop() {
  // Open windows, ordered back-to-front; the last entry is the active window.
  const [open, setOpen] = useState<AppId[]>([]);
  const front = open[open.length - 1];

  function launch(id: AppId) {
    setOpen((cur) => (cur.includes(id) ? bringToFront(cur, id) : [...cur, id]));
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Menu bar */}
      <div className="flex items-center gap-3 border-b border-ink bg-paper px-2 py-1.5 text-title font-bold leading-none">
        {/* nudge the bottom-heavy apple up so its mass aligns with the text */}
        <AppleLogo className="h-[1.05em] w-[1.05em] -translate-y-[0.06em]" />
        <span>Leo</span>
        <span className="text-platinumDark">{front ? APPS.find((a) => a.id === front)?.name : "Special"}</span>
        <AgeClock />
      </div>

      {/* Desktop field — relative so windows can position absolutely over the
          icons. Clip overflow so a window dragged (or staggered) past the edge
          doesn't scroll the whole page; this is a zoom-locked, native-feel app. */}
      <div className="relative flex-1 overflow-hidden">
        {/*
          App icons.
          - phone: 3-up grid, centered in cells
          - iPad (md): 5-up grid
          - desktop (lg): left-aligned flowing wrap at natural size
        */}
        <div
          className="grid grid-cols-3 content-start justify-items-center gap-x-2 gap-y-5 p-4
                     md:grid-cols-5
                     lg:flex lg:flex-wrap lg:justify-start lg:gap-4"
        >
          {APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => launch(app.id)}
              className="flex w-20 flex-col items-center gap-1 p-0.5 text-center"
            >
              <span className="text-4xl leading-none">{app.icon}</span>
              <span className="whitespace-nowrap bg-paper px-0.5 text-xs text-ink">{app.name}</span>
            </button>
          ))}
        </div>

        {/* Open windows */}
        {open.map((id, i) => {
          const Body = APP_BODY[id];
          return (
            <Window
              key={id}
              title={APPS.find((a) => a.id === id)!.name}
              initialPosition={INITIAL_POS[id]}
              active={id === front}
              zIndex={10 + i}
              onFocus={() => setOpen((cur) => bringToFront(cur, id))}
              onClose={() => setOpen((cur) => cur.filter((x) => x !== id))}
            >
              <Body />
            </Window>
          );
        })}
      </div>
    </div>
  );
}
