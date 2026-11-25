import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, createTheme } from "@mui/material";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import ActivityPage from "../pages/ActivityPage";
import { useAuthStore } from "@/stores/useAuthStore";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<any>("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Recharts ResponsiveContainer so charts render in jsdom without ResizeObserver issues
vi.mock("recharts", async () => {
  const actual = await vi.importActual<any>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 600, height: 200 }}>{children}</div>,
  };
});

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    delete: (...args: any[]) => mockDelete(...args),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

const SAMPLE_EVENTS = [
  {
    event_id: 101,
    type: "discount",
    risk: "high",
    invoice_id: 501,
    invoice_number: "INV-501",
    customer_id: 10,
    customer_name: "Perera Builders",
    actor_user_id: 2,
    actor_name: "Kasun",
    amount: 2000,
    data: { sentence: "Discount Rs 2,000 (18%) · Regular customer" },
    occurred_at: "2026-11-25T10:15:00Z",
    after_hours: false,
    checked_by: null,
    checked_by_name: null,
    checked_at: null,
    comment_count: 1,
    is_read: false,
    created_at: "2026-11-25T10:15:00Z",
  },
  {
    event_id: 102,
    type: "payment",
    risk: "normal",
    invoice_id: 502,
    invoice_number: "INV-502",
    customer_id: 11,
    customer_name: "Silva Hardware",
    actor_user_id: 3,
    actor_name: "Nimal",
    amount: 5000,
    data: { sentence: "Payment Rs 5,000 · Cash" },
    occurred_at: "2026-11-25T11:30:00Z",
    after_hours: true,
    checked_by: 1,
    checked_by_name: "Manager",
    checked_at: "2026-11-25T12:00:00Z",
    comment_count: 0,
    is_read: true,
    created_at: "2026-11-25T11:30:00Z",
  },
];

const SAMPLE_SUMMARY = {
  by_type: [
    { type: "discount", count: 1, amount: 2000, high_count: 1 },
    { type: "payment", count: 1, amount: 5000, high_count: 0 },
  ],
  buckets: [
    {
      key: "2026-11-25",
      label: "Nov 25",
      date: "2026-11-25",
      counts: { discount: 1, payment: 1 },
      total: 2,
    },
  ],
  granularity: "day",
  not_checked_count: 1,
  high_not_checked_count: 1,
  by_staff: [
    { user_id: 2, name: "Kasun", discounts: 1, backdated: 0, refunds: 0, total: 1 },
  ],
};

