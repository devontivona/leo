import type { ReactNode } from "react";
import { INK, PLATINUM, RAISED } from "../ui/bevel";

/** A raised platinum panel that groups a quick-add form. */
export function FormPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-2 p-2"
      style={{ border: `1px solid ${INK}`, background: PLATINUM, boxShadow: RAISED }}
    >
      {children}
    </div>
  );
}
