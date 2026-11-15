import { callContract } from "@/lib/callContract";
import {
  SearchPhoneContactsContract,
  UsePhoneContactContract,
  UnpairSelfDeviceContract,
  ReviewContactInvoiceContract,
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
  RotateDeviceTokenContract,
  ListShopDevicesContract,
  UpdateShopDeviceContract,
  SetShopDeviceStatusContract,
  WipeShopDeviceContract,
  TestShopDevicePushContract,
  GetShopDeviceAuditContract,
  GetPhoneAssistantPolicyContract,
  UpdatePhoneAssistantPolicyContract,
  GetDevicePolicyContract,
  UpdateDeviceSettingsContract,
  DeleteDeviceContactsContract,
  DeleteDeviceCallsContract,
  PostDeviceCallNoteContract,
  PostStaffCallNoteContract,
  ListMissedCallsContract,
  ListDeviceMissedCallsContract,
  MarkCallHandledContract,
  MarkDeviceCallHandledContract,
  ListFollowUpsContract,
  ListDeviceFollowUpsContract,
  UpdateFollowUpContract,
  UpdateDeviceFollowUpContract,
  type CustomerBrief,
  type ContactMatchLite,
  type PushSettingsPayload,
  type PushEventCatalogEntry,
  type UserPushPreferenceItem,
  type UserPushPreferenceUpdate,
  type DeviceInvoiceSummary,
  type ShopDeviceItem,
  type DeviceAuditLogItem,
  type PhoneAssistantPolicy,
  type DeviceStatus,
  type ContactSyncMode,
  type CallLoggingScope,
  type ContactSyncPolicy,
  type CallLoggingPolicy,
  type AfterCallCardPolicy,
  type CallNoteRecord,
  type CreateCallNoteBody,
  type MissedCallItem,
  type FollowUpItem,
  type UpdateFollowUpBody,
  type BriefProfile,
  type BriefLockScreenMode,
  type BriefAmountMode,
  type OverlayPolicy,
  type UnknownCallerMode,
  type SharedNumberMode,
  type PushDeliveryMode,
  type UserPersonalQuietHours,
  type DevicePolicyResponse,
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

export interface ReviewContactInvoiceResult {
  invoice_id: number;
  contact_reviewed_at: string;
  contact_reviewed_by: number;
  reviewer_name?: string | null;
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
  phone: string,
): Promise<UsePhoneContactResult> {
  return callContract(UsePhoneContactContract, {
    params: { id: contactId },
    body: { phone },
  });
}

export async function unpairCurrentDevice(): Promise<{ unpaired: boolean }> {
  return callDeviceContract(UnpairSelfDeviceContract);
}

export async function reviewContactInvoice(
  invoiceId: number,
): Promise<ReviewContactInvoiceResult> {
  return callContract(ReviewContactInvoiceContract, {
    params: { id: invoiceId },
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
  quiet_hours?: UserPersonalQuietHours;
}> {
  return callContract(GetMyPushPreferencesContract);
}

export async function updateMyPushPreferences(
  preferences: UserPushPreferenceUpdate[],
  options?: { quiet_hours?: UserPersonalQuietHours },
): Promise<{
  preferences: UserPushPreferenceItem[];
  quiet_hours?: UserPersonalQuietHours;
}> {
  return callContract(UpdateMyPushPreferencesContract, {
    body: {
      preferences,
      ...(options?.quiet_hours ? { quiet_hours: options.quiet_hours } : {}),
    },
  });
}

export async function getDevicePushPreferences(): Promise<{
  preferences: UserPushPreferenceItem[];
  quiet_hours?: UserPersonalQuietHours;
  muted?: boolean;
}> {
  return callDeviceContract(GetDevicePushPreferencesContract);
}

export async function updateDevicePushPreferences(
  preferences: UserPushPreferenceUpdate[],
  options?: { quiet_hours?: UserPersonalQuietHours; muted?: boolean },
): Promise<{
  preferences: UserPushPreferenceItem[];
  quiet_hours?: UserPersonalQuietHours;
  muted?: boolean;
}> {
  return callDeviceContract(UpdateDevicePushPreferencesContract, {
    body: {
      preferences,
      ...(options?.quiet_hours ? { quiet_hours: options.quiet_hours } : {}),
      ...(options?.muted !== undefined ? { muted: options.muted } : {}),
    },
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
  sim_label?: string | null;
  number_masked?: boolean;
  callback_handled_at?: string | null;
  notes?: CallNoteRecord[];
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

export async function rotateDeviceToken(): Promise<{
  device_token: string;
  expires_in_days: number;
}> {
  return callDeviceContract(RotateDeviceTokenContract, { body: {} });
}

export async function listShopDevices(status?: string): Promise<{
  devices: ShopDeviceItem[];
  counts: {
    total: number;
    pending: number;
    active: number;
    suspended: number;
    revoked: number;
  };
}> {
  return callContract(ListShopDevicesContract, {
    query: status ? { status } : undefined,
  });
}

export async function updateShopDevice(
  id: number,
  body: {
    device_label?: string | null;
    capabilities?: Record<string, boolean>;
    brief_profile_id?: string | null;
    muted?: boolean;
    contact_sync_mode?: ContactSyncMode;
    call_logging_scope?: CallLoggingScope;
    sim_filter?: string | null;
  },
): Promise<{ device: ShopDeviceItem }> {
  return callContract(UpdateShopDeviceContract, {
    params: { id },
    body,
  });
}

export async function setShopDeviceStatus(
  id: number,
  body: { status: DeviceStatus; reason?: string | null },
): Promise<{ device: ShopDeviceItem }> {
  return callContract(SetShopDeviceStatusContract, {
    params: { id },
    body,
  });
}

export async function wipeShopDevice(
  id: number,
  reason?: string | null,
): Promise<{ wiped: boolean; pushed: boolean }> {
  return callContract(WipeShopDeviceContract, {
    params: { id },
    body: reason !== undefined ? { reason } : {},
  });
}

export async function testShopDevicePush(
  id: number,
): Promise<{ sent: boolean; reason?: string | null }> {
  return callContract(TestShopDevicePushContract, {
    params: { id },
    body: {},
  });
}

export async function getShopDeviceAudit(
  id: number,
): Promise<{ logs: DeviceAuditLogItem[] }> {
  return callContract(GetShopDeviceAuditContract, {
    params: { id },
  });
}

export async function getPhoneAssistantPolicy(): Promise<{
  policy: PhoneAssistantPolicy;
}> {
  return callContract(GetPhoneAssistantPolicyContract);
}

export async function updatePhoneAssistantPolicy(
  body: Partial<PhoneAssistantPolicy>,
): Promise<{ policy: PhoneAssistantPolicy }> {
  return callContract(UpdatePhoneAssistantPolicyContract, {
    body,
  });
}

export async function getDevicePolicy(): Promise<DevicePolicyResponse> {
  return callDeviceContract(GetDevicePolicyContract);
}

export async function updateDeviceSettings(body: {
  muted?: boolean;
  contact_sync_mode?: ContactSyncMode;
  call_logging_scope?: CallLoggingScope;
  sim_filter?: string | null;
}): Promise<{
  muted: boolean;
  contact_sync_mode: string;
  call_logging_scope: string;
  sim_filter: string | null;
  effective_capabilities: Record<string, boolean>;
  capability_reasons: Record<string, string | null>;
}> {
  return callDeviceContract(UpdateDeviceSettingsContract, { body });
}

export async function deleteDeviceContacts(): Promise<{ deleted: number }> {
  return callDeviceContract(DeleteDeviceContactsContract);
}

export async function deleteDeviceCalls(): Promise<{ deleted: number }> {
  return callDeviceContract(DeleteDeviceCallsContract);
}

export async function createStaffCallNote(
  callId: number,
  body: CreateCallNoteBody,
): Promise<{ note: CallNoteRecord }> {
  return callContract(PostStaffCallNoteContract, {
    params: { id: callId },
    body,
  });
}

export async function createDeviceCallNote(
  clientCallId: string,
  body: CreateCallNoteBody,
): Promise<{ note: CallNoteRecord }> {
  return callDeviceContract(PostDeviceCallNoteContract, {
    params: { client_call_id: clientCallId },
    body,
  });
}

export async function listMissedCalls(limit = 50): Promise<{ items: MissedCallItem[] }> {
  return callContract(ListMissedCallsContract, {
    query: { limit },
  });
}

export async function listDeviceMissedCalls(limit = 50): Promise<{ items: MissedCallItem[] }> {
  return callDeviceContract(ListDeviceMissedCallsContract, {
    query: { limit },
  });
}

export async function markCallHandled(
  callId: number,
): Promise<{ call_id: number; callback_handled_at: string }> {
  return callContract(MarkCallHandledContract, {
    params: { id: callId },
    body: {},
  });
}

export async function markDeviceCallHandled(
  callId: number,
): Promise<{ call_id: number; callback_handled_at: string }> {
  return callDeviceContract(MarkDeviceCallHandledContract, {
    params: { id: callId },
    body: {},
  });
}

export async function listFollowUps(params?: {
  status?: "pending" | "done" | "all";
  customer_id?: number;
  limit?: number;
}): Promise<{ items: FollowUpItem[] }> {
  return callContract(ListFollowUpsContract, {
    query: params ?? { status: "pending" },
  });
}

export async function listDeviceFollowUps(params?: {
  status?: "pending" | "done" | "all";
  customer_id?: number;
  limit?: number;
}): Promise<{ items: FollowUpItem[] }> {
  return callDeviceContract(ListDeviceFollowUpsContract, {
    query: params ?? { status: "pending" },
  });
}

export async function updateFollowUp(
  noteId: number,
  body: UpdateFollowUpBody,
): Promise<{ follow_up: FollowUpItem }> {
  return callContract(UpdateFollowUpContract, {
    params: { id: noteId },
    body,
  });
}

export async function updateDeviceFollowUp(
  noteId: number,
  body: UpdateFollowUpBody,
): Promise<{ follow_up: FollowUpItem }> {
  return callDeviceContract(UpdateDeviceFollowUpContract, {
    params: { id: noteId },
    body,
  });
}

export type {
  CustomerBrief,
  ContactMatchLite,
  PushSettingsPayload,
  PushEventCatalogEntry,
  UserPushPreferenceItem,
  UserPushPreferenceUpdate,
  DeviceInvoiceSummary,
  ShopDeviceItem,
  DeviceAuditLogItem,
  PhoneAssistantPolicy,
  DeviceStatus,
  ContactSyncMode,
  CallLoggingScope,
  ContactSyncPolicy,
  CallLoggingPolicy,
  AfterCallCardPolicy,
  CallNoteRecord,
  CreateCallNoteBody,
  MissedCallItem,
  FollowUpItem,
  UpdateFollowUpBody,
  BriefProfile,
  BriefLockScreenMode,
  BriefAmountMode,
  OverlayPolicy,
  UnknownCallerMode,
  SharedNumberMode,
  PushDeliveryMode,
  UserPersonalQuietHours,
  DevicePolicyResponse,
};
