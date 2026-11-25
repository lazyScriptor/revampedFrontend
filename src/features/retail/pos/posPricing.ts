import type { CatalogProduct, CatalogUnit } from "../api/catalog.types";
import type { SaleCartLine, CartFees } from "@/features/invoices/store/posCartStore";

export type CustomerPriceLevel = "retail" | "contractor" | "trade";

export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;
export const round3 = (n: number): number => Math.round((Number(n) || 0) * 1000) / 1000;

export const customerPriceLevel = (customer: any | null | undefined): CustomerPriceLevel => {
  const lvl = String(customer?.price_level || "retail").toLowerCase();
  if (lvl === "trade") return "trade";
  if (lvl === "contractor") return "contractor";
  return "retail";
};

/**
 * Resolves the unit price for a product/pack under the active customer price tier.
 * Mirrors the R3 backend price computation so client prices stay aligned before checkout.
 */
export function resolveCatalogPrice(
  product: Pick<CatalogProduct, "sell_price" | "contractor_price" | "trade_price">,
  unit: Pick<CatalogUnit, "factor" | "sell_price"> | null | undefined,
  priceLevel: CustomerPriceLevel,
  showContractorPrice = true,
): { unit_price: number; price_source: "retail" | "contractor" | "trade" } {
  const retailBase = Number(product.sell_price) || 0;
  let tierBase = retailBase;
  let source: "retail" | "contractor" | "trade" = "retail";

  if (showContractorPrice) {
    if (priceLevel === "trade" && product.trade_price != null) {
      tierBase = Number(product.trade_price);
      source = "trade";
    } else if ((priceLevel === "contractor" || priceLevel === "trade") && product.contractor_price != null) {
      tierBase = Number(product.contractor_price);
      source = "contractor";
    }
  }

  const factor = unit ? Number(unit.factor) || 1 : 1;
  if (unit && unit.sell_price != null && (source === "retail" || !product.contractor_price)) {
    return { unit_price: round2(Number(unit.sell_price)), price_source: source };
  }
  return { unit_price: round2(tierBase * factor), price_source: source };
}

export const computeSaleLineTotal = (qty: number, unitPrice: number, lineDiscount = 0): number =>
  Math.max(0, round2((Number(qty) || 0) * (Number(unitPrice) || 0) - (Number(lineDiscount) || 0)));

export const computeDiscountPct = (qty: number, unitPrice: number, discount: number): number => {
  const gross = (Number(qty) || 0) * (Number(unitPrice) || 0);
  if (gross <= 0 || discount <= 0) return 0;
  return round2((discount / gross) * 100);
};

export const formatPriceChangeSummary = (from: number, to: number): string => {
  const pct = from > 0 ? Math.round(((to - from) / from) * 100) : 0;
  const pctText = pct === 0 ? "" : ` (${pct > 0 ? `+${pct}` : `−${Math.abs(pct)}`}%)`;
  return `Price ${Number(from).toLocaleString()} → ${Number(to).toLocaleString()}${pctText}`;
};

