import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev machine's LAN hostname so HMR works when testing on the
  // iPhone over the local network (Next 16 blocks cross-origin dev resources
  // by default). Dev-only; has no effect on production.
  allowedDevOrigins: ["janeway.local"],
};

export default nextConfig;
