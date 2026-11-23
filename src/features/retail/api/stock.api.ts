import { api } from "@/lib/api";
import type { CatalogUnit } from "./catalog.types";
import { unwrapData } from "./http";
import type {
  AdjustInput,
  CountInput,
  DocumentsQuery,
  MovementsQuery,
  OpeningInput,
  ProductLocationStock,
  ReceiveDocumentInput,
  StockDocument,
  StockDocumentLine,
  StockDocumentsPage,
  StockLevel,
  StockLevelsPayload,
  StockMovement,
  StockMovementsPage,
  StockSerial,
  StockSummary,
  SupplierItem,
  ThresholdsInput,
} from "./stock.types";

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : num(v));
const asArray = <T = any>(v: unknown, ...keys: string[]): T[] => {
  if (Array.isArray(v)) return v as T[];
  for (const k of keys) if (v && Array.isArray((v as any)[k])) return (v as any)[k] as T[];
  return [];
};
const parseJson = (v: unknown) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};
const personName = (u: any): string | null =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.username || null : null;
const warehouseName = (w: any): string | null => (w ? w.location_name ?? w.name ?? null : null);

export const normalizeStockLevel = (l: any): StockLevel => ({
  product_id: Number(l.product_id),
  warehouse_id: Number(l.warehouse_id),
  qty_on_hand: num(l.qty_on_hand),
  reorder_level: numOrNull(l.reorder_level),
  reorder_qty: numOrNull(l.reorder_qty),
  counted_at: l.counted_at ?? null,
  updatedAt: l.updatedAt ?? l.updated_at ?? null,
});

export const normalizeProductLocationStock = (s: any): ProductLocationStock => ({
  warehouse_id: Number(s.warehouse_id),
  location_name: s.location_name ?? warehouseName(s.Warehouse ?? s.warehouse) ?? `#${s.warehouse_id}`,
  qty_on_hand: num(s.qty_on_hand),
  counted_at: s.counted_at ?? null,
  reorder_level: numOrNull(s.reorder_level),
  reorder_qty: numOrNull(s.reorder_qty),
});

export const normalizeStockDocumentLine = (l: any): StockDocumentLine => {
  const prod = l.RetailProduct ?? l.product ?? null;
  const unit = l.Unit ?? l.unit ?? null;
  const rawSerials = parseJson(l.serials);
  return {
    line_id: l.line_id != null ? Number(l.line_id) : undefined,
    doc_id: l.doc_id != null ? Number(l.doc_id) : undefined,
    product_id: Number(l.product_id ?? prod?.product_id),
    unit_id: l.unit_id != null ? Number(l.unit_id) : null,
    qty: num(l.qty),
    base_qty: num(l.base_qty),
    entered_unit_cost: l.entered_unit_cost === undefined ? undefined : numOrNull(l.entered_unit_cost),
    unit_cost: l.unit_cost === undefined ? undefined : numOrNull(l.unit_cost),
    counted_qty: numOrNull(l.counted_qty),
    system_qty: numOrNull(l.system_qty),
    serials: Array.isArray(rawSerials) ? rawSerials.map(String) : null,
    product_name: l.product_name ?? prod?.name ?? null,
    product_code: l.product_code ?? prod?.code ?? null,
    base_unit: l.base_unit ?? prod?.base_unit ?? null,
    tracking: l.tracking ?? prod?.tracking ?? null,
    serial_capture: l.serial_capture ?? prod?.serial_capture ?? null,
    unit_name: l.unit_name ?? unit?.unit_name ?? unit?.name ?? null,
    unit_factor: unit?.factor != null ? num(unit.factor) : numOrNull(l.unit_factor),
  };
};

