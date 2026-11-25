import { create } from "zustand";
import type { SetStateAction } from "react";
import { addDaysLocal } from "@/lib/dates";
import { calculateLineMath, type CartItem } from "../components/PosLedgerPanel";
import type { CatalogProduct, CatalogUnit, SerialCapture, Tracking } from "@/features/retail/api/catalog.types";
import type { OutOfStockItem, PriceChangeItem } from "@/features/retail/api/pos.api";
import {
  computeSaleLineTotal,
  resolveCatalogPrice,
  round3,
  type CustomerPriceLevel,
} from "@/features/retail/pos/posPricing";

// ─── Line types ───────────────────────────────────────────────────────────────
// A rental line is exactly today's CartItem plus a `kind` tag. The tag is
// internal: it is stripped (see `toRentalPayload`) before anything is sent to
// the API or a receipt, so rental requests stay byte-for-byte what they were.
export type RentalCartLine = CartItem & { kind: "rental" };

// Mirrors INVOICE_SALE_LINES (retail plan §4.3) plus transient POS checkout metadata.
export interface SaleCartLine {
  kind: "sale";
  cart_id: string;
  line_kind: "item" | "unlisted" | "sundry" | "service";
  product_id: number | null;
  scanned_barcode?: string | null;
  description: string;
  warehouse_id: number | null;
  unit_id: number | null;
  unit_label: string;
  unit_factor: number;
  qty: number;
  base_qty: number;
  unit_price: number;
  price_source: "retail" | "contractor" | "trade" | "manual";
  line_discount: number;
  bill_discount_share: number;
  line_total: number;
  // R3 UI & validation metadata (not persisted directly to SQL columns)
  image_url?: string | null;
  variant_label?: string | null;
  tracking?: Tracking;
  serial_capture?: SerialCapture | null;
  allow_decimal?: boolean;
  base_unit?: string;
  units?: CatalogUnit[];
  catalog_unit_price?: number;
  avg_cost?: number | null;
  serials?: string[];
  price_approval_token?: string | null;
  discount_approval_token?: string | null;
  stock_approval_token?: string | null;
  unlisted_approval_token?: string | null;
  out_of_stock?: boolean;
  available_qty?: number | null;
}

export type CartLine = RentalCartLine | SaleCartLine;

export interface CartFees {
  transport: number;
  discount: number;
  advance: number;
  advance_payment_method?: string;
  /** Required by the server when discount > 0 (Release 4 reason chips). */
  discount_reason?: import("@/features/activity/types").ReasonValue | null;
}

const EMPTY_FEES: CartFees = { transport: 0, discount: 0, advance: 0 };

const newIdempotencyKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `cart-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// ─── Pure helpers / selectors ─────────────────────────────────────────────────
export const isRentalLine = (l: CartLine): l is RentalCartLine => l.kind === "rental";
export const isSaleLine = (l: CartLine): l is SaleCartLine => l.kind === "sale";

export const selectRentalLines = (lines: CartLine[]): RentalCartLine[] => lines.filter(isRentalLine);
export const selectSaleLines = (lines: CartLine[]): SaleCartLine[] => lines.filter(isSaleLine);

export const selectRentalSubtotal = (lines: CartLine[]): number =>
  selectRentalLines(lines).reduce((total, item) => total + calculateLineMath(item).lineCost, 0);

export const selectSaleSubtotal = (lines: CartLine[]): number =>
  selectSaleLines(lines).reduce((total, l) => total + l.line_total, 0);

/** Removes the internal `kind` tag so API payloads and receipts are unchanged. */
export const toRentalPayload = (l: CartItem | RentalCartLine): CartItem => {
  const { kind: _kind, ...rest } = l as RentalCartLine;
  return rest;
};

const tagRental = (item: CartItem | RentalCartLine): RentalCartLine =>
  (item as RentalCartLine).kind === "rental" ? (item as RentalCartLine) : { ...item, kind: "rental" };

const resolve = <T>(action: SetStateAction<T>, prev: T): T =>
  typeof action === "function" ? (action as (p: T) => T)(prev) : action;

// ─── Store ────────────────────────────────────────────────────────────────────
export interface PosCartState {
  selectedCustomer: any | null;
  onBehalfOfCustomer: any | null;
  lines: CartLine[];
  fees: CartFees;
  /** Optional bill date/time (local "YYYY-MM-DDTHH:mm"); null means dated now. */
  billDate: string | null;
  jobSite: string;
  customerPo: string;
  idempotencyKey: string;
  billDiscountApprovalToken: string | null;
  /** A machine picked while the walk-in is selected; added once a named customer is chosen. */
  pendingRental: RentalCartLine | null;
  /** True while the customer search should be open asking for a named customer (D2). */
  customerPrompt: boolean;

  /** Walk-in can't rent: keeps the machine aside and opens the customer search. */
  holdRentalForCustomer: (item: CartItem | RentalCartLine) => void;
  /** Cancels the prompt and drops the held machine. */
  cancelCustomerPrompt: () => void;
  setSelectedCustomer: (c: any | null) => void;
  setOnBehalfOfCustomer: (c: any | null) => void;
  setLines: (action: SetStateAction<CartLine[]>) => void;
  /** React-style setter over the rental lines only; sale lines are left alone. */
  setRentalLines: (action: SetStateAction<CartItem[]>) => void;
  /** React-style setter over the sale lines only; rental lines are left alone. */
  setSaleLines: (action: SetStateAction<SaleCartLine[]>) => void;
  addSaleLine: (line: SaleCartLine) => void;
  updateSaleLine: (
    cartId: string,
    patch: Partial<SaleCartLine> | ((prev: SaleCartLine) => SaleCartLine),
  ) => void;
  removeSaleLine: (cartId: string) => void;
  setFees: (action: SetStateAction<any>) => void;
  setBillDate: (v: string | null) => void;
  setJobSite: (v: string) => void;
  setCustomerPo: (v: string) => void;
  setBillDiscountApprovalToken: (token: string | null) => void;
  /** Updates catalog prices on non-manual sale lines when customer price_level changes. */
  applyCustomerPriceLevel: (
    byId: Map<number, CatalogProduct>,
    priceLevel: CustomerPriceLevel,
    showContractorPrice?: boolean,
  ) => void;
  applyServerPriceChanges: (changes: PriceChangeItem[]) => void;
  markLinesOutOfStock: (items: OutOfStockItem[]) => void;
  /** Moves every rental line's out date to `day`, keeping each line's length. */
  applyBillDateToLines: (day: string) => void;
  /** Clears lines, fees and bill date (keeps the customer), like "Clear cart". */
  clearCart: () => void;
  /** Clears everything, including the customers (after a dispatch / on leaving POS). */
  resetAll: () => void;
}

export const usePosCartStore = create<PosCartState>((set) => ({
  selectedCustomer: null,
  onBehalfOfCustomer: null,
  lines: [],
  fees: EMPTY_FEES,
  billDate: null,
  jobSite: "",
  customerPo: "",
  idempotencyKey: newIdempotencyKey(),
  billDiscountApprovalToken: null,
  pendingRental: null,
  customerPrompt: false,

  holdRentalForCustomer: (item) => set({ pendingRental: tagRental(item), customerPrompt: true }),
  cancelCustomerPrompt: () => set({ pendingRental: null, customerPrompt: false }),
  setSelectedCustomer: (selectedCustomer) =>
    set((s) => {
      const walkIn = Boolean(selectedCustomer?.is_walk_in);
      // The walk-in can't take machines out: keep the current customer while any are in the cart.
      if (walkIn && selectRentalLines(s.lines).length > 0) return s;
      if (selectedCustomer && !walkIn && s.pendingRental) {
        return {
          selectedCustomer,
          lines: [...selectRentalLines(s.lines), s.pendingRental, ...selectSaleLines(s.lines)],
          pendingRental: null,
          customerPrompt: false,
        };
      }
      // Picking the walk-in (or nobody) leaves a held machine waiting, a named customer clears the prompt.
      return { selectedCustomer, ...(selectedCustomer && !walkIn ? { customerPrompt: false } : {}) };
    }),
  setOnBehalfOfCustomer: (onBehalfOfCustomer) => set({ onBehalfOfCustomer }),
  setLines: (action) => set((s) => ({ lines: resolve(action, s.lines) })),
  setRentalLines: (action) =>
    set((s) => {
      const prev = selectRentalLines(s.lines);
      const next = resolve<CartItem[]>(action, prev);
      if (next === prev) return s;
      return { lines: [...next.map(tagRental), ...selectSaleLines(s.lines)] };
    }),
  setSaleLines: (action) =>
    set((s) => {
      const prev = selectSaleLines(s.lines);
      const next = resolve<SaleCartLine[]>(action, prev);
      if (next === prev) return s;
      return { lines: [...selectRentalLines(s.lines), ...next] };
    }),
  addSaleLine: (line) =>
    set((s) => {
      const rentals = selectRentalLines(s.lines);
      const sales = selectSaleLines(s.lines);
      const mergeable =
        line.line_kind === "item" &&
        line.product_id != null &&
        line.tracking !== "serial";
      if (mergeable) {
        const idx = sales.findIndex(
          (existing) =>
            existing.line_kind === "item" &&
            existing.product_id === line.product_id &&
            (existing.unit_id ?? null) === (line.unit_id ?? null) &&
            (existing.warehouse_id ?? null) === (line.warehouse_id ?? null) &&
            existing.price_source !== "manual",
        );
        if (idx >= 0) {
          const cur = sales[idx];
          const nextQty = round3(cur.qty + line.qty);
          const nextFactor = cur.unit_factor || 1;
          const updated: SaleCartLine = {
            ...cur,
            qty: nextQty,
            base_qty: round3(nextQty * nextFactor),
            line_total: computeSaleLineTotal(nextQty, cur.unit_price, cur.line_discount),
            out_of_stock: false,
            available_qty: undefined,
            stock_approval_token: null,
          };
          const nextSales = sales.map((x, i) => (i === idx ? updated : x));
          return { lines: [...rentals, ...nextSales] };
        }
      }
      return { lines: [...rentals, ...sales, line] };
    }),
  updateSaleLine: (cartId, patch) =>
    set((s) => ({
      lines: s.lines.map((line) => {
        if (!isSaleLine(line) || line.cart_id !== cartId) return line;
        const next = typeof patch === "function" ? patch(line) : { ...line, ...patch };
        const qty = Math.max(0, Number(next.qty) || 0);
        const factor = Number(next.unit_factor) || 1;
        return {
          ...next,
          qty,
          base_qty: round3(qty * factor),
          line_total: computeSaleLineTotal(qty, next.unit_price, next.line_discount),
        };
      }),
    })),
  removeSaleLine: (cartId) =>
    set((s) => ({
      lines: s.lines.filter((l) => !(isSaleLine(l) && l.cart_id === cartId)),
    })),
  setFees: (action) => set((s) => ({ fees: resolve(action, s.fees) })),
  setBillDate: (billDate) => set({ billDate }),
  setJobSite: (jobSite) => set({ jobSite }),
  setCustomerPo: (customerPo) => set({ customerPo }),
  setBillDiscountApprovalToken: (billDiscountApprovalToken) => set({ billDiscountApprovalToken }),
  applyCustomerPriceLevel: (byId, priceLevel, showContractorPrice = true) =>
    set((s) => ({
      lines: s.lines.map((line) => {
        if (!isSaleLine(line) || line.line_kind !== "item" || line.product_id == null) return line;
        if (line.price_source === "manual" || line.price_approval_token) return line;
        const product = byId.get(line.product_id);
        if (!product) return line;
        const unit = (product.units ?? line.units ?? []).find((u) => (u.unit_id ?? null) === (line.unit_id ?? null)) ?? null;
        const { unit_price, price_source } = resolveCatalogPrice(product, unit, priceLevel, showContractorPrice);
        return {
          ...line,
          unit_price,
          catalog_unit_price: unit_price,
          price_source,
          line_total: computeSaleLineTotal(line.qty, unit_price, line.line_discount),
        };
      }),
    })),
  applyServerPriceChanges: (changes) =>
    set((s) => ({
      lines: s.lines.map((line) => {
        if (!isSaleLine(line) || line.product_id == null) return line;
        const hit = changes.find(
          (c) =>
            Number(c.product_id) === Number(line.product_id) &&
            (c.unit_id === undefined || c.unit_id === null ? (line.unit_id ?? null) === null : Number(c.unit_id) === Number(line.unit_id)),
        ) ?? changes.find((c) => Number(c.product_id) === Number(line.product_id));
        if (!hit) return line;
        const nextPrice = Number(hit.to);
        return {
          ...line,
          unit_price: nextPrice,
          catalog_unit_price: nextPrice,
          price_source: line.price_source === "manual" ? "retail" : line.price_source,
          price_approval_token: null,
          line_total: computeSaleLineTotal(line.qty, nextPrice, line.line_discount),
        };
      }),
    })),
  markLinesOutOfStock: (items) =>
    set((s) => ({
      lines: s.lines.map((line) => {
        if (!isSaleLine(line) || line.product_id == null) return line;
        const hit = items.find(
          (i) =>
            Number(i.product_id) === Number(line.product_id) &&
            (i.warehouse_id == null || line.warehouse_id == null || Number(i.warehouse_id) === Number(line.warehouse_id)),
        );
        if (!hit) return line;
        return {
          ...line,
          out_of_stock: true,
          available_qty: hit.available_qty,
        };
      }),
    })),
  applyBillDateToLines: (day) =>
    set((s) => ({
      lines: s.lines.map((item) => {
        if (!isRentalLine(item)) return item;
        const shift = Math.round(
          (new Date(`${day}T00:00:00`).getTime() - new Date(`${item.borrow_date}T00:00:00`).getTime()) / 86_400_000,
        );
        if (!shift) return item;
        return {
          ...item,
          borrow_date: day,
          expected_return_date: addDaysLocal(item.expected_return_date, shift),
        };
      }),
    })),
  clearCart: () =>
    set({
      lines: [],
      fees: { ...EMPTY_FEES },
      billDate: null,
      jobSite: "",
      customerPo: "",
      billDiscountApprovalToken: null,
      pendingRental: null,
      customerPrompt: false,
      idempotencyKey: newIdempotencyKey(),
    }),
  resetAll: () =>
    set({
      selectedCustomer: null,
      onBehalfOfCustomer: null,
      lines: [],
      fees: { ...EMPTY_FEES },
      billDate: null,
      jobSite: "",
      customerPo: "",
      billDiscountApprovalToken: null,
      pendingRental: null,
      customerPrompt: false,
      idempotencyKey: newIdempotencyKey(),
    }),
}));
