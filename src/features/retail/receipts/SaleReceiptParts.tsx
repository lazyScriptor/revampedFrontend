import type { ReactNode } from "react";
import type { ReceiptLabels } from "@/features/invoices/components/InvoiceReceipt";
import { formatQty } from "../format";
import { returnWasRefunded, type SaleReturnRow, type SoldBillTotals, type SoldReceiptLine } from "./receiptModel";

// The retail parts of a printed bill: the goods list, the Rent · Items · … totals, the short sale
// receipt and the return slip. Receipts stay black on white whatever the app theme (they are printed),
// every figure is tabular, and nothing here knows about the print agent: it prints the DOM it is given.

const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const rule = (style: "solid" | "dashed" = "solid") => <div style={{ borderTop: `1px ${style} #000000`, margin: "4px 0" }} />;

export interface PartsCtx {
  t: ReceiptLabels;
  fmt: (n: number) => string;
  is58mm: boolean;
  isSi: boolean;
}

const sizes = (c: PartsCtx) => ({
  small: c.is58mm ? "8.5px" : "9.5px",
  big: c.is58mm ? "13px" : "15px",
  bold: c.isSi ? 800 : 700,
});

const Row = ({ label, value, strong, size, bold }: { label: ReactNode; value: ReactNode; strong?: boolean; size?: string; bold: number }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", fontWeight: strong ? bold : undefined, fontSize: size }}>
    <span>{label}</span>
    <span style={{ whiteSpace: "nowrap", ...NUM }}>{value}</span>
  </div>
);

/** "−3 returned" for one line, or nothing when none came back. */
const ReturnedNote = ({ line, c }: { line: SoldReceiptLine; c: PartsCtx }) =>
  line.returnedQty > 0 ? (
    <div data-testid="receipt-returned-note" style={{ fontSize: sizes(c).small, ...NUM }}>
      {c.t.returnedQty(formatQty(line.returnedQty))}
    </div>
  ) : null;

