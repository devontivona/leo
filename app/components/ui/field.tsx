"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { INK, PRESSED } from "./bevel";

/** A recessed white-paper input well. Wraps native inputs (text/number/
 *  datetime-local/time) so the phone gets its built-in picker. */
export function TextInput({ className, style, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`selectable bg-paper text-body ${className ?? ""}`}
      style={{
        width: "100%",
        minHeight: "2.2rem",
        padding: "0.35rem 0.5rem",
        color: INK,
        border: `1px solid ${INK}`,
        boxShadow: PRESSED,
        ...style,
      }}
      {...rest}
    />
  );
}

/** A labeled field: small caption above its control. */
export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-small text-platinumDark">
      <span>{label}</span>
      {children}
    </label>
  );
}
