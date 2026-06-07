"use client";

import { useState } from "react";
import { createDiaperAction } from "@/app/schedule/actions";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Field, TextInput } from "../ui/field";
import { FormPanel } from "./form-panel";
import { toLocalInputValue } from "./format";

export function DiaperForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (fn: () => Promise<unknown>) => void;
  onCancel: () => void;
}) {
  const [pee, setPee] = useState(false);
  const [poo, setPoo] = useState(false);
  const [atLocal, setAtLocal] = useState(() => toLocalInputValue(new Date()));

  const submit = () => {
    onSubmit(() =>
      createDiaperAction({ at: new Date(atLocal).toISOString(), pee, poo }),
    );
  };

  return (
    <FormPanel>
      <div className="flex gap-4">
        <Checkbox checked={pee} onChange={setPee} label="Pee" />
        <Checkbox checked={poo} onChange={setPoo} label="Poo" />
      </div>

      <Field label="When">
        <TextInput type="datetime-local" value={atLocal} onChange={(e) => setAtLocal(e.target.value)} />
      </Field>

      <div className="flex gap-2">
        {/* Dry changes (neither flag) are allowed, so Save is always enabled. */}
        <Button variant="default" onClick={submit} className="flex-1">
          Save
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </FormPanel>
  );
}
