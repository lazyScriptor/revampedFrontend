import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { useAuthStore } from "@/stores/useAuthStore";
import { InvoiceReceipt } from "../InvoiceReceipt";

vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useInvoiceSignatures: () => ({ data: { signatures: [] } }),
}));

const invoice = {
  invoice_id: 1042,
  status: "Active",
  issued_date: "2026-10-27T04:45:00Z",
  id_card_status: true,
  Customer: { first_name: "Kasun", last_name: "Silva", nic_number: "199012345678", phone_number: "0712345678" },
  InvoiceLines: [
    { line_id: 1, borrow_date: "2026-10-27", expected_return_date: "2026-10-30", borrow_quantity: 1, locked_base_price: 1500, locked_extra_daily_rate: 1500, locked_minimum_days: 1, line_total_amount: 4500, Equipment: { equipment_name: "Concrete Mixer", serial_number: "CM-03" } },
  ],
  Payments: [{ payment_amount: 1000, method: "Cash" }],
  sub_total: 4500,
  total_amount: 4500,
};

const setShop = (custom: Record<string, string>) =>
  useAuthStore.setState({ user: { first_name: "Nimal", configData: { business_display_name: "T A Enterprises", currency_code: "Rs.", custom_settings: custom } } as any });

const renderReceipt = (props: Record<string, unknown> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InvoiceReceipt id="r" invoice={invoice} isPreview showBarcode={false} {...props} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  setShop({ phone: "0777593701", address: "23 New Galle Road, Moratuwa" });
});

describe("InvoiceReceipt", () => {
  it("minimal bill shows the shop's saved phone and address, the machine number and the balance", () => {
    renderReceipt({ language: "en" });
    expect(screen.getByText("23 New Galle Road, Moratuwa")).toBeTruthy();
    expect(screen.getByText(/0777593701/)).toBeTruthy();
    expect(screen.getByText(/CM-03 · Concrete Mixer/)).toBeTruthy();
    expect(screen.getByText("RENTAL BILL")).toBeTruthy();
    expect(screen.getByText("Rs. 3,500.00")).toBeTruthy();
  });

  it("never prints placeholder shop details when none are saved", () => {
    setShop({});
    const { container } = renderReceipt({ language: "en" });
    expect(container.textContent).not.toMatch(/Commercial Hub|234 5678|rentals@geargrid/);
  });

  it("Sinhala bill uses ජා.හැ.අං only and the shorter business line", () => {
    const { container } = renderReceipt({ language: "si" });
    expect(container.textContent).toContain("ජා.හැ.අං: 199012345678");
    expect(container.textContent).not.toContain("ලියාපදිංචි");
    expect(container.textContent).toContain("යන්ත්‍රෝපකරණ කුලියට දීම");
  });

  it("ID card status is printed only when switched on", () => {
    const off = renderReceipt({ language: "en" });
    expect(off.container.textContent).not.toMatch(/ID card/);
    off.unmount();
    const on = renderReceipt({ language: "en", showIdStatus: true });
    expect(on.container.textContent).toMatch(/ID card kept at the shop/);
  });

  it("detailed bill has no boxed title and hides the ID line by default", () => {
    const { container } = renderReceipt({ language: "en", design: "classic" });
    expect(container.innerHTML).not.toMatch(/border: 1px solid (#000000|rgb\(0, 0, 0\))/);
    expect(container.textContent).not.toMatch(/VAULT COLLATERAL/);
    expect(container.textContent).toMatch(/NIC:/);
    expect(container.textContent).not.toMatch(/REG NO/);
  });
});
