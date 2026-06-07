import type { ReactNode } from "react";
import { INK, PRESSED } from "./bevel";

/** A recessed white "paper" well for list/content areas (pressed bevel). */
export function Well({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-paper ${className ?? ""}`}
      style={{ border: `1px solid ${INK}`, boxShadow: PRESSED }}
    >
      {children}
    </div>
  );
}
