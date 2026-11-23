import { api } from "@/lib/api";
import { unwrapData } from "./http";
import type { CatalogProduct, CatalogUnit, FamilyInput, ProductInput } from "./catalog.types";

export interface WalkInCustomer {
  customer_id: number;
  first_name: string;
  last_name: string;
  nic_number?: string;
  phone_number?: string;
  customer_type?: string;
  price_level?: "retail" | "contractor" | "trade";
  is_walk_in: true;
  deposit_balance?: number;
}

export interface PriceChangeItem {
  product_id: number;
  unit_id: number | null;
  from: number;
  to: number;
  description?: string;
}

export interface OutOfStockItem {
  product_id: number;
  warehouse_id?: number | null;
  available_qty: number;
  requested_qty?: number;
  description?: string;
}

export type SaleCheckoutError =
  | { kind: "price_changed"; message: string; changes: PriceChangeItem[] }
  | { kind: "out_of_stock"; message: string; items: OutOfStockItem[] }
  | { kind: "other"; message: string };

export interface ToSortBillRef {
  invoice_id: number;
  doc_number?: string | null;
}

export interface ToSortGroup {
  key: string;
  description: string;
  count: number;
  total_qty: number;
  last_price: number;
  last_date: string | null;
  bills: ToSortBillRef[];
  scanned_barcode: string | null;
  sale_line_ids: number[];
}

