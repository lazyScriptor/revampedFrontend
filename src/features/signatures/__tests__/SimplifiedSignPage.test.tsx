import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import i18n from "@/i18n";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

const hooks = vi.hoisted(() => ({
  session: null as any,
  mutateAsync: null as any,
  isPending: false,
}));
vi.mock("../hooks/useSignatures", () => ({
  useSignatureSession: () => hooks.session,
  useSubmitSignature: () => ({ mutateAsync: hooks.mutateAsync, isPending: hooks.isPending }),
}));

import { SimplifiedSignPage } from "../components/SimplifiedSignPage";

const sessionData = (over: Record<string, unknown> = {}) => ({
  status: "PENDING",
  checkpoint: "EQUIPMENT_DISPATCHED",
  invoice: { invoice_id: 7, invoice_number: "INV-7", total_amount: 4500, customer_name: "Kasun Silva" },
  tenant: { business_display_name: "Shop", primary_color: "#d97706", secondary_color: "#111" },
  terms: { markdown: "Return it clean.", version: 2 },
  required_roles: ["CUSTOMER"],
  captured_roles: [],
  pending_roles: ["CUSTOMER"],
  operator_saved_signature: null,
  ...over,
});

const setViewport = (w: number, h: number) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: w });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: h });
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SimplifiedSignPage token="tok-1" />
    </QueryClientProvider>,
  );

beforeAll(() => {
  i18n.changeLanguage("en");
  HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AAAA";
  HTMLElement.prototype.setPointerCapture = () => {};
  (globalThis as any).ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  };
});

beforeEach(() => {
  navigate.mockReset();
  sessionStorage.clear();
  hooks.isPending = false;
  hooks.mutateAsync = vi.fn();
  hooks.session = { isLoading: false, error: null, data: sessionData(), refetch: vi.fn() };
  setViewport(390, 844);
});

const drawOnPad = () => {
  const canvas = document.querySelector("canvas")!;
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 50, clientY: 50 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 80, clientY: 90 });
  fireEvent.pointerUp(canvas, { pointerId: 1 });
};

describe("phone sign page", () => {
  it("one tap on Confirm signs and shows the done screen without waiting for a refresh", async () => {
    hooks.mutateAsync = vi.fn().mockResolvedValue({ status: "COMPLETED", all_captured: true, pending_roles: [] });
    renderPage();
    drawOnPad();
    fireEvent.click(screen.getByRole("button", { name: "Confirm signature" }));
    await waitFor(() => expect(screen.getByText("All signatures captured")).toBeTruthy());
    expect(hooks.mutateAsync).toHaveBeenCalledTimes(1);
    expect(hooks.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ role: "CUSTOMER", signatory_name: "Kasun Silva", image_data_url: "data:image/png;base64,AAAA" }),
    );
    // The session data still says PENDING: the page did not need it to move on.
    expect(hooks.session.refetch).not.toHaveBeenCalled();
  });

  it("asks for a drawing instead of sending an empty pad", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Confirm signature" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(hooks.mutateAsync).not.toHaveBeenCalled();
  });

  it("signs for the operator with their saved signature without any tap", async () => {
    hooks.session.data = sessionData({
      required_roles: ["CUSTOMER", "OPERATOR"],
      pending_roles: ["OPERATOR", "CUSTOMER"],
      operator_saved_signature: { operator_user_id: 3, operator_name: "Nimal", has_saved_signature: true },
    });
    hooks.mutateAsync = vi.fn().mockResolvedValue({ status: "PARTIAL", all_captured: false, pending_roles: ["CUSTOMER"] });
    renderPage();
    await waitFor(() =>
      expect(hooks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ role: "OPERATOR", use_stored_operator_signature: true })),
    );
    // Then it is the customer's turn.
    await waitFor(() => expect(screen.getByText(/Customer signature/)).toBeTruthy());
    expect(hooks.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("turns the pad sideways on an upright phone and fills the screen", () => {
    renderPage();
    const pad = screen.getByTestId("sign-pad");
    expect(pad.getAttribute("data-rotated")).toBe("true");
    expect(pad.style.width || getComputedStyle(pad).width).toBeTruthy();
  });

  it("uses the pad as-is when the phone is already sideways", () => {
    setViewport(844, 390);
    renderPage();
    expect(screen.getByTestId("sign-pad").getAttribute("data-rotated")).toBe("false");
    act(() => {
      setViewport(390, 844);
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.getByTestId("sign-pad").getAttribute("data-rotated")).toBe("true");
  });
});
