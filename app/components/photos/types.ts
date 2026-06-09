// Shared DTOs for My Photos — imported by both the server-only DAL (data/photos.ts)
// and the client components. No server-only imports here so it's safe on both sides.

/** The source-pixel rectangle (in the original image) chosen for the 9:16 frame. */
export interface FrameCrop {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface PhotoDTO {
  id: string;
  createdAt: string; // ISO UTC
  filename: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  framedCrop: FrameCrop | null;
  publishedAt: string | null; // ISO UTC, or null if never sent to a frame
  lastFrame: string | null;
}

/** An EO frame discovered on the LAN (mDNS / subnet scan / configured host). */
export interface FrameDTO {
  id: string;
  name: string;
  /** Base URL to push to, e.g. http://192.168.1.79:8080 */
  baseUrl: string;
  /** Discovered frames are reachable by definition; kept for the UI's filter. */
  online: boolean;
}
