"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "../ui/button";
import { uploadPhotoAction } from "@/app/photos/actions";

/** Reads an image file's natural pixel size (best-effort) before upload. */
function readDims(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * "Add a Photo" — a Platinum button fronting a hidden file input. Uploads the
 * chosen photo(s) one at a time, then asks the parent to refresh.
 */
export function UploadControl({ onUploaded }: { onUploaded: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file later
    if (!files.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of files) {
        const { width, height } = await readDims(file);
        const form = new FormData();
        form.set("file", file);
        if (width) form.set("width", String(width));
        if (height) form.set("height", String(height));
        await uploadPhotoAction(form);
      }
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        onChange={onPick}
        style={{ display: "none" }}
      />
      <Button variant="default" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Adding…" : "Add a Photo"}
      </Button>
      {error && (
        <p className="text-small" style={{ color: "#a00000" }}>
          {error}
        </p>
      )}
    </div>
  );
}
