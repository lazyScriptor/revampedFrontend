// Shrinks a photo in the browser before it is uploaded: longest side capped,
// re-encoded as WebP (JPEG where the browser can't encode WebP, e.g. older
// Safari). A 4 MB phone photo usually becomes ~100–250 KB, so uploads are
// fast on mobile data and the server only has to check and store it.

export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
const ACCEPTED_EXT = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i;

export type CompressErrorCode = "not-image" | "too-large" | "unreadable" | "heic";

export class CompressError extends Error {
  constructor(public code: CompressErrorCode) {
    super(code);
  }
}

export interface CompressedImage {
  blob: Blob;
  type: "image/webp" | "image/jpeg";
  width: number;
  height: number;
  originalBytes: number;
}

/** Cheap checks before decoding anything. Throws CompressError. */
export const assertImageFile = (file: File) => {
  const looksLikeImage = file.type.startsWith("image/") || ACCEPTED_EXT.test(file.name);
  if (!looksLikeImage) throw new CompressError("not-image");
  if (file.size > MAX_SOURCE_BYTES) throw new CompressError("too-large");
};

const isHeic = (file: Blob & { name?: string }) =>
  /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name || "");

const decode = async (file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> => {
  // createImageBitmap applies the photo's EXIF rotation, so portrait phone shots stay upright.
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } finally {
    // the decoded <img> keeps its pixels after the URL is revoked
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
};

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function compressImage(
  file: Blob & { name?: string },
  { maxDimension = 1600, quality = 0.82 }: { maxDimension?: number; quality?: number } = {},
): Promise<CompressedImage> {
  let decoded;
  try {
    decoded = await decode(file);
  } catch {
    throw new CompressError(isHeic(file) ? "heic" : "unreadable");
  }
  if (!decoded.width || !decoded.height) throw new CompressError("unreadable");

  const scale = Math.min(1, maxDimension / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new CompressError("unreadable");
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background instead of black in JPEG
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(decoded.source, 0, 0, width, height);
  decoded.close();

  // Browsers that can't encode WebP silently return PNG — check and fall back to JPEG.
  const webp = await toBlob(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") return { blob: webp, type: "image/webp", width, height, originalBytes: file.size };
  const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new CompressError("unreadable");
  return { blob: jpeg, type: "image/jpeg", width, height, originalBytes: file.size };
}

export const formatBytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
