import { callContract } from "@/lib/callContract";
import {
  SearchPhoneContactsContract,
  UsePhoneContactContract,
  GetPushSettingsContract,
  UpdatePushSettingsContract,
  SendPushTestContract,
  GetMyPushPreferencesContract,
  UpdateMyPushPreferencesContract,
  GetDevicePushPreferencesContract,
  UpdateDevicePushPreferencesContract,
  GetDeviceInvoiceContract,
  GetCallByIdContract,
  ListCallsContract,
  type CustomerBrief,
  type ContactMatchLite,
  type PushSettingsPayload,
  type PushEventCatalogEntry,
  type UserPushPreferenceItem,
  type UserPushPreferenceUpdate,
  type DeviceInvoiceSummary,
} from "@geargrid/contracts";
import { callDeviceContract } from "../lib/nativeBridge";

export interface PhoneContactMatch extends ContactMatchLite {
  operator_device_id: number;
  device_label: string | null;
  raw_phone: string | null;
}

export interface UsePhoneContactResult {
  contact_id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
}

export async function searchPhoneContacts(
  search: string,
  limit = 10,
): Promise<PhoneContactMatch[]> {
  const data = await callContract(SearchPhoneContactsContract, {
    query: { search, limit },
  });
  return (data.contacts ?? []) as PhoneContactMatch[];
}

export async function usePhoneContact(
  contactId: number,
): Promise<UsePhoneContactResult> {
  return callContract(UsePhoneContactContract, {
    params: { id: contactId },
  });
}

export interface GetPushSettingsResult {
  settings: PushSettingsPayload;
  catalog: PushEventCatalogEntry[];
}

export async function getPushSettings(): Promise<GetPushSettingsResult> {
  return callContract(GetPushSettingsContract);
}

export async function updatePushSettings(
  payload: PushSettingsPayload,
): Promise<{ settings: PushSettingsPayload }> {
  return callContract(UpdatePushSettingsContract, {
    body: payload,
  });
}

export async function sendPushTest(): Promise<{ reached: number }> {
  return callContract(SendPushTestContract);
}

export async function getMyPushPreferences(): Promise<{
  preferences: UserPushPreferenceItem[];
}> {
  return callContract(GetMyPushPreferencesContract);
}

export async function updateMyPushPreferences(
  preferences: UserPushPreferenceUpdate[],
): Promise<{ preferences: UserPushPreferenceItem[] }> {
  return callContract(UpdateMyPushPreferencesContract, {
    body: { preferences },
  });
}

export async function getDevicePushPreferences(): Promise<{
  preferences: UserPushPreferenceItem[];
}> {
  return callDeviceContract(GetDevicePushPreferencesContract);
}

export async function updateDevicePushPreferences(
  preferences: UserPushPreferenceUpdate[],
): Promise<{ preferences: UserPushPreferenceItem[] }> {
  return callDeviceContract(UpdateDevicePushPreferencesContract, {
    body: { preferences },
  });
}

export async function getDeviceInvoice(
  invoiceId: number,
): Promise<DeviceInvoiceSummary> {
  return callDeviceContract(GetDeviceInvoiceContract, {
    params: { id: invoiceId },
  });
}

export interface CallRecord {
  call_id: number;
  operator_device_id: number;
  client_call_id: string;
  phone_e164: string | null;
  raw_number: string | null;
  direction: "INCOMING" | "OUTGOING" | "MISSED";
  customer_id: number | null;
  contact_id: number | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  device_label?: string | null;
}

export interface CallDetailsResult {
  call: CallRecord;
  match: "customer" | "contact" | "none";
  brief?: CustomerBrief | null;
  contact?: ContactMatchLite | null;
}

export interface CallListItem extends CallRecord {
  customer_name?: string | null;
  contact_name?: string | null;
}

export interface CallListResult {
  calls: CallListItem[];
  total: number;
  page: number;
  limit: number;
}

export async function getCallById(callId: number): Promise<CallDetailsResult> {
  return callContract(GetCallByIdContract, {
    params: { id: callId },
  }) as Promise<CallDetailsResult>;
}

export async function listCalls(params?: {
  customer_id?: number;
  page?: number;
  limit?: number;
}): Promise<CallListResult> {
  return callContract(ListCallsContract, {
    query: params ?? {},
  }) as Promise<CallListResult>;
}

export type {
  CustomerBrief,
  ContactMatchLite,
  PushSettingsPayload,
  PushEventCatalogEntry,
  UserPushPreferenceItem,
  UserPushPreferenceUpdate,
  DeviceInvoiceSummary,
};
