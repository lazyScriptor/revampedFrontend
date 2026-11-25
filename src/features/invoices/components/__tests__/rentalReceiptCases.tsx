// Rental-only bills the receipt must keep drawing exactly as before retail receipts existed.
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";

export const rentalInvoice = {
  invoice_id: 1042,
  status: "Active",
  issued_date: "2026-10-27T12:00:00Z",
  id_card_status: true,
  Customer: { first_name: "Kasun", last_name: "Silva", nic_number: "199012345678", phone_number: "0712345678", address_line1: "12 Lake Rd" },
  InvoiceLines: [
    { line_id: 1, borrow_date: "2026-10-27T12:00:00Z", expected_return_date: "2026-10-30T12:00:00Z", borrow_quantity: 2, locked_base_price: 1500, locked_extra_daily_rate: 1500, locked_minimum_days: 1, line_total_amount: 9000, Equipment: { equipment_name: "Concrete Mixer", serial_number: "CM-03" } },
    { line_id: 2, borrow_date: "2026-10-27T12:00:00Z", expected_return_date: "2026-10-29T12:00:00Z", returned_date: "2026-10-28T12:00:00Z", borrow_quantity: 1, locked_base_price: 2500, locked_extra_daily_rate: 2000, locked_minimum_days: 2, line_total_amount: 2500, Equipment: { equipment_name: "Breaker", serial_number: "BR-1" } },
  ],
  Payments: [{ payment_amount: 3000, method: "Cash", payment_date: "2026-10-27T12:00:00Z" }, { payment_amount: 1000, method: "Bank Transfer", payment_date: "2026-10-28T12:00:00Z" }],
  sub_total: 11500,
  transport_fee: 500,
  discount_amount: 200,
  total_amount: 11800,
};

export const rentalDraft = {
  customer: { first_name: "Kasun", last_name: "Silva", phone_number: "0712345678" },
  items: [{ cart_id: "c1", equipment_name: "Concrete Mixer", borrow_quantity: 1, borrow_date: "2026-10-27T12:00:00Z", expected_return_date: "2026-10-29T12:00:00Z", locked_base_price: 1500, locked_extra_daily_rate: 1500, locked_minimum_days: 1, base_price: 1500, extra_daily_rate: 1500, minimum_rental_period: 1 }] as any[],
  fees: { transport: 300, discount: 0, advance: 500 },
  draftId: "EST-FIXED",
};

export const CASES: { name: string; props: Record<string, unknown> }[] = [
  { name: "minimal-80-en", props: { invoice: rentalInvoice, language: "en", design: "minimal", showIdStatus: true, showTerms: true } },
  { name: "minimal-58-si", props: { invoice: rentalInvoice, language: "si", design: "minimal", paperWidth: "58mm", showTerms: true } },
  { name: "classic-80-en", props: { invoice: rentalInvoice, language: "en", design: "classic", showIdStatus: true, showTerms: true, customNotes: "Site gate B" } },
  { name: "classic-58-en-compact", props: { invoice: rentalInvoice, language: "en", design: "classic", paperWidth: "58mm", density: "compact", showTerms: false } },
  { name: "estimate-minimal-en", props: { isDraft: true, draftData: rentalDraft, language: "en", design: "minimal" } },
  { name: "estimate-classic-si", props: { isDraft: true, draftData: rentalDraft, language: "si", design: "classic" } },
];

/** Times of day depend on the machine's time zone; the rest of the markup must match exactly. */
export const normalise = (html: string) => html.replace(/\d{1,2}:\d{2}(:\d{2})?(\s?[ap]m)?/gi, "TIME");

export const renderCase = (Component: any, props: Record<string, unknown>) => {
  localStorage.clear();
  useAuthStore.setState({ user: { first_name: "Nimal", configData: { business_display_name: "T A Enterprises", currency_code: "Rs.", custom_settings: { phone: "0777593701", address: "23 New Galle Road" } } } as any });
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <Component id="r" isPreview showBarcode {...props} />
    </QueryClientProvider>,
  );
  return normalise(container.innerHTML);
};
