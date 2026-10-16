import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReturnSettlementDialog } from "../ReturnSettlementDialog";

// Mock the TanStack mutation hook
const mockMutate = vi.fn();
vi.mock("../../hooks/useInvoiceHooks", () => ({
  useProcessReturn: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

describe("ReturnSettlementDialog Component Tests", () => {
  const mockInvoice = {
    invoice_id: 88,
    status: "Active",
    InvoiceLines: [
      {
        line_id: 1,
        borrow_quantity: 2,
        good_returned_qty: 0,
        defective_returned_qty: 0,
        locked_extra_daily_rate: 1000,
        expected_return_date: "2026-10-10",
        Equipment: { equipment_name: "Angle Grinder" },
        line_status: "Active",
        track_overdue: true,
      },
    ],
  };

  it("renders the dialog title and active return lines", () => {
    render(
      <ReturnSettlementDialog
        open={true}
        onClose={vi.fn()}
        invoice={mockInvoice}
        showToast={vi.fn()}
      />
    );

    expect(screen.getByText(/Equipment Handover/i)).toBeInTheDocument();
    expect(screen.getByText(/Angle Grinder/i)).toBeInTheDocument();
  });

  it("captures customer rating and release ID toggle on return submission", () => {
    render(
      <ReturnSettlementDialog
        open={true}
        onClose={vi.fn()}
        invoice={mockInvoice}
        showToast={vi.fn()}
      />
    );

    // Locate the confirm button
    const confirmBtn = screen.getByRole("button", { name: /Confirm Return/i });
    fireEvent.click(confirmBtn);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const callArgs = mockMutate.mock.calls[0][0];

    expect(callArgs.id).toBe(88);
    expect(callArgs.data.invoice_id).toBe(88);
    expect(callArgs.data.customer_rating).toBe(5); // Default rating
    expect(callArgs.data.release_id_card).toBe(true);
  });
});
