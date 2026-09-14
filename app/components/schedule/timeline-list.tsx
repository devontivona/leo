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
            <ul>
              {g.items.map((e, i) => (
                <li
                  key={e.id}
                  className="flex items-start gap-2 px-2 py-1.5 text-body"
                  style={{ borderTop: i === 0 ? "none" : "1px solid #e0e0e0" }}
                >
                  {/* Two-line row: the time (a start-end range for naps/bedtime
                      can run long, e.g. "11:50 AM–12:10 PM") sits on its own
                      line above the title + detail, so neither ever has to
                      fight the other for horizontal room or wrap awkwardly. */}
                  <div className="min-w-0 flex-1">
                    <p className="text-small tabular-nums text-platinumDark">{rowTime(e)}</p>
                    <p className="truncate">
                      <span className="font-bold">{rowTitle(e)}</span>{" "}
                      <span className="text-small text-platinumDark">{rowDetail(e)}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete entry"
                    onClick={() => remove(e)}
                    className="shrink-0 px-1 text-small text-platinumDark"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Well>
  );
}
