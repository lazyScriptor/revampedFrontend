import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

const hooks = vi.hoisted(() => ({
  status: { data: { paired: true } } as any,
  pending: { data: { pending: [] as any[] } } as any,
  session: { isLoading: false, data: undefined as any, error: null } as any,
  pendingCalls: [] as any[],
}));
vi.mock("../hooks/useSignatures", () => ({
  useDeviceStatus: () => hooks.status,
  useDevicePendingSignatures: (...args: any[]) => {
    hooks.pendingCalls.push(args);
    return hooks.pending;
  },
  useSignatureSession: () => hooks.session,
  useSubmitSignature: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const deviceId = vi.hoisted(() => ({ value: "gg-phone-1234" as string | null }));
vi.mock("../lib/deviceId", () => ({ getDeviceId: () => deviceId.value }));

import { PairedSignatureWatcher } from "../components/PairedSignatureWatcher";
import { SimplifiedSignPage } from "../components/SimplifiedSignPage";

beforeEach(() => {
  navigate.mockReset();
  hooks.pendingCalls = [];
  hooks.status = { data: { paired: true } };
  hooks.pending = { data: { pending: [] } };
  deviceId.value = "gg-phone-1234";
});
afterEach(() => vi.useRealTimers());

describe("PairedSignatureWatcher", () => {
  it("opens the sign page when the counter sends a request", () => {
    const { rerender } = render(<PairedSignatureWatcher />);
    expect(navigate).not.toHaveBeenCalled();

    hooks.pending = { data: { pending: [{ token: "tok-1" }] } };
    rerender(<PairedSignatureWatcher />);
    expect(navigate).toHaveBeenCalledWith({ to: "/sign-paired/$token", params: { token: "tok-1" } });
  });

  it("does not reopen a request the user already left", () => {
    hooks.pending = { data: { pending: [{ token: "tok-1" }] } };
    const { rerender } = render(<PairedSignatureWatcher />);
    hooks.pending = { data: { pending: [{ token: "tok-1" }] } };
    rerender(<PairedSignatureWatcher />);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("does not poll for requests on a device that is not paired", () => {
    hooks.status = { data: { paired: false } };
    render(<PairedSignatureWatcher />);
    expect(hooks.pendingCalls.at(-1)?.[1]).toMatchObject({ enabled: false });
  });
});

describe("SimplifiedSignPage", () => {
  it("goes back to the waiting screen by itself once everything is signed", () => {
    vi.useFakeTimers();
    hooks.session = { isLoading: false, error: null, data: { status: "COMPLETED", pending_roles: [] } };
    render(<SimplifiedSignPage token="tok-1" />);
    expect(screen.getByText(/3 seconds/)).toBeTruthy();

    act(() => vi.advanceTimersByTime(3000));
    expect(navigate).toHaveBeenCalledWith({ to: "/device", replace: true });
  });

  it("points the home-screen manifest at the device app while open", () => {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/manifest.json";
    document.head.appendChild(link);
    hooks.session = { isLoading: true, error: null, data: undefined };

    const { unmount } = render(<SimplifiedSignPage token="tok-1" />);
    expect(link.getAttribute("href")).toBe("/manifest-device.json");
    unmount();
    expect(link.getAttribute("href")).toBe("/manifest.json");
    link.remove();
  });
});
