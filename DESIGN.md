---
version: alpha
name: Leo Platinum
description: Mac OS 9 "Platinum" appearance for Leo's desktop — gray beveled chrome, pinstripes, and Charcoal type.
colors:
  ink: "#000000"
  platinum: "#CCCCCC"
  platinumLight: "#EEEEEE"
  platinumDark: "#999999"
  bevelHighlight: "#FFFFFF"
  bevelShadow: "#808080"
  bevelDark: "#555555"
  accent: "#3366CC"
  selection: "#B5C5E0"
  desktop: "#8497A8"
  paper: "#FFFFFF"
typography:
  title:
    fontFamily: Charcoal, Geneva, Tahoma, sans-serif
    fontSize: 1rem
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: Charcoal, Geneva, Tahoma, sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.3
  small:
    fontFamily: Geneva, Tahoma, sans-serif
    fontSize: 0.8rem
    fontWeight: 400
    lineHeight: 1.2
  mono:
    fontFamily: Monaco, "Courier New", monospace
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.3
rounded:
  none: 0px
  sm: 2px
  md: 4px
spacing:
  xs: 0.125rem
  sm: 0.25rem
  md: 0.5rem
  lg: 0.75rem
  xl: 1rem
components:
  desktop:
    backgroundColor: "{colors.desktop}"
    textColor: "{colors.paper}"
  window:
    backgroundColor: "{colors.platinum}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.md}"
  titleBar:
    backgroundColor: "{colors.platinum}"
    textColor: "{colors.ink}"
  menuBar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  button:
    backgroundColor: "{colors.platinum}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  desktopIcon:
    textColor: "{colors.paper}"
---

## Overview

This is the **Mac OS 9 "Platinum"** appearance, rebuilt for Leo's desktop. The
feel is a 1999 beige-box Mac: flat neutral grays, hairline black outlines,
chunky bevels that fake light coming from the top-left, pinstripe textures, and
the Charcoal system font. Nothing is glossy, gradient-heavy, or soft. Depth
comes from light/shadow bevels, not blur or large radii.

We are faithful to the Platinum **vocabulary**, not to a 72-DPI pixel grid. This
is a primarily-iPhone app, so it's tuned for a modern touch screen: text is
antialiased and sized to read comfortably, touch targets are generous, and the
whole UI scales as one unit (see Layout). What stays true to form is the
vocabulary — the gray palette, two-tone bevels, hairline borders, small radii,
pinstripes, and dense grid-aligned layout. When unsure about that vocabulary,
copy the real thing — reference OS 9 windows, buttons, and scrollbars rather
than inventing a modern interpretation.

## Colors

The palette is almost entirely neutral gray. Color is rare and meaningful.

