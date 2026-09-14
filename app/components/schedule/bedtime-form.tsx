"use client";

import { useState } from "react";
import { createTimedAction, startTimedAction } from "@/app/schedule/actions";
import type { CreateTimedInput } from "@/data/events";
import { Button } from "../ui/button";
import { Field, TextInput } from "../ui/field";
import { SegmentedControl } from "../ui/segmented-control";
import { FormPanel } from "./form-panel";
import { toLocalInputValue } from "./format";

type Mode = "live" | "manual";

const MODE_OPTIONS = [
  { value: "live" as const, label: "Mark bedtime" },
  { value: "manual" as const, label: "Enter manually" },
];

/** Overnight sleep: distinct from a nap timer. "Mark bedtime" opens it with no
 *  end yet (wake time comes later, from the running banner's Stop button, or
 *  you can enter a finished bedtime→wake range by hand). */
export function BedtimeForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (fn: () => Promise<unknown>) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<Mode>("live");
  const [startLocal, setStartLocal] = useState(() => toLocalInputValue(new Date()));
  const [wakeLocal, setWakeLocal] = useState(() => toLocalInputValue(new Date()));

  const canSave = mode === "live" || new Date(wakeLocal) > new Date(startLocal);

  const submit = () => {
    if (mode === "live") {
      onSubmit(() => startTimedAction({ type: "bedtime" }));
    } else {
      const input: CreateTimedInput = {
        type: "bedtime",
        startAt: new Date(startLocal).toISOString(),
        endAt: new Date(wakeLocal).toISOString(),
      };
      onSubmit(() => createTimedAction(input));
    }
  };

  return (
    <FormPanel>
      <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />

      {mode === "manual" && (
        <>
          <Field label="Bedtime">
            <TextInput type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
          </Field>
          <Field label="Wake time">
            <TextInput type="datetime-local" value={wakeLocal} onChange={(e) => setWakeLocal(e.target.value)} />
          </Field>
        </>
      )}

      <div className="flex gap-2">
        <Button variant="default" disabled={!canSave} onClick={submit} className="flex-1">
          {mode === "live" ? "Start" : "Save"}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </FormPanel>
  );
}
