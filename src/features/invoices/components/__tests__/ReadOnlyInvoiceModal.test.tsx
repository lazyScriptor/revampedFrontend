import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReadOnlyInvoiceModal } from "../ReadOnlyInvoiceModal";

describe("ReadOnlyInvoiceModal Component Tests", () => {
  const mockInvoice = {
    invoice_id: 99,
    status: "Active",
    issued_date: "2026-10-15T10:00:00Z",
    sub_total: 15000,
    transport_fee: 1000,
    discount_amount: 500,
    total_amount: 15500,
    id_card_status: 1,
    Customer: {
      first_name: "Kasun",
      last_name: "Perera",
      company_name: "Perera Productions",
      customer_type: "Business",
      phone_number: "0771234567",
      nic_number: "199012345678",
    },
    InvoiceLines: [
      {
        line_id: 1,
        borrow_quantity: 2,
        good_returned_qty: 0,
        defective_returned_qty: 0,
        locked_base_price: 5000,
        line_total_amount: 10000,
        borrow_date: "2026-10-15",
        expected_return_date: "2026-10-18",
        Equipment: { equipment_name: "Sony FX3 Cinema Camera" },
      },
    ],
    Payments: [
      {
        payment_id: 1,
        payment_amount: 5000,
        method: "Cash",
        payment_date: "2026-10-15",
      },
    ],
  };

  it("renders invoice ID, customer info, and asset details", () => {
    render(
      <ReadOnlyInvoiceModal
        open={true}
        onClose={vi.fn()}
        invoice={mockInvoice}
      />
    );

    expect(screen.getByText(/INV-99/i)).toBeInTheDocument();
    expect(screen.getByText(/Perera Productions/i)).toBeInTheDocument();
    expect(screen.getByText(/0771234567/i)).toBeInTheDocument();
    expect(screen.getByText(/Sony FX3 Cinema Camera/i)).toBeInTheDocument();
    expect(screen.getByText(/ID in Vault/i)).toBeInTheDocument();
  });

  it("calculates and displays grand total and outstanding balance correctly", () => {
    render(
      <ReadOnlyInvoiceModal
        open={true}
        onClose={vi.fn()}
        invoice={mockInvoice}
      />
    );

    expect(screen.getByText(/Rs. 15,500/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Rs. 5,000/i).length).toBeGreaterThanOrEqual(1); // Paid / line rate
    expect(screen.getByText(/Rs. 10,500/i)).toBeInTheDocument(); // Balance (15500 - 5000)
    expect(screen.getByText(/Balance Outstanding/i)).toBeInTheDocument();
  });

  it("fires onClose when Close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <ReadOnlyInvoiceModal
        open={true}
        onClose={handleClose}
        invoice={mockInvoice}
      />
    );

    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