export interface InvoiceSaleLineRow {
  sale_line_id: number;
  invoice_id?: number;
  product_id: number | null;
  line_kind: "item" | "unlisted" | "sundry" | "service";
  scanned_barcode?: string | null;
  description: string;
  warehouse_id?: number | null;
  unit_id?: number | null;
  unit_label: string;
  unit_factor: number;
  qty: number;
  base_qty: number;
  unit_price: number;
  price_source: string;
  line_discount: number;
  bill_discount_share: number;
  line_total: number;
  serials?: string[];
  status?: string;
  sorted_at?: string | null;
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// GET /api/retail/walk-in
export const fetchWalkInCustomer = async (): Promise<WalkInCustomer> => {
  const d = unwrapData<any>(await api.get("/retail/walk-in")) ?? {};
  const c = d.customer ?? d;
  return {
    ...c,
    customer_id: Number(c.customer_id),
    first_name: c.first_name || "Walk-in",
    last_name: c.last_name || "customer",
    price_level: c.price_level || "retail",
    is_walk_in: true,
    deposit_balance: num(c.deposit_balance, 0),
  };
};

// POST /api/invoices with Idempotency-Key header
export const postSaleInvoice = async (payload: Record<string, unknown>, idempotencyKey: string): Promise<any> => {
  const res = await api.post("/invoices", payload, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  const d = unwrapData<any>(res) ?? {};
  return d.invoice ?? d;
};

/** Parses 409 price_changed / out_of_stock responses returned by POST /api/invoices. */
export const parseSaleCheckoutError = (err: any): SaleCheckoutError => {
  const status: number | undefined = err?.status ?? err?.response?.status;
  const raw = err?.data ?? err?.response?.data ?? {};
  const inner =
    raw && typeof raw === "object" && "data" in raw && raw.data && typeof raw.data === "object" ? raw.data : raw;
  const code = String(inner?.code ?? raw?.code ?? "").toLowerCase();
  const message = String(raw?.message ?? inner?.message ?? err?.message ?? "Failed to complete sale.");

  if (status === 409) {
    const rawChanges =
      inner?.changes ??
      inner?.price_changes ??
      inner?.current_prices ??
      (code === "price_changed" ? inner?.items ?? inner?.lines : null);
    if (code === "price_changed" || /price.?changed/i.test(`${code} ${message}`) || Array.isArray(rawChanges)) {
      const list = Array.isArray(rawChanges) ? rawChanges : [];
      return {
        kind: "price_changed",
        message,
        changes: list.map((c: any) => ({
          product_id: Number(c.product_id),
          unit_id: c.unit_id != null ? Number(c.unit_id) : null,
          from: num(c.from ?? c.old_price ?? c.client_price ?? c.requested_unit_price ?? c.expected_unit_price),
          to: num(c.to ?? c.new_price ?? c.server_price ?? c.current_price ?? c.current_unit_price),
          description: c.description ?? c.name,
        })),
      };
    }

    const rawStockItems = inner?.items ?? inner?.lines ?? inner?.shortages;
    if (
      code === "out_of_stock" ||
      /out.?of.?stock|insufficient/i.test(`${code} ${message}`) ||
      inner?.available_qty !== undefined ||
      inner?.available !== undefined
    ) {
      const items: OutOfStockItem[] = Array.isArray(rawStockItems)
        ? rawStockItems.map((i: any) => ({
            product_id: Number(i.product_id),
            warehouse_id: i.warehouse_id != null ? Number(i.warehouse_id) : null,
            available_qty: num(i.available_qty ?? i.available),
            requested_qty:
              i.requested_qty != null ? num(i.requested_qty) : i.requested != null ? num(i.requested) : undefined,
            description: i.description ?? i.name,
          }))
        : inner?.product_id != null
          ? [
              {
                product_id: Number(inner.product_id),
                warehouse_id: inner.warehouse_id != null ? Number(inner.warehouse_id) : null,
                available_qty: num(inner.available_qty ?? inner.available),
                requested_qty:
                  inner.requested_qty != null
                    ? num(inner.requested_qty)
                    : inner.requested != null
                      ? num(inner.requested)
                      : undefined,
                description: inner.description ?? inner.name,
              },
            ]
          : [];
      return { kind: "out_of_stock", message, items };
    }
  }

  return { kind: "other", message };
};

const normalizeBillRef = (b: any): ToSortBillRef | null => {
  if (b == null) return null;
  if (typeof b === "number") return { invoice_id: b, doc_number: `INV-${b}` };
  if (typeof b === "string") {
    const id = Number(b.replace(/^INV-/i, ""));
    return Number.isFinite(id) && id > 0 ? { invoice_id: id, doc_number: b } : null;
  }
  const id = Number(b.invoice_id ?? b.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return { invoice_id: id, doc_number: b.doc_number ?? b.invoice_number ?? `INV-${id}` };
};

// GET /api/approvals/desk?tab=to_sort
// Accepts either server-grouped groups[] or raw InvoiceSaleLine rows in items[] and groups by normalised description.
export const fetchToSortDesk = async (): Promise<{ groups: ToSortGroup[]; total: number }> => {
  const d = unwrapData<any>(await api.get("/approvals/desk", { params: { tab: "to_sort" } })) ?? {};
  const raw: any[] = Array.isArray(d.groups)
    ? d.groups
    : Array.isArray(d.rows)
      ? d.rows
      : Array.isArray(d.items)
        ? d.items
        : [];

  const isAlreadyGrouped = raw.length > 0 && (Array.isArray(raw[0]?.sale_line_ids) || Array.isArray(raw[0]?.line_ids));

  let groups: ToSortGroup[];
  if (isAlreadyGrouped || Array.isArray(d.groups)) {
    groups = raw.map((g: any, idx: number) => {
      const description = String(g.description ?? g.name ?? g.last_description ?? "");
      const ids = Array.isArray(g.sale_line_ids)
        ? g.sale_line_ids.map(Number).filter((n: number) => Number.isFinite(n))
        : Array.isArray(g.line_ids)
          ? g.line_ids.map(Number).filter((n: number) => Number.isFinite(n))
          : g.sale_line_id != null
            ? [Number(g.sale_line_id)]
            : [];
      const bills = (Array.isArray(g.bills) ? g.bills : Array.isArray(g.invoices) ? g.invoices : [])
        .map(normalizeBillRef)
        .filter(Boolean) as ToSortBillRef[];
      return {
        key: String(g.key ?? g.normalized_description ?? (description.toLowerCase().trim() || `group-${idx}`)),
        description,
        count: num(g.count ?? g.lines_count, ids.length || 1),
        total_qty: num(g.total_qty ?? g.qty ?? g.count, 1),
        last_price: num(g.last_price ?? g.unit_price, 0),
        last_date: g.last_date ?? g.latest_date ?? g.createdAt ?? null,
        bills,
        scanned_barcode: g.scanned_barcode ?? null,
        sale_line_ids: ids,
      };
    });
  } else {
    const byKey = new Map<string, ToSortGroup>();
    raw.forEach((row: any, idx: number) => {
      const description = String(row.description ?? row.name ?? "").trim() || `Unlisted #${row.sale_line_id ?? idx + 1}`;
      const key = description.toLowerCase();
      const lineId = Number(row.sale_line_id ?? row.id);
      const qty = num(row.qty, 1);
      const price = num(row.unit_price, 0);
      const rowDate = row.Invoice?.issued_date ?? row.issued_date ?? row.createdAt ?? null;
      const billRef = normalizeBillRef(row.Invoice ?? (row.invoice_id ? { invoice_id: row.invoice_id, invoice_number: row.invoice_number } : null));
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          key,
          description,
          count: 1,
          total_qty: qty,
          last_price: price,
          last_date: rowDate,
          bills: billRef ? [billRef] : [],
          scanned_barcode: row.scanned_barcode ?? null,
          sale_line_ids: Number.isFinite(lineId) ? [lineId] : [],
        });
      } else {
        existing.count += 1;
        existing.total_qty = Math.round((existing.total_qty + qty) * 1000) / 1000;
        if (Number.isFinite(lineId) && !existing.sale_line_ids.includes(lineId)) {
          existing.sale_line_ids.push(lineId);
        }
        if (billRef && !existing.bills.some((b) => b.invoice_id === billRef.invoice_id)) {
          existing.bills.push(billRef);
        }
        if (!existing.scanned_barcode && row.scanned_barcode) {
          existing.scanned_barcode = row.scanned_barcode;
        }
        if (rowDate && (!existing.last_date || Date.parse(rowDate) >= Date.parse(existing.last_date))) {
          existing.last_date = rowDate;
          existing.last_price = price;
        }
      }
    });
    groups = [...byKey.values()];
  }

