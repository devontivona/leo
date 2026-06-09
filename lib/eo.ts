import "server-only";
import { EOClient, discoverEOs } from "eo-client";
import type { DiscoveredEO } from "eo-client";

// Leo talks to the EO frame as an HTTP appliance: discover it on the LAN, then
// POST the framed JPEG bytes to it. This runs server-side (Leo's server is
// LAN-local even though the browser reaches Leo over Tailscale), which also
// sidesteps the browser's mixed-content block on plain-HTTP LAN devices.

export function listEOs(): Promise<DiscoveredEO[]> {
  const hosts = process.env.EO_HOSTS
    ? process.env.EO_HOSTS.split(",").map((h) => h.trim()).filter(Boolean)
    : undefined;
  return discoverEOs({ hosts });
}

export function eoClient(baseUrl: string): EOClient {
  return new EOClient({ baseUrl });
}
