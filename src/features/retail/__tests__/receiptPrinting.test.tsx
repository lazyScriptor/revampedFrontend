import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { useAuthStore } from "@/stores/useAuthStore";

const apiPost = vi.fn();
vi.mock("@/lib/api", () => ({ api: { post: (...a: any[]) => apiPost(...a), get: vi.fn() } }));
vi.mock("@/features/invoices/lib/receiptFont", async (orig) => ({
  ...(await orig<typeof import("@/features/invoices/lib/receiptFont")>()),
  getEmbeddedReceiptFontCss: async () => "",
}));
vi.mock("@/features/signatures/hooks/useSignatures", () => ({ useInvoiceSignatures: () => ({ data: { signatures: [] } }) }));

import { InvoiceReceipt } from "@/features/invoices/components/InvoiceReceipt";
import { handlePrintInvoice } from "@/features/invoices/utils/thermalPrint";

const sold = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    sale_line_id: i + 1, product_id: i + 1, line_kind: "item", description: `Item ${i + 1}`, unit_label: "pcs", unit_factor: 1, qty: 1, base_qty: 1,
    unit_price: 100, line_discount: 0, bill_discount_share: 0, line_total: 100, status: "sold", returned_base_qty: 0,
  }));
const bill = (n: number) => ({
  invoice_id: 700 + n, bill_kind: "sale", status: "Completed", issued_date: "2026-11-23T12:00:00Z", Customer: { first_name: "Walk-in", is_walk_in: true },
  InvoiceLines: [], SaleLines: sold(n), sale_total: n * 100, total_amount: n * 100, Payments: [{ payment_amount: n * 100, method: "Cash" }], change_due: 50,
});

/** jsdom has no layout, so each sold row is made to stand 100 px tall; everything else counts as 0. */
const fakeLayout = () => {
  const original = document.body.appendChild.bind(document.body);
  return vi.spyOn(document.body, "appendChild").mockImplementation(((node: Node) => {
    const added = original(node);
    if (node instanceof HTMLIFrameElement && node.contentWindow) {
      (node.contentWindow as any).Element.prototype.getBoundingClientRect = function () {
        const rows = (this as Element).querySelectorAll?.('[data-row="sold"]').length ?? 0;
        return { height: rows * 100, width: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} };
      };
    }
    return added;
  }) as any);
};

const mountHidden = (n: number) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InvoiceReceipt id={`hidden-${n}`} invoice={bill(n)} language="en" showBarcode={false} />
    </QueryClientProvider>,
  );

const fetchSpy = vi.fn();
beforeEach(() => {
  apiPost.mockReset();
  apiPost.mockResolvedValue({ status: "success" });
  fetchSpy.mockReset();
  fetchSpy.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, jobId: "1", printer: "XP-80" }) });
  vi.stubGlobal("fetch", fetchSpy);
  useAuthStore.setState({ user: { first_name: "Nimal", configData: { business_display_name: "Shop" } } as any });
});
afterEach(() => vi.unstubAllGlobals());

describe("printing the short sale receipt", () => {
  it("measures the page height from what is on the receipt, so it grows with the sold lines", async () => {
    const spy = fakeLayout();
    const heights: number[] = [];
    for (const n of [1, 6]) {
      const { unmount } = mountHidden(n);
      await handlePrintInvoice(`hidden-${n}`, { docType: "SALE_RECEIPT", invoiceId: 700 + n, billSnapshot: bill(n) });
      const body = JSON.parse(fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][1].body);
      heights.push(body.heightMm);
      expect(body.widthMm).toBe(72);
      expect(body.html).toContain(`Item ${n}`);
      unmount();
    }
    spy.mockRestore();
    // 5 more rows of 100 px = about 132 mm more paper
    expect(heights[1] - heights[0]).toBeGreaterThan(100);
  });

  it("logs the print as SALE_RECEIPT with the change given", async () => {
    mountHidden(2);
    await handlePrintInvoice("hidden-2", { docType: "SALE_RECEIPT", invoiceId: 702, docNumber: "INV-702", changeDue: 50, billSnapshot: bill(2) });
    const [url, payload] = apiPost.mock.calls[0];
    expect(url).toBe("/invoices/print-logs");
    expect(payload).toMatchObject({ doc_type: "SALE_RECEIPT", invoice_id: 702, change_due: 50, paper_width: "80mm", print_method: "direct_agent" });
    expect(payload.bill_snapshot.SaleLines).toHaveLength(2);
    expect(payload).not.toHaveProperty("return_id");
  });

  it("a 58 mm roll prints 48 mm wide", async () => {
    mountHidden(1);
    await handlePrintInvoice("hidden-1", { docType: "SALE_RECEIPT", paperWidth: "58mm", invoiceId: 701 });
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).widthMm).toBe(48);
    expect(apiPost.mock.calls[0][1].paper_width).toBe("58mm");
  });

  it("a RETURN_SLIP log carries the return it is for", async () => {
    mountHidden(1);
    await handlePrintInvoice("hidden-1", { docType: "RETURN_SLIP", returnId: 31, invoiceId: 701, billSnapshot: { invoice_id: 701, return_id: 31 } });
    expect(apiPost.mock.calls[0][1]).toMatchObject({ doc_type: "RETURN_SLIP", return_id: 31 });
  });
});
