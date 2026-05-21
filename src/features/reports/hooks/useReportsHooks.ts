import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Shared filter shape — every report endpoint accepts startDate + endDate.
// Some accept additional params (search, status, page).
export interface ReportRange {
  startDate?: string;
  endDate?: string;
}

const unwrap = (res: any) => res?.data ?? res;

// ─── Customer reports ──────────────────────────────────────────────────────
export const useAllCustomersReport = (range: ReportRange & { search?: string }) =>
  useQuery({
    queryKey: ["report-customers-all", range],
    queryFn: async () => unwrap(await api.get("/reports/customers/all", { params: range })),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const useOutstandingBalancesReport = (range: ReportRange & { search?: string }) =>
  useQuery({
    queryKey: ["report-customers-outstanding", range],
    queryFn: async () => unwrap(await api.get("/reports/customers/outstanding", { params: range })),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

// ─── Equipment reports ─────────────────────────────────────────────────────
export const useEquipmentUtilization = (range: ReportRange) =>
  useQuery({
    queryKey: ["report-equipment-utilization", range],
    queryFn: async () => unwrap(await api.get("/reports/equipment-utilization", { params: range })),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const useEquipmentMaintenanceByUnit = (range: ReportRange) =>
  useQuery({
    queryKey: ["report-equipment-maintenance", range],
    queryFn: async () => unwrap(await api.get("/reports/equipment/maintenance-by-unit", { params: range })),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

// ─── Invoice reports ───────────────────────────────────────────────────────
export const useInvoiceAging = () =>
  useQuery({
    queryKey: ["report-invoice-aging"],
    queryFn: async () => unwrap(await api.get("/reports/invoices/aging")),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const useRentalHistoryReport = (
  range: ReportRange & { status?: string; page?: number; pageSize?: number },
) =>
  useQuery({
    queryKey: ["report-invoice-history", range],
    queryFn: async () => unwrap(await api.get("/reports/invoices/history", { params: range })),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

// ─── Financial reports (reuse existing endpoints) ──────────────────────────
export const useProfitLossReport = (range: ReportRange) =>
  useQuery({
    queryKey: ["report-pnl", range],
    queryFn: async () => unwrap(await api.get("/reports/profit-loss", { params: range })),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const useCashFlowReport = (date: string) =>
  useQuery({
    queryKey: ["report-cashflow", date],
    queryFn: async () => unwrap(await api.get("/reports/cash-flow", { params: { date } })),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
