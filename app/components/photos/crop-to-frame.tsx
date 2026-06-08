"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "../ui/button";
import { INK, PLATINUM, PRESSED, RAISED } from "../ui/bevel";
import type { FrameCrop, FrameDTO, PhotoDTO } from "./types";

// The EO frame is 1080×1920 (9:16 portrait). This view lets you pan/zoom the
// photo behind a fixed 9:16 window and exports exactly that region as a
// 1080×1920 JPEG — what gets sent to the frame.

const FRAME_W = 1080;
const FRAME_H = 1920;
const MAX_ZOOM = 8;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function CropToFrame({
  photo,
  frames,
  onPublish,
  onRefreshFrames,
  onCancel,
}: {
  photo: PhotoDTO;
  frames: FrameDTO[];
  onPublish: (form: FormData) => Promise<void>;
  onRefreshFrames: () => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null);
  const lastPan = useRef<{ x: number; y: number } | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  // Mirrors of nat/view + a one-shot guard so we can center from the load/resize
  // callbacks (external events) rather than from an effect body.
  const natRef = useRef<{ w: number; h: number } | null>(null);
  const viewRef = useRef<{ w: number; h: number } | null>(null);
  const centered = useRef(false);

  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ tx: 0, ty: 0 });
  const [pickedFrameId, setPickedFrameId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onlineFrames = frames.filter((f) => f.online);

  // Derived selection: honor the user's pick if it's still online, else default
  // to the first online frame. (Derived, so no setState in an effect.)
  const frameId =
    pickedFrameId && onlineFrames.some((f) => f.id === pickedFrameId)
      ? pickedFrameId
      : onlineFrames[0]?.id ?? null;

  // Center the image to "cover" once both the natural and viewport sizes are
  // known. Called from the load / resize callbacks below, not from an effect.
  const centerIfReady = useCallback(() => {
    const n = natRef.current;
    const v = viewRef.current;
    if (!n || !v || centered.current) return;
    const bs = Math.max(v.w / n.w, v.h / n.h);
    setOffset({ tx: (v.w - n.w * bs) / 2, ty: (v.h - n.h * bs) / 2 });
    setZoom(1);
    centered.current = true;
  }, []);

  // Measure the viewport (it has a fixed 9:16 aspect via CSS; we need real px).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const v = { w: el.clientWidth, h: el.clientHeight };
      viewRef.current = v;
      setView(v);
      centerIfReady();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [centerIfReady]);

  const baseScale = nat && view ? Math.max(view.w / nat.w, view.h / nat.h) : 1;
  const scale = baseScale * zoom;

  const clampOffset = useCallback(
    (tx: number, ty: number, s: number) => {
      if (!nat || !view) return { tx, ty };
      const dispW = nat.w * s;
      const dispH = nat.h * s;
      return {
        tx: clamp(tx, view.w - dispW, 0),
        ty: clamp(ty, view.h - dispH, 0),
      };
    },
    [nat, view],
  );

  function relativePoint(e: PointerEvent) {
    const r = viewportRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, relativePoint(e));
    if (pointers.current.size === 1) {
      lastPan.current = relativePoint(e);
      gesture.current = null;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
      lastPan.current = null;
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, relativePoint(e));

    if (pointers.current.size === 1 && lastPan.current) {
      const p = relativePoint(e);
      const dx = p.x - lastPan.current.x;
      const dy = p.y - lastPan.current.y;
      lastPan.current = p;
      setOffset((o) => clampOffset(o.tx + dx, o.ty + dy, scale));
    } else if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const ratio = dist / gesture.current.dist;
      const newZoom = clamp(zoom * ratio, 1, MAX_ZOOM);
      const newScale = baseScale * newZoom;
      // Keep the pinch midpoint anchored to the same image point, and pan with it.
      setOffset((o) => {
        const imgX = (gesture.current!.mid.x - o.tx) / scale;
        const imgY = (gesture.current!.mid.y - o.ty) / scale;
        const tx = mid.x - imgX * newScale;
        const ty = mid.y - imgY * newScale;
        return clampOffset(tx, ty, newScale);
      });
      setZoom(newZoom);
      gesture.current = { dist, mid };
    }
  }

  function endPointer(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 1) {
      lastPan.current = [...pointers.current.values()][0];
    } else if (pointers.current.size === 0) {
      lastPan.current = null;
    }
  }

  // Zoom slider (accessible fallback): zoom around the viewport center.
  function onZoomSlider(v: number) {
    if (!view) return;
    const newScale = baseScale * v;
    setOffset((o) => {
      const cx = view.w / 2;
      const cy = view.h / 2;
      const imgX = (cx - o.tx) / scale;
      const imgY = (cy - o.ty) / scale;
      return clampOffset(cx - imgX * newScale, cy - imgY * newScale, newScale);
    });
    setZoom(v);
  }

  function computeCrop(): FrameCrop {
    // The viewport shows the image region whose top-left (in image-display space)
    // is (-tx,-ty). Convert to source pixels by dividing by the scale.
    const sx = clamp(-offset.tx / scale, 0, nat!.w);
    const sy = clamp(-offset.ty / scale, 0, nat!.h);
    const sw = clamp(view!.w / scale, 1, nat!.w - sx);
    const sh = clamp(view!.h / scale, 1, nat!.h - sy);
    return { sx, sy, sw, sh };
  }

  function renderBlob(crop: FrameCrop): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = FRAME_W;
      canvas.height = FRAME_H;
      const ctx = canvas.getContext("2d");
      if (!ctx || !imgRef.current) return reject(new Error("Couldn't prepare the image."));
      ctx.drawImage(imgRef.current, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, FRAME_W, FRAME_H);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Couldn't render the image."))),
        "image/jpeg",
        0.85,
      );
    });
  }

  async function publish() {
    if (!frameId || !nat || !view) return;
    setBusy(true);
    setError(null);
    try {
      const crop = computeCrop();
      const blob = await renderBlob(crop);
      const form = new FormData();
      form.set("id", photo.id);
      form.set("frameId", frameId);
      form.set("crop", JSON.stringify(crop));
      form.set("framed", new File([blob], "framed.jpg", { type: "image/jpeg" }));
      await onPublish(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish to the frame.");
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(nat && view);

  return (
    <div className="flex flex-col gap-2" style={{ width: "16rem", maxWidth: "100%" }}>
      <p className="text-small text-platinumDark">Drag to move, pinch or use the slider to zoom. The box is the frame.</p>

      {/* The 9:16 viewport with the image behind it. */}
      <div className="flex justify-center">
        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          style={{
            position: "relative",
            width: "12rem",
            aspectRatio: "9 / 16",
            overflow: "hidden",
            background: "#000000",
            border: `1px solid ${INK}`,
            boxShadow: PRESSED,
            touchAction: "none",
            cursor: "move",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={`/api/photos/${photo.id}/raw`}
            alt={photo.caption ?? photo.filename}
            draggable={false}
            onLoad={(e) => {
              const n = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight };
              natRef.current = n;
              setNat(n);
              centerIfReady();
            }}
            style={{
              position: "absolute",
              left: ready ? `${offset.tx}px` : 0,
              top: ready ? `${offset.ty}px` : 0,
              width: ready ? `${nat!.w * scale}px` : "100%",
              height: ready ? `${nat!.h * scale}px` : "auto",
              maxWidth: "none",
              userSelect: "none",
              pointerEvents: "none",
              visibility: ready ? "visible" : "hidden",
            }}
          />
          {!ready && (
            <span className="absolute inset-0 grid place-items-center text-small" style={{ color: "#ffffff" }}>
              Loading…
            </span>
          )}
        </div>
      </div>

      {/* Zoom slider */}
      <input
        type="range"
        min={1}
        max={MAX_ZOOM}
        step={0.01}
        value={zoom}
        disabled={!ready}
        onChange={(e) => onZoomSlider(Number(e.target.value))}
        aria-label="Zoom"
        style={{ width: "100%" }}
      />

      {/* Frame picker */}
      <div className="flex flex-col gap-1">
        <span className="text-small text-platinumDark">Send to</span>
        {onlineFrames.length === 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-small" style={{ color: "#a00000" }}>
              No frame connected. Turn the frame on and point it at Leo (ws://&lt;this-computer&gt;:8080).
            </p>
            <Button onClick={onRefreshFrames}>Check again</Button>
          </div>
        ) : (
          <div className="flex flex-col" style={{ border: `1px solid ${INK}` }}>
            {onlineFrames.map((f, i) => {
              const selected = f.id === frameId;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPickedFrameId(f.id)}
                  className="text-body leading-none"
                  style={{
                    minHeight: "2.2rem",
                    padding: "0 0.6rem",
                    textAlign: "left",
                    color: INK,
                    background: PLATINUM,
                    borderTop: i ? `1px solid ${INK}` : "none",
                    boxShadow: selected ? PRESSED : RAISED,
                    touchAction: "manipulation",
                  }}
                >
                  {selected ? "● " : "○ "}
                  {f.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p className="text-small" style={{ color: "#a00000" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="default" disabled={busy || !ready || !frameId} onClick={publish}>
          {busy ? "Sending…" : "Send to Frame"}
        </Button>
        <Button disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
