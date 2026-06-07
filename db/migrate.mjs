// Tiny, dependency-light migration runner. Applies every db/*.sql file in order
// through the Neon serverless driver. Run with `npm run db:migrate` (Node 22).
//
// No migration framework on purpose (see AGENTS.md "ask before new infra"): each
// file is append-only and idempotent (`create ... if not exists`), so re-running
// is safe. Add 0002_*.sql, 0003_*.sql, … as the schema grows.

import dotenv from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const here = dirname(fileURLToPath(import.meta.url));

// Next reads .env.local automatically; this standalone script must be told.
dotenv.config({ path: ".env.local" });
dotenv.config(); // .env fallback

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — add it to .env.local");
  process.exit(1);
}

const sql = neon(url);

// Split a .sql file into individual statements. The Neon HTTP driver runs one
// statement per call, so we strip line comments and split on the semicolons
// between statements. Safe here because our SQL has no ';' inside literals.
function statements(text) {
  return text
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

const files = readdirSync(here)
  .filter((f) => /^\d+.*\.sql$/.test(f))
  .sort();

if (files.length === 0) {
  console.error("No migration files found in", here);
  process.exit(1);
}

for (const file of files) {
  const stmts = statements(readFileSync(join(here, file), "utf8"));
  console.log(`→ ${file} (${stmts.length} statements)`);
  for (const stmt of stmts) {
    try {
      await sql.query(stmt);
    } catch (err) {
      console.error(`\n✗ failed in ${file}:\n${stmt}\n`);
      console.error(err.message);
      process.exit(1);
    }
  }
}

console.log("✓ migrations applied");
