#!/usr/bin/env node
// sleep-summary — compute the previous-24h sleep picture for the 9am daily
// text: nap count + daytime total, last night's bedtime->wake span, and how
// many times Leo woke to feed overnight. Outputs JSON; the scheduled job
// reads it and decides whether to report the summary or ask for missing
// pieces first.
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

function fmtDurationWords(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h${m}m` : `${h}h`;
}

async function main() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 24 * 3600 * 1000);
  // Look back further than the 24h window for the bedtime candidate itself,
  // since "last night's bedtime" for a 9am run started ~13-15h ago but the
  // window edge could clip an early bedtime; 30h covers any reasonable case.
  const bedtimeLookback = new Date(now.getTime() - 30 * 3600 * 1000);

  const naps = await sql`
    select * from events
    where type = 'sleep' and end_at is not null
      and start_at >= ${windowStart.toISOString()} and start_at < ${now.toISOString()}
    order by start_at asc
  `;
  const napCount = naps.length;
  const napTotalMs = naps.reduce((sum, n) => sum + (new Date(n.end_at) - new Date(n.start_at)), 0);

  const bedtimeRows = await sql`
    select * from events
    where type = 'bedtime'
      and start_at >= ${bedtimeLookback.toISOString()} and start_at < ${now.toISOString()}
    order by start_at desc limit 1
  `;
  const bedtime = bedtimeRows[0] ?? null;

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

  const result = {
    windowStart: windowStart.toISOString(),
    windowEnd: now.toISOString(),
    naps: {
      count: napCount,
      totalMinutes: Math.round(napTotalMs / 60000),
      totalWords: fmtDurationWords(napTotalMs),
    },
    bedtime: bedtime
      ? {
          startAt: bedtime.start_at,
          endAt: bedtime.end_at,
          startClock: fmtClock(bedtime.start_at),
          endClock: bedtime.end_at ? fmtClock(bedtime.end_at) : null,
          durationMinutes: bedtime.end_at
            ? Math.round((new Date(bedtime.end_at) - new Date(bedtime.start_at)) / 60000)
            : null,
          durationWords: bedtime.end_at
            ? fmtDurationWords(new Date(bedtime.end_at) - new Date(bedtime.start_at))
            : null,
        }
      : null,
    overnightFeeds: {
      count: overnightFeeds.length,
      clockTimes: overnightFeeds.map((f) => fmtClock(f.start_at)),
    },
    missing, // [] means ready to report the full summary
  };

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main().catch((e) => {
  process.stderr.write(`error: ${e.message}\n`);
  process.exit(1);
});
