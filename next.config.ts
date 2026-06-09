import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev machine's LAN hostname so HMR works when testing on the
  // iPhone over the local network, plus the devbox public subdomain that
  // proxies in over HTTPS (Next 16 blocks cross-origin dev resources by
  // default, which wedges client hydration). Dev-only; no effect on production.
  allowedDevOrigins: [
    "janeway.local",
    "janeway.tail7f149.ts.net",
    "leo.waywardlane.com",
  ],

  // eo-client (+ its mDNS dep) talk to the EO frame server-side; don't bundle
  // them so their dynamic node:net / node:dgram imports work at runtime.
  serverExternalPackages: ["eo-client", "bonjour-service"],

  experimental: {
    // My Photos uploads full-resolution phone photos through a Server Action;
    // the default 1MB cap is far too small. The framed crop is tiny by contrast.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
