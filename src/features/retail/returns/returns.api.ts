import { api } from "@/lib/api";
import { unwrapData } from "../api/http";
import type { SaleReturnInput } from "./returnsModel";

// Shapes assumed from the R5-backend prompt (docs/RETAIL_POS_BUILD_PROMPTS.md):
//  POST /api/invoices/:id/sale-returns  (Idempotency-Key header) -> {status, message, data: {invoice, settlement: {refunded, credited, payment_id}}}
//  GET  /api/retail/sale-returns/find?q=&product_id=&customer_id=&days=90 -> rows of recent sold lines
export interface SaleReturnResult {
  invoice: any;
  settlement: { refunded: number; credited: number; payment_id: number | null };
}

export const postSaleReturn = async (invoiceId: number, input: SaleReturnInput, idempotencyKey: string): Promise<SaleReturnResult> => {
  const res = await api.post(`/invoices/${invoiceId}/sale-returns`, input, { headers: { "Idempotency-Key": idempotencyKey } });
  const d = unwrapData<any>(res) ?? {};
  const s = d.settlement ?? {};
  return {
    invoice: d.invoice ?? null,
    settlement: { refunded: Number(s.refunded) || 0, credited: Number(s.credited) || 0, payment_id: s.payment_id ?? null },
  };
};

export interface FindReturnQuery {
  q?: string;
  product_id?: number | null;
  customer_id?: number | null;
  days?: number;
}

export interface FindReturnRow {
  invoice_id: number;
  doc_number: string;
  issued_date: string | null;
  customer_name: string;
  sale_line_id: number;
  product_id: number | null;
  description: string;
  unit_label: string;
  qty_sold: number;
  qty_returnable: number;
  unit_price: number;
}

const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const fetchReturnFind = async (q: FindReturnQuery): Promise<FindReturnRow[]> => {
  const params: Record<string, unknown> = { days: q.days ?? 90 };
  if (q.q?.trim()) params.q = q.q.trim();
  if (q.product_id) params.product_id = q.product_id;
  if (q.customer_id) params.customer_id = q.customer_id;
  const d = unwrapData<any>(await api.get("/retail/sale-returns/find", { params })) ?? {};
  const raw: any[] = Array.isArray(d) ? d : (d.rows ?? d.lines ?? d.items ?? []);
  return raw.map((r) => {
    const cust = r.Customer ?? r.customer;
    const name = r.customer_name ?? (cust ? [cust.first_name, cust.last_name].filter(Boolean).join(" ") : "");
    const id = num(r.invoice_id ?? r.Invoice?.invoice_id);
    return {
      invoice_id: id,
      doc_number: String(r.doc_number ?? r.invoice_number ?? `INV-${id}`),
      issued_date: r.issued_date ?? r.invoice_date ?? r.createdAt ?? null,
      customer_name: String(name || ""),
      sale_line_id: num(r.sale_line_id ?? r.id),
      product_id: r.product_id != null ? num(r.product_id) : null,
      description: String(r.description ?? r.item_name ?? ""),
      unit_label: String(r.unit_label ?? r.unit ?? ""),
      qty_sold: num(r.qty_sold ?? r.qty),
      qty_returnable: num(r.qty_returnable ?? r.returnable_qty),
      unit_price: num(r.unit_price),
    };
  });
};

/** A 409/403 that asks for a manager's approval (return without the bill, or after the shop's day limit). */
export const needsReturnApproval = (err: any): boolean => {
  const status = err?.response?.status ?? err?.status;
  if (status !== 403 && status !== 409 && status !== 428) return false;
  const data = err?.response?.data ?? err?.data ?? {};
  const text = `${data.code ?? ""} ${data.data?.code ?? ""} ${data.message ?? ""} ${data.required_approval ?? ""}`;
  return /approval|return_no_bill/i.test(text);
};
