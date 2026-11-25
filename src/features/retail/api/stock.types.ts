import type { CatalogProduct, CatalogUnit } from "./catalog.types";

export type StockStatus = "in_stock" | "low" | "out" | "not_counted" | "untracked";
export type StockDocType = "opening" | "receive" | "adjust" | "count" | "transfer";
export type StockDocStatus = "draft" | "posted";

export const STOCK_MOVEMENT_TYPES = [
  "OPENING",
  "RECEIVE",
  "SALE",
  "SALE_RETURN",
  "ADJUST_IN",
  "ADJUST_OUT",
  "COUNT_IN",
  "COUNT_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "SALE_VOID",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const ADJUST_REASONS = ["damaged", "lost", "own_use", "sample", "found", "other"] as const;
export type AdjustReason = (typeof ADJUST_REASONS)[number];

export type SerialStatus = "in_stock" | "sold" | "returned" | "written_off";

export interface StockLevel {
  product_id: number;
  warehouse_id: number;
  qty_on_hand: number;
  reorder_level: number | null;
  reorder_qty: number | null;
  counted_at: string | null;
  updatedAt: string | null;
}

export interface StockLevelsPayload {
  server_time: string | null;
  levels: StockLevel[];
}

export interface LocalStockLevels {
  serverTime: string | null;
  levels: StockLevel[];
}

export interface StockSummary {
  items_counted: number;
  items_not_counted: number;
  low_stock_count: number;
  out_of_stock_count: number;
  /** Present only when the user has retail:cost_view. */
  stock_value?: number | null;
}

export interface ProductLocationStock {
  warehouse_id: number;
  location_name: string;
  qty_on_hand: number;
  counted_at: string | null;
  reorder_level: number | null;
  reorder_qty: number | null;
}

export interface StockSerial {
  serial_id?: number;
  product_id: number;
  serial_no: string;
  warehouse_id?: number | null;
  location_name?: string | null;
  status: SerialStatus;
  receive_doc_id?: number | null;
  sale_line_id?: number | null;
  sold_at?: string | null;
  warranty_end?: string | null;
  product_name?: string | null;
  product_code?: string | null;
}

export interface StockDocumentLine {
  line_id?: number;
  doc_id?: number;
  product_id: number;
  unit_id: number | null;
  qty: number;
  base_qty: number;
  entered_unit_cost?: number | null;
  unit_cost?: number | null;
  counted_qty?: number | null;
  system_qty?: number | null;
  serials?: string[] | null;
  product_name?: string | null;
  product_code?: string | null;
  base_unit?: string | null;
  tracking?: CatalogProduct["tracking"] | null;
  serial_capture?: CatalogProduct["serial_capture"] | null;
  unit_name?: string | null;
  unit_factor?: number | null;
}

export interface StockDocument {
  doc_id: number;
  doc_type: StockDocType;
  status: StockDocStatus;
  doc_no: string;
  warehouse_id: number;
  to_warehouse_id?: number | null;
  location_name?: string | null;
  supplier_name?: string | null;
  supplier_ref?: string | null;
  reason?: string | null;
  note?: string | null;
  delivery_charge?: number | null;
  total_cost?: number | null;
  user_id?: number | null;
  user_name?: string | null;
  occurred_at: string;
  posted_at?: string | null;
  version: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  lines: StockDocumentLine[];
  serials?: StockSerial[];
  line_summaries?: Array<{
    product_id: number;
    system_qty: number;
    counted_qty: number;
    difference: number;
  }>;
}

export interface StockDocumentsPage {
  documents: StockDocument[];
  total: number;
  page: number;
  limit: number;
}

export interface StockMovement {
  movement_id: number;
  product_id: number;
  warehouse_id: number;
  qty_change: number;
  qty_after: number;
  type: StockMovementType;
  reason?: string | null;
  unit_cost?: number | null;
  doc_id?: number | null;
  doc_no?: string | null;
  doc_type?: StockDocType | null;
  sale_line_id?: number | null;
  invoice_id?: number | null;
  user_id?: number | null;
  user_name?: string | null;
  product_name?: string | null;
  product_code?: string | null;
  base_unit?: string | null;
  location_name?: string | null;
  occurred_at: string;
  createdAt?: string | null;
}

export interface StockMovementsPage {
  movements: StockMovement[];
  total: number;
  page: number;
  limit: number;
}

export interface SupplierItem {
  product_id: number;
  product: Partial<CatalogProduct> | null;
  times_received: number;
  last_received_at: string | null;
  /** Present only with retail:cost_view. */
  last_unit_cost?: number | null;
  last_unit_id?: number | null;
  last_unit?: CatalogUnit | null;
}

export interface ReceiveLineInput {
  product_id: number;
  unit_id?: number | null;
  qty: number;
  unit_cost: number;
  serials?: string[];
}

export interface ReceiveDocumentInput {
  warehouse_id?: number | null;
  supplier_name: string;
  supplier_ref?: string | null;
  note?: string | null;
  occurred_at?: string | null;
  delivery_charge?: number;
  lines: ReceiveLineInput[];
  post?: boolean;
  version?: number;
}

export interface AdjustInput {
  warehouse_id?: number | null;
  reason: AdjustReason;
  note?: string | null;
  occurred_at?: string | null;
  lines: Array<{
    product_id: number;
    unit_id?: number | null;
    qty: number;
    unit_cost?: number;
  }>;
}

export interface CountInput {
  warehouse_id?: number | null;
  note?: string | null;
  occurred_at?: string | null;
  lines: Array<{
    product_id: number;
    counted_qty: number;
  }>;
}

export interface OpeningInput {
  warehouse_id?: number | null;
  note?: string | null;
  occurred_at?: string | null;
  lines: Array<{
    product_id: number;
    qty: number;
    unit_cost?: number | null;
  }>;
}

export interface DocumentsQuery {
  type?: StockDocType | "";
  status?: StockDocStatus | "";
  from?: string;
  to?: string;
  supplier?: string;
  page?: number;
  limit?: number;
}

export interface MovementsQuery {
  product_id?: number;
  warehouse_id?: number;
  type?: StockMovementType | "";
  user_id?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface ThresholdsInput {
  reorder_level: number | null;
  reorder_qty: number | null;
}