export const normalizeSerial = (s: any): StockSerial => {
  const prod = s.RetailProduct ?? s.product ?? null;
  const wh = s.Warehouse ?? s.warehouse ?? null;
  return {
    serial_id: s.serial_id != null ? Number(s.serial_id) : undefined,
    product_id: Number(s.product_id ?? prod?.product_id),
    serial_no: String(s.serial_no ?? ""),
    warehouse_id: s.warehouse_id != null ? Number(s.warehouse_id) : null,
    location_name: s.location_name ?? warehouseName(wh),
    status: s.status ?? "in_stock",
    receive_doc_id: s.receive_doc_id != null ? Number(s.receive_doc_id) : null,
    sale_line_id: s.sale_line_id != null ? Number(s.sale_line_id) : null,
    sold_at: s.sold_at ?? null,
    warranty_end: s.warranty_end ?? null,
    product_name: s.product_name ?? prod?.name ?? null,
    product_code: s.product_code ?? prod?.code ?? null,
  };
};

export const normalizeStockDocument = (d: any): StockDocument => {
  const wh = d.Warehouse ?? d.warehouse ?? null;
  const usr = d.User ?? d.user ?? null;
  const lines = asArray(d.Lines ?? d.lines).map(normalizeStockDocumentLine);
  const serials = asArray(d.Serials ?? d.serials).map(normalizeSerial);
  return {
    doc_id: Number(d.doc_id ?? d.id),
    doc_type: d.doc_type,
    status: d.status,
    doc_no: String(d.doc_no ?? ""),
    warehouse_id: Number(d.warehouse_id),
    to_warehouse_id: d.to_warehouse_id != null ? Number(d.to_warehouse_id) : null,
    location_name: d.location_name ?? warehouseName(wh),
    supplier_name: d.supplier_name ?? null,
    supplier_ref: d.supplier_ref ?? null,
    reason: d.reason ?? null,
    note: d.note ?? null,
    delivery_charge: d.delivery_charge === undefined ? undefined : numOrNull(d.delivery_charge),
    total_cost: d.total_cost === undefined ? undefined : numOrNull(d.total_cost),
    user_id: d.user_id != null ? Number(d.user_id) : null,
    user_name: d.user_name ?? personName(usr),
    occurred_at: d.occurred_at,
    posted_at: d.posted_at ?? null,
    version: Number(d.version ?? 1),
    createdAt: d.createdAt ?? null,
    updatedAt: d.updatedAt ?? null,
    lines,
    serials: serials.length ? serials : undefined,
    line_summaries: Array.isArray(d.line_summaries)
      ? d.line_summaries.map((s: any) => ({
          product_id: Number(s.product_id),
          system_qty: num(s.system_qty),
          counted_qty: num(s.counted_qty),
          difference: num(s.difference),
        }))
      : undefined,
  };
};

export const normalizeStockMovement = (m: any): StockMovement => {
  const prod = m.RetailProduct ?? m.product ?? null;
  const wh = m.Warehouse ?? m.warehouse ?? null;
  const doc = m.Document ?? m.document ?? null;
  const usr = m.User ?? m.user ?? null;
  return {
    movement_id: Number(m.movement_id ?? m.id),
    product_id: Number(m.product_id ?? prod?.product_id),
    warehouse_id: Number(m.warehouse_id),
    qty_change: num(m.qty_change),
    qty_after: num(m.qty_after),
    type: m.type,
    reason: m.reason ?? null,
    unit_cost: m.unit_cost === undefined ? undefined : numOrNull(m.unit_cost),
    doc_id: m.doc_id != null ? Number(m.doc_id) : doc?.doc_id != null ? Number(doc.doc_id) : null,
    doc_no: m.doc_no ?? doc?.doc_no ?? null,
    doc_type: m.doc_type ?? doc?.doc_type ?? null,
    sale_line_id: m.sale_line_id != null ? Number(m.sale_line_id) : null,
    invoice_id: m.invoice_id != null ? Number(m.invoice_id) : null,
    user_id: m.user_id != null ? Number(m.user_id) : null,
    user_name: m.user_name ?? personName(usr),
    product_name: m.product_name ?? prod?.name ?? null,
    product_code: m.product_code ?? prod?.code ?? null,
    base_unit: m.base_unit ?? prod?.base_unit ?? null,
    location_name: m.location_name ?? warehouseName(wh),
    occurred_at: m.occurred_at,
    createdAt: m.createdAt ?? null,
  };
};

