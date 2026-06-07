// Shared, plain-data types for the schedule. No runtime imports here, so this is
// safe to import from both the server-only DAL and client components.

export type EventType = "feed" | "sleep" | "diaper";

/**
 * A schedule event as the client sees it: camelCase, timestamps as ISO-UTC
 * strings. The DAL maps DB rows to this and never leaks raw rows.
 * `endAt === null` on a feed/sleep means a timer is still running.
 */
export interface EventDTO {
  id: string;
  type: EventType;
  startAt: string;
  endAt: string | null;
  // feed
  fedLeft: boolean | null;
  fedRight: boolean | null;
  fedBottle: boolean | null;
  bottleMl: number | null;
  // diaper
  pee: boolean | null;
  poo: boolean | null;
  note: string | null;
}