function renderActivity(permissions = ["activity:view", "activity:check"]) {
  useAuthStore.setState({
    isAuthenticated: true,
    user: {
      user_id: 1,
      username: "admin",
      permissions,
    } as any,
  });

  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={createTheme()}>
          <ActivityPage />
        </ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("ActivityPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage("en");
    mockGet.mockImplementation((url: string, config?: any) => {
      if (url === "/activity/summary") {
        return Promise.resolve({ data: SAMPLE_SUMMARY });
      }
      if (url === "/activity/saved-filters") {
        return Promise.resolve({
          data: {
            filters: [
              {
                id: "sf-1",
                name: "Big discounts",
                filters: {
                  preset: "this_week",
                  types: ["discount"],
                  high_only: true,
                },
              },
            ],
          },
        });
      }
      if (url === "/activity/101/comments") {
        return Promise.resolve({
          data: {
            comments: [
              {
                comment_id: 1,
                event_id: 101,
                user_id: 1,
                user_name: "Admin",
                body: "Asked Kasun, contractor rate",
                created_at: "2026-11-25T10:20:00Z",
              },
            ],
          },
        });
      }
      if (url === "/activity") {
        const typesParam = config?.params?.types;
        const filtered = typesParam
          ? SAMPLE_EVENTS.filter((e) => String(typesParam).split(",").includes(e.type))
          : SAMPLE_EVENTS;
        return Promise.resolve({
          data: {
            events: filtered,
            total: filtered.length,
            page: 1,
            limit: 50,
            totals: {
              count: filtered.length,
              amount: filtered.reduce((s, e) => s + e.amount, 0),
              high_count: filtered.filter((e) => e.risk === "high").length,
              not_checked_count: filtered.filter((e) => !e.checked_at).length,
            },
            see_amounts: true,
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    mockPost.mockResolvedValue({ data: { ok: true } });
    mockDelete.mockResolvedValue({ data: { ok: true } });
  });

  afterEach(() => {
    i18n.changeLanguage("en");
  });

  it("drives tiles, charts, and totals strip from the date filter and allows tile tap filtering", async () => {
    renderActivity();

    await waitFor(() => {
      expect(screen.getByTestId("type-tile-discount")).toBeInTheDocument();
      expect(screen.getByTestId("activity-totals-strip")).toHaveTextContent("2 events · Rs. 7,000");
    });

    // Change date filter to Yesterday
    fireEvent.click(screen.getByText("Yesterday"));
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "/activity/summary",
        expect.objectContaining({ params: expect.objectContaining({ preset: "yesterday" }) }),
      );
    });

    // Tap discount tile -> filters to discount, totals strip updates to match rows
    await waitFor(() => {
      expect(screen.getByTestId("type-tile-discount")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("type-tile-discount"));
    await waitFor(() => {
      expect(screen.getByTestId("activity-totals-strip")).toHaveTextContent("1 events · Rs. 2,000");
    });

    // Tap discount tile again -> clears filter
    fireEvent.click(screen.getByTestId("type-tile-discount"));
    await waitFor(() => {
      expect(screen.getByTestId("activity-totals-strip")).toHaveTextContent("2 events · Rs. 7,000");
    });
  });

  it("handles Checked vs Read, comments, and saved filters", async () => {
    renderActivity();

    await waitFor(() => {
      expect(screen.getByTestId("activity-row-101")).toBeInTheDocument();
    });

    // Checked toggle on unchecked row 101
    const checkBtns = screen.getAllByLabelText("Mark checked");
    fireEvent.click(checkBtns[0]);
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/activity/101/check");
    });

    // Uncheck on checked row 102
    const uncheckBtn = await screen.findByLabelText("Uncheck");
    fireEvent.click(uncheckBtn);
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("/activity/102/check");
    });

    // Expand comments on row 101 and add a comment
    const commentBtns = screen.getAllByLabelText("Comments");
    fireEvent.click(commentBtns[0]);
    await waitFor(() => {
      expect(screen.getByText("Asked Kasun, contractor rate")).toBeInTheDocument();
    });
    const input = screen.getAllByLabelText("Add a comment...")[0];
    fireEvent.change(input, { target: { value: "Verified with owner" } });
    fireEvent.click(screen.getAllByLabelText("Send comment")[0]);
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/activity/101/comments", { body: "Verified with owner" });
    });

    // Apply saved filter
    fireEvent.click(screen.getByText("Big discounts"));
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "/activity",
        expect.objectContaining({
          params: expect.objectContaining({ preset: "this_week", types: "discount", risk: "high" }),
        }),
      );
    });
  });

  it("hides per-staff bars without activity:check and hides amounts when see_amounts is false", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/activity/summary") {
        return Promise.resolve({ data: { ...SAMPLE_SUMMARY, by_staff: undefined, see_amounts: false } });
      }
      if (url === "/activity/saved-filters") return Promise.resolve({ data: { filters: [] } });
      if (url === "/activity") {
        return Promise.resolve({
          data: {
            events: SAMPLE_EVENTS,
            total: 2,
            page: 1,
            limit: 50,
            totals: { count: 2, amount: 0, high_count: 1, not_checked_count: 1 },
            see_amounts: false,
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderActivity(["activity:view"]);

    await waitFor(() => {
      expect(screen.getByTestId("activity-row-101")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("per-staff-bars")).not.toBeInTheDocument();
    expect(screen.getByTestId("activity-totals-strip")).toHaveTextContent("2 events");
    expect(screen.getByTestId("activity-totals-strip")).not.toHaveTextContent("Rs.");
  });

  it("renders real Sinhala strings when language is si", async () => {
    await i18n.changeLanguage("si");
    renderActivity();

    await waitFor(() => {
      expect(screen.getByText("ක්‍රියාකාරකම්")).toBeInTheDocument();
      expect(screen.getByText("Excel බාගන්න")).toBeInTheDocument();
    });
  });
});
