import { api } from "@/lib/api";

export type Language = "en" | "si";

export type TemplateKey =
  | "receipt"
  | "payment_received"
  | "payment_reminder"
  | "return_due_tomorrow"
  | "return_due_today"
  | "overdue_return"
  | "thank_you"
  | "custom";

export type WhatsAppWarning =
  | "no_phone"
  | "landline"
  | "invalid_phone"
  | "opted_out"
  | "no_balance"
  | "nothing_to_return"
  | "messaged_recently"
  | "too_long";

export interface PhoneInfo {
  digits: string;
  display: string;
  kind: "mobile" | "landline" | "international" | "invalid";
  valid: boolean;
}

export interface LastMessage {
  template_key: TemplateKey;
  created_at: string;
  status: "opened" | "sent";
}

export interface ComposedMessage {
  template_key: TemplateKey;
  language: Language;
  body: string;
  link: string;
  to: PhoneInfo;
  customer: { customer_id: number; name: string; opted_out: boolean };
  invoice: { invoice_id: number; number: string; balance: number } | null;
  last_message: LastMessage | null;
  warnings: WhatsAppWarning[];
}

export interface WorklistItem {
  invoice_id: number;
  invoice_number: string;
  customer: { customer_id: number; name: string; phone: PhoneInfo; opted_out: boolean };
  total: number;
  balance: number | null;
  due_date: string | null;
  days_late: number;
  pending_units: number;
  items: string;
  template_key: TemplateKey;
  language: Language;
  body: string;
  link: string;
  last_message: LastMessage | null;
  warnings: WhatsAppWarning[];
}

export type WorklistSection = "overdue_returns" | "returns_due_today" | "returns_due_tomorrow" | "payments_pending";

export interface Worklist {
  generated_at: string;
  today: string;
  summary: Record<WorklistSection, number> & { balance_pending: number };
  sections: Record<WorklistSection, WorklistItem[]>;
}

export interface LogEntry {
  log_id: number;
  customer_id: number | null;
  customer_name: string;
  invoice_id: number | null;
  invoice_number: string | null;
  template_key: TemplateKey;
  language: Language;
  to_phone: string;
  body: string;
  status: "opened" | "sent";
  created_at: string;
}

export interface TemplatesPayload {
  languages: Language[];
  keys: { key: TemplateKey; group: "order" | "payments" | "returns" | "general"; needs_invoice: boolean }[];
  placeholders: string[];
  samples: Record<Language, Record<string, string>>;
  max_length: number;
  templates: Record<TemplateKey, Record<Language, { body: string; default_body: string; is_custom: boolean }>>;
}

export interface WhatsAppSettings {
  shop_name: string;
  shop_phone: string;
  default_language: Language;
}

export interface ComposeParams {
  template_key: TemplateKey;
  invoice_id?: number;
  customer_id?: number;
  language?: Language;
  custom_text?: string;
}

export interface LogParams {
  customer_id?: number | null;
  invoice_id?: number | null;
  template_key: TemplateKey;
  language: Language;
  to_phone: string;
  body: string;
}

// api.ts already unwraps axios' `response.data`, leaving the server's { status, data } envelope.
const data = <T>(body: any): T => body?.data as T;

export const fetchWorklist = async (language?: Language) =>
  data<Worklist>(await api.get("/whatsapp/worklist", { params: { language } }));

export const composeMessage = async (params: ComposeParams) => data<ComposedMessage>(await api.post("/whatsapp/compose", params));

export const logMessage = async (params: LogParams) => data<{ log_id: number; status: string }>(await api.post("/whatsapp/log", params));

export const confirmSent = async (logId: number) => data<{ log_id: number; status: string }>(await api.patch(`/whatsapp/log/${logId}/sent`));

export const fetchLog = async (params: { customer_id?: number; invoice_id?: number; template_key?: TemplateKey; limit?: number; offset?: number }) =>
  data<{ total: number; entries: LogEntry[] }>(await api.get("/whatsapp/log", { params }));

export const fetchTemplates = async () => data<TemplatesPayload>(await api.get("/whatsapp/templates"));

export const saveTemplate = async (p: { key: TemplateKey; language: Language; body: string }) =>
  data<{ key: string; language: string; body: string; is_custom: boolean }>(await api.put(`/whatsapp/templates/${p.key}/${p.language}`, { body: p.body }));

export const resetTemplate = async (p: { key: TemplateKey; language: Language }) =>
  data<{ key: string; language: string; body: string; is_custom: boolean }>(await api.delete(`/whatsapp/templates/${p.key}/${p.language}`));

export const fetchSettings = async () => data<WhatsAppSettings>(await api.get("/whatsapp/settings"));

export const updateSettings = async (p: Partial<Pick<WhatsAppSettings, "shop_phone" | "default_language">>) =>
  data<WhatsAppSettings>(await api.put("/whatsapp/settings", p));

export const setOptOut = async (p: { customerId: number; optOut: boolean }) =>
  data<{ customer_id: number; opted_out: boolean }>(await api.patch(`/whatsapp/customers/${p.customerId}/opt-out`, { opt_out: p.optOut }));
