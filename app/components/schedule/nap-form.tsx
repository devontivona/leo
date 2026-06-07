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
  { value: "live" as const, label: "Live timer" },
  { value: "manual" as const, label: "Enter manually" },
];

export function NapForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (fn: () => Promise<unknown>) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<Mode>("live");
  const [startLocal, setStartLocal] = useState(() => toLocalInputValue(new Date()));
  const [duration, setDuration] = useState("");

  const canSave = mode === "live" || Number(duration) > 0;

  const submit = () => {
    if (mode === "live") {
      onSubmit(() => startTimedAction({ type: "sleep" }));
    } else {
      const start = new Date(startLocal);
      const end = new Date(start.getTime() + Number(duration) * 60000);
      const input: CreateTimedInput = {
        type: "sleep",
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      };
      onSubmit(() => createTimedAction(input));
    }
  };

  return (
    <FormPanel>
      <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />

      {mode === "manual" && (
        <>
          <Field label="Started">
            <TextInput type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
          </Field>
          <Field label="Lasted (min)">
            <TextInput
              type="number"
              inputMode="numeric"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="45"
            />
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
