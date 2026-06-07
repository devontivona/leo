"use client";

import type { ReactNode } from "react";
import { INK, PLATINUM, PRESSED, RAISED } from "./bevel";

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

type SegmentedProps<T extends string> =
  | { multiple?: false; options: Option<T>[]; value: T; onChange: (value: T) => void }
  | { multiple: true; options: Option<T>[]; value: T[]; onChange: (value: T[]) => void };

/**
 * A row of joined beveled buttons. Single-select (the selected segment stays
 * pressed in) or multi-select (`multiple`, any number pressed). Used for the
 * Live/Manual mode toggle (single) and feed sources Left/Right/Bottle (multi).
 */
export function SegmentedControl<T extends string>(props: SegmentedProps<T>) {
  const isSelected = (v: T) => (props.multiple ? props.value.includes(v) : props.value === v);

  const toggle = (v: T) => {
    if (props.multiple) {
      const next = props.value.includes(v)
        ? props.value.filter((x) => x !== v)
        : [...props.value, v];
      props.onChange(next);
    } else {
      props.onChange(v);
    }
  };

  return (
    <div
      className="inline-flex"
      role={props.multiple ? "group" : "radiogroup"}
      style={{ border: `1px solid ${INK}` }}
    >
      {props.options.map((opt, i) => {
        const selected = isSelected(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(opt.value)}
            className="text-title font-bold leading-none"
            style={{
              minHeight: "2.2rem",
              padding: "0 0.75rem",
              color: INK,
              background: PLATINUM,
              borderLeft: i ? `1px solid ${INK}` : "none",
              boxShadow: selected ? PRESSED : RAISED,
              touchAction: "manipulation",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
