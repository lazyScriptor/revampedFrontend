import { api } from "@/lib/api";
import type {
  CallRecordingSettings,
  CallResultOption,
  CallsReportResponse,
  CollectionsListResponse,
  CollectionsQueryParams,
  CustomerCollectionDetailResponse,
  DialFromPhonePayload,
  SaveCallOutcomePayload,
} from "../types";

const unwrap = <T>(res: any): T => (res?.data !== undefined ? res.data : res) as T;

export async function dialFromUserPhone(payload: DialFromPhonePayload) {
  const res: any = await api.post("/calls/dial", payload);
  return unwrap<{ sent: number; total_devices: number; phone: string; call_id?: number }>(res);
}

export async function saveCallOutcome(payload: SaveCallOutcomePayload) {
  if (payload.call_id) {
    const res: any = await api.post(`/calls/${payload.call_id}/notes`, {
      customer_id: payload.customer_id,
      invoice_ids: payload.invoice_ids,
      outcome: payload.outcome,
      result: payload.result,
      note: payload.note,
      promise_amount: payload.promise_amount,
      promise_date: payload.promise_date,
      expected_return_date: payload.expected_return_date,
      follow_up_on: payload.call_again_on,
    });
    return unwrap<any>(res);
  }
  const res: any = await api.post("/calls/manual", {
    customer_id: payload.customer_id,
    invoice_ids: payload.invoice_ids,
    phone: payload.phone,
    outcome: payload.outcome,
    result: payload.result,
    note: payload.note,
    promise_amount: payload.promise_amount,
    promise_date: payload.promise_date,
    expected_return_date: payload.expected_return_date,
    follow_up_on: payload.call_again_on,
  });
  return unwrap<any>(res);
}

export async function linkCallToCustomer(callId: number, customerId: number) {
  const res: any = await api.post(`/calls/${callId}/link-customer`, { customer_id: customerId });
  return unwrap<any>(res);
}

export async function fetchCallRecordingUrl(callId: number) {
  const res: any = await api.get(`/calls/${callId}/recording`);
  return unwrap<{ url: string; mime_type?: string; duration_seconds?: number }>(res);
}

export async function setCallDisputeHold(callId: number, disputeHold: boolean) {
  const res: any = await api.patch(`/calls/${callId}/dispute-hold`, { dispute_hold: disputeHold });
  return unwrap<{ call_id: number; dispute_hold: boolean }>(res);
}

export async function fetchCollectionsReport(params: CollectionsQueryParams) {
  const res: any = await api.get("/reports/customers/collections", { params });
  return unwrap<CollectionsListResponse>(res);
}

export async function fetchCustomerCollectionDetail(
  customerId: number,
  params: CollectionsQueryParams & { filters_on?: boolean },
) {
  const res: any = await api.get(`/reports/customers/collections/${customerId}`, { params });
  return unwrap<CustomerCollectionDetailResponse>(res);
}

export async function fetchCallsReport(params: {
  startDate?: string;
  endDate?: string;
  staff_id?: number | string;
  outcome?: string;
  search?: string;
  promise_status?: string;
}) {
  const res: any = await api.get("/reports/calls", { params });
  return unwrap<CallsReportResponse>(res);
}

export async function fetchCollectionsSettings() {
  const res: any = await api.get("/settings/collections");
  return unwrap<{
    call_results?: CallResultOption[];
    answered_threshold_seconds?: number;
    call_recording?: CallRecordingSettings;
  }>(res);
}

export async function updateCollectionsSettings(payload: {
  call_results?: CallResultOption[];
  answered_threshold_seconds?: number;
  call_recording?: CallRecordingSettings;
}) {
  const res: any = await api.patch("/settings/collections", payload);
  return unwrap<any>(res);
}
