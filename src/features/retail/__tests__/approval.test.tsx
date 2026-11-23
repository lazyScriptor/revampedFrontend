import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";

const api = {
  fetchApprovers: vi.fn(),
  approveHere: vi.fn(),
  requestApproval: vi.fn(),
  fetchRetailSettings: vi.fn(),
};
vi.mock("../api/retail.api", async (orig) => ({
  ...(await orig<typeof import("../api/retail.api")>()),
  fetchApprovers: (...a: any[]) => api.fetchApprovers(...a),
  approveHere: (...a: any[]) => api.approveHere(...a),
  requestApproval: (...a: any[]) => api.requestApproval(...a),
  fetchRetailSettings: (...a: any[]) => api.fetchRetailSettings(...a),
}));

import { makeFakeSocket, renderWithProviders, signIn } from "./testUtils";
const socket = makeFakeSocket();
vi.mock("@/lib/socket", () => ({ connectSocket: vi.fn(), getSocket: () => socket }));

import { useApproval } from "../approval/useApproval";
import { REMOTE_WAIT_MS } from "../approval/ApprovalOverlay";
import type { ApprovalGrant } from "../api/types";

let result: ApprovalGrant | null | "pending" = "pending";
function Harness() {
  const { request } = useApproval();
  return (
    <button
      onClick={async () => {
        result = "pending";
        result = await request({ type: "price_change", summary: "Price 1,250 → 1,100 (−12%)", context: { item: 7 } });
      }}
    >
      ask
    </button>
  );
}

const MANAGERS = [
  { id: 1, display_name: "Me Myself" }, // the signed-in cashier: must not be offered
  { id: 2, display_name: "Nimal" },
  { id: 3, display_name: "Kamala" },
];

const open = async () => {
  fireEvent.click(screen.getByText("ask"));
  await screen.findByText("Manager approval");
};
const pickManager = async (name: string) => fireEvent.click(await screen.findByRole("button", { name: new RegExp(name) }));
const tapPin = (digits: string) => digits.split("").forEach((d) => fireEvent.click(screen.getByRole("button", { name: d })));
const approveBtn = () => screen.getByRole("button", { name: /^approve$/i });

