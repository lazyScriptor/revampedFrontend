import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReturnSettlementDialog, calcDaysLate, calcLateFee } from "../ReturnSettlementDialog";

const mockMutate = vi.fn();
vi.mock("../../hooks/useInvoiceHooks", () => ({
  useProcessReturn: () => ({ mutate: mockMutate, isPending: false }),
}));

const mockInvoice = {
  invoice_id: 88,
  status: "Active",
  total_amount: "2000",
  Payments: [{ payment_amount: "500" }],
  InvoiceLines: [
    {
      line_id: 1,
      borrow_quantity: 4,
      good_returned_qty: 0,
      defective_returned_qty: 0,
      locked_extra_daily_rate: 1000,
      expected_return_date: "2026-10-10",
      Equipment: { equipment_name: "Angle Grinder" },
      line_status: "Active",
      track_overdue: false, // untracked → no late fees, keeps the maths simple in tests
    },
  ],
};

const renderDialog = (invoice = mockInvoice) =>
  render(<ReturnSettlementDialog open onClose={vi.fn()} invoice={invoice} showToast={vi.fn()} />);

const submitted = () => mockMutate.mock.calls[0][0].data;

describe("ReturnSettlementDialog (handover)", () => {
  beforeEach(() => mockMutate.mockClear());

  it("renders the title and each active line", () => {
    renderDialog();
    expect(screen.getByText(/Equipment Handover/i)).toBeInTheDocument();
    expect(screen.getByText(/Angle Grinder/i)).toBeInTheDocument();
  });

  it("submits everything as returned-in-good-condition by default, with the vault release flag", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Confirm Return/i }));
    const d = submitted();
    expect(mockMutate.mock.calls[0][0].id).toBe(88);
    expect(d.release_id_card).toBe(true);
    expect(d.lines_returned[0]).toMatchObject({ line_id: 1, good_qty: 4, defective_qty: 0 });
  });

  it("the damaged quantity can be TYPED (cleared and retyped), not just stepped", async () => {
    const user = userEvent.setup();
    renderDialog();
    const damaged = screen.getByRole("textbox", { name: /Damaged/i });
    await user.clear(damaged);
    await user.type(damaged, "3");
    fireEvent.click(screen.getByRole("button", { name: /Confirm Return/i }));
    expect(submitted().lines_returned[0]).toMatchObject({ good_qty: 1, defective_qty: 3 });
  });

  it("returning can be typed too; damaged is capped at what is returning", async () => {
    const user = userEvent.setup();
    renderDialog();
    const returning = screen.getByRole("textbox", { name: /Returning now/i });
    await user.clear(returning);
    await user.type(returning, "2");
    const damaged = screen.getByRole("textbox", { name: /Damaged/i });
    await user.clear(damaged);
    await user.type(damaged, "9"); // more than the 2 coming back → clamped to 2
    fireEvent.click(screen.getByRole("button", { name: /Confirm Return/i }));
    expect(submitted().lines_returned[0]).toMatchObject({ good_qty: 0, defective_qty: 2 });
  });

  it("cannot return more than is still out", async () => {
    const user = userEvent.setup();
    renderDialog();
    const returning = screen.getByRole("textbox", { name: /Returning now/i });
    await user.clear(returning);
    await user.type(returning, "99");
    fireEvent.click(screen.getByRole("button", { name: /Confirm Return/i }));
    const l = submitted().lines_returned[0];
    expect(l.good_qty + l.defective_qty).toBe(4);
  });

  it("the payment amount can be typed with decimals", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(/Collect now/i), "1250.50");
    fireEvent.click(screen.getByRole("button", { name: /Confirm Return/i }));
    expect(submitted().final_payment_amount).toBe(1250.5);
  });

  it("'Full balance' fills the amount still owed (invoice total − paid)", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Full balance/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm Return/i }));
    expect(submitted().final_payment_amount).toBe(1500); // 2000 − 500
  });

  it("confirm is disabled when nothing is returning and no payment is entered", async () => {
    const user = userEvent.setup();
    renderDialog();
    const returning = screen.getByRole("textbox", { name: /Returning now/i });
    await user.clear(returning);
    await user.tab();
    expect(screen.getByRole("button", { name: /Confirm Return/i })).toBeDisabled();
  });
});

describe("late fee maths (mirrors the backend)", () => {
  const line: any = { track_overdue: true, expected_return: "2026-10-10", locked_extra_rate: 500, good_qty: 2, defective_qty: 1 };
  it("is 0 on or before the due date", () => {
    expect(calcDaysLate(line, "2026-10-10")).toBe(0);
    expect(calcDaysLate(line, "2026-10-09")).toBe(0);
  });
  it("days late × extra rate × units returned", () => {
    expect(calcDaysLate(line, "2026-10-13")).toBe(3);
    expect(calcLateFee(line, "2026-10-13")).toBe(3 * 500 * 3);
  });
  it("is 0 when late fees were waived", () => {
    expect(calcLateFee({ ...line, track_overdue: false }, "2026-10-20")).toBe(0);
  });
  it("counts elapsed hours: out 9:42 AM, back 29 hours later = 2 days = 1 extra day", () => {
    const out = new Date(2026, 9, 30, 9, 42).toISOString();
    const open: any = { track_overdue: false, open_ended: true, out_at: out, borrow_date: "2026-10-30", expected_return: "2026-10-30", min_days: 1, locked_extra_rate: 250, good_qty: 1, defective_qty: 0 };
    expect(calcDaysLate(open, "2026-10-31", new Date(2026, 9, 31, 15, 8))).toBe(1);
    expect(calcLateFee(open, "2026-10-31", new Date(2026, 9, 31, 15, 8))).toBe(250);
  });
  it("a line with no return date is charged for the days out beyond its price (out 2 days = 1 extra)", () => {
    const open: any = { track_overdue: false, open_ended: true, borrow_date: "2026-10-10", expected_return: "2026-10-10", min_days: 1, locked_extra_rate: 500, good_qty: 2, defective_qty: 0 };
    expect(calcDaysLate(open, "2026-10-10")).toBe(0);
    expect(calcDaysLate(open, "2026-10-11")).toBe(0);
    expect(calcDaysLate(open, "2026-10-12")).toBe(1);
    expect(calcLateFee(open, "2026-10-12")).toBe(1 * 500 * 2);
  });
});
