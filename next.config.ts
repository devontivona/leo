import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev machine's LAN hostname so HMR works when testing on the
  // iPhone over the local network (Next 16 blocks cross-origin dev resources
  // by default). Dev-only; has no effect on production.
  allowedDevOrigins: ["janeway.local", "janeway.tail7f149.ts.net"],

  experimental: {
    // My Photos uploads full-resolution phone photos through a Server Action;
    // the default 1MB cap is far too small. The framed crop is tiny by contrast.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