describe("manager approval overlay", () => {
  beforeEach(() => {
    Object.values(api).forEach((m) => m.mockReset());
    api.fetchApprovers.mockResolvedValue(MANAGERS);
    api.fetchRetailSettings.mockResolvedValue({ approvalMethod: "either", askManagerRemote: true, approvalGrantMinutes: 0, negativeStock: "warn", discountLimitPct: 10 });
    window.history.replaceState(null, "");
    signIn({ id: 1, permissions: [] });
    result = "pending";
  });

  it("shows the one-line summary and the managers, but not the requester", async () => {
    renderWithProviders(<Harness />);
    await open();
    expect(screen.getByTestId("approval-summary").textContent).toContain("1,250");
    expect(await screen.findByRole("button", { name: /Nimal/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Kamala/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Me Myself/ })).toBeNull();
  });

  it("approves with a PIN and hands back the one-time token", async () => {
    api.approveHere.mockResolvedValue({ approval_token: "tok-1", exception_id: 9 });
    renderWithProviders(<Harness />);
    await open();
    await pickManager("Nimal");
    expect((approveBtn() as HTMLButtonElement).disabled).toBe(true); // PIN too short
    tapPin("1234");
    expect((approveBtn() as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(approveBtn());
    await waitFor(() => expect(result).toEqual({ approval_token: "tok-1", exception_id: 9 }));
    expect(api.approveHere).toHaveBeenCalledWith(
      expect.objectContaining({ type: "price_change", approver_user_id: 2, pin: "1234", context: { item: 7 }, summary: expect.any(String) }),
    );
    await waitFor(() => expect(screen.queryByText("Manager approval")).toBeNull());
  });

  it("Enter confirms once the PIN is long enough", async () => {
    api.approveHere.mockResolvedValue({ approval_token: "t", exception_id: 1 });
    renderWithProviders(<Harness />);
    await open();
    await pickManager("Kamala");
    tapPin("4321");
    fireEvent.keyDown(screen.getByRole("group", { name: /pin/i }), { key: "Enter" });
    await waitFor(() => expect(api.approveHere).toHaveBeenCalledTimes(1));
  });

  it("accepts digits from the physical keyboard and ignores a 7th digit", async () => {
    renderWithProviders(<Harness />);
    await open();
    await pickManager("Nimal");
    const pad = screen.getByRole("group", { name: /pin/i });
    "1234567".split("").forEach((d) => fireEvent.keyDown(pad, { key: d }));
    expect(screen.getByTestId("pin-dots").children.length).toBe(6);
  });

  it("shows a wrong-PIN message and clears the PIN", async () => {
    api.approveHere.mockRejectedValue({ response: { status: 401, data: { message: "Incorrect PIN" } } });
    renderWithProviders(<Harness />);
    await open();
    await pickManager("Nimal");
    tapPin("0000");
    fireEvent.click(approveBtn());
    expect(await screen.findByText("Wrong PIN.")).toBeTruthy();
    expect(result).toBe("pending");
  });

  it("shows the lockout and stops accepting that manager's PIN", async () => {
    api.approveHere.mockRejectedValue({ response: { status: 423, data: { message: "PIN locked" } } });
    renderWithProviders(<Harness />);
    await open();
    await pickManager("Nimal");
    tapPin("0000");
    fireEvent.click(approveBtn());
    expect(await screen.findByText(/PIN locked for about 10 min/, {}, { timeout: 4000 })).toBeTruthy();
    tapPin("1234");
    expect((approveBtn() as HTMLButtonElement).disabled).toBe(true);
    // another manager still works
    await pickManager("Kamala");
    expect(screen.queryByText(/PIN locked for about/)).toBeNull();
  });

  it("resolves null when the overlay is closed without approving", async () => {
    renderWithProviders(<Harness />);
    await open();
    fireEvent.click(screen.getByLabelText("Close"));
    await waitFor(() => expect(result).toBeNull());
  });

  it("uses a password field when the shop allows passwords only", async () => {
    api.fetchRetailSettings.mockResolvedValue({ approvalMethod: "password", askManagerRemote: false, approvalGrantMinutes: 0, negativeStock: "warn", discountLimitPct: 10 });
    api.approveHere.mockResolvedValue({ approval_token: "tp", exception_id: 2 });
    renderWithProviders(<Harness />);
    await open();
    await pickManager("Nimal");
    const field = await screen.findByLabelText("Password");
    fireEvent.change(field, { target: { value: "secret" } });
    fireEvent.click(approveBtn());
    await waitFor(() => expect(result).toEqual({ approval_token: "tp", exception_id: 2 }));
    expect(api.approveHere).toHaveBeenCalledWith(expect.objectContaining({ password: "secret" }));
    expect(api.approveHere.mock.calls[0][0].pin).toBeUndefined();
    expect(screen.queryByRole("button", { name: /ask manager/i })).toBeNull(); // askManagerRemote false
  });

  it("returns null straight away in a shop without retail", async () => {
    signIn({ retail: false });
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByText("ask"));
    await waitFor(() => expect(result).toBeNull());
    expect(screen.queryByText("Manager approval")).toBeNull();
  });

  describe("Ask manager (remote)", () => {
    const ask = async () => {
      api.requestApproval.mockResolvedValue({ exception_id: 55 });
      renderWithProviders(<Harness />);
      await open();
      fireEvent.click(await screen.findByRole("button", { name: /ask manager/i }));
      await screen.findByText("Waiting for approval…");
    };

    it("waits, then resolves with the token from the approval:decided event", async () => {
      await ask();
      expect(api.requestApproval).toHaveBeenCalledWith(expect.objectContaining({ type: "price_change", summary: expect.any(String) }));
      act(() => socket.emit("approval:decided", { exception_id: 999, approved: true, approval_token: "other" })); // someone else's
      expect(result).toBe("pending");
      act(() => socket.emit("approval:decided", { exception_id: 55, approved: true, approval_token: "remote-tok" }));
      await waitFor(() => expect(result).toEqual({ approval_token: "remote-tok", exception_id: 55 }));
    });

    it("shows a declined message and lets the cashier try again", async () => {
      await ask();
      act(() => socket.emit("approval:decided", { exception_id: 55, approved: false }));
      expect(await screen.findByText("The manager declined this.")).toBeTruthy();
      expect(screen.getByRole("button", { name: /ask manager/i })).toBeTruthy();
      expect(result).toBe("pending");
    });

    it("cancel stops waiting and stops listening", async () => {
      await ask();
      expect(socket.count("approval:decided")).toBe(1);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(socket.count("approval:decided")).toBe(0));
      act(() => socket.emit("approval:decided", { exception_id: 55, approved: true, approval_token: "late" }));
      expect(result).toBe("pending");
    });

    it("gives up after 5 minutes", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        await ask();
        await act(async () => {
          vi.advanceTimersByTime(REMOTE_WAIT_MS + 1000);
        });
        expect(await screen.findByText("No answer in 5 minutes.")).toBeTruthy();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
