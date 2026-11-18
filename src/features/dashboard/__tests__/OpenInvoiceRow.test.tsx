import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/features/whatsapp/components/WhatsAppButton", () => ({ WhatsAppButton: () => null }));

import { OpenInvoiceRowItem } from "../widgets/openInvoices/OpenInvoiceRow";
import type { OpenInvoiceRow } from "../types";

const base: OpenInvoiceRow = {
  invoice_id: 7, issued_date: "2026-11-01", age_days: 17, status: "Active",
  customer: { customer_id: 1, name: "Nimal Perera", phone_number: "0771234567" },
  live_total: 5000, paid: 0, owed: 5000, accrued_charges: 0,
  units_out: 2, items_out: [{ name: "Mixer", qty: 2 }],
  earliest_due_date: "2026-11-05", days_overdue: 0,
  is_unpaid: true, has_items_out: true,
};

describe("OpenInvoiceRowItem (equipment view)", () => {
  it("shows an open-ended rental as open-ended, not with a past due date", () => {
    render(<OpenInvoiceRowItem row={{ ...base, open_ended: true }} view="returns" onRowClick={() => {}} />);
    expect(screen.getByText("Open-ended")).toBeTruthy();
    expect(screen.queryByText(/due 5 Nov/)).toBeNull();
  });

  it("shows the due date for a tracked rental not yet late", () => {
    render(<OpenInvoiceRowItem row={{ ...base, open_ended: false }} view="returns" onRowClick={() => {}} />);
    expect(screen.getByText(/5 Nov/)).toBeTruthy();
  });

  it("shows the amount owed in the shop currency format", () => {
    render(<OpenInvoiceRowItem row={base} view="money" onRowClick={() => {}} />);
    expect(screen.getAllByText(/Rs\. 5,000/).length).toBeGreaterThan(0);
  });
});
