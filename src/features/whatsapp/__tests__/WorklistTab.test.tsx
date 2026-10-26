import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { WorklistItem, Worklist } from "../api/whatsapp.api";

let worklistState: any;
const refetch = vi.fn();
const logMutate = vi.fn();
vi.mock("../hooks/useWhatsApp", () => ({
  useWhatsAppWorklist: () => worklistState,
  useLogWhatsAppMessage: () => ({ mutate: logMutate, isPending: false }),
}));
// the per-row preview dialog is covered by its own tests
vi.mock("../components/WhatsAppSendDialog", async (orig) => {
  const real = await orig<typeof import("../components/WhatsAppSendDialog")>();
  return { ...real, WhatsAppSendDialog: (p: any) => <div data-testid="send-dialog">{`${p.invoiceId}|${p.templateKey}`}</div> };
});

import { WorklistTab } from "../components/WorklistTab";

const phone = (digits = "94771234567", kind: any = "mobile", valid = true) => ({ digits, display: digits ? `+${digits}` : "", kind, valid });
const item = (id: number, over: Partial<WorklistItem> = {}): WorklistItem => ({
  invoice_id: id,
  invoice_number: `INV-${id}`,
  customer: { customer_id: id, name: `Customer ${id}`, phone: phone(), opted_out: false },
  total: 10000,
  balance: null,
  due_date: "2026-10-20",
  days_late: 6,
  pending_units: 2,
  items: "• 2 × Hammer Drill (EQ-1)\n• 1 × Ladder (EQ-2)",
  template_key: "overdue_return",
  language: "en",
  body: `Reminder body ${id}`,
  link: `https://wa.me/94771234567?text=${id}`,
  last_message: null,
  warnings: [],
  ...over,
});

const worklist = (sections: Partial<Worklist["sections"]> = {}): Worklist => {
  const s = { overdue_returns: [], returns_due_today: [], returns_due_tomorrow: [], payments_pending: [], ...sections } as Worklist["sections"];
  return {
    generated_at: "2026-10-26T04:30:00Z",
    today: "2026-10-26",
    summary: {
      overdue_returns: s.overdue_returns.length,
      returns_due_today: s.returns_due_today.length,
      returns_due_tomorrow: s.returns_due_tomorrow.length,
      payments_pending: s.payments_pending.length,
      balance_pending: s.payments_pending.reduce((a, r) => a + (r.balance || 0), 0),
    },
    sections: s,
  };
};
const ready = (w: Worklist) => {
  worklistState = { data: w, isLoading: false, isError: false, isFetching: false, refetch };
};

let openSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  logMutate.mockReset();
  refetch.mockReset();
  openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
});

