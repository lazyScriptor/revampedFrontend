import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";

const api = { fetchDesk: vi.fn(), decideApproval: vi.fn(), setApprovalPin: vi.fn() };
vi.mock("../api/retail.api", async (orig) => ({
  ...(await orig<typeof import("../api/retail.api")>()),
  fetchDesk: (...a: any[]) => api.fetchDesk(...a),
  decideApproval: (...a: any[]) => api.decideApproval(...a),
  setApprovalPin: (...a: any[]) => api.setApprovalPin(...a),
}));
vi.mock("@/features/retail/api/preferences.api", () => ({
  fetchUiPreferences: vi.fn(async () => ({})),
  putUiPreference: vi.fn(async () => ({})),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));

import { makeFakeSocket, renderWithProviders, signIn } from "./testUtils";
const socket = makeFakeSocket();
vi.mock("@/lib/socket", () => ({ connectSocket: vi.fn(), getSocket: () => socket }));

import { RetailTopBar } from "../RetailTopBar";
import { ApprovalPinSection } from "../approval/ApprovalPinSection";

const waitingRow = (id: number) => ({
  exception_id: id,
  type: "price_change",
  status: "waiting",
  summary: `Price 1,250 → 1,100 (#${id})`,
  requested_by_name: "Cashier A",
  created_at: "2026-11-24T09:30:00Z",
});

let waitingTotal = 2;
beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
  window.history.replaceState(null, "");
  waitingTotal = 2;
  api.fetchDesk.mockImplementation(async (q: any) => {
    if (q.tab === "waiting") return { rows: [waitingRow(1), waitingRow(2)].slice(0, q.limit === 1 ? 1 : 2), total: waitingTotal, totals: [] };
    return {
      rows: [
        {
          exception_id: 7,
          type: "price_change",
          status: "approved",
          item_name: "Sali steel 12mm",
          old_value: 1250,
          new_value: 1100,
          amount_impact: -150,
          requested_by_name: "Cashier A",
          approved_by_name: "Nimal",
          created_at: "2026-11-24T10:00:00Z",
        },
      ],
      total: 1,
      totals: [{ type: "price_change", count: 3, amount: -450 }],
    };
  });
  api.decideApproval.mockResolvedValue({});
});

