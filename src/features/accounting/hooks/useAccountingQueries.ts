import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ============================================================================
// ACCOUNTING INVOICES
// ============================================================================
export const useAccountingInvoices = (params: Record<string, string>) => {
  return useQuery({
    queryKey: ["accounting-invoices", params],
    queryFn: async () => {
      const response: any = await api.get("/accounting/invoices", { params });
      return response?.data || response;
    },
    staleTime: 1000 * 60,
  });
};

// ============================================================================
// ACCOUNTING PAYMENTS
// ============================================================================
export const useAccountingPayments = (params: Record<string, string>) => {
  return useQuery({
    queryKey: ["accounting-payments", params],
    queryFn: async () => {
      const response: any = await api.get("/accounting/payments", { params });
      return response?.data || response;
    },
    staleTime: 1000 * 60,
  });
};

// ============================================================================
// ACCOUNTING EXPENSES
// ============================================================================
export const useAccountingExpenses = (params: Record<string, string>) => {
  return useQuery({
    queryKey: ["accounting-expenses", params],
    queryFn: async () => {
      const response: any = await api.get("/accounting/expenses", { params });
      return response?.data || response;
    },
    staleTime: 1000 * 60,
  });
};

// ============================================================================
// TRANSACTION JOURNAL
// ============================================================================
export const useTransactionJournal = (params: Record<string, string>) => {
  return useQuery({
    queryKey: ["accounting-journal", params],
    queryFn: async () => {
      const response: any = await api.get("/accounting/journal", { params });
      return response?.data || response;
    },
    staleTime: 1000 * 60,
  });
};
