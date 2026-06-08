"use client";

import { Well } from "../ui/well";
import type { PhotoDTO } from "./types";

/** The gallery: a Well full of square thumbnails. Tap one to open it. */
export function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: PhotoDTO[];
  onOpen: (photo: PhotoDTO) => void;
}) {
  if (!photos.length) {
    return (
      <Well>
        <p className="p-3 text-center text-small text-platinumDark">
          No photos yet. Tap “Add a Photo” to put one in here.
        </p>
      </Well>
    );
  }

  return (
    <Well>
      <div className="grid grid-cols-3 gap-1 p-1">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(p)}
            className="relative block aspect-square overflow-hidden"
            style={{ border: "1px solid #b8b8b3", background: "#dededb", touchAction: "manipulation" }}
            title={p.caption ?? p.filename}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${p.id}/raw`}
              alt={p.caption ?? p.filename}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {p.publishedAt && (
              // A tiny corner tag: this one has been shown on the frame.
              <span
                aria-label="On the frame"
                title="On the frame"
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  fontSize: "0.7rem",
                  lineHeight: 1,
                  padding: "0.1rem 0.2rem",
                  background: "#000000",
                  color: "#ffffff",
                }}
              >
                ▣
              </span>
            )}
          </button>
        ))}
      </div>
    </Well>
  );
}
