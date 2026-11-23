export interface PerfMachine {
  equipment_id: number;
  name: string;
  serial: string | null;
  category_id: number | null;
  warehouse: string | null;
  owned: number;
  revenue: number;
  rentals: number;
  daysRented: number;
  utilizationPct: number;
  unitsOut: number;
  defects: number;
  purchaseCost: number;
  lifetimeRevenue: number;
  paybackPct: number | null;
  idle: boolean;
}

export interface PerfTotals {
  machines: number;
  units: number;
  revenue: number;
  rentals: number;
  idleMachines: number;
  unitsOut: number;
  defects: number;
  purchaseCost: number;
  lifetimeRevenue: number;
  utilizationPct: number;
  paybackPct: number | null;
  daysRented?: number;
  repairCost?: number;
}

export interface PerfGroup extends PerfTotals {
  category_id: number | null;
  name: string;
  machinesList?: PerfMachine[];
}

export interface PerfFamily extends PerfGroup {
  types: PerfGroup[];
}

export interface EquipmentPerformance {
  dateRange: { startDate: string; endDate: string; days: number };
  totals: PerfTotals;
  families: PerfFamily[];
  topEarners: PerfMachine[];
  idleMachines: PerfMachine[];
}

export const lkr = (n: number) =>
  `LKR ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
