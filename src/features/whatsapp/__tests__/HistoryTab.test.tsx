import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const calls: any[] = [];
let logState: any;
vi.mock("../hooks/useWhatsApp", () => ({
  useWhatsAppLog: (filters: any) => {
    calls.push(filters);
    return logState;
  },
}));

import { HistoryTab } from "../components/HistoryTab";

const entry = (id: number, over: any = {}) => ({
  log_id: id,
  customer_id: id,
  customer_name: `Customer ${id}`,
  invoice_id: 50 + id,
  invoice_number: `INV-${50 + id}`,
  template_key: "receipt",
  language: "en",
  to_phone: "94771234567",
  body: `Line one\nLine two ${id}`,
  status: "opened",
  created_at: new Date(Date.now() - 3600_000).toISOString(),
  ...over,
});

beforeEach(() => {
  calls.length = 0;
  logState = { data: { total: 2, entries: [entry(1), entry(2, { status: "sent", language: "si", template_key: "overdue_return" })] }, isLoading: false, isError: false, isFetching: false };
});

describe("HistoryTab", () => {
  it("lists messages with customer, invoice, type, language and status", () => {
    render(<HistoryTab />);
    const rows = screen.getAllByTestId("history-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Customer 1");
    expect(rows[0]).toHaveTextContent("INV-51");
    expect(rows[0]).toHaveTextContent("Receipt");
    expect(rows[0]).toHaveTextContent("Opened");
    expect(rows[1]).toHaveTextContent("Sent");
    expect(rows[1]).toHaveTextContent("සිං");
    expect(screen.getByText("2 messages")).toBeInTheDocument();
  });

  it("expands a row to show the full message", () => {
    render(<HistoryTab />);
    const row = screen.getAllByTestId("history-row")[0];
    expect(row.textContent).toContain("Line one Line two 1"); // collapsed to one line
    fireEvent.click(row);
    expect(row.textContent).toContain("Line one\nLine two 1");
  });

  it("filters by message type and loads more", () => {
    logState = { ...logState, data: { total: 90, entries: [entry(1)] } };
    render(<HistoryTab />);
    expect(calls.at(-1)).toMatchObject({ template_key: undefined, limit: 30 });
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(calls.at(-1)).toMatchObject({ limit: 60 });
    fireEvent.mouseDown(screen.getByLabelText("Message type"));
    fireEvent.click(screen.getByRole("option", { name: "Overdue" }));
    expect(calls.at(-1)).toMatchObject({ template_key: "overdue_return", limit: 30 }); // limit resets with the filter
  });

  it("has an empty state and an error state", () => {
    logState = { data: { total: 0, entries: [] }, isLoading: false, isError: false, isFetching: false };
    const { unmount } = render(<HistoryTab />);
    expect(screen.getByText("No messages yet.")).toBeInTheDocument();
    unmount();
    logState = { data: undefined, isLoading: false, isError: true, isFetching: false };
    render(<HistoryTab />);
    expect(screen.getByText("Could not load history.")).toBeInTheDocument();
  });
});
