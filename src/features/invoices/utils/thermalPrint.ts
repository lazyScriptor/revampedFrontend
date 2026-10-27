// features/invoices/utils/thermalPrint.ts
//
// Thermal receipt print engine.
//
// Strategy (in order):
//   1. DIRECT (preferred) — send the receipt HTML + its measured height to the
//      local GearGrid Print Agent (geargrid-print-agent/). The agent renders a
//      PDF whose page is exactly the content height and submits it to CUPS with
//      PageSize=Custom.<W>x<H>mm. The printer feeds only what is printed, then
//      cuts. No dialog, no wasted paper, no mid-bill splits.
//   2. DIALOG (fallback) — if the agent is not running, open the browser print
//      dialog with a dynamically sized @page rule (previous behaviour).

import { api } from "@/lib/api";
import { queryClient } from "@/app/queryClient";
import { RECEIPT_SINHALA_FAMILY, getEmbeddedReceiptFontCss } from "../lib/receiptFont";

export interface PrintInvoiceOptions {
  paperWidth?: "80mm" | "58mm";
  title?: string;
  copies?: number;
  printer?: string;
  sourceElementId?: string;
  // Audit logging metadata
  invoiceId?: number | null;
  docNumber?: string;
  docType?: "DISPATCH" | "COMPLETED" | "DRAFT" | "RETURN_SETTLEMENT";
  customerName?: string;
  customerPhone?: string;
  totalItems?: number;
  totalMachines?: number;
  subtotal?: number;
  transportFee?: number;
  discountAmount?: number;
  grandTotal?: number;
  totalPaid?: number;
  balanceDue?: number;
  language?: string;
  customNotes?: string;
  billSnapshot?: any;
}

export type PrintResult =
  | { method: "direct"; jobId: string | null; printer: string; heightMm: number }
  | { method: "dialog"; reason?: string };

export const PRINT_AGENT_URL: string =
  (import.meta as any).env?.VITE_PRINT_AGENT_URL || "http://127.0.0.1:17888";

const PX_PER_MM = 96 / 25.4; // CSS reference: 1mm = 3.7795px
const BOTTOM_BUFFER_MM = 3; // tiny safety margin so the last line is never clipped
const MIN_HEIGHT_MM = 30;

export interface PrintAgentHealth {
  ok: boolean;
  version?: string;
  printers?: string[];
  defaultPrinter?: string | null;
  chrome?: boolean;
}

/** Quick (≤1.2s) probe of the local print agent. Never throws. */
export const checkPrintAgent = async (): Promise<PrintAgentHealth> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1200);
  try {
    const res = await fetch(`${PRINT_AGENT_URL}/health`, { signal: ctrl.signal });
    if (!res.ok) return { ok: false };
    return (await res.json()) as PrintAgentHealth;
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
};

