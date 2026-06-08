"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { INK, PRESSED } from "../ui/bevel";
import type { PhotoDTO } from "./types";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A single photo, full view, with the publish + delete actions. */
export function PhotoDetail({
  photo,
  onPublish,
  onDelete,
  onClose,
}: {
  photo: PhotoDTO;
  onPublish: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-col gap-2" style={{ width: "16rem", maxWidth: "100%" }}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onClose} className="text-small text-platinumDark" style={{ touchAction: "manipulation" }}>
          ‹ All Photos
        </button>
        <span className="text-small text-platinumDark">{formatWhen(photo.createdAt)}</span>
      </div>

      <div style={{ border: `1px solid ${INK}`, boxShadow: PRESSED, background: "#000000" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/photos/${photo.id}/raw`}
          alt={photo.caption ?? photo.filename}
          style={{ display: "block", width: "100%", maxHeight: "60vh", objectFit: "contain" }}
        />
      </div>

      {photo.caption && <p className="text-body">{photo.caption}</p>}

      {photo.publishedAt && (
        <p className="text-small text-platinumDark">
          On {photo.lastFrame ?? "the frame"} · sent {formatWhen(photo.publishedAt)}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="default" onClick={onPublish}>
          Publish to Frame
        </Button>
        {confirmDelete ? (
          <Button onClick={onDelete} style={{ color: "#a00000" }}>
            Really delete?
          </Button>
        ) : (
          <Button onClick={() => setConfirmDelete(true)}>Delete</Button>
        )}
      </div>
    </div>
  );
}
