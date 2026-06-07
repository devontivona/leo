"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteEventAction,
  getActiveEventsAction,
  listEventsAction,
  stopTimedAction,
} from "@/app/schedule/actions";
import { DiaperForm } from "./diaper-form";
import { FeedForm } from "./feed-form";
import { NapForm } from "./nap-form";
import { QuickAddBar, type FormKind } from "./quick-add-bar";
import { RunningTimerBanner } from "./running-timer-banner";
import { TimelineList } from "./timeline-list";
import type { EventDTO } from "./types";

/**
 * My Schedule — the real app. Client-rooted (no RSC in the data path): it loads
 * events through Server Actions on mount, and because the window remounts every
 * time it's launched, that mount IS the resume-on-open for any running timer.
 */
export function ScheduleApp() {
  const [events, setEvents] = useState<EventDTO[] | null>(null);
  const [active, setActive] = useState<EventDTO[]>([]);
  const [form, setForm] = useState<FormKind>("none");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [list, act] = await Promise.all([listEventsAction(), getActiveEventsAction()]);
    setEvents(list);
    setActive(act);
  }, []);

  // Initial load (and resume-on-open). Queries run inside an async IIFE so the
  // setState calls happen after an await, not synchronously in the effect body.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [list, act] = await Promise.all([listEventsAction(), getActiveEventsAction()]);
        if (alive) {
          setEvents(list);
          setActive(act);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Couldn't load the schedule.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Run a mutation, then close any open form and refetch. Errors surface inline.
  const run = useCallback(
    (fn: () => Promise<unknown>) => {
      setError(null);
      fn()
        .then(() => {
          setForm("none");
          return refresh();
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Something went wrong."));
    },
    [refresh],
  );

  return (
    <div className="flex flex-col gap-2" style={{ width: "20rem", maxWidth: "100%" }}>
      {active.map((ev) => (
        <RunningTimerBanner key={ev.id} event={ev} onStop={() => run(() => stopTimedAction({ id: ev.id }))} />
      ))}

      <QuickAddBar open={form} onOpen={setForm} />

      {error && (
        <p className="text-small" style={{ color: "#a00000" }}>
          {error}
        </p>
      )}

      {form === "feed" && <FeedForm onSubmit={run} onCancel={() => setForm("none")} />}
      {form === "nap" && <NapForm onSubmit={run} onCancel={() => setForm("none")} />}
      {form === "diaper" && <DiaperForm onSubmit={run} onCancel={() => setForm("none")} />}

      <TimelineList events={events} onDelete={(id) => run(() => deleteEventAction({ id }))} />
    </div>
  );
}
