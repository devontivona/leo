#!/usr/bin/env node
// sleep-summary — compute the previous day's sleep picture for the daily
// text: nap count + daytime total + last nap's end time, last night's
// bedtime->wake span, overnight feed count, and the full-period sleep total.
// Outputs JSON; the scheduled job reads it and decides whether to report the
// summary or ask for missing pieces first.
//
// Window definition (calendar-day, not clock-relative): naps come from
// YESTERDAY's calendar day (local midnight to midnight); bedtime is the one
// that STARTED yesterday (and, on a normal night, ends today). This matches
// how a parent actually thinks about "yesterday" rather than a raw "last 24h
// from whenever the job happens to run" window, which silently clips a
// morning nap if the job runs a few minutes late.
//
// Reuses the same DATABASE_URL resolution + timezone conventions as
// cli/leo.mjs (see that file for the rationale). Read-only — never writes.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TZ = process.env.LEO_TZ || "America/Los_Angeles";
// Naive date/time strings below (e.g. "2026-09-13T00:00:00") parse against
// this process's local zone — pin it to the household zone, same trick the
// CLI uses, so "midnight" means midnight Pacific regardless of host TZ.
process.env.TZ = TZ;

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
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
    join(__dirname, "..", ".env.local"),
    join(process.cwd(), ".env.local"),
  ];
  for (const f of candidates) {
    const url = readEnvVar(f, "DATABASE_URL");
    if (url) return url;
  }
  throw new Error("DATABASE_URL not set (env, ~/.config/leo/env, or .env.local)");
}

const sql = neon(databaseUrl());

function fmtClock(d) {
  return new Date(d).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
}

/** Unified duration format used everywhere in the summary: "3h 4m", "10h", "45m". */
function fmtDurationWords(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function ymd(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Local midnight (household TZ) for the calendar day containing `d`. */
function localMidnight(d) {
  return new Date(`${ymd(d)}T00:00:00`);
}

async function main() {
  const now = new Date();
  const todayStart = localMidnight(now);
  // Step back 12h from today's midnight to land safely in yesterday's
  // calendar day regardless of DST, then take THAT day's midnight.
  const yesterdayStart = localMidnight(new Date(todayStart.getTime() - 12 * 3600 * 1000));

  // Bedtime: the one that STARTED yesterday.
  const bedtimeRows = await sql`
    select * from events
    where type = 'bedtime'
      and start_at >= ${yesterdayStart.toISOString()} and start_at < ${todayStart.toISOString()}
    order by start_at desc limit 1
  `;
  const bedtime = bedtimeRows[0] ?? null;

  // Naps: yesterday's calendar day.
  const naps = await sql`
    select * from events
    where type = 'sleep' and end_at is not null
      and start_at >= ${yesterdayStart.toISOString()} and start_at < ${todayStart.toISOString()}
    order by start_at asc
  `;
  const napCount = naps.length;
  const napTotalMs = naps.reduce((sum, n) => sum + (new Date(n.end_at) - new Date(n.start_at)), 0);
  const lastNap = naps[naps.length - 1] ?? null;

  const missing = [];
  let overnightFeeds = [];

  if (!bedtime) {
    missing.push("bedtime", "wake", "overnight_feed");
  } else if (!bedtime.end_at) {
    missing.push("wake");
    const feeds = await sql`
      select * from events where type = 'feed' and start_at >= ${bedtime.start_at}
      order by start_at asc
    `;
    overnightFeeds = feeds;
    if (feeds.length === 0) missing.push("overnight_feed");
  } else {
    const feeds = await sql`
      select * from events where type = 'feed'
        and start_at >= ${bedtime.start_at} and start_at <= ${bedtime.end_at}
      order by start_at asc
    `;
    overnightFeeds = feeds;
    if (feeds.length === 0) missing.push("overnight_feed");
  }

  const bedtimeMs = bedtime?.end_at ? new Date(bedtime.end_at) - new Date(bedtime.start_at) : null;
  const totalSleepMs = bedtimeMs != null ? napTotalMs + bedtimeMs : null;

  const result = {
    dayOf: ymd(yesterdayStart), // which calendar day this summary covers
    naps: {
      count: napCount,
      totalMinutes: Math.round(napTotalMs / 60000),
      total: fmtDurationWords(napTotalMs),
      lastNapEndClock: lastNap ? fmtClock(lastNap.end_at) : null,
    },
    bedtime: bedtime
      ? {
          startAt: bedtime.start_at,
          endAt: bedtime.end_at,
          startClock: fmtClock(bedtime.start_at),
          endClock: bedtime.end_at ? fmtClock(bedtime.end_at) : null,
          durationMinutes: bedtimeMs != null ? Math.round(bedtimeMs / 60000) : null,
          total: bedtimeMs != null ? fmtDurationWords(bedtimeMs) : null,
        }
      : null,
    overnightFeeds: {
      count: overnightFeeds.length,
      clockTimes: overnightFeeds.map((f) => fmtClock(f.start_at)),
    },
    totalSleep:
      totalSleepMs != null
        ? { minutes: Math.round(totalSleepMs / 60000), total: fmtDurationWords(totalSleepMs) }
        : null,
    missing, // [] means ready to report the full summary
  };

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main().catch((e) => {
  process.stderr.write(`error: ${e.message}\n`);
  process.exit(1);
});
