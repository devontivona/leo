import "server-only";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { assertAuthorized } from "@/lib/auth";
import { removePhoto, saveFramed, saveOriginal } from "@/lib/photo-store";
import type { FrameCrop, PhotoDTO } from "@/app/components/photos/types";

// Data Access Layer for My Photos. Same shape as data/events.ts: Zod validation
// at the client trust boundary, assertAuthorized() before every DB touch, raw
// rows mapped to DTOs. Image bytes are written through lib/photo-store.ts; this
// layer owns the metadata row and keeps the two in sync.

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreatePhotoInput {
  filename: string;
  mimeType: string;
  bytes: Buffer; // the original upload
  byteSize: number;
  width?: number;
  height?: number;
  caption?: string;
}

export interface PublishPhotoInput {
  id: string;
  bytes: Buffer; // the 1080×1920 framed JPEG
  crop: FrameCrop;
  frameName: string;
}

// ---------------------------------------------------------------------------
// Zod schemas — the validation choke point.
// ---------------------------------------------------------------------------

const IMAGE_MIME = z.enum([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/bmp",
]);

const dim = z.coerce.number().int().positive().max(100000).optional();
const caption = z.string().trim().max(500).optional();

const CreatePhoto = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: IMAGE_MIME,
  byteSize: z.number().int().positive(),
  width: dim,
  height: dim,
  caption,
});

const Crop = z.object({
  sx: z.number().nonnegative(),
  sy: z.number().nonnegative(),
  sw: z.number().positive(),
  sh: z.number().positive(),
});

const PublishPhoto = z.object({
  id: z.uuid(),
  crop: Crop,
  frameName: z.string().trim().min(1).max(120),
});

const ById = z.object({ id: z.uuid() });
const ListOpts = z.object({ limit: z.number().int().positive().max(1000).optional() }).optional();

// ---------------------------------------------------------------------------
// Row → DTO
// ---------------------------------------------------------------------------

interface Row {
  id: string;
  created_at: Date | string;
  filename: string;
  mime_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  framed_crop: FrameCrop | null;
  published_at: Date | string | null;
  last_frame: string | null;
}

const iso = (v: Date | string) => (v instanceof Date ? v : new Date(v)).toISOString();

function rowToDTO(r: Row): PhotoDTO {
  return {
    id: r.id,
    createdAt: iso(r.created_at),
    filename: r.filename,
    mimeType: r.mime_type,
    byteSize: r.byte_size,
    width: r.width,
    height: r.height,
    caption: r.caption,
    framedCrop: r.framed_crop,
    publishedAt: r.published_at == null ? null : iso(r.published_at),
    lastFrame: r.last_frame,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listPhotos(opts?: { limit?: number }): Promise<PhotoDTO[]> {
  const parsed = ListOpts.parse(opts);
  const limit = parsed?.limit ?? 200;
  await assertAuthorized();
  const sql = getSql();
  const rows = (await sql`
    select * from photos order by created_at desc limit ${limit}
  `) as Row[];
  return rows.map(rowToDTO);
}

export async function getPhoto(input: { id: string }): Promise<PhotoDTO | null> {
  const { id } = ById.parse(input);
  await assertAuthorized();
  const sql = getSql();
  const rows = (await sql`select * from photos where id = ${id}`) as Row[];
  return rows.length ? rowToDTO(rows[0]) : null;
}

/** Just the mime type + whether the framed variant exists — for the serving route. */
export async function getPhotoMeta(input: { id: string }): Promise<{ mimeType: string; hasFramed: boolean } | null> {
  const { id } = ById.parse(input);
  await assertAuthorized();
  const sql = getSql();
  const rows = (await sql`select mime_type, published_at from photos where id = ${id}`) as {
    mime_type: string;
    published_at: Date | string | null;
  }[];
  if (!rows.length) return null;
  return { mimeType: rows[0].mime_type, hasFramed: rows[0].published_at != null };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Insert the metadata row, then write the original bytes to disk under that id. */
export async function createPhoto(input: CreatePhotoInput): Promise<PhotoDTO> {
  const v = CreatePhoto.parse({
    filename: input.filename,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    width: input.width,
    height: input.height,
    caption: input.caption,
  });
  await assertAuthorized();
  const sql = getSql();
  const rows = (await sql`
    insert into photos (filename, mime_type, byte_size, width, height, caption)
    values (${v.filename}, ${v.mimeType}, ${v.byteSize}, ${v.width ?? null}, ${v.height ?? null}, ${v.caption ?? null})
    returning *
  `) as Row[];
  const dto = rowToDTO(rows[0]);
  try {
    await saveOriginal(dto.id, input.bytes, v.mimeType);
  } catch (e) {
    // Don't leave an orphan metadata row pointing at a file that isn't there.
    await sql`delete from photos where id = ${dto.id}`;
    throw e;
  }
  return dto;
}

/** Store the framed JPEG, record the crop, and mark the photo as published. */
export async function markPublished(input: PublishPhotoInput): Promise<PhotoDTO> {
  const v = PublishPhoto.parse({ id: input.id, crop: input.crop, frameName: input.frameName });
  await assertAuthorized();
  const sql = getSql();
  // Ensure the photo exists before writing files for it.
  const exists = (await sql`select id from photos where id = ${v.id}`) as { id: string }[];
  if (!exists.length) throw new Error("That photo no longer exists.");
  await saveFramed(v.id, input.bytes);
  const rows = (await sql`
    update photos
    set framed_crop = ${JSON.stringify(v.crop)}::jsonb,
        published_at = now(),
        last_frame = ${v.frameName}
    where id = ${v.id}
    returning *
  `) as Row[];
  return rowToDTO(rows[0]);
}

export async function deletePhoto(input: { id: string }): Promise<void> {
  const { id } = ById.parse(input);
  await assertAuthorized();
  const sql = getSql();
  await sql`delete from photos where id = ${id}`;
  await removePhoto(id);
}
