import { nativeBridge } from "./nativeBridge";

/**
 * The thermal print agent runs on the counter machine and cannot be reached from a phone, so on the
 * phone a receipt is turned into a PDF and handed to Android's share sheet.
 */
export async function shareElementAsPdf(elementId: string, filename: string, widthMm = 72): Promise<boolean> {
  const el = document.getElementById(elementId);
  if (!el) return false;
  const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map((n) => n.outerHTML)
    .join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${styles}<style>body{margin:0;background:#ffffff;color:#000000}</style></head><body>${el.outerHTML}</body></html>`;
  return nativeBridge.sharePdf(html, filename, widthMm);
}
