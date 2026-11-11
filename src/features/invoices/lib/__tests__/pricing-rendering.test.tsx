import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import i18n from "@/i18n";
import { useAuthStore } from "@/stores/useAuthStore";
import { LedgerTable } from "../../components/LedgerTable";
import { InvoiceReceipt } from "../../components/InvoiceReceipt";
import { ReturnSettlementDialog } from "../../components/ReturnSettlementDialog";
import { analyseLine } from "../lineCost";

vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useInvoiceSignatures: () => ({ data: { signatures: [] } }),
}));

vi.mock("../../hooks/useInvoiceHooks", () => ({
  useProcessReturn: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("Step 3.3: Pricing UI Rendering Tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuthStore.setState({
      user: {
        first_name: "Test",
        configData: {
          business_display_name: "Test Rental",
          currency_code: "Rs.",
          custom_settings: { phone: "0771234567", address: "Colombo, Sri Lanka" },
        },
      } as any,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    i18n.changeLanguage("en");
  });

  describe("LedgerTable rendering", () => {
    it("a period item renders base, 'for 5 days', 'then Rs. 50/day'", () => {
      const line = {
        line_id: 101,
        borrow_date: "2026-11-01",
        expected_return_date: "2026-11-06",
        track_overdue: true,
        borrow_quantity: 1,
        good_returned_qty: 0,
        defective_returned_qty: 0,
        line_status: "Active",
        locked_base_price: 250,
        locked_minimum_days: 5,
        locked_extra_daily_rate: 50,
        line_total_amount: 250,
        Equipment: {
          equipment_name: "Scaffolding Set",
          equipment_name_si: "මච්චං කට්ටලය",
          serial_number: "SC-01",
        },
      };

      const info = analyseLine(line, "2026-11-03", {
        issuedAt: "2026-11-01T09:00:00+05:30",
        now: new Date("2026-11-03T10:00:00+05:30"),
      });

      render(<LedgerTable lines={[line]} infos={[info]} returnTraces={[]} />);

      const cells = within(screen.getByTestId("ledger-row")).getAllByRole("cell");
      const rateCell = cells[5];
      expect(rateCell).toHaveTextContent("Rs. 250");
      expect(rateCell).toHaveTextContent("for 5 days");
      expect(rateCell).toHaveTextContent("then Rs. 50/day");
    });

    it("a 1-day item renders 'per day' without the period label", () => {
      const line = {
        line_id: 102,
        borrow_date: "2026-11-01",
        expected_return_date: "2026-11-02",
        track_overdue: true,
        borrow_quantity: 1,
        good_returned_qty: 0,
        defective_returned_qty: 0,
        line_status: "Active",
        locked_base_price: 300,
        locked_minimum_days: 1,
        locked_extra_daily_rate: 300,
        line_total_amount: 300,
        Equipment: {
          equipment_name: "Demolition Hammer",
          serial_number: "DH-01",
        },
      };

      const info = analyseLine(line, "2026-11-02", {
        issuedAt: "2026-11-01T09:00:00+05:30",
        now: new Date("2026-11-02T10:00:00+05:30"),
      });

      render(<LedgerTable lines={[line]} infos={[info]} returnTraces={[]} />);

      const cells = within(screen.getByTestId("ledger-row")).getAllByRole("cell");
      const rateCell = cells[5];
      expect(rateCell).toHaveTextContent("Rs. 300");
      expect(rateCell).toHaveTextContent("per day");
      expect(rateCell.textContent).not.toMatch(/for \d+ days/);
      expect(rateCell.textContent).not.toMatch(/then/);
    });

    it("a tracked line past due date but inside period shows the late reminder, but NO 'incl. late' fee text", () => {
      // 5-day minimum item, due after 1 day (2026-11-02), current date is 2026-11-04 (day 3)
      const line = {
        line_id: 103,
        borrow_date: "2026-11-01",
        expected_return_date: "2026-11-02",
        track_overdue: true,
        borrow_quantity: 1,
        good_returned_qty: 0,
        defective_returned_qty: 0,
        line_status: "Active",
        locked_base_price: 250,
        locked_minimum_days: 5,
        locked_extra_daily_rate: 50,
        line_total_amount: 250,
        Equipment: {
          equipment_name: "Scaffolding Frame",
          serial_number: "SF-01",
        },
      };

      const info = analyseLine(line, "2026-11-04", {
        issuedAt: "2026-11-01T09:00:00+05:30",
        now: new Date("2026-11-04T10:00:00+05:30"),
      });

      // Verify analytical properties
      expect(info.isOverdue).toBe(true);
      expect(info.lateFee).toBe(0);

      render(<LedgerTable lines={[line]} infos={[info]} returnTraces={[]} />);

      const row = screen.getByTestId("ledger-row");
      const cells = within(row).getAllByRole("cell");

      // Shows overdue status reminder
      expect(cells[0]).toHaveTextContent(/2 days late/i);
      // Cost cell shows base cost without late fee
      const totalCell = cells[6];
      expect(totalCell).toHaveTextContent("Rs. 250");
      expect(totalCell.textContent).not.toContain("incl. late");
    });
  });

  describe("InvoiceReceipt rendering", () => {
    const renderReceipt = (invoiceData: any, language: "en" | "si" = "en") => {
      const queryClient = new QueryClient();
      return render(
        <QueryClientProvider client={queryClient}>
          <InvoiceReceipt
            id="test-receipt"
            invoice={invoiceData}
            isPreview
            showBarcode={false}
            language={language}
          />
        </QueryClientProvider>
      );
    };

    it("printed price text and line total match golden cases in English and Sinhala", async () => {
      const tieredInvoice = {
        invoice_id: 201,
        status: "Active",
        issued_date: "2026-11-01T09:00:00+05:30",
        InvoiceLines: [
          {
            line_id: 1,
            borrow_date: "2026-11-01",
            expected_return_date: "2026-11-06",
            borrow_quantity: 2,
            locked_base_price: 250,
            locked_minimum_days: 5,
            locked_extra_daily_rate: 50,
            line_total_amount: 500,
            Equipment: {
              equipment_name: "Scaffolding Set",
              equipment_name_si: "මච්චං කට්ටලය",
              serial_number: "SC-01",
            },
          },
        ],
        sub_total: 500,
        total_amount: 500,
      };

      // English render
      const { unmount: unmountEn } = renderReceipt(tieredInvoice, "en");
      expect(screen.getByText(/Base: Rs\. 250\.00 \(5d\) \+ Extra: Rs\. 50\.00\/d/i)).toBeInTheDocument();
      expect(screen.getAllByText("Rs. 500.00").length).toBeGreaterThanOrEqual(1);
      unmountEn();

      // Sinhala render
      await i18n.changeLanguage("si");
      const { unmount: unmountSi } = renderReceipt(tieredInvoice, "si");
      expect(
        screen.getByText(/මූලික: Rs\. 250\.00 \(දින 5\) \+ අමතර: දිනකට Rs\. 50\.00/i)
      ).toBeInTheDocument();
      unmountSi();
    });

    it("prints the INV-104 saved snapshot values and Rs. 200 total", () => {
      const savedInvoice = {
        invoice_id: 104,
        status: "Active",
        issued_date: "2026-11-09T10:00:00+05:30",
        InvoiceLines: [
          {
            line_id: 1,
            borrow_date: "2026-11-09",
            expected_return_date: "2026-11-09",
            borrow_quantity: 2,
            locked_base_price: 50,
            locked_minimum_days: 5,
            locked_extra_daily_rate: 50,
            line_total_amount: 100,
            Equipment: { equipment_name: "Steel Scaffolding Plank - 6 feet", serial_number: "EQ-209" },
          },
          {
            line_id: 2,
            borrow_date: "2026-11-09",
            expected_return_date: "2026-11-09",
            borrow_quantity: 2,
            locked_base_price: 50,
            locked_minimum_days: 1,
            locked_extra_daily_rate: 50,
            line_total_amount: 100,
            Equipment: { equipment_name: "Scaffolding (4*5)", serial_number: "EQ-047" },
          },
        ],
        sub_total: 200,
        total_amount: 200,
      };

      renderReceipt(savedInvoice, "en");
      expect(screen.getByText(/Base: Rs\. 50\.00 \(5d\) \+ Extra: Rs\. 50\.00\/d/i)).toBeInTheDocument();
      expect(screen.getAllByText("Rs. 100.00").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Rs. 200.00").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("ReturnSettlementDialog rendering", () => {
    const createMockInvoice = () => ({
      invoice_id: 301,
      status: "Active",
      total_amount: "250",
      InvoiceLines: [
        {
          line_id: 1,
          borrow_date: "2026-11-01",
          expected_return_date: "2026-11-02",
          track_overdue: true,
          borrow_quantity: 1,
          good_returned_qty: 0,
          defective_returned_qty: 0,
          line_status: "Active",
          locked_base_price: 250,
          locked_minimum_days: 5,
          locked_extra_daily_rate: 50,
          Equipment: { equipment_name: "Scaffolding Set" },
        },
      ],
      Payments: [],
    });

    it("opening the dialog for a 5-day item returned on day 3 shows Rs. 0 late fee", () => {
      // Freeze at Day 3 (2026-11-04)
      vi.setSystemTime(new Date("2026-11-04T10:00:00+05:30"));

      render(
        <ReturnSettlementDialog
          open={true}
          onClose={vi.fn()}
          invoice={createMockInvoice()}
          showToast={vi.fn()}
        />
      );

      // Verify that NO late fee chip or late fee summary is rendered
      expect(screen.queryByText(/\d+d late/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Estimated Late Fees/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/incl.*late fees/i)).not.toBeInTheDocument();
      // Total amount remains 250, with no late fee added to summary
      expect(screen.getByText("Rs. 250")).toBeInTheDocument();
    });

    it("opening the dialog for the same item on day 7 shows Rs. 100 late fee (2 × Rs. 50)", () => {
      // Freeze at Day 7 (2026-11-08) -> 6 calendar days past due date (2026-11-02),
      // 5 min days - 1 contract day = 4 grace days.
      // Chargeable late days = 6 - 4 = 2 days -> 2 * 50 = Rs. 100
      vi.setSystemTime(new Date("2026-11-08T10:00:00+05:30"));

      render(
        <ReturnSettlementDialog
          open={true}
          onClose={vi.fn()}
          invoice={createMockInvoice()}
          showToast={vi.fn()}
        />
      );

      // Verify that late fee chip and summary are rendered with 2d late · +Rs.100
      expect(screen.getByText(/2d late · \+Rs\.100/i)).toBeInTheDocument();
      expect(screen.getByText(/Estimated Late Fees: Rs\. 100/i)).toBeInTheDocument();
      expect(screen.getByText(/incl\. Rs\. 100 late fees/i)).toBeInTheDocument();
      // New total owes Rs. 350 (250 + 100)
      expect(screen.getByText("Rs. 350")).toBeInTheDocument();
    });
  });
});
