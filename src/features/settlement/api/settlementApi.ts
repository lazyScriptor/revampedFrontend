import { api } from "@/lib/api";
import type {
  CompleteBillsResponse,
  OpenBillsQueryParams,
  OpenBillsResponse,
  SettlementCommitResponse,
  SettlementOverviewResponse,
  SettlementPreviewRequest,
  SettlementPreviewResponse,
} from "../types";

const unwrap = <T>(res: any): T => (res?.data !== undefined ? res.data : res) as T;

export async function fetchSettlementOverview(
  customerId: number,
  signal?: AbortSignal,
): Promise<SettlementOverviewResponse> {
  const res = await api.get(`/customers/${customerId}/settlement/overview`, { signal });
  return unwrap<SettlementOverviewResponse>(res);
}

export async function fetchCustomerOpenBills(
  customerId: number,
  params: OpenBillsQueryParams,
  signal?: AbortSignal,
): Promise<OpenBillsResponse> {
  const res = await api.get(`/customers/${customerId}/open-bills`, { params, signal });
  return unwrap<OpenBillsResponse>(res);
}

export async function previewCustomerSettlement(
  customerId: number,
  body: SettlementPreviewRequest,
  signal?: AbortSignal,
): Promise<SettlementPreviewResponse> {
  const res = await api.post(`/customers/${customerId}/settlement/preview`, body, { signal });
  return unwrap<SettlementPreviewResponse>(res);
}

export async function commitCustomerSettlement(
  customerId: number,
  body: SettlementPreviewRequest & { preview_version: string },
  idempotencyKey: string,
): Promise<SettlementCommitResponse> {
  const res = await api.post(`/customers/${customerId}/settlement`, body, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return unwrap<SettlementCommitResponse>(res);
}

export async function completeSettlementBills(
  customerId: number,
  body: { invoice_ids: number[]; release_id_card: boolean },
): Promise<CompleteBillsResponse> {
  const res = await api.post(`/customers/${customerId}/settlement/complete-bills`, body);
  return unwrap<CompleteBillsResponse>(res);
}

export async function voidSettlement(
  settlementId: number,
  reason?: string,
): Promise<{
  settlement_id: number;
  is_voided: boolean;
  voided_at: string;
  voided_by: number;
  voided_payments_count: number;
  deposit_balance: number;
}> {
  const res = await api.post(`/settlements/${settlementId}/void`, reason ? { reason } : {});
  return unwrap(res);
}

export async function fetchSettlementDetail(
  settlementId: number,
  signal?: AbortSignal,
): Promise<SettlementCommitResponse> {
  const res = await api.get(`/settlements/${settlementId}`, { signal });
  return unwrap<SettlementCommitResponse>(res);
}
