import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";

const unwrap = (res: any) => res?.data ?? res;

export const INVOICE_DELETE_REASONS = [
  "Created by mistake",
  "Customer cancelled",
  "Duplicate invoice",
  "Wrong customer or items",
  "Test entry",
  "Other",
] as const;
export type InvoiceDeleteReason = (typeof INVOICE_DELETE_REASONS)[number];

export interface DeletedInvoiceRow {
  invoice_id: number;
  issued_date: string;
  total_amount: number;
  status: string;
  customer: { first_name?: string; last_name?: string; company_name?: string; customer_type?: string; phone_number?: string } | null;
  deleted_at: string;
  deleted_by_name: string | null;
  deleted_by_role: string | null;
  delete_reason: string | null;
  delete_note: string | null;
  delete_flagged: boolean;
  voided_amount: number;
}

export interface DeletedInvoicesResponse {
  total: number;
  page: number;
  summary: { totalDeleted: number; flaggedCount: number };
  invoices: DeletedInvoiceRow[];
}

export const useDeletedInvoices = (params: { page?: number; limit?: number; flagged?: boolean; search?: string }) =>
  useQuery<DeletedInvoicesResponse>({
    queryKey: ["deleted-invoices", params],
    queryFn: async () => unwrap(await api.get("/invoices/deleted", { params })),
    placeholderData: keepPreviousData,
    retry: false,
  });

// A delete/restore touches stock, balances, revenue and every report, so refresh everything.
const useRefreshAll = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
};

export const useDeleteInvoice = () => {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: async (p: { id: number; reason: InvoiceDeleteReason; note?: string }) =>
      unwrap(await api.delete(`/invoices/${p.id}`, { data: { reason: p.reason, note: p.note } })),
    onSuccess: refresh,
  });
};

export const useRestoreInvoice = () => {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: async (id: number) => unwrap(await api.post(`/invoices/${id}/restore`)),
    onSuccess: refresh,
  });
};
