import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { LedgerTable } from "../LedgerTable";
import { analyseLine } from "../../lib/lineCost";

const TODAY = "2026-10-27";
const mk = (over: Record<string, unknown> = {}) => ({
  line_id: 1,
  borrow_date: "2026-10-20",
  expected_return_date: "2026-10-25",
  track_overdue: true,
  borrow_quantity: 3,
  good_returned_qty: 0,
  defective_returned_qty: 0,
  line_status: "Active",
  locked_base_price: 1500,
  locked_minimum_days: 1,
  locked_extra_daily_rate: 1500,
  line_total_amount: 4500,
  Equipment: { equipment_name: "Hammer Drill", equipment_name_si: "හැමර් ඩ්‍රිල්", serial_number: "EQ-0001" },
  ...over,
});
const renderTable = (lines: any[], traces: any[] = []) => render(<LedgerTable lines={lines} infos={lines.map((l) => analyseLine(l, TODAY))} returnTraces={traces} />);

describe("LedgerTable", () => {
  it("shows the columns in reading order", () => {
    renderTable([mk()]);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Machine", "Rented out", "Qty", "Returned", "Days out", "Rate", "Total"]);
  });

  it("one row per line, in reading order: machine, rented out, qty, returned, days out, rate, total", () => {
    renderTable([mk()]);
    const cells = within(screen.getByTestId("ledger-row")).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("EQ-0001");
    expect(cells[0]).toHaveTextContent("Hammer Drill");
    expect(cells[0]).toHaveTextContent("හැමර් ඩ්‍රිල්");
    expect(cells[1]).toHaveTextContent("20 Oct");
    expect(cells[2]).toHaveTextContent("3");
    expect(cells[3]).toHaveTextContent("Not back yet");
    expect(cells[3]).toHaveTextContent(/Due/);
    expect(cells[4]).toHaveTextContent("7"); // 20 Oct to 27 Oct
    expect(cells[5]).toHaveTextContent("Rs. 1,500");
    expect(cells[5]).toHaveTextContent("per day");
    // 2 days late × 1500 × 3 units = 9000 on top of 4500
    expect(cells[6]).toHaveTextContent("Rs. 13,500");
    expect(cells[6]).toHaveTextContent("incl. late 9,000");
  });

  it("shows the time the bill was written as the rented-out time", () => {
    render(<LedgerTable lines={[mk()]} infos={[analyseLine(mk(), TODAY)]} returnTraces={[]} issuedAt="2026-10-20T09:05:00" />);
    expect(within(screen.getByTestId("ledger-row")).getAllByRole("cell")[1]).toHaveTextContent(/9:05 AM/);
  });

  it("a machine with no return date, out 2 days, is billed 2 days (not 1)", () => {
    const line = mk({ borrow_quantity: 1, borrow_date: "2026-10-25", expected_return_date: "2026-10-25", track_overdue: false, locked_base_price: 1500, locked_extra_daily_rate: 1500, line_total_amount: 1500 });
    renderTable([line]);
    const cells = within(screen.getByTestId("ledger-row")).getAllByRole("cell");
    expect(cells[4]).toHaveTextContent("2");
    expect(cells[6]).toHaveTextContent("Rs. 3,000");
    expect(cells[6]).toHaveTextContent("1 extra day");
  });

  it("tiered pricing shows base, cover days and the extra daily rate", () => {
    renderTable([mk({ locked_base_price: 4500, locked_minimum_days: 3, locked_extra_daily_rate: 1200, track_overdue: false })]);
    const rate = within(screen.getByTestId("ledger-row")).getAllByRole("cell")[5];
    expect(rate).toHaveTextContent("Rs. 4,500");
    expect(rate).toHaveTextContent("for 3 days");
    expect(rate).toHaveTextContent("then 1,200/day");
  });

  it("a returned line shows its return date, days out, returned and damaged counts", () => {
    renderTable([mk({ line_status: "Returned", good_returned_qty: 2, defective_returned_qty: 1, actual_return_date: "2026-10-24" })]);
    const cells = within(screen.getByTestId("ledger-row")).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("3 back");
    expect(cells[2]).toHaveTextContent("1 damaged");
    expect(cells[3]).toHaveTextContent("24 Oct");
    expect(cells[4]).toHaveTextContent("4");
    expect(cells[0]).toHaveTextContent("Returned");
  });

  it("totals row sums quantities and cost", () => {
    renderTable([mk({ track_overdue: false }), mk({ line_id: 2, borrow_quantity: 2, good_returned_qty: 2, line_status: "Returned", line_total_amount: 3000, track_overdue: false })]);
    const cells = within(screen.getByTestId("ledger-totals")).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("5");
    expect(cells[3]).toHaveTextContent("2 back");
    expect(cells[6]).toHaveTextContent("Rs. 7,500");
  });

  it("expands to the handover history", () => {
    const traces = [{ event_action: "RETURN_PROCESSED", createdAt: "2026-10-24T05:00:00Z", state_payload: JSON.stringify({ lines_returned: [{ line_id: 1, good_qty: 1, defective_qty: 0 }] }) }];
    renderTable([mk({ good_returned_qty: 1, track_overdue: false })], traces);
    expect(screen.queryByText("Handover history")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("ledger-row"));
    expect(screen.getByText(/handover history/i)).toBeInTheDocument();
  });
});
