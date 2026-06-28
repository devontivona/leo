---
name: leo
description: Logs Leo's day — feeds (left/right/bottle), naps, and diapers (pee/poop) — and reads back his recent schedule, using the `leo` CLI. Use whenever a parent says Leo just ate, nursed, had a bottle, went down for a nap, woke up, or had a wet/dirty diaper, or asks when he last fed/napped/was changed. Events default to "now"; backdate with --ago or --at.
metadata:
  updatedAt: "2026-06-28"
allowed-tools: Bash(leo:*)
---

# leo: log My Schedule from the terminal

`leo` is Leo's own command-line tool for keeping his schedule — the same
feeds / naps / diapers timeline you see in the **My Schedule** app, written to
the same database. It's how Leo "runs his life from his computer" (he can't;
he's a baby; that's the joke). Use it to log events as they happen and to check
when he last ate, slept, or was changed.

Everything is logged as **happening now** unless you backdate it with `--ago`
or `--at`. Times are stored UTC and shown in your local time.

## Install

If `leo` isn't already on PATH, install it once from the repo:

```
bash cli/install.sh        # installs deps, links `leo`, seeds DATABASE_URL
```

or by hand:

```
cd cli && npm install && npm link
```

It needs **Node ≥ 20.9** (this machine defaults to Node 16 — run `nvm use 22`
first) and a `DATABASE_URL` for the Neon database. The installer copies that
from the repo's `.env.local` into `~/.config/leo/env`; otherwise export
`DATABASE_URL` yourself. Verify with `leo --help`.

## Logging

```
leo feed --bottle --ml 120      # a 120ml bottle, now
leo feed --left                 # nursed on the left
leo feed --left --right --for 18m   # both sides, lasted 18 minutes
leo nap --ago 2h --for 50m      # a 50-min nap that started 2 hours ago
leo pee                         # wet diaper
leo poop                        # dirty diaper
leo poop --wet                  # dirty AND wet
leo diaper                      # a dry change (neither pee nor poop)
```

- **feed** needs at least one source: `--left`, `--right`, and/or `--bottle`.
  `--ml <n>` records bottle volume (and implies `--bottle`).
- **nap** takes no flags of its own; use `--for`/`--ago` for duration and timing.
- **pee** / **poop** are shortcuts; `poop --wet` marks it wet too. Use `diaper
  --pee --poo` for the explicit form, or bare `diaper` for a dry change.
- **feeds and naps** are recorded as completed events. Add `--for <dur>` to give
  them a duration (e.g. `20m`, `1h15m`); without it they're a point in time.

## Reading

```
leo status            # time since the last feed, nap, and diaper
leo log               # the last 20 events, newest first
leo log --limit 50    # more history
leo log --json        # structured array of events for parsing
```

Use `--json` on `log` or `status` (and on any logging command) to get the raw
event back as JSON instead of a human confirmation.

## Shared options

- `--ago <dur>` — backdate by a duration: `30m`, `1h`, `1h15m` (bare number =
  minutes).
- `--at <time>` — absolute time instead: `"14:30"`, `"2026-06-28 14:30"`, or ISO.
- `--for <dur>` — duration of a feed or nap.
- `--note "<text>"` — attach a note (quote it if it has spaces).
- `--json` — machine-readable output.

## Tips for agents

- Write in Leo's playful first-person voice — it's **My Schedule**, not a "baby
  tracker." Confirm what you logged back to the parent ("Logged a 120ml bottle
  at 2:14 PM").
- Default to **now**. Only reach for `--ago`/`--at` when the parent says it
  happened earlier ("he ate an hour ago" → `--ago 1h`).
- Don't guess a feed source — if they just say "he ate," ask whether it was
  left, right, or a bottle (and how many ml), since `feed` requires a source.
- `leo status` is the fast answer to "when did Leo last …?" — prefer it over
  scanning `leo log`.
- Exit code is `0` on success, `1` on error (message on stderr) — branch on it.
- Logging writes to the real shared database the whole household sees; treat it
  like a real action, not a dry run.
