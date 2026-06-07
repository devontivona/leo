import "server-only";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { assertAuthorized } from "@/lib/auth";
import type { EventDTO, EventType } from "@/app/components/schedule/types";

// ---------------------------------------------------------------------------
// Input types (the action/UI build these; date fields are ISO strings).
// ---------------------------------------------------------------------------

export interface StartTimedInput {
  type: "feed" | "sleep";
  fedLeft?: boolean;
  fedRight?: boolean;
  fedBottle?: boolean;
  bottleMl?: number;
}

export interface CreateTimedInput {
  type: "feed" | "sleep";
  startAt: string; // ISO UTC
  endAt: string; // ISO UTC
  fedLeft?: boolean;
  fedRight?: boolean;
  fedBottle?: boolean;
  bottleMl?: number;
  note?: string;
}

export interface CreateDiaperInput {
  at: string; // ISO UTC
  pee: boolean;
  poo: boolean;
  note?: string;
}

// ---------------------------------------------------------------------------
// Zod schemas — the validation choke point at the client trust boundary.
// ---------------------------------------------------------------------------

const note = z.string().trim().max(1000).optional();
const ml = z.coerce.number().int().nonnegative().optional();
const hasFeedSource = (v: { fedLeft?: boolean; fedRight?: boolean; fedBottle?: boolean; type: string }) =>
  v.type !== "feed" || Boolean(v.fedLeft || v.fedRight || v.fedBottle);

const StartTimed = z
  .object({
    type: z.enum(["feed", "sleep"]),
    fedLeft: z.boolean().optional(),
    fedRight: z.boolean().optional(),
    fedBottle: z.boolean().optional(),
    bottleMl: ml,
  })
  .refine(hasFeedSource, { message: "Pick at least one feed source." });

const CreateTimed = z
  .object({
    type: z.enum(["feed", "sleep"]),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    fedLeft: z.boolean().optional(),
    fedRight: z.boolean().optional(),
    fedBottle: z.boolean().optional(),
    bottleMl: ml,
    note,
  })
  .refine(hasFeedSource, { message: "Pick at least one feed source." })
  .refine((v) => v.endAt >= v.startAt, { message: "It can't end before it starts." });

const CreateDiaperSchema = z.object({
  at: z.coerce.date(),
  pee: z.boolean(),
  poo: z.boolean(),
  note,
});

const ById = z.object({ id: z.uuid() });
const ListOpts = z.object({ limit: z.number().int().positive().max(500).optional() }).optional();

// ---------------------------------------------------------------------------
// Row → DTO
// ---------------------------------------------------------------------------

interface Row {
  id: string;
  type: EventType;
  start_at: Date | string;
  end_at: Date | string | null;
  fed_left: boolean | null;
  fed_right: boolean | null;
  fed_bottle: boolean | null;
  bottle_ml: number | null;
  pee: boolean | null;
  poo: boolean | null;
  note: string | null;
}

const iso = (v: Date | string) => (v instanceof Date ? v : new Date(v)).toISOString();

function rowToDTO(r: Row): EventDTO {
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

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "23505";
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listEvents(opts?: { limit?: number }): Promise<EventDTO[]> {
  const parsed = ListOpts.parse(opts);
  const limit = parsed?.limit ?? 50;
  await assertAuthorized();
  const sql = getSql();
  const rows = (await sql`
    select * from events order by start_at desc limit ${limit}
  `) as Row[];
  return rows.map(rowToDTO);
}

/** In-progress timers to resume. Diapers are always end_at NULL, so exclude them. */
export async function getActiveEvents(): Promise<EventDTO[]> {
  await assertAuthorized();
  const sql = getSql();
  const rows = (await sql`
    select * from events
    where end_at is null and type in ('feed', 'sleep')
    order by start_at desc
  `) as Row[];
  return rows.map(rowToDTO);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Start a live timer: start_at = now() (DB clock, no device skew), end_at NULL. */
export async function startTimedEvent(input: StartTimedInput): Promise<EventDTO> {
  const v = StartTimed.parse(input);
  await assertAuthorized();
  const sql = getSql();
  const isFeed = v.type === "feed";
  try {
    const rows = (await sql`
      insert into events (type, start_at, fed_left, fed_right, fed_bottle, bottle_ml)
      values (
        ${v.type}, now(),
        ${isFeed ? Boolean(v.fedLeft) : null},
        ${isFeed ? Boolean(v.fedRight) : null},
        ${isFeed ? Boolean(v.fedBottle) : null},
        ${isFeed ? v.bottleMl ?? null : null}
      )
      returning *
    `) as Row[];
    return rowToDTO(rows[0]);
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new Error(v.type === "feed" ? "A feed timer is already running." : "A nap timer is already running.");
    }
    throw e;
  }
}

/** Stop a live timer: set end_at = now(). Idempotent if already stopped. */
export async function stopTimedEvent(input: { id: string }): Promise<EventDTO> {
  const { id } = ById.parse(input);
  await assertAuthorized();
  const sql = getSql();
  const rows = (await sql`
    update events set end_at = now() where id = ${id} and end_at is null returning *
  `) as Row[];
  if (rows.length) return rowToDTO(rows[0]);
  const cur = (await sql`select * from events where id = ${id}`) as Row[];
  if (cur.length) return rowToDTO(cur[0]);
  throw new Error("That entry no longer exists.");
}

/** Backdated/manual timed entry: both timestamps set up front. */
export async function createTimedEvent(input: CreateTimedInput): Promise<EventDTO> {
  const v = CreateTimed.parse(input);
  await assertAuthorized();
  const sql = getSql();
  const isFeed = v.type === "feed";
  const rows = (await sql`
    insert into events (type, start_at, end_at, fed_left, fed_right, fed_bottle, bottle_ml, note)
    values (
      ${v.type}, ${v.startAt}, ${v.endAt},
      ${isFeed ? Boolean(v.fedLeft) : null},
      ${isFeed ? Boolean(v.fedRight) : null},
      ${isFeed ? Boolean(v.fedBottle) : null},
      ${isFeed ? v.bottleMl ?? null : null},
      ${v.note ?? null}
    )
    returning *
  `) as Row[];
  return rowToDTO(rows[0]);
}

/** Instantaneous diaper entry (dry change = pee and poo both false). */
export async function createDiaper(input: CreateDiaperInput): Promise<EventDTO> {
  const v = CreateDiaperSchema.parse(input);
  await assertAuthorized();
  const sql = getSql();
  const rows = (await sql`
    insert into events (type, start_at, pee, poo, note)
    values ('diaper', ${v.at}, ${v.pee}, ${v.poo}, ${v.note ?? null})
    returning *
  `) as Row[];
  return rowToDTO(rows[0]);
}

export async function deleteEvent(input: { id: string }): Promise<void> {
  const { id } = ById.parse(input);
  await assertAuthorized();
  const sql = getSql();
  await sql`delete from events where id = ${id}`;
}
