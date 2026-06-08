import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// On-disk store for photo bytes. Neon holds the metadata (see data/photos.ts);
// the actual files live here on the host. Self-hosted on the LAN, so the local
// filesystem is the simplest durable store — no cloud keys, works offline.
//
// Layout: <root>/<id>/original.<ext>   the upload, as-is
//         <root>/<id>/framed.jpg       the 1080×1920 crop sent to the EO frame
//
// Configure the root with PHOTOS_DIR; defaults to .photo-data in the project
// (gitignored). This module is fs-only — it never touches the database.

export type Variant = "raw" | "framed";

function root(): string {
  return process.env.PHOTOS_DIR || path.join(process.cwd(), ".photo-data");
}

function dirFor(id: string): string {
  return path.join(root(), id);
}

/** original.<ext> for "raw"; framed.jpg for "framed". */
function fileFor(id: string, variant: Variant, ext = "jpg"): string {
  const name = variant === "framed" ? "framed.jpg" : `original.${ext}`;
  return path.join(dirFor(id), name);
}

// We store the original's extension nowhere on disk, so "raw" reads need to find
// whatever original.* exists. Keep it simple: the DB row carries the mime type,
// and the serving route derives the extension from it (see extForMime).

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/bmp": "bmp",
};

export function extForMime(mime: string): string {
  return MIME_EXT[mime] ?? "bin";
}

export async function saveOriginal(id: string, bytes: Buffer, mime: string): Promise<void> {
  await mkdir(dirFor(id), { recursive: true });
  await writeFile(fileFor(id, "raw", extForMime(mime)), bytes);
}

export async function saveFramed(id: string, bytes: Buffer): Promise<void> {
  await mkdir(dirFor(id), { recursive: true });
  await writeFile(fileFor(id, "framed"), bytes);
}

/** Read a variant's bytes. `mime` is only needed for "raw" (to find the ext). */
export async function readVariant(id: string, variant: Variant, mime = "image/jpeg"): Promise<Buffer> {
  return readFile(fileFor(id, variant, extForMime(mime)));
}

/** Remove every file for a photo (the whole <id>/ directory). */
export async function removePhoto(id: string): Promise<void> {
  await rm(dirFor(id), { recursive: true, force: true });
}
