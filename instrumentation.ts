// Runs once when the Next.js server boots (see Next docs: instrumentation.js).
// We use it to stand up the WebSocket server that the EO photo frame connects to,
// so Leo can push photos to it directly. Node runtime only — `ws` is Node-only,
// and the Edge runtime has no long-lived sockets.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startFrameServer } = await import("@/lib/frame-server");
    startFrameServer();
  }
}
