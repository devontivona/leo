import "server-only";
import { WebSocketServer, WebSocket } from "ws";
import type { FrameDTO } from "@/app/components/photos/types";

// Leo *is* the EO frame's control app. The frame (apps/android-kiosk) is a
// WebSocket client: it dials a configurable server URL, sends REGISTER, then
// waits for a URL_UPDATE telling it which image to show full-screen. So we hold a
// tiny WS server here; publishing a photo is just sending one URL_UPDATE.
//
// Protocol (mirrors the EO repo's WebSocketClient.java exactly):
//   frame → us:  { type:"REGISTER", data:{ name }, timestamp }
//   frame → us:  { type:"STATUS",   data:{ currentUrl, status }, timestamp }
//   us → frame:  { type:"URL_UPDATE", data:{ url }, timestamp }
//   either way:  PING ⇄ PONG
//
// The server is started once from instrumentation.ts (register), on the Node
// runtime. State lives on globalThis so it survives dev hot-reloads and is shared
// with the Server Actions that read/publish (same Node process).

const PORT = Number(process.env.FRAME_WS_PORT ?? 8080);
const ONLINE_WINDOW_MS = 90_000; // a frame counts as online if seen within this
const HEARTBEAT_MS = 30_000;

interface FrameConn {
  id: string;
  ws: WebSocket;
  name: string;
  lastSeen: number;
  currentUrl: string | null;
  heartbeat?: ReturnType<typeof setInterval>;
}

interface WsMessage {
  type: "REGISTER" | "STATUS" | "URL_UPDATE" | "PING" | "PONG";
  data?: Record<string, unknown>;
  timestamp: number;
}

declare global {
  var __leoFrameWss: WebSocketServer | undefined;
  var __leoFrames: Map<string, FrameConn> | undefined;
  var __leoFrameSeq: number | undefined;
}

function frames(): Map<string, FrameConn> {
  if (!globalThis.__leoFrames) globalThis.__leoFrames = new Map();
  return globalThis.__leoFrames;
}

// A stable-ish id per connection. (Date.now()+counter; no crypto needed — these
// are ephemeral connection handles, not persisted.)
function nextId(): string {
  globalThis.__leoFrameSeq = (globalThis.__leoFrameSeq ?? 0) + 1;
  return `frame-${Date.now().toString(36)}-${globalThis.__leoFrameSeq}`;
}

function send(ws: WebSocket, msg: WsMessage): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

/** Start the WS server once. Safe to call repeatedly (idempotent). */
export function startFrameServer(): void {
  if (globalThis.__leoFrameWss) return;

  let wss: WebSocketServer;
  try {
    wss = new WebSocketServer({ port: PORT, skipUTF8Validation: true });
  } catch (err) {
    console.error(`[frame-server] failed to bind port ${PORT}:`, err);
    return;
  }
  globalThis.__leoFrameWss = wss;
  console.log(`[frame-server] listening on ws://0.0.0.0:${PORT}`);

  wss.on("error", (err) => console.error("[frame-server] server error:", err));

  wss.on("connection", (ws: WebSocket) => {
    const conn: FrameConn = {
      id: nextId(),
      ws,
      name: "EO frame",
      lastSeen: Date.now(),
      currentUrl: null,
    };
    frames().set(conn.id, conn);
    console.log(`[frame-server] frame connected: ${conn.id}`);

    // Keep the link warm and refresh lastSeen via PONG replies.
    conn.heartbeat = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;
      send(ws, { type: "PING", data: { timestamp: Date.now() }, timestamp: Date.now() });
    }, HEARTBEAT_MS);

    send(ws, { type: "STATUS", data: { message: "Connected to Leo" }, timestamp: Date.now() });

    ws.on("message", (raw: Buffer) => {
      conn.lastSeen = Date.now();
      let msg: WsMessage;
      try {
        msg = JSON.parse(raw.toString("utf8"));
      } catch {
        return;
      }
      switch (msg.type) {
        case "REGISTER":
          if (typeof msg.data?.name === "string" && msg.data.name.trim()) {
            conn.name = msg.data.name.trim();
          }
          console.log(`[frame-server] registered: ${conn.name} (${conn.id})`);
          break;
        case "STATUS":
          if (typeof msg.data?.currentUrl === "string") conn.currentUrl = msg.data.currentUrl;
          break;
        case "PING":
          send(ws, { type: "PONG", data: { timestamp: Date.now() }, timestamp: Date.now() });
          break;
        // PONG: lastSeen already bumped above.
      }
    });

    const cleanup = () => {
      if (conn.heartbeat) clearInterval(conn.heartbeat);
      frames().delete(conn.id);
      console.log(`[frame-server] frame disconnected: ${conn.id}`);
    };
    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });
}

function isOnline(c: FrameConn): boolean {
  return c.ws.readyState === WebSocket.OPEN && Date.now() - c.lastSeen < ONLINE_WINDOW_MS;
}

/** Connected frames, newest activity first. */
export function listFrames(): FrameDTO[] {
  return Array.from(frames().values())
    .map((c) => ({ id: c.id, name: c.name, online: isOnline(c), currentUrl: c.currentUrl }))
    .sort((a, b) => Number(b.online) - Number(a.online));
}

/**
 * Push a URL to one frame. Returns the frame's name on success. Throws a friendly
 * error if the frame isn't connected anymore.
 */
export function publishToFrame(frameId: string, url: string): string {
  const conn = frames().get(frameId);
  if (!conn) throw new Error("That frame isn't connected. Make sure it's on and pointed at Leo.");
  if (conn.ws.readyState !== WebSocket.OPEN) throw new Error("That frame just went offline. Try again.");
  send(conn.ws, { type: "URL_UPDATE", data: { url }, timestamp: Date.now() });
  conn.currentUrl = url;
  return conn.name;
}
