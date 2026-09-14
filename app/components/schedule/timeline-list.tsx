"use client";

import { Well } from "../ui/well";
import { dayHeading, dayKey, rowDetail, rowTime, rowTitle } from "./format";
import type { EventDTO } from "./types";

export function TimelineList({
  events,
  onDelete,
}: {
  events: EventDTO[] | null;
  onDelete: (id: string) => void;
}) {
  if (events === null) {
    return (
      <Well>
        <p className="px-2 py-3 text-small text-platinumDark">Loading…</p>
      </Well>
    );
  }
  if (events.length === 0) {
    return (
      <Well>
        <p className="px-2 py-3 text-small text-platinumDark">Nothing logged yet.</p>
      </Well>
    );
  }

  // Group consecutive events by local day (events are already newest-first).
  const groups: { key: string; heading: string; items: EventDTO[] }[] = [];
  for (const e of events) {
    const key = dayKey(e.startAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e);
    else groups.push({ key, heading: dayHeading(e.startAt), items: [e] });
  }

  const remove = (e: EventDTO) => {
    if (confirm(`Delete this ${rowTitle(e).toLowerCase()} entry?`)) onDelete(e.id);
  };

  return (
    <Well>
      <div className="max-h-72 overflow-auto">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="sticky top-0 bg-paper px-2 py-1 text-small font-bold text-platinumDark">{g.heading}</p>
            {/*
              A CSS grid — not flex — spanning every row in this day group.
              Grid column tracks size to the widest CELL IN THAT COLUMN across
              ALL rows (max-content), so the time column is exactly as wide as
              its longest value here (e.g. a bedtime range) and no wider, and
              every row's title ("Fed"/"Nap"/"Bedtime"…) lines up at the same
              x position. Flexbox can't do this — each row would be its own
              flex container, so a column can't share a width with its
              siblings' rows without either overlapping (too narrow) or
              wasting space (hardcoded too wide). `role="list"/"listitem"`
              keeps the list semantics since the real elements are styling
              divs, not literal ul/li (which CSS grid can't reshuffle like this).
            */}
            <div
              role="list"
              className="grid items-baseline text-body"
              style={{ gridTemplateColumns: "max-content max-content 1fr max-content", columnGap: "0.5rem" }}
            >
              {g.items.map((e, i) => {
                const border = i === 0 ? "none" : "1px solid #e0e0e0";
                return (
                  <div role="listitem" key={e.id} style={{ display: "contents" }}>
                    <span
                      className="whitespace-nowrap py-1 pl-2 text-small tabular-nums text-platinumDark"
                      style={{ borderTop: border }}
                    >
                      {rowTime(e)}
                    </span>
                    <span className="py-1 font-bold" style={{ borderTop: border }}>
                      {rowTitle(e)}
                    </span>
                    <span className="py-1 text-small text-platinumDark" style={{ borderTop: border }}>
                      {rowDetail(e)}
                    </span>
                    <button
                      type="button"
                      aria-label="Delete entry"
                      onClick={() => remove(e)}
                      className="py-1 pr-2 text-small text-platinumDark"
                      style={{ borderTop: border }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Well>
  );
}