/** The goods on a bill: name and total, then "3 pcs × Rs. 1,000.00" (and the line's own discount). */
export function SoldItemsBlock({ lines, c, heading }: { lines: SoldReceiptLine[]; c: PartsCtx; heading: string }) {
  const { small, bold } = sizes(c);
  if (lines.length === 0) return null;
  return (
    <div data-testid="receipt-sold-section">
      <div style={{ fontWeight: bold, fontSize: small, marginBottom: "2px" }}>{heading}</div>
      {lines.map((line) => (
        <div key={line.id} data-row="sold" className="avoid-break" style={{ marginBottom: "4px", breakInside: "avoid", pageBreakInside: "avoid" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", fontWeight: bold }}>
            <span style={{ textDecoration: line.fullyReturned ? "line-through" : "none" }}>{line.name}</span>
            <span style={{ whiteSpace: "nowrap", textDecoration: line.fullyReturned ? "line-through" : "none", ...NUM }}>{c.fmt(line.lineTotal)}</span>
          </div>
          <div style={{ fontSize: small, ...NUM }}>
            {formatQty(line.qty)} {line.unit} × {c.fmt(line.unitPrice)}
            {line.lineDiscount > 0 ? ` · ${c.t.off(c.fmt(line.lineDiscount))}` : ""}
          </div>
          <ReturnedNote line={line} c={c} />
        </div>
      ))}
    </div>
  );
}

/**
 * Rent · Items · Transport · Discount · Returned · Total, then what was paid and what is left (or the
 * change handed back). Used by the full bill for a sale or a mixed bill.
 */
export function SoldTotalsBlock({ totals, c }: { totals: SoldBillTotals; c: PartsCtx }) {
  const { small, big, bold } = sizes(c);
  const { t, fmt } = c;
  const showPaymentRows = totals.changeDue <= 0;
  const firstMethod = totals.payments[0]?.method;
  return (
    <div data-testid="receipt-sold-totals">
      {totals.kind === "mixed" && <Row label={t.sRent} value={fmt(totals.rent)} bold={bold} />}
      <Row label={t.sItems} value={fmt(totals.items)} bold={bold} />
      {totals.transport > 0 && <Row label={t.mTransport} value={`+${fmt(totals.transport)}`} bold={bold} />}
      {totals.discount > 0 && <Row label={t.mDiscount} value={`-${fmt(totals.discount)}`} bold={bold} />}
      {totals.returned > 0 && <Row label={t.sReturned} value={`-${fmt(totals.returned)}`} bold={bold} />}
      {totals.lateFees > 0 && <Row label={t.mLateFees} value={`+${fmt(totals.lateFees)}`} bold={bold} />}
      <div style={{ marginTop: "2px" }}>
        <Row label={t.mTotal} value={fmt(totals.total)} strong size={big} bold={bold} />
      </div>
      {showPaymentRows &&
        totals.payments.map((p, i) => (
          <div key={i} style={{ fontSize: small }}>
            <Row label={`${p.refund ? t.sRefund : t.sPaid} · ${p.method}`} value={`${p.refund ? "-" : ""}${fmt(p.amount)}`} bold={bold} />
          </div>
        ))}
      {showPaymentRows && totals.payments.length > 1 && <Row label={t.mPaid} value={fmt(totals.paid)} bold={bold} />}
      {!showPaymentRows && <Row label={firstMethod ? `${t.sPaid} · ${firstMethod}` : t.sPaid} value={fmt(totals.tendered)} bold={bold} />}
      <div style={{ marginTop: "2px" }}>
        {totals.changeDue > 0 ? (
          <Row label={t.sChange} value={fmt(totals.changeDue)} strong size={big} bold={bold} />
        ) : (
          <Row label={t.mBalance} value={totals.balance === 0 ? t.paidInFull : fmt(totals.balance)} strong size={big} bold={bold} />
        )}
      </div>
    </div>
  );
}

export interface ShortSaleReceiptProps {
  c: PartsCtx;
  company: { name: string; address: string; contactLine: string };
  docNumber: string;
  dateTime: string;
  cashier: string | null;
  lines: SoldReceiptLine[];
  totals: SoldBillTotals;
  footer: string;
  barcode: ReactNode;
}

/**
 * The short retail receipt of a sale-only bill: shop, bill number, date and time, cashier, items,
 * total, paid, change, footer, barcode. No ID card line, terms, signatures, return dates or late fees.
 */
export function ShortSaleReceiptBody({ c, company, docNumber, dateTime, cashier, lines, totals, footer, barcode }: ShortSaleReceiptProps) {
  const { small, big, bold } = sizes(c);
  const { t, fmt } = c;
  const hasExtras = totals.transport > 0 || totals.discount > 0 || totals.returned > 0;
  const paidShown = totals.changeDue > 0 ? totals.tendered : totals.paid;
  return (
    <div data-testid="short-sale-receipt">
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: c.is58mm ? "14px" : "16px", lineHeight: 1.15, textTransform: "uppercase" }}>{company.name}</div>
        {company.address && <div style={{ fontSize: small }}>{company.address}</div>}
        {company.contactLine && <div style={{ fontSize: small, ...NUM }}>{company.contactLine}</div>}
      </div>
      {rule()}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "6px" }}>
        <span style={{ fontWeight: bold }}>{t.sReceipt}</span>
        <span style={{ fontWeight: bold, ...NUM }}>{docNumber}</span>
      </div>
      <div style={{ fontSize: small, ...NUM }}>{dateTime}</div>
      {cashier && (
        <div style={{ fontSize: small }}>
          {t.sCashier}: {cashier}
        </div>
      )}
      {rule()}
      {lines.map((line) => (
        <div key={line.id} data-row="sold" className="avoid-break" style={{ marginBottom: "3px", breakInside: "avoid", pageBreakInside: "avoid" }}>
          <div style={{ fontWeight: bold, textDecoration: line.fullyReturned ? "line-through" : "none" }}>{line.name}</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", fontSize: small, ...NUM }}>
            <span>
              {formatQty(line.qty)} {line.unit} × {fmt(line.unitPrice)}
            </span>
            <span style={{ whiteSpace: "nowrap", textDecoration: line.fullyReturned ? "line-through" : "none" }}>{fmt(line.lineTotal)}</span>
          </div>
          {line.lineDiscount > 0 && <div style={{ fontSize: small, ...NUM }}>{t.off(fmt(line.lineDiscount))}</div>}
          <ReturnedNote line={line} c={c} />
        </div>
      ))}
      {rule()}
      {hasExtras && <Row label={t.sItems} value={fmt(totals.items)} bold={bold} />}
      {totals.transport > 0 && <Row label={t.mTransport} value={`+${fmt(totals.transport)}`} bold={bold} />}
      {totals.discount > 0 && <Row label={t.mDiscount} value={`-${fmt(totals.discount)}`} bold={bold} />}
      {totals.returned > 0 && <Row label={t.sReturned} value={`-${fmt(totals.returned)}`} bold={bold} />}
      <Row label={t.mTotal} value={fmt(totals.total)} strong size={big} bold={bold} />
      <Row label={t.sPaid} value={fmt(paidShown)} bold={bold} />
      {totals.changeDue > 0 ? (
        <Row label={t.sChange} value={fmt(totals.changeDue)} strong bold={bold} />
      ) : (
        totals.balance > 0 && <Row label={t.mBalance} value={fmt(totals.balance)} strong bold={bold} />
      )}
      {footer.trim() && (
        <>
          {rule("dashed")}
          <div data-testid="sale-footer" style={{ textAlign: "center", fontSize: small, whiteSpace: "pre-line" }}>
            {footer.trim()}
          </div>
        </>
      )}
      {barcode}
      <div style={{ textAlign: "center", marginTop: "4px", fontSize: small }}>{t.thankYou(company.name)}</div>
      <div style={{ textAlign: "center", fontSize: "7.5px" }}>{t.poweredBy}</div>
      <div style={{ height: "2mm" }} />
    </div>
  );
}