const normUnit = (u: any): CatalogUnit => ({
  unit_id: u.unit_id,
  unit_name: String(u.unit_name ?? u.name ?? ""),
  factor: num(u.factor) || 1,
  sell_price: numOrNull(u.sell_price),
  is_default_sale: !!u.is_default_sale,
});

export const normalizeSupplierItem = (r: any): SupplierItem => {
  const prod = r.RetailProduct ?? r.product ?? null;
  const unit = r.Unit ?? r.last_unit ?? null;
  return {
    product_id: Number(r.product_id ?? prod?.product_id),
    product: prod ? { ...prod, product_id: Number(prod.product_id), sell_price: prod.sell_price != null ? num(prod.sell_price) : undefined } : null,
    times_received: num(r.times_received ?? 1),
    last_received_at: r.last_received_at ?? null,
    last_unit_cost: r.last_unit_cost === undefined ? undefined : numOrNull(r.last_unit_cost),
    last_unit_id: r.last_unit_id != null ? Number(r.last_unit_id) : unit?.unit_id != null ? Number(unit.unit_id) : null,
    last_unit: unit ? normUnit(unit) : null,
  };
};

export const normalizeStockSummary = (d: any): StockSummary => ({
  items_counted: num(d?.items_counted),
  items_not_counted: num(d?.items_not_counted),
  low_stock_count: num(d?.low_stock_count),
  out_of_stock_count: num(d?.out_of_stock_count),
  stock_value: d?.stock_value === undefined ? undefined : numOrNull(d.stock_value),
});

// ── Levels & Summary ──────────────────────────────────────────────────────────
export const fetchStockLevels = async (params: { since?: string | null; warehouse_id?: number | null } = {}): Promise<StockLevelsPayload> => {
  const q: Record<string, unknown> = {};
  if (params.since) q.since = params.since;
  if (params.warehouse_id != null) q.warehouse_id = params.warehouse_id;
  const d = unwrapData<any>(await api.get("/retail/stock/levels", { params: q })) ?? {};
  return {
    server_time: d.server_time ?? d.serverTime ?? null,
    levels: asArray(d, "levels", "rows", "items").map(normalizeStockLevel),
  };
};

export const fetchStockSummary = async (warehouseId?: number | null): Promise<StockSummary> => {
  const params = warehouseId != null ? { warehouse_id: warehouseId } : undefined;
  const d = unwrapData<any>(await api.get("/retail/stock/summary", { params })) ?? {};
  return normalizeStockSummary(d.summary ?? d);
};

export const updateStockThresholds = async (
  productId: number,
  warehouseId: number,
  input: ThresholdsInput,
): Promise<StockLevel> => {
  const d = unwrapData<any>(await api.put(`/retail/stock/levels/${productId}/${warehouseId}`, input)) ?? {};
  return normalizeStockLevel(d.level ?? d);
};

// ── Suppliers ─────────────────────────────────────────────────────────────────
export const fetchSuppliers = async (q = ""): Promise<string[]> => {
  const d = unwrapData<any>(await api.get("/retail/stock/suppliers", { params: q ? { q } : undefined }));
  return asArray<any>(d, "suppliers", "rows").map((s) => (typeof s === "string" ? s : String(s?.supplier_name ?? s?.name ?? ""))).filter(Boolean);
};

export const fetchSupplierItems = async (supplier: string): Promise<SupplierItem[]> => {
  if (!supplier.trim()) return [];
  const d = unwrapData<any>(await api.get("/retail/finder/supplier-items", { params: { supplier } }));
  return asArray(d, "items", "products", "rows").map(normalizeSupplierItem);
};

// ── Receiving (Stock in) ──────────────────────────────────────────────────────
export const createReceive = async (input: ReceiveDocumentInput): Promise<StockDocument> => {
  const d = unwrapData<any>(await api.post("/retail/stock/receive", input)) ?? {};
  return normalizeStockDocument(d.document ?? d);
};

