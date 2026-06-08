"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deletePhotoAction,
  listFramesAction,
  listPhotosAction,
  publishPhotoAction,
} from "@/app/photos/actions";
import { CropToFrame } from "./crop-to-frame";
import { PhotoDetail } from "./photo-detail";
import { PhotoGrid } from "./photo-grid";
import { UploadControl } from "./upload-control";
import type { FrameDTO, PhotoDTO } from "./types";

type View = { kind: "gallery" } | { kind: "detail"; id: string } | { kind: "crop"; id: string };

/**
 * My Photos — upload, browse, and publish one photo at a time to Leo's EO frame.
 * Client-rooted like My Schedule: loads through Server Actions on mount and holds
 * everything in useState, refetching after each mutation. A short-lived banner
 * confirms a successful publish.
 */
export function PhotosApp() {
  const [photos, setPhotos] = useState<PhotoDTO[] | null>(null);
  const [frames, setFrames] = useState<FrameDTO[]>([]);
  const [view, setView] = useState<View>({ kind: "gallery" });
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const refreshPhotos = useCallback(async () => {
    setPhotos(await listPhotosAction());
  }, []);

  const refreshFrames = useCallback(async () => {
    setFrames(await listFramesAction());
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ps, fs] = await Promise.all([listPhotosAction(), listFramesAction()]);
        if (alive) {
          setPhotos(ps);
          setFrames(fs);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Couldn't load your photos.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selected = photos?.find((p) => view.kind !== "gallery" && p.id === view.id) ?? null;

  // If the open photo vanished (e.g. it was deleted), fall back to the gallery —
  // derived during render so we never setState inside an effect.
  const effectiveView: View = view.kind !== "gallery" && photos && !selected ? { kind: "gallery" } : view;

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deletePhotoAction({ id });
      setView({ kind: "gallery" });
      await refreshPhotos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete that photo.");
    }
  }

  async function handlePublish(form: FormData) {
    const res = await publishPhotoAction(form);
    setFlash(`Sent to ${res.frameName}.`);
    setView({ kind: "gallery" });
    await refreshPhotos();
    // Clear the banner after a few seconds.
    setTimeout(() => setFlash(null), 4000);
  }

  // --- Crop view -----------------------------------------------------------
  if (effectiveView.kind === "crop" && selected) {
    return (
      <CropToFrame
        photo={selected}
        frames={frames}
        onRefreshFrames={refreshFrames}
        onPublish={handlePublish}
        onCancel={() => setView({ kind: "detail", id: selected.id })}
      />
    );
  }

  // --- Detail view ---------------------------------------------------------
  if (effectiveView.kind === "detail" && selected) {
    return (
      <PhotoDetail
        photo={selected}
        onPublish={() => {
          void refreshFrames();
          setView({ kind: "crop", id: selected.id });
        }}
        onDelete={() => handleDelete(selected.id)}
        onClose={() => setView({ kind: "gallery" })}
      />
    );
  }

  // --- Gallery view --------------------------------------------------------
  return (
    <div className="flex flex-col gap-2" style={{ width: "18rem", maxWidth: "100%" }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-small text-platinumDark">
          My Photos{photos ? ` · ${photos.length} ${photos.length === 1 ? "picture" : "pictures"}` : ""}
        </p>
        <UploadControl onUploaded={refreshPhotos} />
      </div>

      {flash && (
        <p className="text-small" style={{ color: "#006000" }}>
          {flash}
        </p>
      )}
      {error && (
        <p className="text-small" style={{ color: "#a00000" }}>
          {error}
        </p>
      )}

      {photos === null ? (
        <p className="text-small text-platinumDark">Loading…</p>
      ) : (
        <PhotoGrid photos={photos} onOpen={(p) => setView({ kind: "detail", id: p.id })} />
      )}
    </div>
  );
}
