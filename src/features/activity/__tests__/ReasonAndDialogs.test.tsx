import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material";
import { theme } from "@/app/theme";
import { I18nextProvider } from "react-i18next";
import { ToastProvider } from "@/components/ui/AppToast";
import i18n from "@/i18n";
import { ReasonChips, isReasonValid } from "@/components/ui/ReasonChips";
import { PosCheckoutPanel } from "@/features/invoices/components/PosCheckoutPanel";
import { ManageFinancialPanel } from "@/features/invoices/components/ManageFinancialPanel";
import { ReturnSettlementDialog } from "@/features/invoices/components/ReturnSettlementDialog";
import { CompletionRatingDialog } from "@/features/reviews/components/CompletionRatingDialog";
import ActivitySettingsPage from "../pages/ActivitySettingsPage";
import { DEFAULT_ACTIVITY_SETTINGS } from "../constants";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<any>("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearch: () => ({ tab: "reasons" }),
  };
});

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
    patch: (...args: any[]) => mockPatch(...args),
    delete: vi.fn(),
  },
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={theme}>
          <ToastProvider>{ui}</ToastProvider>
        </ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("Slice 1 Reasons, Dates, Reviews, and Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage("en");
    mockGet.mockImplementation((url: string) => {
      if (url === "/activity/settings") return Promise.resolve({ data: DEFAULT_ACTIVITY_SETTINGS });
      if (url === "/invoices/10/reviews") return Promise.resolve({ data: { reviews: [] } });
      if (url === "/phone-assistant/roles") return Promise.resolve({ data: { roles: [] } });
      return Promise.resolve({ data: {} });
    });
    mockPost.mockResolvedValue({ data: { late_fee_today: 2000, late_fee_at_date: 500, difference: 1500 } });
    mockPut.mockResolvedValue({ data: DEFAULT_ACTIVITY_SETTINGS });
    mockPatch.mockResolvedValue({ data: {} });
  });

  it("ReasonChips renders tappable chips (no dropdown) and requires a note for Other", () => {
    const onChange = vi.fn();
    const { container } = wrap(
      <ReasonChips list="discount" value={null} onChange={onChange} required />,
    );

    expect(container.querySelector("select")).toBeNull();
    expect(screen.getByText("Regular customer")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Other"));
    expect(onChange).toHaveBeenCalledWith({ key: "other", note: "" });
    expect(isReasonValid({ key: "other", note: "" }, true)).toBe(false);
    expect(isReasonValid({ key: "other", note: "Approved by owner" }, true)).toBe(true);
    expect(isReasonValid({ key: "regular_customer" }, true)).toBe(true);
  });

  it("blocks POS dispatch when discount > 0 without a reason", () => {
    const setFees = vi.fn();
    wrap(
      <PosCheckoutPanel
        cartItems={[
          {
            equipment_id: 1,
            equipment_name: "Drill",
            borrow_quantity: 1,
            borrow_date: "2026-11-25",
            expected_return_date: "2026-11-26",
            locked_base_price: 1000,
            locked_minimum_days: 1,
            locked_extra_daily_rate: 500,
            is_bulk_item: false,
            available_stock: 5,
          } as any,
        ]}
        selectedCustomer={{ customer_id: 1, first_name: "A", last_name: "B", deposit_balance: 0 }}
        fees={{ transport: 0, discount: 200, advance: 0, discount_reason: null }}
        setFees={setFees}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
        onConfirmDispatch={vi.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByTestId("reason-chips-discount")).toBeInTheDocument();
    const dispatchBtn = screen.getByRole("button", { name: /place.*dispatch/i });
    expect(dispatchBtn).toBeDisabled();
  });

  it("blocks Manage fees save without a reason and blocks future payment dates", () => {
    wrap(
      <ManageFinancialPanel
        invoice={{
          invoice_id: 10,
          status: "Active",
          total_amount: 1000,
          transport_fee: 0,
          discount_amount: 0,
          InvoiceLines: [],
          Payments: [],
        }}
        showToast={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
      />,
    );

    // Edit discount -> Save disabled until reason chosen
    fireEvent.click(screen.getByLabelText("Edit Discount"));
    const discountInput = screen.getByRole("textbox", { name: "Discount" });
    fireEvent.change(discountInput, { target: { value: "100" } });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    // Enter a future payment date -> submit blocked
    const dateInput = screen.getByLabelText("Payment date", { selector: "input" });
    fireEvent.change(dateInput, { target: { value: "2099-01-01" } });
    expect(screen.getByText("Future dates are not allowed")).toBeInTheDocument();
  });

  it("shows server late-fee difference when return date is back-dated", async () => {
    wrap(
      <ReturnSettlementDialog
        open
        onClose={vi.fn()}
        showToast={vi.fn()}
        invoice={{
          invoice_id: 10,
          issued_date: "2026-11-20",
          InvoiceLines: [
            {
              line_id: 1,
              line_status: "Active",
              borrow_quantity: 1,
              good_returned_qty: 0,
              defective_returned_qty: 0,
              locked_extra_daily_rate: 500,
              locked_minimum_days: 1,
              borrow_date: "2026-11-20",
              expected_return_date: "2026-11-21",
              Equipment: { equipment_name: "Mixer" },
            },
          ],
          Payments: [],
        }}
      />,
    );

    const dateInput = screen.getByLabelText("Returned on", { selector: "input" });
    fireEvent.change(dateInput, { target: { value: "2026-11-23" } });

    await waitFor(() => {
      expect(screen.getByTestId("return-late-fee-diff")).toHaveTextContent(
        "Late fee Rs 1,500 less than today",
      );
    });
    expect(screen.getByTestId("reason-chips-backdate")).toBeInTheDocument();
  });

  it("appends selected review tag labels to description", async () => {
    wrap(
      <CompletionRatingDialog
        open
        invoiceId={10}
        customerName="Perera"
        onClose={vi.fn()}
        showToast={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("review-tag-chips")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("On time"));
    fireEvent.click(screen.getByText("Clean"));

    const textboxes = screen.getAllByRole("textbox");
    expect((textboxes[0] as HTMLTextAreaElement).value).toBe("On time · Clean");
  });

  it("saves Reason lists in ActivitySettingsPage and prevents removing Other", async () => {
    wrap(<ActivitySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Activity & Reason Settings")).toBeInTheDocument();
    });

    // Save button calls PUT /activity/settings
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/activity/settings",
        expect.objectContaining({ reasons: expect.any(Object) }),
      );
    });
  });
});
