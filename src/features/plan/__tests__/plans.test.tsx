import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/useAuthStore";
import { FeatureGate, planAllows } from "../usePlan";
import {
  countOverrides, diffPlans, effectiveFeatures, groupState, limitFromText, priceFromText, setFeature, setGroup, setLimitOverride, setOverride,
  type PlansData,
} from "@/features/super-admin/lib/planEditing";

const groups = [
  { key: "accounting", features: [{ key: "accounting.invoices" }, { key: "accounting.journal" }] },
  { key: "operations", features: [{ key: "maintenance" }, { key: "workforce", requires: "maintenance" }] },
];
const plan = (features: Record<string, boolean>, price: number | null = 5900) => ({ price, limits: { max_users: 3 as number | null }, features });
const allOff = { "accounting.invoices": false, "accounting.journal": false, maintenance: false, workforce: false };
const plansData = (): PlansData => ({
  tiers: ["Basic", "Pro", "Enterprise"],
  groups,
  limit_keys: ["max_users"],
  version: 4,
  updated_at: null,
  plans: {
    Basic: plan({ ...allOff, "accounting.invoices": true }),
    Pro: plan({ ...allOff, "accounting.invoices": true, "accounting.journal": true, maintenance: true, workforce: true }, 9900),
    Enterprise: plan({ ...allOff, "accounting.invoices": true, "accounting.journal": true, maintenance: true, workforce: true }, null),
  },
});

const saveMutate = vi.hoisted(() => vi.fn());
vi.mock("@/features/super-admin/hooks/useSuperAdminHooks", () => ({
  usePlans: () => ({ data: plansDataRef.current, isLoading: false, isError: false, refetch: vi.fn() }),
  useTenants: () => ({ data: [{ tier: "Basic", display_name: "Galle fort" }, { tier: "Enterprise", display_name: "T.A Enterprises" }] }),
  useSavePlans: () => ({ mutate: saveMutate, isPending: false, isError: false, reset: vi.fn() }),
}));
const plansDataRef = vi.hoisted(() => ({ current: null as any }));

import { PlanEditor } from "@/features/super-admin/components/PlanEditor";
import { useDashboardMoney } from "@/features/accounting/utils/currency";
import { HandoverLineCard } from "@/features/invoices/components/HandoverLineCard";

const openEditor = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PlanEditor />
    </QueryClientProvider>,
  );
const box = (name: string) => screen.getByRole("checkbox", { name }) as HTMLInputElement;

beforeEach(() => {
  plansDataRef.current = plansData();
  saveMutate.mockReset();
  useAuthStore.setState({ user: null } as any);
});

describe("plan checks in the app", () => {
  it("an unknown plan hides nothing; a known one hides what it leaves out", () => {
    expect(planAllows(null, "maintenance")).toBe(true);
    const p = { tier: "Basic", features: { maintenance: false, "data.imports": true }, limits: {} };
    expect(planAllows(p, "maintenance")).toBe(false);
    expect(planAllows(p, ["maintenance", "data.imports"])).toBe(true);
    expect(planAllows(p, "added.later")).toBe(true);
  });
  it("a locked screen says so and doesn't render", () => {
    useAuthStore.setState({ user: { plan: { tier: "Basic", features: { maintenance: false }, limits: {} } } } as any);
    render(<FeatureGate feature="maintenance"><div>repairs</div></FeatureGate>);
    expect(screen.queryByText("repairs")).toBeNull();
    expect(screen.getByText(/Not included in your plan/)).toBeTruthy();
  });
  it("the same screen shows when the plan includes it", () => {
    useAuthStore.setState({ user: { plan: { tier: "Pro", features: { maintenance: true }, limits: {} } } } as any);
    render(<FeatureGate feature="maintenance"><div>repairs</div></FeatureGate>);
    expect(screen.getByText("repairs")).toBeTruthy();
  });
});

describe("dashboard money", () => {
  const Amount = ({ code }: { code?: string }) => {
    useAuthStore.setState({ user: { configData: code ? { currency_code: code } : {} } } as any);
    const { full, compact } = useDashboardMoney();
    return <div>{full(45710.4)} | {compact(12500)}</div>;
  };
  it("shows Rs. by default, never a hard-coded dollar", () => {
    render(<Amount />);
    expect(screen.getByText("Rs. 45,710 | Rs. 12.5K")).toBeTruthy();
  });
  it("follows the shop's own currency", () => {
    render(<Amount code="USD" />);
    expect(screen.getByText("$ 45,710 | $ 12.5K")).toBeTruthy();
  });
});

describe("returns follow the plan", () => {
  const line = { line_id: 1, equipment_name: "Drill - 1", borrow_qty: 2, remaining_qty: 2, good_qty: 2, defective_qty: 0, track_overdue: false, _orig_tracked: false, locked_extra_rate: 0 };
  const card = () => render(<HandoverLineCard line={line} daysLate={0} lateFee={0} onChange={vi.fn()} />);
  it("without Maintenance a machine can't be marked damaged, but can still come back", () => {
    useAuthStore.setState({ user: { plan: { tier: "Basic", features: { maintenance: false }, limits: {} } } } as any);
    card();
    expect(screen.queryByText("Damaged")).toBeNull();
    expect(screen.getByText(/Drill - 1/)).toBeTruthy();
  });
  it("with Maintenance the damaged field is there", () => {
    useAuthStore.setState({ user: { plan: { tier: "Pro", features: { maintenance: true }, limits: {} } } } as any);
    card();
    expect(screen.getByText("Damaged")).toBeTruthy();
  });
});

