import { create } from "zustand";
import type { SetStateAction } from "react";
import { addDaysLocal } from "@/lib/dates";
import { calculateLineMath, type CartItem } from "../components/PosLedgerPanel";

// ─── Line types ───────────────────────────────────────────────────────────────
// A rental line is exactly today's CartItem plus a `kind` tag. The tag is
// internal: it is stripped (see `toRentalPayload`) before anything is sent to
// the API or a receipt, so rental requests stay byte-for-byte what they were.
export type RentalCartLine = CartItem & { kind: "rental" };

// Mirrors INVOICE_SALE_LINES (retail plan §4.3). Declared for the retail steps;
// nothing creates sale lines yet.
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
  price_source: "retail" | "contractor" | "manual";
  line_discount: number;
  bill_discount_share: number;
  line_total: number;
}

export type CartLine = RentalCartLine | SaleCartLine;

export interface CartFees {
  transport: number;
  discount: number;
  advance: number;
  advance_payment_method?: string;
}

const EMPTY_FEES: CartFees = { transport: 0, discount: 0, advance: 0 };

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

  setSelectedCustomer: (c: any | null) => void;
  setOnBehalfOfCustomer: (c: any | null) => void;
  setLines: (action: SetStateAction<CartLine[]>) => void;
  /** React-style setter over the rental lines only; sale lines are left alone. */
  setRentalLines: (action: SetStateAction<CartItem[]>) => void;
  setFees: (action: SetStateAction<any>) => void;
  setBillDate: (v: string | null) => void;
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

  setSelectedCustomer: (selectedCustomer) => set({ selectedCustomer }),
  setOnBehalfOfCustomer: (onBehalfOfCustomer) => set({ onBehalfOfCustomer }),
  setLines: (action) => set((s) => ({ lines: resolve(action, s.lines) })),
  setRentalLines: (action) =>
    set((s) => {
      const prev = selectRentalLines(s.lines);
      const next = resolve<CartItem[]>(action, prev);
      if (next === prev) return s;
      return { lines: [...next.map(tagRental), ...selectSaleLines(s.lines)] };
    }),
  setFees: (action) => set((s) => ({ fees: resolve(action, s.fees) })),
  setBillDate: (billDate) => set({ billDate }),
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
  clearCart: () => set({ lines: [], fees: { ...EMPTY_FEES }, billDate: null }),
  resetAll: () =>
    set({
      selectedCustomer: null,
      onBehalfOfCustomer: null,
      lines: [],
      fees: { ...EMPTY_FEES },
      billDate: null,
    }),
}));