describe("WorklistTab", () => {
  it("shows the four counts and lands on the first section that has people in it", () => {
    ready(worklist({ returns_due_today: [item(2, { template_key: "return_due_today", days_late: 0, due_date: "2026-10-26" })], payments_pending: [item(4, { template_key: "payment_reminder", balance: 6000, due_date: null, days_late: 0 })] }));
    render(<WorklistTab />);
    expect(screen.getByText("Overdue returns")).toBeInTheDocument();
    expect(screen.getByText("Money owed")).toBeInTheDocument();
    // overdue is empty, so the list opens on "Due today"
    expect(screen.getByText("Customer 2")).toBeInTheDocument();
    expect(screen.queryByText("Customer 4")).not.toBeInTheDocument();
  });

  it("switches section from the tiles", () => {
    ready(worklist({ overdue_returns: [item(1)], payments_pending: [item(4, { template_key: "payment_reminder", balance: 6000, due_date: null, days_late: 0 })] }));
    render(<WorklistTab />);
    expect(screen.getByText("Customer 1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Money owed"));
    expect(screen.getByText("Customer 4")).toBeInTheDocument();
    expect(screen.getByText("Rs. 6,000", { selector: ".MuiChip-label" })).toBeInTheDocument(); // balance chip on the row
  });

  it("shows what each row needs: invoice, days late, number, due date and machines", () => {
    ready(worklist({ overdue_returns: [item(1)] }));
    render(<WorklistTab />);
    const row = screen.getByTestId("worklist-row");
    expect(within(row).getByText("INV-1")).toBeInTheDocument();
    expect(within(row).getByText("6 days late")).toBeInTheDocument();
    expect(within(row).getByText("+94771234567")).toBeInTheDocument();
    expect(within(row).getByText(/2 × Hammer Drill \(EQ-1\), 1 × Ladder \(EQ-2\)/)).toBeInTheDocument();
  });

  it("opens the preview dialog for that invoice with that message type", () => {
    ready(worklist({ overdue_returns: [item(1)] }));
    render(<WorklistTab />);
    fireEvent.click(screen.getByRole("button", { name: /Send on WhatsApp: Customer 1/ }));
    expect(screen.getByTestId("send-dialog")).toHaveTextContent("1|overdue_return");
  });

  it("marks rows already messaged recently and dims blocked ones", () => {
    ready(
      worklist({
        overdue_returns: [
          item(1, { warnings: ["messaged_recently"], last_message: { template_key: "overdue_return", created_at: new Date(Date.now() - 3600_000).toISOString(), status: "sent" } }),
          item(2, { warnings: ["opted_out"], customer: { customer_id: 2, name: "Customer 2", phone: phone(), opted_out: true } }),
        ],
      }),
    );
    render(<WorklistTab />);
    expect(screen.getByLabelText("Messaged")).toBeInTheDocument();
    expect(screen.getByText("Opted out")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send on WhatsApp: Customer 2/ })).toBeDisabled();
  });

  it("a row with no usable number offers 'Choose contact'", () => {
    ready(worklist({ overdue_returns: [item(1, { warnings: ["landline"], customer: { customer_id: 1, name: "Customer 1", phone: phone("94112345678", "landline", false), opted_out: false } })] }));
    render(<WorklistTab />);
    expect(screen.getByText("Choose contact")).toBeInTheDocument();
  });

  describe("message the whole list", () => {
    const rows = () => [
      item(1),
      item(2, { warnings: ["opted_out"] }),
      item(3, { warnings: ["landline"], customer: { customer_id: 3, name: "Customer 3", phone: phone("94112345678", "landline", false), opted_out: false } }),
      item(4, { warnings: ["messaged_recently"] }),
      item(5),
    ];

    it("counts only the people who can actually be messaged", () => {
      ready(worklist({ overdue_returns: rows() }));
      render(<WorklistTab />);
      expect(screen.getByRole("button", { name: "Message all (2)" })).toBeEnabled();
    });

    it("walks through them one by one, opening each chat and logging it", () => {
      ready(worklist({ overdue_returns: rows() }));
      render(<WorklistTab />);
      fireEvent.click(screen.getByRole("button", { name: "Message all (2)" }));
      expect(screen.getByText("1 of 2")).toBeInTheDocument();
      expect(screen.getByTestId("queue-preview")).toHaveTextContent("Reminder body 1");

      fireEvent.click(screen.getByRole("button", { name: "Open WhatsApp & next" }));
      expect(openSpy).toHaveBeenCalledWith("https://wa.me/94771234567?text=1", "_blank", "noopener,noreferrer");
      expect(logMutate).toHaveBeenCalledWith({
        customer_id: 1,
        invoice_id: 1,
        template_key: "overdue_return",
        language: "en",
        to_phone: "94771234567",
        body: "Reminder body 1",
      });
      expect(screen.getByText("2 of 2")).toBeInTheDocument();
      expect(screen.getByTestId("queue-preview")).toHaveTextContent("Reminder body 5");
    });

    it("skipping moves on without opening anything, and the end shows a summary", () => {
      ready(worklist({ overdue_returns: rows() }));
      render(<WorklistTab />);
      fireEvent.click(screen.getByRole("button", { name: "Message all (2)" }));
      fireEvent.click(screen.getByRole("button", { name: "Skip" }));
      expect(openSpy).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Open WhatsApp & next" }));
      expect(screen.getByText("That's everyone!")).toBeInTheDocument();
      expect(screen.getByText("1 opened · 1 skipped")).toBeInTheDocument();
      expect(logMutate).toHaveBeenCalledTimes(1);
    });

    it("is disabled when nobody on the list can be messaged", () => {
      ready(worklist({ overdue_returns: [item(2, { warnings: ["opted_out"] })] }));
      render(<WorklistTab />);
      expect(screen.getByRole("button", { name: "Message all (0)" })).toBeDisabled();
    });
  });

  it("celebrates an empty day", () => {
    ready(worklist());
    render(<WorklistTab />);
    expect(screen.getByText("All clear for today")).toBeInTheDocument();
  });

  it("shows a loading state without crashing", () => {
    worklistState = { data: undefined, isLoading: true, isError: false, isFetching: true, refetch };
    render(<WorklistTab />);
    expect(screen.getAllByText("Overdue returns").length).toBeGreaterThan(0); // tile + section title
  });

  it("offers retry when the list cannot load", () => {
    worklistState = { data: undefined, isLoading: false, isError: true, isFetching: false, refetch };
    render(<WorklistTab />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });
});
