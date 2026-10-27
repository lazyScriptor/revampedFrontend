// features/invoices/lib/receiptFont.ts
//
// Sinhala on printed bills came out thin: the print document (hidden iframe /
// print agent's headless Chrome) never loaded Noto Sans Sinhala, so Chrome
// fell back to a system Sinhala font with a single light weight and every
// "bold" was faked or ignored. We ship the variable font ourselves:
// • in the app, as a normal @font-face (preview matches the print);
// • in the print document, embedded as a data URL, so it works offline and
//   inside the agent without any network fetch.
import fontUrl from "@fontsource-variable/noto-sans-sinhala/files/noto-sans-sinhala-sinhala-wght-normal.woff2?url";

export const RECEIPT_SINHALA_FAMILY = "GG Receipt Sinhala";

const SINHALA_RANGE = "U+0D80-0DFF, U+200C-200D, U+25CC";

const fontFace = (src: string) =>
  `@font-face{font-family:'${RECEIPT_SINHALA_FAMILY}';font-style:normal;font-display:block;font-weight:100 900;src:url(${src}) format('woff2');unicode-range:${SINHALA_RANGE};}`;

/** Registers the receipt font in the app document once (for on-screen previews). */
export const ensureReceiptFontInApp = () => {
  if (typeof document === "undefined" || document.getElementById("gg-receipt-font")) return;
  const style = document.createElement("style");
  style.id = "gg-receipt-font";
  style.textContent = fontFace(fontUrl);
  document.head.appendChild(style);
};

let embedded: Promise<string> | null = null;

/** @font-face CSS with the font inlined, for the self-contained print document. Never throws. */
export const getEmbeddedReceiptFontCss = (): Promise<string> => {
  embedded ||= import("@fontsource-variable/noto-sans-sinhala/files/noto-sans-sinhala-sinhala-wght-normal.woff2?inline")
    .then((m) => fontFace(m.default))
    .catch(() => fontFace(new URL(fontUrl, window.location.href).href));
  return embedded;
};