describe("manager desk badge", () => {
  it("is hidden without the retail feature", async () => {
    signIn({ retail: false, permissions: ["approvals:decide"] });
    renderWithProviders(<RetailTopBar />);
    expect(screen.queryByLabelText("Manager desk")).toBeNull();
    expect(screen.queryByLabelText("Quick find")).toBeNull();
    expect(api.fetchDesk).not.toHaveBeenCalled();
  });

  it("is hidden without approvals:decide (the command button still shows)", async () => {
    signIn({ permissions: [] });
    renderWithProviders(<RetailTopBar />);
    expect(screen.getByLabelText("Quick find")).toBeTruthy();
    expect(screen.queryByLabelText("Manager desk")).toBeNull();
    expect(api.fetchDesk).not.toHaveBeenCalled();
  });

  it("shows the waiting count and refreshes it on socket events", async () => {
    signIn({ permissions: ["approvals:decide"] });
    renderWithProviders(<RetailTopBar />);
    await waitFor(() => expect(screen.getByText("2")).toBeTruthy());
    waitingTotal = 3;
    act(() => socket.emit("approval:requested", { exception_id: 3 }));
    await waitFor(() => expect(screen.getByText("3")).toBeTruthy());
    waitingTotal = 0;
    act(() => socket.emit("approval:decided", { exception_id: 3, approved: true }));
    await waitFor(() => expect(document.querySelector(".MuiBadge-badge.MuiBadge-invisible")).not.toBeNull()); // zero hides the badge
  });

  it("opens the desk with Approve / Decline on waiting requests", async () => {
    signIn({ permissions: ["approvals:decide"] });
    renderWithProviders(<RetailTopBar />);
    await waitFor(() => expect(screen.getByText("2")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Manager desk"));
    const rows = await screen.findAllByTestId("waiting-row");
    expect(rows).toHaveLength(2);
    fireEvent.click(rows[0].querySelector("button")!); // Approve
    await waitFor(() => expect(api.decideApproval).toHaveBeenCalledWith(1, true));
    fireEvent.click(screen.getAllByRole("button", { name: "Decline" })[1]);
    await waitFor(() => expect(api.decideApproval).toHaveBeenCalledWith(2, false));
  });

  it("Records tab shows the table, totals per type, and filters by type and date", async () => {
    signIn({ permissions: ["approvals:decide"] });
    renderWithProviders(<RetailTopBar />);
    fireEvent.click(await screen.findByLabelText("Manager desk"));
    fireEvent.click(await screen.findByRole("tab", { name: "Records" }));
    expect(await screen.findByText("Sali steel 12mm")).toBeTruthy();
    expect(screen.getByText("Nimal")).toBeTruthy();
    expect(screen.getByTestId("desk-totals").textContent).toContain("Price change · 3 · Rs -450");

    fireEvent.click(screen.getByRole("button", { name: "Discount" }));
    await waitFor(() => expect(api.fetchDesk).toHaveBeenCalledWith(expect.objectContaining({ tab: "records", type: "discount_over_limit" })));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-11-01" } });
    await waitFor(() => expect(api.fetchDesk).toHaveBeenCalledWith(expect.objectContaining({ from: "2026-11-01" })));
  });

  it("To sort tab is an empty state until a later step", async () => {
    signIn({ permissions: ["approvals:decide"] });
    renderWithProviders(<RetailTopBar />);
    fireEvent.click(await screen.findByLabelText("Manager desk"));
    fireEvent.click(await screen.findByRole("tab", { name: "To sort" }));
    expect(await screen.findByText("Nothing to sort yet.")).toBeTruthy();
  });
});

describe("approval PIN section", () => {
  const fill = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

  it("renders only for approvers in a retail shop", () => {
    signIn({ permissions: [] });
    const { unmount } = renderWithProviders(<ApprovalPinSection />);
    expect(screen.queryByText("Approval PIN")).toBeNull();
    unmount();
    signIn({ retail: false, permissions: ["approvals:decide"] });
    renderWithProviders(<ApprovalPinSection />);
    expect(screen.queryByText("Approval PIN")).toBeNull();
  });

  it("rejects non-digits and mismatches, then saves with the current password", async () => {
    signIn({ permissions: ["approvals:decide"] });
    api.setApprovalPin.mockResolvedValue({});
    renderWithProviders(<ApprovalPinSection />);
    fill(/current password/i, "hunter2");
    fill("New PIN", "12ab34"); // letters are stripped as typed
    expect((screen.getByLabelText("New PIN") as HTMLInputElement).value).toBe("1234");
    fill("Confirm PIN", "9999");
    fireEvent.click(screen.getByRole("button", { name: "Save PIN" }));
    expect(await screen.findByText("The PINs do not match.")).toBeTruthy();
    expect(api.setApprovalPin).not.toHaveBeenCalled();
    fill("Confirm PIN", "1234");
    fireEvent.click(screen.getByRole("button", { name: "Save PIN" }));
    await waitFor(() => expect(api.setApprovalPin).toHaveBeenCalledWith({ current_password: "hunter2", pin: "1234" }));
    expect(await screen.findByText("PIN saved.")).toBeTruthy();
  });

  it("shows the server's message when the password is wrong", async () => {
    signIn({ permissions: ["approvals:decide"] });
    api.setApprovalPin.mockRejectedValue({ response: { data: { message: "Current password is incorrect" } } });
    renderWithProviders(<ApprovalPinSection />);
    fill(/current password/i, "bad");
    fill("New PIN", "1234");
    fill("Confirm PIN", "1234");
    fireEvent.click(screen.getByRole("button", { name: "Save PIN" }));
    expect(await screen.findByText("Current password is incorrect")).toBeTruthy();
  });
});