export const updateReceiveDraft = async (id: number, input: ReceiveDocumentInput & { version: number }): Promise<StockDocument> => {
  const d = unwrapData<any>(await api.put(`/retail/stock/receive/${id}`, input)) ?? {};
  return normalizeStockDocument(d.document ?? d);
};

export const postReceiveDraft = async (id: number, version: number): Promise<StockDocument> => {
  const d = unwrapData<any>(await api.post(`/retail/stock/receive/${id}/post`, { version })) ?? {};
  return normalizeStockDocument(d.document ?? d);
};

export const deleteReceiveDraft = async (id: number) => unwrapData<any>(await api.delete(`/retail/stock/receive/${id}`));

// ── Adjustments, Counts & Opening Stock ───────────────────────────────────────
export const postAdjust = async (input: AdjustInput): Promise<StockDocument> => {
  const d = unwrapData<any>(await api.post("/retail/stock/adjust", input)) ?? {};
  return normalizeStockDocument(d.document ?? d);
};

export const postCount = async (input: CountInput): Promise<StockDocument> => {
  const d = unwrapData<any>(await api.post("/retail/stock/count", input)) ?? {};
  const doc = d.document ? { ...d.document, line_summaries: d.line_summaries ?? d.document.line_summaries } : d;
  return normalizeStockDocument(doc);
};

export const postOpening = async (input: OpeningInput): Promise<StockDocument> => {
  const d = unwrapData<any>(await api.post("/retail/stock/opening", input)) ?? {};
  return normalizeStockDocument(d.document ?? d);
};

// ── Documents, Movements & Serials ────────────────────────────────────────────
export const fetchStockDocuments = async (query: DocumentsQuery = {}): Promise<StockDocumentsPage> => {
  const params: Record<string, unknown> = { page: query.page ?? 1, limit: query.limit ?? 25 };
  if (query.type) params.type = query.type;
  if (query.status) params.status = query.status;
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;
  if (query.supplier) params.supplier = query.supplier;
  const d = unwrapData<any>(await api.get("/retail/stock/documents", { params })) ?? {};
  const documents = asArray(d, "documents", "rows", "items").map(normalizeStockDocument);
  return {
    documents,
    total: Number(d.total ?? d.count ?? documents.length) || 0,
    page: Number(d.page ?? query.page ?? 1) || 1,
    limit: Number(d.limit ?? query.limit ?? 25) || 25,
  };
};

export const fetchStockDocument = async (id: number): Promise<StockDocument> => {
  const d = unwrapData<any>(await api.get(`/retail/stock/documents/${id}`)) ?? {};
  const raw = d.document ?? d;
  return normalizeStockDocument({ ...raw, serials: raw.serials ?? d.serials });
};

export const fetchStockMovements = async (query: MovementsQuery = {}): Promise<StockMovementsPage> => {
  const params: Record<string, unknown> = { page: query.page ?? 1, limit: query.limit ?? 30 };
  if (query.product_id) params.product_id = query.product_id;
  if (query.warehouse_id) params.warehouse_id = query.warehouse_id;
  if (query.type) params.type = query.type;
  if (query.user_id) params.user_id = query.user_id;
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;
  const d = unwrapData<any>(await api.get("/retail/stock/movements", { params })) ?? {};
  const movements = asArray(d, "movements", "rows", "items").map(normalizeStockMovement);
  return {
    movements,
    total: Number(d.total ?? d.count ?? movements.length) || 0,
    page: Number(d.page ?? query.page ?? 1) || 1,
    limit: Number(d.limit ?? query.limit ?? 30) || 30,
  };
};

export const fetchSerials = async (params: { product_id?: number; status?: string; q?: string } = {}): Promise<StockSerial[]> => {
  const q: Record<string, unknown> = {};
  if (params.product_id) q.product_id = params.product_id;
  if (params.status) q.status = params.status;
  if (params.q) q.q = params.q;
  const d = unwrapData<any>(await api.get("/retail/serials", { params: q }));
  return asArray(d, "serials", "rows", "items").map(normalizeSerial);
};
