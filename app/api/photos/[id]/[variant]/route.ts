import { getPhotoMeta } from "@/data/photos";
import { readVariant, type Variant } from "@/lib/photo-store";

// Serves photo bytes to the gallery (raw) and to the EO frame (framed). The frame
// is an old-Android WebView, so we mirror EO's media proxy: permissive CORS and a
// long cache (the published URL is cache-busted per publish, so this is safe).
//
//   GET /api/photos/<id>/raw[.ext]      → the original upload
//   GET /api/photos/<id>/framed[.jpg]   → the 1080×1920 crop sent to the frame

export const dynamic = "force-dynamic";

function normalizeVariant(raw: string): Variant | null {
  const base = raw.split(".")[0]; // strip a friendly extension (framed.jpg → framed)
  if (base === "raw" || base === "framed") return base;
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; variant: string }> }) {
  const { id, variant: variantRaw } = await params;
  const variant = normalizeVariant(variantRaw);
  if (!variant) return new Response("Not found", { status: 404 });

  const meta = await getPhotoMeta({ id });
  if (!meta) return new Response("Not found", { status: 404 });
  if (variant === "framed" && !meta.hasFramed) return new Response("Not found", { status: 404 });

  const contentType = variant === "framed" ? "image/jpeg" : meta.mimeType;

  let bytes: Buffer;
  try {
    bytes = await readVariant(id, variant, meta.mimeType);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  // raw bytes never change for a given id (long cache); framed is overwritten on
  // each re-publish, so never serve it stale.
  const cacheControl =
    variant === "framed" ? "no-store" : "public, max-age=31536000, immutable";

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.length),
      "Cache-Control": cacheControl,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    },
  });
}
