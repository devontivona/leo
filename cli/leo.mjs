#!/usr/bin/env node
// leo — Leo's own command-line tool for logging his schedule.
//
// Talks straight to Neon (the same Postgres the app uses) via the serverless
// driver, mirroring db/migrate.mjs. It does NOT import the server-only DAL
// (data/events.ts) — instead it re-runs the same small INSERTs. The DB CHECK
// constraints in db/*.sql are the shared source of truth, so the CLI and the
// web UI can't drift on what a valid event looks like.
//
// Design: instant by default. `leo feed` logs a feed happening now; `--ago`
// backdates it and `--for` gives it a duration. Diapers are instantaneous.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Output helpers (stdout = results, stderr = diagnostics; exit 1 on error)
// ---------------------------------------------------------------------------

function fail(msg) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  process.stdout.write(`${msg}\n`);
}

// ---------------------------------------------------------------------------
// DATABASE_URL resolution: env first, then ~/.config/leo/env, then a repo
// .env.local (so it just works when run from a checkout). No dotenv dep.
// ---------------------------------------------------------------------------

function readEnvVar(file, key) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    if (line.slice(0, eq).trim() !== key) continue;
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    return val;
  }
  return null;
}

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const candidates = [
    join(homedir(), ".config", "leo", "env"),
    join(__dirname, "..", ".env.local"), // repo root when run from a checkout
    join(process.cwd(), ".env.local"),
  ];
  for (const f of candidates) {
    const url = readEnvVar(f, "DATABASE_URL");
    if (url) return url;
  }
  fail(
    "DATABASE_URL is not set. Export it, or put it in ~/.config/leo/env\n" +
      "(KEY=VALUE form). The installer seeds it from the repo's .env.local.",
  );
}

function getSql() {
  return neon(databaseUrl());
}

// ---------------------------------------------------------------------------
// Argument parsing — flat subcommands, a known set of value-taking flags.
// Supports `--flag value`, `--flag=value`, and bare boolean `--flag`.
// ---------------------------------------------------------------------------

const VALUE_FLAGS = new Set(["ml", "ago", "at", "for", "note", "limit"]);

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      let key = a.slice(2);
      let val;
      const eq = key.indexOf("=");
      if (eq >= 0) {
        val = key.slice(eq + 1);
        key = key.slice(0, eq);
      }
      if (VALUE_FLAGS.has(key)) {
        if (val === undefined) {
          val = argv[++i];
          if (val === undefined) fail(`--${key} needs a value`);
        }
        flags[key] = val;
      } else {
        flags[key] = val === undefined ? true : val;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

// ---------------------------------------------------------------------------
// Time + duration parsing. Times are stored UTC; we accept relative (--ago)
// or absolute (--at) and emit ISO strings, exactly like the UI does.
// ---------------------------------------------------------------------------

function parseDuration(s) {
  const str = String(s).trim().toLowerCase();
  if (/^\d+$/.test(str)) return parseInt(str, 10); // bare number = minutes
  const m = str.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/);
  if (!m || (!m[1] && !m[2])) {
    fail(`bad duration "${s}" — use e.g. 30m, 1h, or 1h15m`);
  }
  return parseInt(m[1] || "0", 10) * 60 + parseInt(m[2] || "0", 10);
}

/** When did the event happen? --at wins (absolute), else now minus --ago. */
function resolveStart(flags) {
  if (flags.at !== undefined) {
    const d = new Date(flags.at);
    if (Number.isNaN(d.getTime())) fail(`bad --at "${flags.at}"`);
    return d;
  }
  const now = new Date();
  if (flags.ago !== undefined) {
    return new Date(now.getTime() - parseDuration(flags.ago) * 60000);
  }
  return now;
}

function intOption(flags, key) {
  if (flags[key] === undefined) return null;
  const n = Number(flags[key]);
  if (!Number.isInteger(n) || n < 0) fail(`--${key} must be a non-negative whole number`);
  return n;
}