  return { groups, total: groups.length || num(d.total ?? d.pagination?.total ?? d.count, 0) };
};

// POST /api/retail/desk/unlisted/link
export const linkUnlistedLines = async (input: { sale_line_ids: number[]; product_id: number }) =>
  unwrapData<any>(await api.post("/retail/desk/unlisted/link", input));

// POST /api/retail/desk/unlisted/create
export const createUnlistedItem = async (input: {
  sale_line_ids: number[];
  item: ProductInput | FamilyInput;
  opening_qty?: number | null;
}) => {
  const res = unwrapData<any>(await api.post("/retail/desk/unlisted/create", input)) ?? {};
  return {
    ...res,
    product: (res.product ?? null) as CatalogProduct | null,
    products: (Array.isArray(res.products) ? res.products : res.product ? [res.product] : []) as CatalogProduct[],
  };
};

// POST /api/retail/desk/unlisted/one-off
export const markUnlistedOneOff = async (input: { sale_line_ids: number[] }) =>
  unwrapData<any>(await api.post("/retail/desk/unlisted/one-off", input));

/** Normalises capitalized Sequelize SaleLines includes on invoice payloads. */
export const normalizeSaleLines = (invoice: any): InvoiceSaleLineRow[] => {
  if (!invoice) return [];
  const raw = invoice.SaleLines ?? invoice.sale_lines ?? invoice.saleLines ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map((l: any, idx: number) => {
    const prod = l.RetailProduct ?? l.product ?? null;
    const unit = l.Unit ?? l.unit ?? null;
    const serialList = Array.isArray(l.serials)
      ? l.serials.map(String)
      : Array.isArray(l.Serials)
        ? l.Serials.map((s: any) => String(s.serial_no ?? s))
        : l.serial_number
          ? [String(l.serial_number)]
          : undefined;
    const kind = l.line_kind === "catalog" ? "item" : (l.line_kind ?? "item");
    return {
      sale_line_id: Number(l.sale_line_id ?? l.id ?? idx + 1),
      invoice_id: l.invoice_id != null ? Number(l.invoice_id) : undefined,
      product_id: l.product_id != null ? Number(l.product_id) : null,
      line_kind: kind,
      scanned_barcode: l.scanned_barcode ?? null,
      description: String(l.description ?? prod?.name ?? `Item #${l.product_id ?? idx + 1}`),
      warehouse_id: l.warehouse_id != null ? Number(l.warehouse_id) : null,
      unit_id: l.unit_id != null ? Number(l.unit_id) : null,
      unit_label: String(l.unit_label ?? l.unit_name ?? unit?.unit_name ?? prod?.base_unit ?? "pcs"),
      unit_factor: num(l.unit_factor ?? unit?.factor, 1),
      qty: num(l.qty, 1),
      base_qty: num(l.base_qty ?? l.qty, 1),
      unit_price: num(l.unit_price, 0),
      price_source: String(l.price_source ?? "retail"),
      line_discount: num(l.line_discount, 0),
      bill_discount_share: num(l.bill_discount_share, 0),
      line_total: num(l.line_total, 0),
      serials: serialList && serialList.length > 0 ? serialList : undefined,
      status: l.status ?? "sold",
      sorted_at: l.sorted_at ?? null,
    };
  });
};

export type { CatalogProduct, CatalogUnit };
