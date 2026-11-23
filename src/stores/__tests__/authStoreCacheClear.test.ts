import { describe, it, expect, vi, beforeEach } from "vitest";

const clear = vi.fn(async () => {});
vi.mock("@/lib/queryPersist", async (orig) => ({
  ...(await orig<typeof import("@/lib/queryPersist")>()),
  clearPersistedQueryCache: () => clear(),
}));

import { useAuthStore } from "../useAuthStore";

const jwt = (tenantDbName: string) => `h.${btoa(JSON.stringify({ tenantDbName }))}.s`;
const user = (id: number) => ({ id, email: "a@b.c", username: "u", roles: [], permissions: [] });

describe("auth store clears the persisted query cache", () => {
  beforeEach(() => {
    clear.mockClear();
    useAuthStore.setState({ isAuthenticated: false, user: null, token: null });
  });

  it("not on the first sign-in", () => {
    useAuthStore.getState().setAuth(user(1), jwt("a"));
    expect(clear).not.toHaveBeenCalled();
  });

  it("not when the same user's session is refreshed", () => {
    useAuthStore.getState().setAuth(user(1), jwt("a"));
    useAuthStore.getState().setAuth(user(1), jwt("a"));
    expect(clear).not.toHaveBeenCalled();
  });

  it("when a different shop signs in", () => {
    useAuthStore.getState().setAuth(user(1), jwt("a"));
    useAuthStore.getState().setAuth(user(1), jwt("b"));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("when a different user signs in", () => {
    useAuthStore.getState().setAuth(user(1), jwt("a"));
    useAuthStore.getState().setAuth(user(2), jwt("a"));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("on logout", () => {
    const loc = window.location;
    Object.defineProperty(window, "location", { configurable: true, value: { href: "/" } });
    globalThis.fetch = vi.fn(async () => ({})) as any;
    useAuthStore.getState().setAuth(user(1), jwt("a"));
    useAuthStore.getState().logout();
    expect(clear).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toBeNull();
    Object.defineProperty(window, "location", { configurable: true, value: loc });
  });
});
