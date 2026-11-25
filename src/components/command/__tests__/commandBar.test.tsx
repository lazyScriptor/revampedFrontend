import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
vi.mock("@/features/retail/api/preferences.api", () => ({
  fetchUiPreferences: vi.fn(async () => ({})),
  putUiPreference: vi.fn(async () => ({})),
}));

import { CommandBarHost } from "../CommandBarHost";
import { registerCommand } from "../commandRegistry";
import { renderWithProviders, signIn } from "@/features/retail/__tests__/testUtils";

const ctrlK = () => fireEvent.keyDown(window, { key: "k", ctrlKey: true });

describe("command bar", () => {
  beforeEach(() => {
    navigate.mockClear();
    window.history.replaceState(null, "");
  });

  it("does nothing in a shop without retail", () => {
    signIn({ retail: false, permissions: ["inventory_permission"] });
    renderWithProviders(<CommandBarHost />);
    ctrlK();
    expect(screen.queryByPlaceholderText(/page or an invoice/i)).toBeNull();
  });

  it("opens with Ctrl+K and lists only the pages this user may open", async () => {
    signIn({ permissions: [] });
    renderWithProviders(<CommandBarHost />);
    ctrlK();
    expect(await screen.findByPlaceholderText(/page or an invoice/i)).toBeTruthy();
    // Dashboard has no permission rule; Invoicing needs inventory_permission
    expect(screen.getByRole("option", { name: /dashboard/i })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /^invoices/i })).toBeNull();
  });

  it("filters by what is typed and Enter goes to the highlighted page", async () => {
    signIn({ permissions: ["inventory_permission"] });
    renderWithProviders(<CommandBarHost />);
    ctrlK();
    const input = await screen.findByPlaceholderText(/page or an invoice/i);
    fireEvent.change(input, { target: { value: "customers" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/customers" }));
  });

  it("offers Find invoice for a number and opens it in Manage", async () => {
    signIn({ permissions: ["inventory_permission"] });
    renderWithProviders(<CommandBarHost />);
    ctrlK();
    const input = await screen.findByPlaceholderText(/page or an invoice/i);
    fireEvent.change(input, { target: { value: "INV-1934" } });
    const opt = await screen.findByRole("option", { name: /find invoice 1934/i });
    fireEvent.click(opt);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/invoices", search: { mode: "manage", invoiceId: 1934 } }));
  });

  it("arrow keys move the highlight", async () => {
    signIn({ permissions: ["inventory_permission"] });
    renderWithProviders(<CommandBarHost />);
    ctrlK();
    const input = await screen.findByPlaceholderText(/page or an invoice/i);
    const selected = () => screen.getAllByRole("option").findIndex((o) => o.getAttribute("aria-selected") === "true");
    expect(selected()).toBe(0);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(selected()).toBe(1);
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(selected()).toBe(0);
  });

  it("hides commands whose permission or feature the user lacks, and shows registered ones they have", async () => {
    registerCommand({ id: "t-secret", label: "common.save", permission: "never:have", perform: vi.fn() });
    const ok = vi.fn();
    registerCommand({ id: "t-ok", label: "common.cancel", perform: ok });
    signIn({ permissions: [] });
    renderWithProviders(<CommandBarHost />);
    ctrlK();
    await screen.findByPlaceholderText(/page or an invoice/i);
    expect(screen.queryByRole("option", { name: "Save" })).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: "Cancel" }));
    });
    await waitFor(() => expect(ok).toHaveBeenCalled());
  });
});
