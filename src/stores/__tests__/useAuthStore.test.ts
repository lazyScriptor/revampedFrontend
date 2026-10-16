import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "../useAuthStore";

// Mock i18n helper to prevent network calls during testing
vi.mock("@/i18n", () => ({
  syncLanguageFromAuth: vi.fn().mockResolvedValue(undefined),
}));

describe("useAuthStore Zustand Store Tests", () => {
  beforeEach(() => {
    // Reset state before each test
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  });

  it("initializes with unauthenticated default state", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it("sets authentication state and user profile accurately", () => {
    const mockUser = {
      id: 1,
      email: "cashier@rental.com",
      username: "cashier1",
      roles: ["Cashier"],
      permissions: ["invoice:create", "invoice:view", "customer:view"],
    };

    useAuthStore.getState().setAuth(mockUser, "mock-jwt-token-xyz");

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe("mock-jwt-token-xyz");
  });

  describe("hasPermission & hasAnyPermission Checks", () => {
    it("returns true for granted granular permissions", () => {
      useAuthStore.getState().setAuth({
        id: 2,
        email: "staff@rental.com",
        username: "staff2",
        roles: ["Staff"],
        permissions: ["equipment:view", "invoice:view"],
      });

      expect(useAuthStore.getState().hasPermission("equipment:view")).toBe(true);
      expect(useAuthStore.getState().hasPermission("invoice:view")).toBe(true);
      expect(useAuthStore.getState().hasPermission("accounting:view")).toBe(false);
    });

    it("evaluates hasAnyPermission correctly", () => {
      useAuthStore.getState().setAuth({
        id: 3,
        email: "tech@rental.com",
        username: "tech3",
        roles: ["Technician"],
        permissions: ["defect:view", "defect:edit"],
      });

      expect(
        useAuthStore.getState().hasAnyPermission("invoice:create", "defect:view")
      ).toBe(true);
      expect(
        useAuthStore.getState().hasAnyPermission("admin:manage", "billing:view")
      ).toBe(false);
    });

    it("grants all permissions unconditionally to Admin / Owner roles", () => {
      useAuthStore.getState().setAuth({
        id: 4,
        email: "owner@rental.com",
        username: "owner",
        roles: ["Owner"],
        permissions: [], // Empty permissions list
      });

      // Role bypass check
      expect(useAuthStore.getState().hasPermission("any:super:secret:action")).toBe(true);
      expect(useAuthStore.getState().hasPermission("accounting:delete_all")).toBe(true);
    });
  });

  describe("updateUserPartial", () => {
    it("updates user fields without wiping other properties", () => {
      useAuthStore.getState().setAuth({
        id: 1,
        email: "user@rental.com",
        username: "user1",
        first_name: "Kamal",
        roles: ["Cashier"],
        permissions: ["invoice:view"],
      });

      useAuthStore.getState().updateUserPartial({ first_name: "Nimal", last_name: "Silva" });

      const updatedUser = useAuthStore.getState().user;
      expect(updatedUser?.first_name).toBe("Nimal");
      expect(updatedUser?.last_name).toBe("Silva");
      expect(updatedUser?.username).toBe("user1"); // Kept original
      expect(updatedUser?.roles).toEqual(["Cashier"]);
    });
  });
});
