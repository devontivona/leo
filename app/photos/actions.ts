"use server";

// Thin Server Action wrappers for My Photos. Validation, authorization, SQL, and
// file writes all live behind the server-only DAL (data/photos.ts) and the frame
// server (lib/frame-server.ts); these just cross the client→server boundary and
// unpack FormData for the binary (upload / publish) paths. The client tree holds
// photos in useState and refetches after each mutation, so there's nothing to
// revalidate here (same approach as app/schedule/actions.ts).

import { headers } from "next/headers";
import { createPhoto, deletePhoto, listPhotos, markPublished } from "@/data/photos";
import { listFrames, publishToFrame } from "@/lib/frame-server";
import type { FrameCrop, PhotoDTO } from "@/app/components/photos/types";

export async function listPhotosAction(): Promise<PhotoDTO[]> {
  return listPhotos();
}

export async function deletePhotoAction(input: { id: string }): Promise<void> {
  return deletePhoto(input);
}

export async function listFramesAction() {
  return listFrames();
}

function intOrUndef(v: FormDataEntryValue | null): number | undefined {
  if (typeof v !== "string" || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Upload an original photo: write bytes to disk + insert the metadata row. */
export async function uploadPhotoAction(form: FormData): Promise<PhotoDTO> {
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("No image was provided.");
  const caption = form.get("caption");
  const bytes = Buffer.from(await file.arrayBuffer());
  return createPhoto({
    filename: file.name || "photo",
    mimeType: file.type || "application/octet-stream",
    bytes,
    byteSize: file.size,
    width: intOrUndef(form.get("width")),
    height: intOrUndef(form.get("height")),
    caption: typeof caption === "string" && caption.trim() ? caption.trim() : undefined,
  });
}

// Where the frame should fetch the published image. Prefer an explicit env (a
// LAN IP the old-Android WebView can resolve); otherwise derive it from the
// request host (works when you loaded Leo at that same address).
async function imageBaseUrl(): Promise<string> {
  const explicit = process.env.FRAME_PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("host");
  if (!host) throw new Error("Couldn't determine this server's address. Set FRAME_PUBLIC_BASE_URL.");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * Publish one photo to a frame: store the 1080×1920 crop, mark it published, then
 * push the URL to the chosen frame over the WebSocket. Saving the file before
 * sending avoids the frame fetching before the bytes are on disk.
 */
export async function publishPhotoAction(
  form: FormData,
): Promise<{ photo: PhotoDTO; frameName: string; url: string }> {
  const id = String(form.get("id") ?? "");
  const frameId = String(form.get("frameId") ?? "");
  const framed = form.get("framed");
  const cropRaw = form.get("crop");

  if (!(framed instanceof File)) throw new Error("No cropped image was provided.");
  let crop: FrameCrop;
  try {
    crop = JSON.parse(typeof cropRaw === "string" ? cropRaw : "");
  } catch {
    throw new Error("Invalid crop data.");
  }

  // Confirm the frame is connected before we write anything.
  const frame = listFrames().find((f) => f.id === frameId);
  if (!frame) throw new Error("That frame isn't connected. Make sure it's on and pointed at Leo.");
  if (!frame.online) throw new Error("That frame appears to be offline. Try again in a moment.");

  const bytes = Buffer.from(await framed.arrayBuffer());
  const photo = await markPublished({ id, bytes, crop, frameName: frame.name });

  // The URL MUST end in a real image extension: the EO frame classifies media by
  // url.endsWith(".jpg") — a query string makes it think the image is a video
  // ("Streaming… / video error"). No cache-buster needed: the frame wipes its
  // image cache on every URL_UPDATE, so a re-publish always re-downloads.
  const url = `${await imageBaseUrl()}/api/photos/${id}/framed.jpg`;
  const frameName = publishToFrame(frameId, url);
  return { photo, frameName, url };
}
