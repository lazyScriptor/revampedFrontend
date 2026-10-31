import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { useAuthStore } from "@/stores/useAuthStore";
import { InvoiceReceipt } from "../InvoiceReceipt";

const sigs = vi.hoisted(() => ({ list: [] as Array<{ role: string; image_url: string; signatory_name: string }> }));
vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useInvoiceSignatures: () => ({ data: { signatures: sigs.list } }),
}));

// The real processing needs a canvas; here it stands in for "processed".
vi.mock("../../lib/printableSignature", () => ({
  usePrintableSignature: (src?: string | null) =>
    src ? { url: `data:image/png;base64,SHARP-${src.split("/").pop()}`, sig: { url: "x", tail: 0.4, aspect: 2 } } : null,
  getPrintableSignature: async () => null,
  printableSignatureStyle: () => ({ display: "block" }),
}));

const invoice = {
  invoice_id: 1042,
  status: "Active",
  issued_date: "2026-10-27T04:45:00Z",
  Customer: { first_name: "Kasun", last_name: "Silva", phone_number: "0712345678" },
  InvoiceLines: [
    { line_id: 1, borrow_date: "2026-10-27", expected_return_date: "2026-10-30", borrow_quantity: 1, locked_base_price: 1500, locked_extra_daily_rate: 1500, locked_minimum_days: 1, line_total_amount: 4500, Equipment: { equipment_name: "Concrete Mixer" } },
  ],
  Payments: [],
  sub_total: 4500,
  total_amount: 4500,
};

const renderReceipt = (design: "minimal" | "classic") =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InvoiceReceipt id="r" invoice={invoice} showBarcode={false} language="en" design={design} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ user: { first_name: "Nimal", configData: { custom_settings: {} } } as any });
});

describe.each(["minimal", "classic"] as const)("%s bill signatures", (design) => {
  it("gives both signatures the same fixed slot so the lines stay level when only the operator has signed", () => {
    sigs.list = [{ role: "OPERATOR", image_url: "/uploads/signatures/op.png", signatory_name: "Nimal" }];
    renderReceipt(design);
    const operatorImg = screen.getByAltText("Authorized Signatory") as HTMLImageElement;
    const operatorSlot = operatorImg.parentElement as HTMLElement;
    expect(operatorSlot.style.height).toBe("40px");
    expect(operatorSlot.style.alignItems).toBe("flex-end");
    expect(operatorSlot.style.overflow).toBe("visible");

    const customerLabel = screen.getByText("Customer Signature");
    const customerSlot = customerLabel.previousElementSibling as HTMLElement;
    expect(customerSlot.style.height).toBe("40px");
    expect(customerSlot.querySelector("img")).toBeNull();
  });

  it("prints the sharpened copy and remembers the original for the print step", async () => {
    sigs.list = [
      { role: "CUSTOMER", image_url: "/uploads/signatures/cu.png", signatory_name: "Kasun" },
      { role: "OPERATOR", image_url: "/uploads/signatures/op.png", signatory_name: "Nimal" },
    ];
    renderReceipt(design);
    const img = screen.getByAltText("Customer Signature") as HTMLImageElement;
    await waitFor(() => expect(img.getAttribute("src")).toBe("data:image/png;base64,SHARP-cu.png"));
    expect(img.getAttribute("data-signature-src")).toMatch(/\/uploads\/signatures\/cu\.png$/);
  });
});
