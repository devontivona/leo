"use client";

import type { ReactNode } from "react";
import { INK, PLATINUM, PRESSED, RAISED } from "./bevel";

interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
}

/** OS 9 checkbox: a beveled box (☑ when checked) with a label. */
export function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-body"
    >
      <span
        aria-hidden
        className="grid shrink-0 place-items-center"
        style={{
          width: "1.4rem",
          height: "1.4rem",
          border: `1px solid ${INK}`,
          background: PLATINUM,
          boxShadow: checked ? PRESSED : RAISED,
        }}
      >
        {checked && (
          <svg viewBox="0 0 12 12" aria-hidden style={{ width: "0.85rem", height: "0.85rem" }}>
            <path
              d="M2 6.5 L4.8 9 L10 3"
              fill="none"
              stroke={INK}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}
