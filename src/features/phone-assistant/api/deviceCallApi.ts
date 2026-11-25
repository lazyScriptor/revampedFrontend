import { deviceApi } from "../lib/nativeBridge";

export type CallOutcome = "answered" | "no_answer" | "unreachable";

export interface DeviceCallResultOption {
  key: string;
  label_en: string;
  label_si: string;
  requires_promise?: boolean;
  requires_date?: boolean;
  requires_note?: boolean;
}

export interface DeviceCall {
  call_id: number;
  client_call_id: string;
  customer_id: number | null;
  customer_name: string | null;
  direction: "INCOMING" | "OUTGOING" | "MISSED";
  raw_number: string | null;
  started_at: string;
  duration_seconds: number | null;
  suggested_outcome: "answered" | "no_answer" | null;
}

export interface DeviceCallBill {
  invoice_id: number;
  units_out: number;
  /** null when this role may not see money. */
  owed: number | null;
  selected: boolean;
}

export interface DeviceCallCard {
  call: DeviceCall;
  bills: DeviceCallBill[];
  call_results: DeviceCallResultOption[];
  answered_threshold_seconds: number;
  see_amounts: boolean;
  note: {
    note_id: number;
    outcome: CallOutcome | null;
    note: string | null;
    created_at: string;
  } | null;
}

export interface DeviceCallToNote extends DeviceCall {
  open_bills: number;
}

export interface DeviceCallNotePayload {
  outcome: CallOutcome;
  result: string | null;
  note: string | null;
  promise_amount: number | null;
  promise_date: string | null;
  follow_up_on: string | null;
  invoice_ids: number[];
}

// deviceApi already unwraps the axios response, which leaves { status, data }.
const data = <T,>(res: unknown): T => (res as { data: T }).data;

export const fetchDeviceCallCard = async (clientCallId: string) =>
  data<DeviceCallCard>(await deviceApi.get(`/device/calls/${encodeURIComponent(clientCallId)}/card`));

export const fetchDeviceCallsToNote = async () =>
  data<{ items: DeviceCallToNote[]; total: number }>(await deviceApi.get("/device/calls/to-note"));

export const saveDeviceCallOutcome = async (clientCallId: string, payload: DeviceCallNotePayload) =>
  data<{ note: unknown }>(
    await deviceApi.post(`/device/calls/${encodeURIComponent(clientCallId)}/note`, payload),
  );
