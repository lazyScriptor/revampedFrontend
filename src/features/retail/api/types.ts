// Shapes assumed from the R0-backend prompt (docs/RETAIL_POS_BUILD_PROMPTS.md). If the backend
// differs, adjust here and in the sibling *.api.ts files; nothing else calls the API directly.

export const EXCEPTION_TYPES = [
  "unlisted_item",
  "price_change",
  "discount_over_limit",
  "below_cost",
  "negative_stock",
  "return_no_bill",
  "line_removed",
  "bill_void_after_print",
  "credit_over_limit",
  "backdated_bill",
  "drawer_open",
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export type ApprovalMethod = "pin" | "password" | "either";

export type ExceptionPolicyMode = "off" | "record" | "approve";

export interface RetailSettings {
  approvalMethod: ApprovalMethod;
  /** Minutes one approval stays valid for more lines on the same bill; 0 = single use. */
  approvalGrantMinutes: number;
  askManagerRemote: boolean;
  negativeStock: "warn" | "block";
  discountLimitPct: number;
  exceptions?: Partial<Record<ExceptionType, ExceptionPolicyMode>>;
  quickPad?: number[];
  showContractorPrice?: boolean;
  belowCostWarning?: boolean;
  /** Name pattern for generated item names, e.g. "{brand} {subCategory} {itemWord} {variant}{unit}". */
  namePattern?: string;
  codePrefix?: string;
  units?: string[] | { base?: string[]; pack?: string[] };
  defaultWarehouseId?: number | null;
  booksClosedUntil?: string | null;
}

export const DEFAULT_RETAIL_SETTINGS: RetailSettings = {
  approvalMethod: "either",
  approvalGrantMinutes: 0,
  askManagerRemote: true,
  negativeStock: "warn",
  discountLimitPct: 10,
  quickPad: [],
  showContractorPrice: true,
  belowCostWarning: true,
  exceptions: {
    unlisted_item: "record",
    price_change: "approve",
    discount_over_limit: "approve",
    below_cost: "record",
    negative_stock: "approve",
  },
};

export interface Approver {
  id: number;
  display_name: string;
  avatar_url?: string | null;
}

export interface ApprovalRequestInput {
  type: ExceptionType;
  /** One line shown to the manager, e.g. "Price 1,250 -> 1,100 (-12%)". */
  summary: string;
  /** What is being approved (item, bill, old/new values). The token is bound to a hash of this. */
  context: Record<string, unknown>;
  amount_impact?: number;
}

export interface ApprovalGrant {
  approval_token: string;
  exception_id: number;
  expires_at?: string;
}

export type ExceptionStatus = "recorded" | "waiting" | "approved" | "declined" | "sorted";

export interface CounterException {
  exception_id: number;
  type: ExceptionType;
  status: ExceptionStatus;
  summary?: string | null;
  invoice_id?: number | null;
  invoice_number?: string | null;
  item_name?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  amount_impact?: number | string | null;
  requested_by_name?: string | null;
  approved_by_name?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface DeskTotals {
  type: ExceptionType;
  count: number;
  amount: number;
}

export interface DeskPage {
  rows: CounterException[];
  total: number;
  totals: DeskTotals[];
}

export interface DeskQuery {
  tab: "waiting" | "records";
  type?: ExceptionType | "";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
