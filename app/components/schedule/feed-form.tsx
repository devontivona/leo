"use client";

import { useState } from "react";
import { createTimedAction, startTimedAction } from "@/app/schedule/actions";
import type { CreateTimedInput, StartTimedInput } from "@/data/events";
import { Button } from "../ui/button";
import { Field, TextInput } from "../ui/field";
import { SegmentedControl } from "../ui/segmented-control";
import { FormPanel } from "./form-panel";
import { toLocalInputValue } from "./format";

type Source = "left" | "right" | "bottle";
type Mode = "live" | "manual";

const SOURCE_OPTIONS = [
  { value: "left" as const, label: "Left" },
  { value: "right" as const, label: "Right" },
  { value: "bottle" as const, label: "Bottle" },
];
const MODE_OPTIONS = [
  { value: "live" as const, label: "Live timer" },
  { value: "manual" as const, label: "Enter manually" },
];

export function FeedForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (fn: () => Promise<unknown>) => void;
  onCancel: () => void;
}) {
  const [sources, setSources] = useState<Source[]>([]);
  // Entered in oz (US bottles are marked in oz) — converted to ml, what the
  // DB actually stores, only at submit time.
  const [bottleOz, setBottleOz] = useState("");
  const [mode, setMode] = useState<Mode>("live");
  const [startLocal, setStartLocal] = useState(() => toLocalInputValue(new Date()));
  const [duration, setDuration] = useState("");

  const hasBottle = sources.includes("bottle");
  const canSave = sources.length > 0 && (mode === "live" || Number(duration) > 0);

  const flags = () => ({
    fedLeft: sources.includes("left"),
    fedRight: sources.includes("right"),
    fedBottle: hasBottle,
    bottleMl: hasBottle && bottleOz ? Math.round(Number(bottleOz) * 29.5735) : undefined,
  });

  const submit = () => {
    if (mode === "live") {
      const input: StartTimedInput = { type: "feed", ...flags() };
      onSubmit(() => startTimedAction(input));
    } else {
      const start = new Date(startLocal);
      const end = new Date(start.getTime() + Number(duration) * 60000);
      const input: CreateTimedInput = {
        type: "feed",
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        ...flags(),
      };
      onSubmit(() => createTimedAction(input));
    }
  };

  return (
    <FormPanel>
      <div className="flex flex-col gap-1">
        <span className="text-small text-platinumDark">Source</span>
        <SegmentedControl multiple options={SOURCE_OPTIONS} value={sources} onChange={setSources} />
      </div>

      {hasBottle && (
        <Field label="Bottle (oz)">
          <TextInput
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            value={bottleOz}
            onChange={(e) => setBottleOz(e.target.value)}
            placeholder="optional"
          />
        </Field>
      )}

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
              placeholder="20"
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
