import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// The Neon serverless client. Lazily constructed so importing this module never
// throws at build time when DATABASE_URL is absent — the error only surfaces when
// a query actually runs. This is the ONLY module that reads DATABASE_URL, so the
// connection string never reaches a client bundle.
let client: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set — add it to .env.local");
    }
    client = neon(url);
  }
  return client;
}
