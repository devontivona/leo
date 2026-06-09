"use server";

// Thin Server Action wrappers for My Photos. Validation, authorization, SQL, and
// file writes all live behind the server-only DAL (data/photos.ts) and the EO
// helpers (lib/eo.ts); these just cross the client→server boundary and unpack
// FormData for the binary (upload / publish) paths. The client tree holds photos
// in useState and refetches after each mutation, so there's nothing to
// revalidate here (same approach as app/schedule/actions.ts).

import { createPhoto, deletePhoto, listPhotos, markPublished } from "@/data/photos";
import { eoClient, listEOs } from "@/lib/eo";
import type { FrameCrop, FrameDTO, PhotoDTO } from "@/app/components/photos/types";

export async function listPhotosAction(): Promise<PhotoDTO[]> {
  return listPhotos();
}

export async function deletePhotoAction(input: { id: string }): Promise<void> {
  return deletePhoto(input);
}

/** Discover EO frames on the LAN. (Named "frames" to match the UI vocabulary.) */
export async function listFramesAction(): Promise<FrameDTO[]> {
  const eos = await listEOs();
  return eos.map((e) => ({ id: e.id, name: e.name, baseUrl: e.baseUrl, online: true }));
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

/**
 * Publish one photo to an EO frame: store the 1080×1920 crop locally, mark it
 * published, then POST the bytes straight to the frame's HTTP API (the EO stores
 * them by content hash and displays immediately). No URL is involved — the frame
 * never fetches back from Leo, so this works regardless of how Leo is reached.
 */
export async function publishPhotoAction(
  form: FormData,
): Promise<{ photo: PhotoDTO; frameName: string }> {
  const id = String(form.get("id") ?? "");
  const baseUrl = String(form.get("baseUrl") ?? "");
  const framed = form.get("framed");
  const cropRaw = form.get("crop");

  if (!baseUrl) throw new Error("No frame was selected.");
  if (!(framed instanceof File)) throw new Error("No cropped image was provided.");
  let crop: FrameCrop;
  try {
    crop = JSON.parse(typeof cropRaw === "string" ? cropRaw : "");
  } catch {
    throw new Error("Invalid crop data.");
  }

  // Confirm the frame is reachable (and get its current name) before writing.
  const client = eoClient(baseUrl);
  let frameName: string;
  try {
    frameName = (await client.getInfo()).name;
  } catch {
    throw new Error("That frame isn't reachable. Make sure it's on and on the same network.");
  }

  const bytes = Buffer.from(await framed.arrayBuffer());
  const photo = await markPublished({ id, bytes, crop, frameName });
  await client.uploadMedia(new Uint8Array(bytes), { type: "image", name: `${id}.jpg` });
  return { photo, frameName };
}
