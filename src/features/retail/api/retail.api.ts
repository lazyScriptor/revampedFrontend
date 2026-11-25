import { api } from "@/lib/api";
import { unwrapData } from "./http";
import {
  DEFAULT_RETAIL_SETTINGS,
  DEFAULT_RECEIPT_SETTINGS,
  type RetailReceiptSettings,
  type Approver,
  type ApprovalGrant,
  type ApprovalRequestInput,
  type CounterException,
  type DeskPage,
  type DeskQuery,
  type DeskTotals,
  type RetailSettings,
} from "./types";

// ── Settings ──────────────────────────────────────────────────────────────────
// GET /api/retail/settings (needs retail:view)
export const fetchRetailSettings = async (): Promise<RetailSettings> => {
  const data = unwrapData<any>(await api.get("/retail/settings"));
  const s = data?.settings ?? data ?? {};
  return {
    ...DEFAULT_RETAIL_SETTINGS,
    ...s,
    exceptions: { ...DEFAULT_RETAIL_SETTINGS.exceptions, ...(s?.exceptions ?? {}) },
    receipt: normalizeReceiptSettings(s?.receipt),
  };
};

/** Fills what the server did not send with the defaults, and ignores anything of the wrong type. */
export const normalizeReceiptSettings = (raw: any): RetailReceiptSettings => {
  const r = raw && typeof raw === "object" ? raw : {};
  const d = DEFAULT_RECEIPT_SETTINGS;
  return {
    shortSaleReceipt: typeof r.shortSaleReceipt === "boolean" ? r.shortSaleReceipt : d.shortSaleReceipt,
    saleFooter: typeof r.saleFooter === "string" ? r.saleFooter : d.saleFooter,
    showItemsSoldOnRentalReceipt: typeof r.showItemsSoldOnRentalReceipt === "boolean" ? r.showItemsSoldOnRentalReceipt : d.showItemsSoldOnRentalReceipt,
    showCashier: typeof r.showCashier === "boolean" ? r.showCashier : d.showCashier,
    returnSlipFooter: typeof r.returnSlipFooter === "string" ? r.returnSlipFooter : d.returnSlipFooter,
  };
};

// PUT /api/retail/settings (needs config:manage): only the sent fields change; `receipt` is merged on the server.
export const saveReceiptSettings = async (patch: Partial<RetailReceiptSettings>): Promise<RetailReceiptSettings> => {
  const data = unwrapData<any>(await api.put("/retail/settings", { receipt: patch }));
  const s = data?.settings ?? data ?? {};
  return normalizeReceiptSettings(s?.receipt ?? patch);
};

// ── Approvals ─────────────────────────────────────────────────────────────────
// GET /api/approvals/approvers -> active users who hold approvals:decide
export const fetchApprovers = async (): Promise<Approver[]> => {
  const data = unwrapData<any>(await api.get("/approvals/approvers"));
  const list = Array.isArray(data) ? data : (data?.approvers ?? []);
  return list as Approver[];
};

const toGrant = (body: any): ApprovalGrant => {
  const d = unwrapData<any>(body) ?? {};
  return { approval_token: d.approval_token, exception_id: d.exception_id, expires_at: d.expires_at };
};

// POST /api/approvals/approve-here {type, context, summary, approver_user_id, pin | password}
export const approveHere = async (
  input: ApprovalRequestInput & { approver_user_id: number; pin?: string; password?: string },
): Promise<ApprovalGrant> => toGrant(await api.post("/approvals/approve-here", input));

// POST /api/approvals/request {type, context, summary, amount_impact?} -> status 'waiting'
export const requestApproval = async (input: ApprovalRequestInput): Promise<{ exception_id: number; expires_at?: string }> => {
  const d = unwrapData<any>(await api.post("/approvals/request", input)) ?? {};
  return { exception_id: d.exception_id, expires_at: d.expires_at };
};

// POST /api/approvals/:id/decide {approve} (needs approvals:decide, not the requester)
export const decideApproval = async (exceptionId: number, approve: boolean) =>
  unwrapData<any>(await api.post(`/approvals/${exceptionId}/decide`, { approve }));

// POST /api/approvals/record {type, context, summary, invoice_id?, amount_impact?} (record-only)
export const recordException = async (
  input: ApprovalRequestInput & { invoice_id?: number | null },
): Promise<{ exception_id: number }> => {
  const d = unwrapData<any>(await api.post("/approvals/record", input)) ?? {};
  return { exception_id: d.exception_id };
};

// GET /api/approvals/desk?tab=waiting|records&type&from&to&page&limit
export const fetchDesk = async (q: DeskQuery): Promise<DeskPage> => {
  const params: Record<string, unknown> = { tab: q.tab, page: q.page ?? 1, limit: q.limit ?? 25 };
  if (q.type) params.type = q.type;
  if (q.from) params.from = q.from;
  if (q.to) params.to = q.to;
  const d = unwrapData<any>(await api.get("/approvals/desk", { params })) ?? {};
  // The backend includes the people as Requester / Approver objects; the desk shows flat names.
  const personName = (p: any): string | null =>
    p ? [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.username || null : null;
  const rows: CounterException[] = (d.rows ?? d.exceptions ?? d.items ?? []).map((r: any) => ({
    ...r,
    requested_by_name: r.requested_by_name ?? personName(r.Requester),
    approved_by_name: r.approved_by_name ?? personName(r.Approver),
  }));
  const totals: DeskTotals[] = (d.totals ?? []).map((t: any) => ({
    type: t.type,
    count: Number(t.count) || 0,
    amount: Number(t.amount ?? t.sum ?? t.amount_impact) || 0,
  }));
  return { rows, total: Number(d.total ?? d.count ?? rows.length) || 0, totals };
};

// PUT /api/me/approval-pin {current_password, pin}  (4-6 digits; the PIN is never logged)
export const setApprovalPin = async (input: { current_password: string; pin: string }) =>
  unwrapData<any>(await api.put("/me/approval-pin", input));