- **Ink (#000000):** All text and the 1px outline around every window and control.
- **Platinum (#CCCCCC):** The default surface — window bodies, buttons, scrollbar tracks.
- **Platinum Light (#EEEEEE) / Platinum Dark (#999999):** The two faces of a bevel; lighter toward the light source, darker away from it.
- **Bevel Highlight (#FFFFFF) / Shadow (#808080) / Dark (#555555):** The 1px edge lines that make a control read as raised or pressed.
- **Accent (#3366CC):** The single interactive blue. Used only for the default-button ring and focus.
- **Selection (#B5C5E0):** Highlighted text and selected list rows.
- **Desktop (#8497A8):** The slate-blue desktop behind the windows.
- **Paper (#FFFFFF):** Editable content areas, menus, and list backgrounds.

## Typography

The system font is **Charcoal** (fall back to Geneva, then Tahoma). Monaco is
the monospace face for any numeric or code-like content. Sizes are in `rem` so
they scale with the root font-size knob (see Layout) — `1rem` is the standard UI
size, `0.8rem` for secondary labels.

- **Title:** `1rem` bold — title bars, menu items, button labels.
- **Body:** `1rem` regular — most content.
- **Small:** `0.8rem` — captions, metadata, status text.

Let text antialias normally — at touch-comfortable sizes on a retina screen,
smoothed Charcoal/Geneva reads better than forced pixelation. The crispness
budget goes to borders and bevels, not type.

## Layout

Everything lives on the **desktop**: a slate-blue field with launchable app
icons. Apps open as draggable **windows**, each with a pinstriped title bar.
There is a single **menu bar** pinned to the top of the screen (white, hairline
black underline), not per-window. Spacing is tight and grid-aligned — `spacing.md`
(`0.5rem`) is the workhorse unit.

**Scale.** The whole UI scales from one knob: the root `font-size` on `html`
(~18px on phones, a little smaller on wide desktop screens). Because type and
spacing tokens are in `rem`, everything grows and shrinks together from that
single value — no per-component breakpoints. **Borders and radii stay in `px`**
(see Shapes) so a hairline is always a crisp 1 device-relative pixel and never
blurs to a fractional width when the UI scales. Don't introduce a competing zoom
or `transform: scale` — adjust the root font-size instead.

## Elevation & Depth

Depth is faked with 1px bevel lines, never shadows or blur:

- **Raised** (buttons, window frames): white/light edge on top-left, gray/dark edge on bottom-right.
- **Pressed / recessed** (text fields, wells, pushed buttons): the bevel inverts — dark top-left, light bottom-right.

A control is "3D" because of these two-tone edges plus a flat platinum face.

## Shapes

Corners are square or barely rounded. Windows are rectangular (0 radius);
buttons get a 2px radius at most. No pills, no circles except radio buttons.
Title bars carry horizontal **pinstripes** (alternating 1px light/dark gray
lines) when the window is active; an inactive window's title bar is plain
platinum with grayed-out text and controls.

Border widths and radii are defined in `px`, never `rem` — they're hairline
details that must stay crisp at any scale, so they don't grow with the root
font-size.

## Components

- **Window:** 1px ink outline, platinum body, pinstriped title bar with a close box (top-left) and zoom/collapse boxes (top-right). Draggable by the title bar.
- **Button:** platinum face, two-tone bevel, `1rem` bold label. The default button gets a 2–3px accent-blue ring. Pressed state inverts the bevel. Give genuinely tappable controls a comfortable min height so they're easy to hit on a phone.
- **Segmented control:** a row of joined beveled buttons sharing hairline dividers. The selected segment(s) sit pressed in (inverted bevel). Single-select for either/or choices; multi-select where more than one can be on at once.
- **Checkbox:** a small beveled platinum box that reads pressed-in when checked, with a 1px ink check mark, and a label to its right. Square, never round (rounds are for radio buttons).
- **Text field:** a recessed white-paper well (inverted bevel, 1px ink outline) holding native input text. Wrap native pickers (date/time/number) in the same chrome so the phone keeps its built-in pickers. Editable content stays selectable.
- **Timer:** a live elapsed-time readout in Monaco/tabular figures (`M:SS`, or `H:MM:SS` past an hour) so the digits don't jitter as it ticks.
- **Menu bar:** white strip across the top, black labels, blue selection highlight on open menus.
- **Scrollbar:** platinum track with a faint pinstripe, a beveled draggable thumb, and arrow buttons at each end.
- **Desktop icon:** small pixel icon with a white label below; selected icons invert the label to the selection color.

## Do's and Don'ts

- **Do** outline every surface with a hairline black border and bevel it with two-tone edges.
- **Do** keep color scarce — gray is the default; blue means "interactive."
- **Do** size type and spacing in `rem`, and borders/radii in `px`. Scale the UI with the root font-size.
- **Do** give tappable controls a comfortable touch size, even when the chrome around them is dense.
- **Don't** use drop shadows, blur, gradients, or large border radii.
- **Don't** introduce new accent colors or modern flat-design conventions.
- **Don't** scale the UI with `zoom` or `transform: scale` — it softens hairlines. Use the root font-size.
- **Don't** force pixelated/non-antialiased text.
