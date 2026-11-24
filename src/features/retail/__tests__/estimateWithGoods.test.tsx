import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

const printSpy = vi.fn();
vi.mock("@/features/invoices/hooks/useInvoiceHooks", () => ({
  handlePrintInvoice: (...a: any[]) => printSpy(...a),
  checkPrintAgent: async () => ({ ok: true, defaultPrinter: "XP-80" }),
}));
vi.mock("@/features/signatures/hooks/useSignatures", () => ({ useInvoiceSignatures: () => ({ data: { signatures: [] } }) }));
vi.mock("@/features/whatsapp/components/WhatsAppButton", () => ({ WhatsAppButton: () => null }));
vi.mock("@/features/invoices/components/BillDetailsEditor", () => ({ BillDetailsEditor: () => null }));
vi.mock("@/features/signatures/components/SignatureCaptureDialog", () => ({ SignatureCaptureDialog: () => null }));

import { useAuthStore } from "@/stores/useAuthStore";
import { ReceiptPrintDialog } from "@/features/invoices/components/ReceiptPrintDialog";

const draft = {
  customer: { first_name: "Kasun", last_name: "Silva" },
  items: [{ cart_id: "c1", equipment_name: "Concrete Mixer", borrow_quantity: 1, borrow_date: "2026-10-27T12:00:00Z", expected_return_date: "2026-10-29T12:00:00Z", locked_base_price: 1500, locked_extra_daily_rate: 1500, locked_minimum_days: 1 }] as any[],
  saleLines: [{ cart_id: "s1", description: "Cement bag", qty: 2, unit_label: "bag", unit_price: 1800, line_discount: 0, line_total: 3600 }],
  fees: { transport: 0, discount: 100, advance: 0 },
  draftId: "EST-1",
};

beforeEach(() => {
  printSpy.mockReset();
  printSpy.mockResolvedValue({ method: "direct", printer: "XP-80", jobId: "1", heightMm: 120 });
  localStorage.clear();
  useAuthStore.setState({ user: { first_name: "Nimal", configData: { business_display_name: "Shop" } } as any });
});

describe("quotation / estimate with goods", () => {
  it("shows the goods and the Rent / Items rows in the preview and logs them with the totals", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider theme={createTheme()}>
          <ReceiptPrintDialog open onClose={vi.fn()} isDraft draftData={draft} />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    // the preview is the second copy of the receipt in the page
    const preview = document.getElementById("printable-receipt-draft-preview")!;
    expect(preview.textContent).toContain("Cement bag");
    expect(preview.textContent).toMatch(/Rent\s*Rs\. 3,000\.00/);
    expect(preview.textContent).toMatch(/Items\s*Rs\. 3,600\.00/);
    expect(preview.textContent).toMatch(/TOTAL\s*Rs\. 6,500\.00/);

    fireEvent.click(screen.getByRole("button", { name: /Print POS bill/i }));
    await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
    const options = printSpy.mock.calls[0][1];
    expect(options).toMatchObject({ docType: "DRAFT", totalItems: 2, subtotal: 6600, discountAmount: 100, grandTotal: 6500 });
    expect(options.billSnapshot.saleLines).toHaveLength(1);
  });

  it("a rental-only estimate is unchanged: no Items section and no Rent row", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider theme={createTheme()}>
          <ReceiptPrintDialog open onClose={vi.fn()} isDraft draftData={{ ...draft, saleLines: [] }} />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const preview = document.getElementById("printable-receipt-draft-preview")!;
    expect(preview.textContent).not.toContain("ITEMS");
    expect(preview.textContent).not.toMatch(/Rent\s*Rs\./);
  });
});
