import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CategoryPerformanceReport from "../CategoryPerformanceReport";

const machine = (id: number, name: string, revenue: number) => ({
  equipment_id: id, name, serial: null, category_id: 2, warehouse: null, owned: 1, revenue, rentals: 2,
  daysRented: 4, utilizationPct: 10, unitsOut: 0, defects: 0, purchaseCost: 0, lifetimeRevenue: revenue, paybackPct: null, idle: false,
});
const group = (over: object) => ({
  category_id: 1, name: "Grinder", machines: 2, units: 2, revenue: 300, rentals: 4, idleMachines: 0, unitsOut: 0, defects: 0,
  purchaseCost: 0, lifetimeRevenue: 300, utilizationPct: 10, paybackPct: null, ...over,
});

vi.mock("../../hooks/useReportsHooks", () => ({
  useEquipmentPerformance: () => ({
    isLoading: false,
    data: {
      dateRange: { startDate: "2026-11-01", endDate: "2026-11-30", days: 30 },
      totals: { ...group({}), repairCost: 0 },
      families: [{ ...group({}), types: [{ ...group({ category_id: 2, name: "4 inch" }), machinesList: [machine(1, "Grinder ( 4 inch ) -4", 200), machine(2, "Grinder ( 4 inch ) -6", 100)] }], machinesList: [] }],
      topEarners: [], idleMachines: [],
    },
  }),
}));
vi.mock("@/features/warehouses/hooks/useWarehouseOptions", () => ({ useWarehouseOptions: () => ({ data: [] }) }));
vi.mock("@/features/equipment/hooks/useCategoryHooks", () => ({ useCategoryOptions: () => ({ data: [] }) }));

describe("CategoryPerformanceReport", () => {
  it("shows the family total and drills down to sizes and machines", () => {
    render(<CategoryPerformanceReport />);
    expect(screen.getByText("Grinder")).toBeTruthy();
    expect(screen.queryByText("4 inch")).toBeNull();
    fireEvent.click(screen.getByText("Grinder"));
    fireEvent.click(screen.getByText("4 inch"));
    expect(screen.getByText("Grinder ( 4 inch ) -4")).toBeTruthy();
  });
});