export interface ReturnSlipProps {
  c: PartsCtx;
  company: { name: string; address: string; contactLine: string };
  docNumber: string;
  dateTime: string;
  ret: SaleReturnRow;
  footer: string;
  /** "a4" gets a roomier, simple layout. */
  a4?: boolean;
}

/** What went back and what happened to the money, for one return of sold items. */
export function ReturnSlipBody({ c, company, docNumber, dateTime, ret, footer, a4 }: ReturnSlipProps) {
  const { small, big, bold } = sizes(c);
  const { t, fmt } = c;
  const refunded = returnWasRefunded(ret);
  const amountBack = ret.settlement.refunded > 0 ? ret.settlement.refunded : ret.value;
  return (
    <div data-testid="return-slip" style={a4 ? { fontSize: "12px" } : undefined}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: c.is58mm ? "14px" : a4 ? "20px" : "16px", lineHeight: 1.15, textTransform: "uppercase" }}>{company.name}</div>
        {company.address && <div style={{ fontSize: small }}>{company.address}</div>}
        {company.contactLine && <div style={{ fontSize: small, ...NUM }}>{company.contactLine}</div>}
      </div>
      {rule()}
      <div style={{ textAlign: "center", fontWeight: 800, fontSize: big }}>{t.rsTitle}</div>
      <Row label={t.sBillNo} value={docNumber} bold={bold} />
      <div style={{ fontSize: small }}>
        <Row label={t.rsReturnedOn} value={dateTime} bold={bold} />
        {ret.cashier && <Row label={t.sCashier} value={ret.cashier} bold={bold} />}
      </div>
      {rule()}
      {ret.lines.map((l, i) => (
        <div key={`${l.sale_line_id ?? "x"}-${i}`} data-row="returned" className="avoid-break" style={{ marginBottom: "3px", breakInside: "avoid", pageBreakInside: "avoid" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", fontWeight: bold }}>
            <span>{l.description}</span>
            <span style={{ whiteSpace: "nowrap", ...NUM }}>{fmt(l.value)}</span>
          </div>
          <div style={{ fontSize: small, ...NUM }}>
            {formatQty(l.qty)} {l.unit_label} · {l.condition === "damaged" ? t.rsDamaged : t.rsGood}
          </div>
        </div>
      ))}
      {rule()}
      <Row label={t.rsValue} value={fmt(ret.value)} strong size={big} bold={bold} />
      {refunded ? <Row label={t.refundedVia(ret.settlement.method || "")} value={fmt(amountBack)} bold={bold} /> : <Row label={t.rsKept} value={fmt(ret.settlement.credited || ret.value)} bold={bold} />}
      {ret.balance_after != null && <Row label={t.rsBalanceAfter} value={ret.balance_after === 0 ? t.paidInFull : fmt(ret.balance_after)} strong bold={bold} />}
      {ret.reason && (
        <div style={{ fontSize: small, marginTop: "2px" }}>
          {t.rsReason}: {ret.reason}
        </div>
      )}
      {footer.trim() && (
        <>
          {rule("dashed")}
          <div data-testid="slip-footer" style={{ textAlign: "center", fontSize: small, whiteSpace: "pre-line" }}>
            {footer.trim()}
          </div>
        </>
      )}
      <div style={{ textAlign: "center", fontSize: "7.5px", marginTop: "4px" }}>{t.poweredBy}</div>
      <div style={{ height: "2mm" }} />
    </div>
  );
}
