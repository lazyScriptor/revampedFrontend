import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({ api: { get: vi.fn() } }));

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { pickPermissions, refreshPermissions } from "../refreshPermissions";

// What `GET /api/me` really answers (meController.getProfile), after api.ts unwraps axios' response.data.
const meReply = (permissions: string[]) => ({ status: "success", data: { profile: { user_id: 1, permissions } } });

describe("refreshPermissions", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { permissions: ["inventory_permission"] } as any, isAuthenticated: true } as any);
  });

  it("reads the list where /api/me puts it", () => {
    expect(pickPermissions(meReply(["activity:view"]))).toEqual(["activity:view"]);
    expect(pickPermissions({ status: "success", data: {} })).toBeNull();
  });

  it("adds a permission granted after sign-in (e.g. activity:view from Release 4)", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(meReply(["inventory_permission", "activity:view"]) as any);
    const list = await refreshPermissions();
    expect(list).toContain("activity:view");
    expect(useAuthStore.getState().user?.permissions).toContain("activity:view");
  });

  it("keeps the saved list when the server cannot be reached", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("offline"));
    expect(await refreshPermissions()).toBeNull();
    expect(useAuthStore.getState().user?.permissions).toEqual(["inventory_permission"]);
  });
});
