"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

// Bevel inks. Borders/radii stay in px (hairlines must not scale); these are the
// 1px edge lines from DESIGN.md that fake top-left light.
const INK = "#000000";
const HIGHLIGHT = "#ffffff";
const SHADOW = "#808080";
const PLATINUM = "#cccccc";

const RAISED = `inset 1px 1px 0 ${HIGHLIGHT}, inset -1px -1px 0 ${SHADOW}`;
const PRESSED = `inset 1px 1px 0 ${SHADOW}, inset -1px -1px 0 ${HIGHLIGHT}`;

type Pos = { x: number; y: number };

export interface WindowProps {
  title: string;
  initialPosition?: Pos;
  /** Active window draws pinstripes + ink text; inactive is plain, grayed. */
  active?: boolean;
  zIndex?: number;
  onFocus?: () => void;
  onClose?: () => void;
  children: ReactNode;
}

export function Window({
  title,
  initialPosition = { x: 24, y: 24 },
  active = true,
  zIndex,
  onFocus,
  onClose,
  children,
}: WindowProps) {
  const [pos, setPos] = useState(initialPosition);
  const [collapsed, setCollapsed] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  // Drag origin, tracked in a ref so moves don't re-render until we setPos.
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  function onTitleDown(e: PointerEvent<HTMLDivElement>) {
    onFocus?.();
    if (zoomed) return; // a maximized window isn't draggable
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
  }
  function onTitleMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const { sx, sy, ox, oy } = drag.current;
    setPos({ x: ox + (e.clientX - sx), y: oy + (e.clientY - sy) });
  }
  function onTitleUp(e: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div
      role="dialog"
      aria-label={title}
      onPointerDown={() => onFocus?.()}
      className="absolute flex flex-col text-ink"
      style={{
        // Maximized: fill the desktop field (inset 0). Otherwise float at pos
        // with a phone-friendly natural width.
        left: zoomed ? 0 : pos.x,
        top: zoomed ? 0 : pos.y,
        zIndex,
        width: zoomed ? "100%" : "min(22rem, calc(100vw - 1rem))",
        height: zoomed && !collapsed ? "100%" : undefined,
        maxWidth: zoomed ? undefined : "calc(100vw - 1rem)",
        border: `1px solid ${INK}`,
        background: PLATINUM,
        boxShadow: RAISED,
      }}
    >
      {/* Title bar — pinstriped when active, draggable by its whole width. */}
      <div
        onPointerDown={onTitleDown}
        onPointerMove={onTitleMove}
        onPointerUp={onTitleUp}
        className="flex cursor-default select-none items-center gap-2 px-1 py-1"
        style={{
          borderBottom: `1px solid ${INK}`,
          touchAction: "none",
          backgroundImage: active
            ? `repeating-linear-gradient(to bottom, ${HIGHLIGHT} 0, ${HIGHLIGHT} 1px, ${PLATINUM} 1px, ${PLATINUM} 2px)`
            : "none",
        }}
      >
        <TitleBox kind="close" active={active} onClick={() => onClose?.()} />
        <span
          className="mx-auto px-2 text-title font-bold leading-none"
          style={{ background: PLATINUM, color: active ? INK : "#999999" }}
        >
          {title}
        </span>
        <TitleBox kind="collapse" active={active} onClick={() => setCollapsed((c) => !c)} />
        <TitleBox kind="zoom" active={active} onClick={() => setZoomed((z) => !z)} />
      </div>

      {/* Body — hidden when collapsed (window-shade roll-up). When maximized it
          grows to fill the window and scrolls if the content overflows. */}
      {!collapsed && (
        <div
          className={zoomed ? "flex-1 overflow-auto p-2" : "p-2"}
          style={{ background: PLATINUM }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function TitleBox({
  kind,
  active,
  onClick,
}: {
  kind: "close" | "collapse" | "zoom";
  active: boolean;
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      aria-label={kind}
      onPointerDown={(e) => {
        e.stopPropagation(); // don't start a window drag
        setPressed(true);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        setPressed(false);
      }}
      onPointerLeave={() => setPressed(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="relative grid shrink-0 place-items-center"
      style={{
        width: "1.4rem",
        height: "1.4rem",
        border: `1px solid ${active ? INK : "#999999"}`,
        background: PLATINUM,
        touchAction: "none",
        boxShadow: !active ? "none" : pressed ? PRESSED : RAISED,
      }}
    >
      {/* Faint ink marks distinguish the boxes, drawn (not font glyphs) so they
          stay crisp at any scale. */}
      {active && kind === "close" && (
        <svg viewBox="0 0 10 10" aria-hidden style={{ width: "0.6rem", height: "0.6rem" }}>
          <path
            d="M2 2 L8 8 M8 2 L2 8"
            stroke={INK}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      )}
      {active && kind === "zoom" && (
        <span style={{ width: "0.5rem", height: "0.5rem", border: `1px solid ${INK}` }} />
      )}
      {active && kind === "collapse" && (
        <span style={{ width: "0.6rem", height: 0, borderTop: `1px solid ${INK}` }} />
      )}
    </button>
  );
}