function noteOption(flags) {
  if (flags.note === undefined) return null;
  const n = String(flags.note).trim();
  if (n.length > 1000) fail("--note is too long (max 1000 chars)");
  return n || null;
}

// ---------------------------------------------------------------------------
// Row → DTO (camelCase, ISO timestamps) — matches data/events.ts EventDTO.
// ---------------------------------------------------------------------------

const iso = (v) => (v instanceof Date ? v : new Date(v)).toISOString();

function rowToDTO(r) {
  return {
    id: r.id,
    type: r.type,
    startAt: iso(r.start_at),
    endAt: r.end_at == null ? null : iso(r.end_at),
    fedLeft: r.fed_left,
    fedRight: r.fed_right,
    fedBottle: r.fed_bottle,
    bottleMl: r.bottle_ml,
    pee: r.pee,
    poo: r.poo,
    note: r.note,
  };
}

// ---------------------------------------------------------------------------
// Human formatting
// ---------------------------------------------------------------------------

function clockTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayTime(isoStr) {
  return new Date(isoStr).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function durationMin(dto) {
  if (!dto.endAt) return null;
  return Math.round((new Date(dto.endAt) - new Date(dto.startAt)) / 60000);
}

function humanizeAgo(isoStr) {
  const mins = Math.round((Date.now() - new Date(isoStr).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m ago` : `${h}h ago`;
}

function describe(dto) {
  if (dto.type === "feed") {
    const src = [
      dto.fedLeft && "left",
      dto.fedRight && "right",
      dto.fedBottle && (dto.bottleMl != null ? `bottle ${dto.bottleMl}ml` : "bottle"),
    ].filter(Boolean);
    return `feed (${src.join(", ")})`;
  }
  if (dto.type === "sleep") return "nap";
  if (dto.type === "diaper") {
    const what = [dto.pee && "pee", dto.poo && "poop"].filter(Boolean);
    return what.length ? `diaper (${what.join(" + ")})` : "diaper (dry)";
  }
  return dto.type;
}

function confirm(dto) {
  const dur = durationMin(dto);
  const when = clockTime(dto.startAt);
  const tail = dur ? `, ${dur} min` : "";
  ok(`✓ Logged ${describe(dto)} — ${when}${tail}`);
}

// ---------------------------------------------------------------------------
// Write commands
// ---------------------------------------------------------------------------

async function createTimed(type, flags) {
  const start = resolveStart(flags);
  const durMin = flags.for !== undefined ? parseDuration(flags.for) : 0;
  const end = new Date(start.getTime() + durMin * 60000);

  let fedLeft = null;
  let fedRight = null;
  let fedBottle = null;
  let ml = null;

  if (type === "feed") {
    fedLeft = Boolean(flags.left);
    fedRight = Boolean(flags.right);
    fedBottle = Boolean(flags.bottle);
    ml = intOption(flags, "ml");
    if (ml != null && !fedBottle) fedBottle = true; // --ml implies a bottle
    if (!fedLeft && !fedRight && !fedBottle) {
      fail("a feed needs a source: pass --left, --right, and/or --bottle");
    }
  }

  const note = noteOption(flags);
  const sql = getSql();
  const rows = await sql`
    insert into events (type, start_at, end_at, fed_left, fed_right, fed_bottle, bottle_ml, note)
    values (
      ${type}, ${start.toISOString()}, ${end.toISOString()},
      ${fedLeft}, ${fedRight}, ${fedBottle}, ${ml}, ${note}
    )
    returning *
  `;
  return rowToDTO(rows[0]);
}

async function createDiaper(flags, { pee, poo }) {
  const at = resolveStart(flags);
  const note = noteOption(flags);
  const sql = getSql();
  const rows = await sql`
    insert into events (type, start_at, pee, poo, note)
    values ('diaper', ${at.toISOString()}, ${pee}, ${poo}, ${note})
    returning *
  `;
  return rowToDTO(rows[0]);
}

// ---------------------------------------------------------------------------
// Read commands
// ---------------------------------------------------------------------------

async function listEvents(limit) {
  const sql = getSql();
  const rows = await sql`
    select * from events order by start_at desc limit ${limit}
  `;
  return rows.map(rowToDTO);
}

function printLogTable(dtos) {
  if (!dtos.length) {
    ok("No events logged yet.");
    return;
  }
  for (const dto of dtos) {
    const dur = durationMin(dto);
    const tail = dur ? ` (${dur}m)` : "";
    ok(`${dayTime(dto.startAt).padEnd(18)}  ${describe(dto)}${tail}`);
  }
}

function printStatus(dtos) {
  const last = (type) => dtos.find((d) => d.type === type);
  const line = (label, dto) =>
    dto ? `${label}: ${describe(dto)} — ${humanizeAgo(dto.startAt)}` : `${label}: none yet`;
  ok(line("Last feed", last("feed")));
  ok(line("Last nap", last("sleep")));
  ok(line("Last diaper", last("diaper")));
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `leo — log Leo's schedule from the terminal

Usage: leo <command> [options]

Logging (happens "now" by default):
  feed     Log a feed.    --left  --right  --bottle  --ml <n>
  nap      Log a nap (sleep).
  pee      Log a wet diaper.
  poop     Log a dirty diaper.    --wet  (also wet)
  diaper   Log a diaper.    --pee  --poo   (neither = a dry change)

Reading:
  log      Show recent events.    --limit <n>  (default 20)
  status   Time since the last feed, nap, and diaper.

Shared options:
  --ago <dur>    Backdate the event by a duration (e.g. 30m, 1h15m).
  --at <time>    Absolute time instead (local or ISO, e.g. "14:30", "2026-06-28 14:30").
  --for <dur>    Duration of a feed or nap (e.g. 20m, 1h). Default 0.
  --note <text>  Attach a note.
  --json         Print the created row(s) as JSON instead of a confirmation.
  -h, --help     Show this help.

Examples:
  leo feed --bottle --ml 120
  leo feed --left --for 18m
  leo nap --ago 2h --for 50m
  leo pee
  leo poop --wet
  leo log --json
  leo status
`;

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const { positional, flags } = parseArgs(argv);
  const cmd = positional[0];

  if (!cmd || flags.help || flags.h || cmd === "help") {
    ok(HELP);
    return;
  }

  const emit = (dto) => (flags.json ? ok(JSON.stringify(dto, null, 2)) : confirm(dto));

  switch (cmd) {
    case "feed":
      emit(await createTimed("feed", flags));
      return;
    case "nap":
    case "sleep":
      emit(await createTimed("sleep", flags));
      return;
    case "pee":
      emit(await createDiaper(flags, { pee: true, poo: false }));
      return;
    case "poop":
    case "poo":
      emit(await createDiaper(flags, { pee: Boolean(flags.wet), poo: true }));
      return;
    case "diaper":
      emit(await createDiaper(flags, { pee: Boolean(flags.pee), poo: Boolean(flags.poo) }));
      return;
    case "log":
    case "list": {
      const limit = intOption(flags, "limit") ?? 20;
      const dtos = await listEvents(limit);
      if (flags.json) ok(JSON.stringify(dtos, null, 2));
      else printLogTable(dtos);
      return;
    }
    case "status": {
      const dtos = await listEvents(50);
      if (flags.json) {
        const last = (type) => dtos.find((d) => d.type === type) ?? null;
        ok(JSON.stringify({ feed: last("feed"), nap: last("sleep"), diaper: last("diaper") }, null, 2));
      } else {
        printStatus(dtos);
      }
      return;
    }
    default:
      fail(`unknown command "${cmd}". Run \`leo --help\`.`);
  }
}

main().catch((e) => {
  const msg = e && e.message ? e.message : String(e);
  if (msg.includes("duplicate key") || (e && e.code === "23505")) {
    fail("a timer of that type is already running.");
  }
  fail(msg);
});
