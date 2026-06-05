# AGENTS.md

Guidance for AI agents working in this repo. See `README.md` for the project overview.

## What this is

A private Next.js site for tracking baby stuff and storing photos, styled as a
**Mac OS 9 Platinum** desktop. The desktop holds app icons; opening one launches
a classic OS 9 window. Apps so far: **My Schedule** (sleep/feeding/diapers as one
timeline), **Photo Albums**, **Milestones**.

The framing is that this is **Leo's own 90s computer** in his room — he "runs"
his life from it (he can't; he's a baby; that's the joke). Write all
user-facing copy from his first-person point of view: *My Schedule*, *My
Photos*, not "Baby Tracker." Keep that voice playful and consistent.

## Design intent

- **Faithful to the Platinum vocabulary, tuned for touch.** Match real Platinum
  chrome — title bars, window controls, scrollbars, two-tone beveled borders,
  the Charcoal/Geneva font feel. But this is a primarily-iPhone app, so we don't
  chase a 72-DPI pixel grid: text antialiases normally, touch targets are
  generous, and the UI scales as one unit. When unsure about the *look*, copy
  real OS 9; for sizing/usability, favor the phone. `DESIGN.md` is the source of
  truth — read it before styling.
- **Scaling:** size type and spacing in `rem`, borders and radii in `px`. The
  whole UI scales from the root `font-size` on `html` (~18px on phones, smaller
  on desktop). Never use `zoom` or `transform: scale` — it blurs hairlines.
- The desktop metaphor is core: shortcuts launch windowed apps. Keep that mental
  model intact when adding features.
- Playful, but not cluttered. It's for two parents, not a product.

## Conventions

- Next.js App Router. Keep retro UI primitives (window, button, scrollbar, etc.)
  as shared, reusable components — don't re-style chrome per app.
- Data lives in Postgres (Supabase). Keep it private; no public/unauthenticated access.

## Scope

- Private to one household. Don't add multi-tenant, accounts, or sharing flows
  unless asked.
- Ask before pulling in heavy dependencies or new infrastructure.

## Tooling

- **Node:** requires Node ≥20.9 (Next.js 16). This machine defaults to Node 16 —
  use nvm (`nvm use 22`) before running `npm`/`next`.
- **Design system:** `DESIGN.md` is the source of truth for the Platinum look.
  After editing it, run `npm run design:lint`, then `npm run design:export` to
  regenerate `app/platinum.theme.css` (imported by `app/globals.css`) and the
  token JSON files. Don't hand-edit the generated files.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
