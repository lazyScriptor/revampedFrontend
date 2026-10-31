// Signatures are saved as the whole signing pad: a thin grey-edged stroke
// floating in a lot of white. Squeezed into a 40px slot on an 80mm bill, the
// stroke shrinks below half a pixel and the thermal head prints it as a faint
// blur. For print we crop to the ink, turn every inked pixel solid black,
// thicken the line a touch and hand back a PNG sized for the print head.
import { useEffect, useState } from "react";

const OUTPUT_HEIGHT_PX = 160; // ~4x the 40px slot, sharp on 203/300 dpi heads
const MAX_OUTPUT_WIDTH_PX = 640;
const INK_LUMA = 200; // anything darker than this (and visible) counts as ink
const PAD_PX = 4;
// Signatures are lined up by their baseline, not their lowest ink: the row by
// which this share of the ink has been drawn is where the body of the writing
// ends, and any tail (the leg of a p or g) hangs below the line.
const BASELINE_INK_SHARE = 0.92;
// Display height of the body above the baseline, in bill px, and how far a
// tail may hang below the line (share of the image height).
const BODY_DISPLAY_PX = 34;
const MAX_TAIL_SHIFT = 0.22;

export interface PrintableSignature {
  url: string;
  /** Tail below the baseline as a share of the body height (0 when none). */
  tail: number;
  /** Width / height of the image. */
  aspect: number;
}

/** Inline style for the bill's signature image: same body size, baseline on the line. */
export const printableSignatureStyle = (sig: PrintableSignature | null): Record<string, string> => {
  const base = { display: "block", height: "auto" };
  if (!sig) return { ...base, maxWidth: "100%", maxHeight: "100%", objectFit: "contain" };
  const heightPx = BODY_DISPLAY_PX * (1 + sig.tail);
  const shift = Math.min(MAX_TAIL_SHIFT, sig.tail / (1 + sig.tail));
  return {
    ...base,
    width: `min(100%, ${Math.round(heightPx * sig.aspect)}px)`,
    transform: shift > 0 ? `translateY(${(shift * 100).toFixed(1)}%)` : "none",
  };
};

const cache = new Map<string, Promise<PrintableSignature | null>>();

const loadBitmap = async (src: string): Promise<ImageBitmap | HTMLImageElement> => {
  // A CORS fetch keeps the canvas readable; a plain <img> from the API origin would taint it.
  const res = await fetch(src, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (typeof createImageBitmap === "function") return createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const isInk = (d: Uint8ClampedArray, i: number) =>
  d[i + 3] > 40 && 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < INK_LUMA;

/** Crops to the ink and returns a solid black-on-transparent PNG, or null if there is no ink. */
export const processSignature = async (src: string): Promise<PrintableSignature | null> => {
  const bitmap = await loadBitmap(src);
  const w = bitmap.width;
  const h = bitmap.height;
  if (!w || !h) return null;

  const source = document.createElement("canvas");
  source.width = w;
  source.height = h;
  const sctx = source.getContext("2d", { willReadFrequently: true });
  if (!sctx) return null;
  sctx.drawImage(bitmap, 0, 0);
  const { data } = sctx.getImageData(0, 0, w, h);

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isInk(data, (y * w + x) * 4)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  // Baseline: tails of letters carry little ink, so the row holding 92% of the
  // ink (counted from the top) is where the body of the writing ends.
  const rowInk = new Uint32Array(h);
  let totalInk = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (isInk(data, (y * w + x) * 4)) {
        rowInk[y]++;
        totalInk++;
      }
    }
  }
  let baseline = maxY;
  for (let y = minY, acc = 0; y <= maxY; y++) {
    acc += rowInk[y];
    if (acc >= totalInk * BASELINE_INK_SHARE) {
      baseline = y;
      break;
    }
  }

  minX = Math.max(0, minX - PAD_PX);
  minY = Math.max(0, minY - PAD_PX);
  maxX = Math.min(w - 1, maxX + PAD_PX);
  maxY = Math.min(h - 1, maxY + PAD_PX);
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const above = Math.max(1, baseline - minY + 1);
  const tail = Math.max(0, maxY - baseline) / above;

  const scale = Math.min(OUTPUT_HEIGHT_PX / cropH, MAX_OUTPUT_WIDTH_PX / cropW);
  const outW = Math.max(1, Math.round(cropW * scale));
  const outH = Math.max(1, Math.round(cropH * scale));

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const octx = out.getContext("2d", { willReadFrequently: true });
  if (!octx) return null;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(source, minX, minY, cropW, cropH, 0, 0, outW, outH);

  const img = octx.getImageData(0, 0, outW, outH);
  const px = img.data;
  const ink = new Uint8Array(outW * outH);
  for (let i = 0; i < ink.length; i++) ink[i] = isInk(px, i * 4) ? 1 : 0;

  // Thicken by one pixel in each direction so the stroke survives the print head.
  const thick = new Uint8Array(ink.length);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const i = y * outW + x;
      thick[i] =
        ink[i] ||
        (x > 0 && ink[i - 1]) ||
        (x < outW - 1 && ink[i + 1]) ||
        (y > 0 && ink[i - outW]) ||
        (y < outH - 1 && ink[i + outW])
          ? 1
          : 0;
    }
  }
  for (let i = 0; i < thick.length; i++) {
    const o = i * 4;
    px[o] = px[o + 1] = px[o + 2] = 0;
    px[o + 3] = thick[i] ? 255 : 0;
  }
  octx.putImageData(img, 0, 0);
  return { url: out.toDataURL("image/png"), tail, aspect: outW / outH };
};

export const getPrintableSignature = (src: string): Promise<PrintableSignature | null> => {
  let pending = cache.get(src);
  if (!pending) {
    pending = processSignature(src).catch(() => null);
    cache.set(src, pending);
  }
  return pending;
};

/** Print-ready signature for `src`; `url` falls back to the original while processing or if it fails. */
export const usePrintableSignature = (
  src: string | null | undefined,
): { url: string; sig: PrintableSignature | null } | null => {
  const [processed, setProcessed] = useState<{ src: string; out: PrintableSignature | null } | null>(null);
  useEffect(() => {
    if (!src) return;
    let alive = true;
    getPrintableSignature(src).then((out) => {
      if (alive) setProcessed({ src, out });
    });
    return () => {
      alive = false;
    };
  }, [src]);
  if (!src) return null;
  const out = processed?.src === src ? processed.out : null;
  return { url: out?.url ?? src, sig: out };
};
