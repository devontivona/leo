"use client";

import { type ButtonHTMLAttributes, type ReactNode, useState } from "react";
import { ACCENT, INK, PLATINUM, PRESSED, RAISED } from "./bevel";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** "default" gets the accent-blue ring (the primary action), per DESIGN.md. */
  variant?: "normal" | "default";
  children: ReactNode;
}

/** Platinum push button: raised bevel, inverts when pressed, comfy touch height. */
export function Button({
  variant = "normal",
  type = "button",
  children,
  className,
  disabled,
  style,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  ...rest
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type={type}
      disabled={disabled}
      className={`text-title font-bold leading-none ${className ?? ""}`}
      style={{
        minHeight: "2.2rem",
        padding: "0 0.75rem",
        color: INK,
        background: PLATINUM,
        border: `1px solid ${INK}`,
        borderRadius: "2px",
        boxShadow: pressed && !disabled ? PRESSED : RAISED,
        outline: variant === "default" ? `2px solid ${ACCENT}` : "none",
        outlineOffset: "1px",
        opacity: disabled ? 0.5 : 1,
        touchAction: "manipulation",
        ...style,
      }}
      {...rest}
      onPointerDown={(e) => {
        setPressed(true);
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        setPressed(false);
        onPointerUp?.(e);
      }}
      onPointerLeave={(e) => {
        setPressed(false);
        onPointerLeave?.(e);
      }}
    >
      {children}
    </button>
  );
}
