import "server-only";

// The single authorization seam. Every Data Access Layer function awaits this
// before touching the database, so when we add a household PIN this is the only
// place that changes — it instantly covers every read and write path.
//
// Deferred for now (the app runs locally / behind the LAN). To harden later:
// read the session cookie via `cookies()` from "next/headers", compare a hashed
// PIN, and throw if it doesn't match.
export async function assertAuthorized(): Promise<void> {
  return;
}
