import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

const apiMock = { get: vi.fn(), put: vi.fn() };
vi.mock("@/lib/api", () => ({ api: { get: (...a: any[]) => apiMock.get(...a), put: (...a: any[]) => apiMock.put(...a), post: vi.fn() } }));
vi.mock("@/features/signatures/hooks/useSignatures", () => ({ useInvoiceSignatures: () => ({ data: { signatures: [] } }) }));

import { useAuthStore } from "@/stores/useAuthStore";
import { InvoiceReceipt } from "@/features/invoices/components/InvoiceReceipt";
import { RetailReceiptSettings } from "../receipts/RetailReceiptSettings";

const server = { shortSaleReceipt: true, saleFooter: "", showItemsSoldOnRentalReceipt: true, showCashier: true, returnSlipFooter: "" };
const saleBill = {
  invoice_id: 9, bill_kind: "sale", status: "Completed", issued_date: "2026-11-23T12:00:00Z", issued_by: { name: "Dilini" },
  Customer: { first_name: "Walk-in", is_walk_in: true }, InvoiceLines: [],
  SaleLines: [{ sale_line_id: 1, description: "Steel nail", unit_label: "pcs", unit_factor: 1, qty: 2, base_qty: 2, unit_price: 100, line_total: 200, status: "sold", returned_base_qty: 0 }],
  sale_total: 200, total_amount: 200, Payments: [{ payment_amount: 200, method: "Cash" }],
};

const signIn = (opts: { retail?: boolean; manage?: boolean } = {}) =>
  useAuthStore.setState({
    isAuthenticated: true,
    user: {
      first_name: "Nimal", permissions: opts.manage === false ? [] : ["config:manage"], roles: opts.manage === false ? [] : ["Administrator"],
      plan: { features: { retail: opts.retail ?? true } }, configData: { business_display_name: "Shop" },
    } as any,
  });

const mount = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={createTheme()}>
        <RetailReceiptSettings />
        <InvoiceReceipt id="r" invoice={saleBill} isPreview showBarcode={false} language="en" />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  apiMock.get.mockReset();
  apiMock.put.mockReset();
  apiMock.get.mockResolvedValue({ status: "success", data: { settings: { receipt: server } } });
  apiMock.put.mockImplementation(async (_url: string, body: any) => ({ status: "success", data: { settings: { receipt: { ...server, ...body.receipt } } } }));
  localStorage.clear();
  signIn();
});

const open = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /Retail receipts/ }));
};

describe("Retail receipts settings", () => {
  it("is shown only when retail is on and the user may change settings", async () => {
    signIn({ retail: false });
    const off = mount();
    expect(screen.queryByTestId("retail-receipt-settings")).toBeNull();
    off.unmount();
    signIn({ manage: false });
    const noRight = mount();
    expect(noRight.container.querySelector('[data-testid="retail-receipt-settings"]')).toBeNull();
    noRight.unmount();
    signIn();
    mount();
    expect(await screen.findByTestId("retail-receipt-settings")).toBeTruthy();
  });

  it("has the five choices, filled from the shop's saved settings", async () => {
    apiMock.get.mockResolvedValue({ status: "success", data: { settings: { receipt: { ...server, saleFooter: "Thank you", showCashier: false } } } });
    mount();
    await open();
    await waitFor(() => expect(screen.getByRole("switch", { name: "Show cashier" })).toHaveProperty("checked", false));
    expect(screen.getByRole("switch", { name: "Short receipt for sales" })).toHaveProperty("checked", true);
    expect(screen.getByRole("switch", { name: "List goods on rental bills" })).toHaveProperty("checked", true);
    await waitFor(() => expect((screen.getByRole("textbox", { name: "Sale receipt footer" }) as HTMLTextAreaElement).value).toBe("Thank you"));
    expect(screen.getByRole("textbox", { name: "Return slip footer" })).toBeTruthy();
  });

  it("saves through PUT /retail/settings and the receipts follow at once", async () => {
    mount();
    await screen.findByTestId("short-sale-receipt"); // short receipt by default
    expect(screen.getByText("Cashier: Dilini")).toBeTruthy();
    await open();
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("switch", { name: "Short receipt for sales" }));
    fireEvent.click(screen.getByRole("switch", { name: "Show cashier" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Sale receipt footer" }), { target: { value: "Goods can be returned in 7 days" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Return slip footer" }), { target: { value: "Keep this slip" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1));
    expect(apiMock.put).toHaveBeenCalledWith("/retail/settings", {
      receipt: { shortSaleReceipt: false, saleFooter: "Goods can be returned in 7 days", showItemsSoldOnRentalReceipt: true, showCashier: false, returnSlipFooter: "Keep this slip" },
    });
    expect(await screen.findByText("Receipt settings saved")).toBeTruthy();
    // with the short receipt off the same bill prints as a full sales bill
    await waitFor(() => expect(screen.queryByTestId("short-sale-receipt")).toBeNull());
    expect(screen.getByText("SALES BILL")).toBeTruthy();
  });

  it("shows the server's message when saving fails", async () => {
    apiMock.put.mockRejectedValue({ response: { data: { message: "Not allowed" } } });
    mount();
    await open();
    fireEvent.click(screen.getByRole("switch", { name: "Show cashier" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Not allowed")).toBeTruthy();
  });

  it("keeps a footer to 300 letters", async () => {
    mount();
    await open();
    fireEvent.change(screen.getByRole("textbox", { name: "Sale receipt footer" }), { target: { value: "x".repeat(400) } });
    expect((screen.getByRole("textbox", { name: "Sale receipt footer" }) as HTMLTextAreaElement).value).toHaveLength(300);
  });
});