const makeCartId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `sale-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function buildSaleLineFromProduct(
  product: CatalogProduct,
  opts: {
    unit?: CatalogUnit | null;
    warehouseId: number | null;
    priceLevel: CustomerPriceLevel;
    showContractorPrice?: boolean;
    qty?: number;
    scannedBarcode?: string | null;
  },
): SaleCartLine {
  const unit = opts.unit ?? null;
  const factor = unit ? Number(unit.factor) || 1 : 1;
  const qty = opts.qty ?? 1;
  const { unit_price, price_source } = resolveCatalogPrice(
    product,
    unit,
    opts.priceLevel,
    opts.showContractorPrice ?? true,
  );
  return {
    kind: "sale",
    cart_id: makeCartId(),
    line_kind: product.tracking === "service" ? "service" : "item",
    product_id: product.product_id,
    scanned_barcode: opts.scannedBarcode ?? null,
    description: product.name,
    warehouse_id: opts.warehouseId,
    unit_id: unit?.unit_id ?? null,
    unit_label: unit?.unit_name || product.base_unit || "pcs",
    unit_factor: factor,
    qty,
    base_qty: round3(qty * factor),
    unit_price,
    catalog_unit_price: unit_price,
    price_source,
    line_discount: 0,
    bill_discount_share: 0,
    line_total: computeSaleLineTotal(qty, unit_price, 0),
    image_url: product.image_url ?? null,
    variant_label: product.variant_label ?? null,
    tracking: product.tracking ?? "counted",
    serial_capture: product.serial_capture ?? null,
    allow_decimal: !!product.allow_decimal,
    base_unit: product.base_unit ?? "pcs",
    units: product.units ?? [],
    avg_cost: product.avg_cost ?? null,
    serials: product.tracking === "serial" ? [] : undefined,
  };
}

export function buildUnlistedSaleLine(input: {
  description: string;
  unit_price: number;
  qty: number;
  line_kind?: "unlisted" | "sundry";
  warehouseId: number | null;
  scanned_barcode?: string | null;
  unlisted_approval_token?: string | null;
}): SaleCartLine {
  const qty = input.qty > 0 ? input.qty : 1;
  const unit_price = round2(Math.max(0, input.unit_price));
  return {
    kind: "sale",
    cart_id: makeCartId(),
    line_kind: input.line_kind ?? "unlisted",
    product_id: null,
    scanned_barcode: input.scanned_barcode ?? null,
    description: input.description.trim(),
    warehouse_id: input.warehouseId,
    unit_id: null,
    unit_label: "pcs",
    unit_factor: 1,
    qty,
    base_qty: round3(qty),
    unit_price,
    catalog_unit_price: unit_price,
    price_source: "manual",
    line_discount: 0,
    bill_discount_share: 0,
    line_total: computeSaleLineTotal(qty, unit_price, 0),
    allow_decimal: false,
    base_unit: "pcs",
    unlisted_approval_token: input.unlisted_approval_token ?? null,
  };
}

/** Collects approval tokens for POST /api/invoices, preserving both bill-level map and line-level overrides. */
export function buildSaleInvoicePayload(opts: {
  customerId: number;
  saleLines: SaleCartLine[];
  fees: CartFees;
  paymentAmount: number;
  paymentMethod: string;
  settleNow: boolean;
  jobSite?: string;
  customerPo?: string;
  issuedDateIso?: string | null;
  billDiscountApprovalToken?: string | null;
}) {
  const approvalTokens: Record<string, string> = {};
  if (opts.billDiscountApprovalToken) {
    approvalTokens.discount_over_limit = opts.billDiscountApprovalToken;
  }

  const sale_items = opts.saleLines.map((l) => {
    const lineTokens: Record<string, string> = {};
    if (l.price_approval_token) {
      approvalTokens.price_change = l.price_approval_token;
      lineTokens.price_change = l.price_approval_token;
    }
    if (l.discount_approval_token) {
      approvalTokens.discount_over_limit = l.discount_approval_token;
      lineTokens.discount_over_limit = l.discount_approval_token;
    }
    if (l.stock_approval_token) {
      approvalTokens.negative_stock = l.stock_approval_token;
      lineTokens.negative_stock = l.stock_approval_token;
    }
    if (l.unlisted_approval_token) {
      approvalTokens.unlisted_item = l.unlisted_approval_token;
      lineTokens.unlisted_item = l.unlisted_approval_token;
    }

    return {
      product_id: l.product_id,
      line_kind: l.line_kind,
      description: l.description,
      warehouse_id: l.warehouse_id,
      unit_id: l.unit_id,
      qty: l.qty,
      unit_price: l.unit_price,
      line_discount: l.line_discount || 0,
      ...(l.serials && l.serials.length > 0 ? { serials: l.serials } : {}),
      ...(l.scanned_barcode ? { scanned_barcode: l.scanned_barcode } : {}),
      ...(Object.keys(lineTokens).length > 0 ? { approval_tokens: lineTokens } : {}),
    };
  });

  const paymentAmount = round2(Math.max(0, opts.paymentAmount));

  // Release 4: every bill discount carries a reason (the server refuses one without).
  const discountReason = (opts.fees.discount || 0) > 0 ? opts.fees.discount_reason ?? null : null;

  return {
    customer_id: opts.customerId,
    items: [],
    sale_items,
    ...(discountReason ? { discount_reason: discountReason } : {}),
    fees: {
      transport: round2(opts.fees.transport || 0),
      discount: round2(opts.fees.discount || 0),
      advance: paymentAmount,
      advance_payment_method: opts.paymentMethod,
    },
    payment: {
      amount: paymentAmount,
      method: opts.paymentMethod,
    },
    settle_now: opts.settleNow,
    ...(opts.jobSite?.trim() ? { job_site: opts.jobSite.trim() } : {}),
    ...(opts.customerPo?.trim() ? { customer_po: opts.customerPo.trim() } : {}),
    ...(opts.issuedDateIso ? { issued_date: opts.issuedDateIso } : {}),
    ...(Object.keys(approvalTokens).length > 0 ? { approval_tokens: approvalTokens } : {}),
  };
}

/**
 * POST /api/invoices body for a mixed bill (machines + goods on one bill). One payment (fees.advance with
 * its method, recorded once as for rentals), no settle_now: a bill with machines out can't close.
 */
export function buildMixedInvoicePayload(opts: {
  customerId: number;
  onBehalfCustomerId?: number | null;
  rentalItems: unknown[];
  saleLines: SaleCartLine[];
  fees: CartFees;
  paymentMethod: string;
  jobSite?: string;
  customerPo?: string;
  issuedDateIso?: string | null;
  billDiscountApprovalToken?: string | null;
}) {
  const base = buildSaleInvoicePayload({
    customerId: opts.customerId,
    saleLines: opts.saleLines,
    fees: opts.fees,
    paymentAmount: opts.fees.advance || 0,
    paymentMethod: opts.paymentMethod,
    settleNow: false,
    jobSite: opts.jobSite,
    customerPo: opts.customerPo,
    issuedDateIso: opts.issuedDateIso,
    billDiscountApprovalToken: opts.billDiscountApprovalToken,
  });
  const { payment: _payment, settle_now: _settleNow, ...rest } = base;
  return {
    ...rest,
    items: opts.rentalItems,
    borrowed_on_behalf_of_customer_id: opts.onBehalfCustomerId ?? null,
  };
}