describe("plan editing rules", () => {
  it("Workforce brings Maintenance on; Maintenance off takes Workforce with it", () => {
    const { plans } = plansData();
    const on = setFeature(plans, "Basic", "workforce", true, groups);
    expect(on.Basic.features).toMatchObject({ workforce: true, maintenance: true });
    const off = setFeature(on, "Basic", "maintenance", false, groups);
    expect(off.Basic.features).toMatchObject({ workforce: false, maintenance: false });
    expect(plans.Basic.features.maintenance).toBe(false); // the original isn't touched
  });
  it("a group ticks and unticks everything in it", () => {
    const { plans } = plansData();
    expect(groupState(plans.Basic, groups[0])).toMatchObject({ on: 1, all: false, none: false });
    expect(groupState(setGroup(plans, "Basic", groups[0], true, groups).Basic, groups[0]).all).toBe(true);
    expect(groupState(setGroup(plans, "Basic", groups[0], false, groups).Basic, groups[0]).none).toBe(true);
  });
  it("reads limits and prices strictly", () => {
    expect(limitFromText("")).toBeNull();
    expect(limitFromText("200")).toBe(200);
    for (const bad of ["0", "-1", "1.5", "abc"]) expect(limitFromText(bad)).toBeUndefined();
    expect(priceFromText("5900.50")).toBe(5900.5);
    expect(priceFromText("")).toBeNull();
    expect(priceFromText("5,900")).toBeUndefined();
  });
  it("lists every change", () => {
    const d = plansData();
    const after = setFeature(d.plans, "Basic", "accounting.journal", true, groups);
    after.Basic = { ...after.Basic, price: 6500, limits: { max_users: null } };
    expect(diffPlans(d.plans, after, d)).toEqual([
      { kind: "price", tier: "Basic", from: 5900, to: 6500 },
      { kind: "limit", tier: "Basic", key: "max_users", from: 3, to: null },
      { kind: "feature", tier: "Basic", key: "accounting.journal", on: true },
    ]);
  });
  it("shop exceptions: set, clear and apply, including what a feature needs", () => {
    let o = setOverride(undefined, "maintenance", true);
    o = setLimitOverride(o, "max_users", 10);
    expect(countOverrides(o)).toBe(2);
    expect(effectiveFeatures(plansData().plans.Basic, o, groups).maintenance).toBe(true);
    const off = setOverride(undefined, "maintenance", false);
    expect(effectiveFeatures(plansData().plans.Pro, off, groups).workforce).toBe(false);
    expect(countOverrides(setLimitOverride(setOverride(o, "maintenance", undefined), "max_users", undefined))).toBe(0);
    expect(setLimitOverride(undefined, "max_users", null).limits).toEqual({ max_users: null });
  });
});

describe("plan editor screen", () => {
  it("Save stays off until something changes, and Discard puts it back", () => {
    openEditor();
    const save = screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(box("Journal: Basic"));
    expect(save.disabled).toBe(false);
    expect(screen.getByText("1 unsaved change")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(box("Journal: Basic").checked).toBe(false);
    expect(save.disabled).toBe(true);
  });
  it("Accounting can be ticked item by item, and the group shows it", () => {
    openEditor();
    expect(box("Invoices: Basic").checked).toBe(true);
    fireEvent.click(box("Invoices: Basic"));
    expect(box("Invoices: Basic").checked).toBe(false);
    expect(box("Accounting: Basic").checked).toBe(false);
    fireEvent.click(box("Accounting: Basic"));
    expect(box("Invoices: Basic").checked && box("Journal: Basic").checked).toBe(true);
  });
  it("ticking Workforce ticks Maintenance on screen", () => {
    openEditor();
    fireEvent.click(box("Workforce: Basic"));
    expect(box("Maintenance and repairs: Basic").checked).toBe(true);
    fireEvent.click(box("Maintenance and repairs: Basic"));
    expect(box("Workforce: Basic").checked).toBe(false);
  });
  it("a bad number blocks saving until fixed, and blank means unlimited", () => {
    openEditor();
    const save = screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement;
    const staff = screen.getByRole("textbox", { name: "Active staff: Basic" });
    fireEvent.change(staff, { target: { value: "abc" } });
    expect(save.disabled).toBe(true);
    expect(screen.getByText(/Enter a whole number/)).toBeTruthy();
    fireEvent.change(staff, { target: { value: "" } });
    expect(save.disabled).toBe(false);
  });
  it("Save asks first, names the shops affected, and sends the version it started from", async () => {
    openEditor();
    fireEvent.click(box("Journal: Basic"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    const dialog = await screen.findByRole("dialog");
    expect(saveMutate).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/\+ Journal/)).toBeTruthy();
    expect(within(dialog).getByText(/Galle fort/)).toBeTruthy();
    expect(within(dialog).queryByText(/T\.A Enterprises/)).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save and apply" }));
    await waitFor(() => expect(saveMutate).toHaveBeenCalled());
    const [body] = saveMutate.mock.calls[0];
    expect(body.version).toBe(4);
    expect(body.plans.Basic.features["accounting.journal"]).toBe(true);
  });
  it("a refresh while editing doesn't throw away the edits", () => {
    const view = openEditor();
    fireEvent.click(box("Journal: Basic"));
    plansDataRef.current = { ...plansData(), version: 5 };
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <PlanEditor />
      </QueryClientProvider>,
    );
    expect(box("Journal: Basic").checked).toBe(true);
  });
});