// ─── Document builder ───────────────────────────────────────────────────────
const buildReceiptDocument = (
  innerHtml: string,
  opts: { title: string; pageWidth: string; pageHeight: string; fontPx: string; fontCss?: string }
) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${opts.title.replace(/</g, "&lt;")}</title>
    <style id="dynamic-page-size">
      @page { size: ${opts.pageWidth} ${opts.pageHeight}; margin: 0mm !important; }
    </style>
    <style>${opts.fontCss || ""}</style>
    <style>
      html, body {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body {
        padding: 0 1mm 0 1mm !important;
        font-family: '${RECEIPT_SINHALA_FAMILY}', 'Noto Sans Sinhala', 'Sinhala Sangam MN', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: #000000 !important;
        font-size: ${opts.fontPx};
        line-height: 1.28;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }
      #receipt-print-wrapper {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        display: flow-root; /* contains child margins so height measurement is exact */
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      hr { border: none; border-top: 1px dashed #000000; margin: 3px 0; }
      .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 1.5px 0; vertical-align: top; }
    </style>
  </head>
  <body>
    <div id="receipt-print-wrapper">${innerHtml}</div>
  </body>
</html>`;

/** Renders the document in a hidden iframe of the given width and returns it with the content height in mm. */
const renderAndMeasure = async (
  html: string,
  widthCss: string
): Promise<{ iframe: HTMLIFrameElement; heightMm: number }> => {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: widthCss,
    height: "100px",
    border: "none",
    opacity: "0",
    pointerEvents: "none",
  } as CSSStyleDeclaration);
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow!.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Wait for web/system fonts (Sinhala shaping changes line heights) and layout.
  try {
    await (doc as any).fonts?.ready;
  } catch {
    /* ignore */
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const wrapper = doc.getElementById("receipt-print-wrapper");
  const px = Math.max(
    wrapper?.getBoundingClientRect().height || 0,
    doc.body.scrollHeight || 0
  );
  const heightMm = Math.max(MIN_HEIGHT_MM, Math.ceil(px / PX_PER_MM) + BOTTOM_BUFFER_MM);
  return { iframe, heightMm };
};

const removeLater = (iframe: HTMLIFrameElement, ms = 2000) =>
  setTimeout(() => iframe.parentNode?.removeChild(iframe), ms);

// ─── Public API ─────────────────────────────────────────────────────────────
export const handlePrintInvoice = async (
  target: string | (PrintInvoiceOptions & { sourceElementId?: string }),
  options?: PrintInvoiceOptions
): Promise<PrintResult | null> => {
  const resolvedTargetId = typeof target === "string" ? target : target?.sourceElementId || "printable-invoice";
  const resolvedOptions: PrintInvoiceOptions | undefined = typeof target === "string" ? options : target;

  let contentElement = document.getElementById(resolvedTargetId);
  if (!contentElement) {
    // Resilient fallback: search for any active printable receipt element in the DOM
    contentElement = document.querySelector('[id^="printable-receipt"]') as HTMLElement ||
                     document.getElementById("pos-dispatch-silent-receipt") ||
                     document.getElementById("history-reprint-dom");
  }

  if (!contentElement) {
    console.error(`Print element with ID '${resolvedTargetId}' not found.`);
    return null;
  }

  const paperWidth = resolvedOptions?.paperWidth || "80mm";
  const is58 = paperWidth === "58mm";
  const printableWidthMm = is58 ? 48 : 72; // physical printable area of the head
  const fontPx = is58 ? "10px" : "11px";
  const title = resolvedOptions?.title || "GearGrid POS Receipt";
  const innerHtml = contentElement.innerHTML;
  // Embedded Sinhala font — without it Sinhala prints in a thin system fallback.
  const fontCss = await getEmbeddedReceiptFontCss();

  // ── 1. DIRECT: exact-length print through the local agent ────────────────
  let fallbackReason = "Print agent not running";
  try {
    const measureDoc = buildReceiptDocument(innerHtml, {
      title,
      pageWidth: `${printableWidthMm}mm`,
      pageHeight: "1000mm",
      fontPx,
      fontCss,
    });
    const { iframe, heightMm } = await renderAndMeasure(measureDoc, `${printableWidthMm}mm`);
    iframe.parentNode?.removeChild(iframe);

    const finalDoc = buildReceiptDocument(innerHtml, {
      title,
      pageWidth: `${printableWidthMm}mm`,
      pageHeight: `${heightMm}mm`,
      fontPx,
      fontCss,
    });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(`${PRINT_AGENT_URL}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html: finalDoc,
        widthMm: printableWidthMm,
        heightMm,
        copies: resolvedOptions?.copies || 1,
        printer: resolvedOptions?.printer,
        jobName: title,
      }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));

    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok) {
      const result: PrintResult = { method: "direct", jobId: data.jobId ?? null, printer: data.printer, heightMm };
      // Record print audit log to backend and refresh audit views
      await logPrintEventToServer(resolvedOptions, result, heightMm);
      return result;
    }
    fallbackReason = data?.error || `Agent responded ${res.status}`;
    console.warn("Print agent error, falling back to browser dialog:", fallbackReason);
  } catch (err) {
    // Connection refused / timeout → agent not installed or not running.
    fallbackReason = (err as Error)?.message || fallbackReason;
  }

  // ── 2. FALLBACK: browser print dialog with dynamically sized @page ───────
  const rollWidth = is58 ? "58mm" : "80mm";
  const dialogDoc = buildReceiptDocument(innerHtml, {
    title,
    pageWidth: rollWidth,
    pageHeight: "297mm",
    fontPx,
    fontCss,
  });
  const { iframe, heightMm } = await renderAndMeasure(dialogDoc, rollWidth);
  const doc = iframe.contentWindow!.document;
  const tag = doc.getElementById("dynamic-page-size");
  if (tag) {
    tag.textContent = `@page { size: ${rollWidth} ${heightMm + 5}mm; margin: 0mm !important; }`;
  }

  const fallbackResult: PrintResult = { method: "dialog", reason: fallbackReason };
  // Record audit log BEFORE opening window.print() (which blocks the JS thread while the dialog is open)
  await logPrintEventToServer(resolvedOptions, fallbackResult, heightMm);

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  removeLater(iframe);

  return fallbackResult;
};

/**
 * Posts print audit log to backend and refreshes audit & invoice views.
 * Never throws, ensuring UI execution is never disrupted.
 */
const logPrintEventToServer = async (
  options: PrintInvoiceOptions | undefined,
  result: PrintResult,
  heightMm: number
) => {
  try {
    const resolvedInvoiceId =
      options?.invoiceId || options?.billSnapshot?.invoice_id || null;

    const payload = {
      invoice_id: resolvedInvoiceId,
      doc_number:
        options?.docNumber ||
        (resolvedInvoiceId ? `INV-${resolvedInvoiceId}` : options?.title || "POS Receipt"),
      doc_type: options?.docType || "DISPATCH",
      customer_name: options?.customerName || null,
      customer_phone: options?.customerPhone || null,
      print_method: result.method === "direct" ? "direct_agent" : "browser_dialog",
      printer_name: result.method === "direct" ? result.printer : (options?.printer || "Browser Default"),
      paper_width: options?.paperWidth || "80mm",
      copies: options?.copies || 1,
      height_mm: heightMm,
      total_items: options?.totalItems || 0,
      total_machines: options?.totalMachines || 0,
      subtotal: options?.subtotal || 0,
      transport_fee: options?.transportFee || 0,
      discount_amount: options?.discountAmount || 0,
      grand_total: options?.grandTotal || 0,
      total_paid: options?.totalPaid || 0,
      balance_due: options?.balanceDue || 0,
      language: options?.language || "en",
      custom_notes: options?.customNotes || null,
      bill_snapshot: options?.billSnapshot || null,
    };
    const res = await api.post("/invoices/print-logs", payload);
    console.info("POS Bill print log successfully recorded to audit trail:", res.data);
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ["invoice-print-logs"] }),
      queryClient.invalidateQueries({ queryKey: ["invoices"] }),
      ...(resolvedInvoiceId
        ? [queryClient.invalidateQueries({ queryKey: ["invoice", Number(resolvedInvoiceId)] })]
        : []),
    ]);
  } catch (err: any) {
    console.error("Notice: Print audit log could not be saved to backend:", err?.response?.data || err.message);
  }
};
