// Platinum bevel tokens. Bevels/borders are 1px and must stay crisp at any root
// font-size, so they live as inline-style strings (px) rather than Tailwind color
// utilities. This is the single source of truth — window.tsx and every ui/*
// primitive imports from here (see DESIGN.md > Elevation & Depth).

export const INK = "#000000";
export const HIGHLIGHT = "#ffffff";
export const SHADOW = "#808080";
export const PLATINUM = "#cccccc";
export const ACCENT = "#3366cc";
export const PAPER = "#ffffff";

// Raised: light edge top-left, dark edge bottom-right (light from the top-left).
export const RAISED = `inset 1px 1px 0 ${HIGHLIGHT}, inset -1px -1px 0 ${SHADOW}`;
// Pressed / recessed: the bevel inverts.
export const PRESSED = `inset 1px 1px 0 ${SHADOW}, inset -1px -1px 0 ${HIGHLIGHT}`;
