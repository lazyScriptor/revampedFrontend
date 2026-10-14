// features/invoices/components/InvoiceReceipt.tsx
import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useAuthStore } from "@/stores/useAuthStore";
import { CartItem, calculateLineMath } from "./PosLedgerPanel";

// ─── Code 39 Barcode SVG Generator ───────────────────────────────────────────
// High-contrast, zero-dependency 1D barcode that prints razor-sharp on 203/300 DPI thermal heads.
const CODE39_PATTERNS: Record<string, string> = {
  "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000",
  "4": "000110001", "5": "100110000", "6": "001110000", "7": "000100101",
  "8": "100100100", "9": "001100100", "A": "100001001", "B": "001001001",
  "C": "101001000", "D": "000011001", "E": "100011000", "F": "001011000",
  "G": "000001101", "H": "100001100", "I": "001001100", "J": "000011100",
  "K": "100000011", "L": "001000011", "M": "101000010", "N": "000010011",
  "O": "100010010", "P": "001010010", "Q": "000000111", "R": "100000110",
  "S": "001000110", "T": "000010110", "U": "110000001", "V": "011000001",
  "W": "111000000", "X": "010010001", "Y": "110010000", "Z": "011010000",
  "-": "010000101", ".": "110000100", " ": "011000100", "$": "010101000",
  "/": "010100010", "+": "010001010", "%": "000101010", "*": "010010100",
};

export const Code39Barcode = ({
  value,
  height = 36,
  narrowWidth = 1.3,
  wideWidth = 3.2,
}: {
  value: string;
  height?: number;
  narrowWidth?: number;
  wideWidth?: number;
}) => {
  const clean = `*${value.toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, "-")}*`;
  const interGap = narrowWidth;
  const elements: { isBar: boolean; width: number }[] = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS["-"];
    for (let p = 0; p < pattern.length; p++) {
      elements.push({
        isBar: p % 2 === 0,
        width: pattern[p] === "1" ? wideWidth : narrowWidth,
      });
    }
    if (i < clean.length - 1) {
      elements.push({ isBar: false, width: interGap });
    }
  }

  const totalWidth = elements.reduce((sum, el) => sum + el.width, 0);
  let currentX = 0;
  const rects: React.ReactNode[] = [];

  elements.forEach((el, idx) => {
    if (el.isBar) {
      rects.push(
        <rect
          key={idx}
          x={currentX}
          y={0}
          width={el.width}
          height={height}
          fill="#000000"
        />
      );
    }
    currentX += el.width;
  });

  return (
    <div style={{ textAlign: "center", margin: "6px 0 2px 0" }}>
      <svg
        width={totalWidth}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{ display: "inline-block", maxWidth: "95%" }}
      >
        {rects}
      </svg>
      <div
        style={{
          fontSize: "10px",
          letterSpacing: "2px",
          fontWeight: "bold",
          color: "#000000",
          marginTop: "1px",
        }}
      >
        {clean}
      </div>
    </div>
  );
};

// ─── Format Helpers ─────────────────────────────────────────────────────────
const fmtMoney = (val: number | string | null | undefined, currency = "Rs.") => {
  const n = Number(val || 0);
  return `${currency} ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const fmtDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? String(dateStr)
      : d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
  } catch {
    return String(dateStr);
  }
};

const fmtDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return new Date().toLocaleString();
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? String(dateStr)
      : d.toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
  } catch {
    return String(dateStr);
  }
};

const calculateDays = (start: string, end: string) => {
  if (!start || !end) return 1;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
  return diff < 1 || isNaN(diff) ? 1 : diff;
};

// ─── Interface Definition ────────────────────────────────────────────────────
export interface InvoiceReceiptProps {
  id: string; // DOM element ID to be printed
  invoice?: any; // Full invoice from backend (Active / Completed)
  isDraft?: boolean; // When true, formats as a draft/quotation slip
  draftData?: {
    customer?: any;
    onBehalfOfCustomer?: any;
    items?: CartItem[];
    fees?: { transport?: number; discount?: number; advance?: number };
    draftId?: string;
  };
  paperWidth?: "80mm" | "58mm";
  density?: "standard" | "compact";
  showTerms?: boolean;
  showBarcode?: boolean;
  customNotes?: string;
  cashierName?: string;
  isPreview?: boolean; // Render visibly on screen inside a dialog preview
}

export const InvoiceReceipt = ({
  id,
  invoice,
  isDraft = false,
  draftData,
  paperWidth = "80mm",
  density = "standard",
  showTerms = true,
  showBarcode = true,
  customNotes,
  cashierName,
  isPreview = false,
}: InvoiceReceiptProps) => {
  const user = useAuthStore((s) => s.user);
  const config = (user as any)?.configData || {};

  // Company Branding from Tenant Config with fallbacks
  const companyName =
    (config?.business_display_name as string) || "GEARGRID RENTALS";
  const companyAddress =
    (config?.address as string) ||
    (config?.custom_settings?.address as string) ||
    "123 Commercial Hub, Galle Road, Colombo";
  const companyPhone =
    (config?.phone as string) ||
    (config?.custom_settings?.phone as string) ||
    "+94 11 234 5678";
  const companyEmail =
    (config?.email as string) ||
    (config?.custom_settings?.email as string) ||
    "rentals@geargrid.live";
  const currencyCode = (config?.currency_code as string) || "Rs.";

  // Cashier / Operator Fallback
  const operatorName =
    cashierName ||
    (user?.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : user?.username || "Authorized Operator");

  // Normalization logic: handles BOTH active/completed invoices AND mid-way draft quotes
  const normalized = useMemo(() => {
    if (isDraft || !invoice) {
      const cust = draftData?.customer || {};
      const benef = draftData?.onBehalfOfCustomer;
      const items = draftData?.items || [];
      const fees = draftData?.fees || { transport: 0, discount: 0, advance: 0 };

      const lines = items.map((item, idx) => {
        const math = calculateLineMath(item);
        return {
          id: item.cart_id || `draft-line-${idx}`,
          name: item.equipment_name || "Equipment Item",
          qty: item.borrow_quantity || 1,
          start: item.borrow_date,
          end: item.expected_return_date,
          days: math.totalDays,
          lineTotal: math.lineCost,
          pricingText: math.calculationText,
          status: "Draft",
          returnedDate: null,
        };
      });

      const subtotal = lines.reduce((acc, l) => acc + l.lineTotal, 0);
      const transport = Number(fees.transport || 0);
      const discount = Number(fees.discount || 0);
      const advance = Number(fees.advance || 0);
      const grandTotal = Math.max(0, subtotal + transport - discount);
      const balanceDue = Math.max(0, grandTotal - advance);

      return {
        docType: "ESTIMATE" as const,
        docTitle: "*** RENTAL ESTIMATE / QUOTATION ***",
        docSubtitle: "* ESTIMATE ONLY · GOODS NOT YET DISPATCHED *",
        docNumber: draftData?.draftId || `EST-${Math.floor(100000 + Math.random() * 900000)}`,
        issuedDate: new Date().toISOString(),
        customer: {
          name:
            cust.customer_type === "Business" && cust.company_name
              ? cust.company_name
              : `${cust.first_name || ""} ${cust.last_name || ""}`.trim() || "Walk-in Customer",
          nic: cust.nic_number || "Not on file",
          phone: cust.phone_number || "N/A",
          address: cust.address_line1 || cust.city || "",
          depositBalance: Number(cust.deposit_balance || 0),
        },
        beneficiary: benef
          ? {
              name:
                benef.company_name ||
                `${benef.first_name || ""} ${benef.last_name || ""}`.trim(),
              phone: benef.phone_number || "",
            }
          : null,
        lines,
        totalUnits: lines.reduce((acc, l) => acc + l.qty, 0),
        subtotal,
        transport,
        discount,
        lateFees: 0,
        grandTotal,
        payments:
          advance > 0
            ? [{ label: "Advance Deposit", amount: advance, method: "Cash/Wallet", date: new Date().toISOString() }]
            : [],
        totalPaid: advance,
        balanceDue,
        vaultStatus: "Pending Check-in",
        status: "Draft",
      };
    }

    // Official backend invoice
    const cust = invoice.Customer || {};
    const benef = invoice.OnBehalfOfCustomer;
    const invLines = invoice.InvoiceLines || [];
    const payments = invoice.Payments || [];

    const lines = invLines.map((line: any, idx: number) => {
      const days = calculateDays(line.borrow_date, line.expected_return_date);
      const isDaily =
        Number(line.locked_minimum_days) <= 1 &&
        Number(line.locked_base_price) === Number(line.locked_extra_daily_rate);
      const pricingText = isDaily
        ? `${days} day${days !== 1 ? "s" : ""} @ ${fmtMoney(line.locked_base_price, currencyCode)}/d`
        : `Base: ${fmtMoney(line.locked_base_price, currencyCode)} (${line.locked_minimum_days}d) + Extra: ${fmtMoney(line.locked_extra_daily_rate, currencyCode)}/d`;

      return {
        id: line.line_id || `line-${idx}`,
        name: line.Equipment?.equipment_name || `Equipment #${line.equipment_id}`,
        qty: Number(line.borrow_quantity) || 1,
        start: line.borrow_date,
        end: line.expected_return_date,
        days,
        lineTotal: Number(line.line_total_amount || 0),
        pricingText,
        status: line.line_status || "Active",
        returnedDate: line.returned_date || null,
      };
    });

    const subtotal = Number(invoice.sub_total || 0);
    const transport = Number(invoice.transport_fee || 0);
    const discount = Number(invoice.discount_amount || 0);
    const grandTotal = Number(invoice.total_amount || 0);
    const lateFees = Math.max(0, grandTotal - (subtotal + transport - discount));
    const totalPaid = payments.reduce(
      (sum: number, p: any) => sum + Number(p.payment_amount || 0),
      0
    );
    const balanceDue = Math.max(0, grandTotal - totalPaid);
    const isCompleted = invoice.status === "Completed";

    return {
      docType: isCompleted ? ("COMPLETED" as const) : ("DISPATCH" as const),
      docTitle: isCompleted
        ? "*** RENTAL INVOICE (COMPLETED & SETTLED) ***"
        : "*** OFFICIAL RENTAL DISPATCH BILL ***",
      docSubtitle: isCompleted
        ? "* ALL EQUIPMENT RETURNED & SETTLED *"
        : "* GEAR DISPATCHED · HIRER ACKNOWLEDGED *",
      docNumber: `INV-${invoice.invoice_id}`,
      issuedDate: invoice.issued_date || invoice.createdAt || new Date().toISOString(),
      customer: {
        name:
          cust.customer_type === "Business" && cust.company_name
            ? cust.company_name
            : `${cust.first_name || ""} ${cust.last_name || ""}`.trim() || "Walk-in Customer",
        nic: cust.nic_number || "Not on file",
        phone: cust.phone_number || "N/A",
        address: cust.address_line1 || cust.city || "",
        depositBalance: Number(cust.deposit_balance || 0),
      },
      beneficiary: benef
        ? {
            name:
              benef.company_name ||
              `${benef.first_name || ""} ${benef.last_name || ""}`.trim(),
            phone: benef.phone_number || "",
          }
        : null,
      lines,
      totalUnits: lines.reduce((acc, l) => acc + l.qty, 0),
      subtotal,
      transport,
      discount,
      lateFees,
      grandTotal,
      payments: payments.map((p: any, idx: number) => ({
        label: idx === 0 ? "Initial Advance" : `Payment ${idx + 1}`,
        amount: Math.abs(Number(p.payment_amount || 0)),
        method: p.method || "Cash",
        date: p.payment_date || p.createdAt,
      })),
      totalPaid,
      balanceDue,
      vaultStatus: invoice.id_card_status ? "HELD IN VAULT" : "RELEASED / NONE",
      status: invoice.status || "Active",
    };
  }, [invoice, isDraft, draftData, currencyCode]);

  // Styling metrics based on paperWidth & density
  const is58mm = paperWidth === "58mm";
  const isCompact = density === "compact";
  const fontSizeBase = is58mm ? "10px" : isCompact ? "10.5px" : "11px";
  const fontSizeHeader = is58mm ? "14px" : "16px";
  const fontSizeTotal = is58mm ? "13px" : "15px";
  const lineHeight = "1.25";

  // Monospace font stack guaranteeing alignment
  const monoFont = "'Courier New', Courier, 'Lucida Console', Monaco, monospace";

  // Container styling
  const containerStyle: React.CSSProperties = isPreview
    ? {
        width: is58mm ? "48mm" : "72mm",
        maxWidth: is58mm ? "48mm" : "72mm",
        margin: "0 auto",
        padding: "4mm 3mm 12mm 3mm",
        backgroundColor: "#ffffff",
        color: "#000000",
        fontFamily: monoFont,
        fontSize: fontSizeBase,
        lineHeight,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        border: "1px solid #cbd5e1",
        borderRadius: "4px",
      }
    : {
        display: "none", // Keeps it hidden on dashboard; iframe clones innerHTML directly
        fontFamily: monoFont,
        color: "#000000",
        backgroundColor: "#ffffff",
        fontSize: fontSizeBase,
        lineHeight,
      };

  return (
    <Box id={id} sx={containerStyle}>
      {/* ── 1. STORE HEADER ─────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: "6px" }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: fontSizeHeader,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "#000000",
          }}
        >
          {companyName}
        </div>
        <div style={{ fontSize: is58mm ? "9px" : "10px", marginTop: "1px", color: "#000000" }}>
          HEAVY MACHINERY & EQUIPMENT RENTALS
        </div>
        <div style={{ fontSize: is58mm ? "8.5px" : "9.5px", marginTop: "2px", color: "#000000" }}>
          {companyAddress}
        </div>
        <div style={{ fontSize: is58mm ? "8.5px" : "9.5px", color: "#000000" }}>
          Tel: {companyPhone} · {companyEmail}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px dashed #000000", margin: "5px 0" }} />

      {/* ── 2. DOCUMENT TYPE BANNER & METADATA ───────────────────────────────── */}
      <div
        style={{
          border: "1px solid #000000",
          padding: "3px 4px",
          textAlign: "center",
          margin: "4px 0",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: is58mm ? "10px" : "11.5px", color: "#000000" }}>
          {normalized.docTitle}
        </div>
        <div style={{ fontSize: is58mm ? "8px" : "9px", color: "#000000" }}>
          {normalized.docSubtitle}
        </div>
      </div>

      <div style={{ fontSize: fontSizeBase, margin: "6px 0 4px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: "bold" }}>DOC NUMBER:</span>
          <span style={{ fontWeight: 900 }}>{normalized.docNumber}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>DATE & TIME:</span>
          <span>{fmtDateTime(normalized.issuedDate)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>OPERATOR:</span>
          <span>{operatorName}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>STATUS:</span>
          <span style={{ fontWeight: "bold" }}>{normalized.status.toUpperCase()}</span>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px dashed #000000", margin: "5px 0" }} />

      {/* ── 3. CLIENT & VERIFICATION DETAILS ─────────────────────────────────── */}
      <div style={{ fontSize: fontSizeBase, margin: "4px 0" }}>
        <div style={{ fontWeight: 800, marginBottom: "2px" }}>
          CLIENT: {normalized.customer.name.toUpperCase()}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>NIC / REG NO:</span>
          <span style={{ fontWeight: 800 }}>{normalized.customer.nic}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>PHONE:</span>
          <span>{normalized.customer.phone}</span>
        </div>
        {normalized.customer.address && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>ADDRESS:</span>
            <span style={{ textAlign: "right", maxWidth: "60%" }}>
              {normalized.customer.address}
            </span>
          </div>
        )}
        {normalized.beneficiary && (
          <div
            style={{
              marginTop: "3px",
              paddingTop: "2px",
              borderTop: "1px dotted #000000",
              fontSize: is58mm ? "9px" : "10px",
            }}
          >
            <span style={{ fontWeight: "bold" }}>ON BEHALF OF: </span>
            {normalized.beneficiary.name} ({normalized.beneficiary.phone})
          </div>
        )}
        <div
          style={{
            marginTop: "3px",
            fontSize: is58mm ? "9px" : "10px",
            fontWeight: "bold",
          }}
        >
          VAULT COLLATERAL: [{normalized.vaultStatus}]
        </div>
      </div>

      {/* Double divider before equipment table */}
      <div
        style={{
          borderTop: "2px solid #000000",
          borderBottom: "1px solid #000000",
          height: "2px",
          margin: "5px 0",
        }}
      />

      {/* ── 4. ITEMIZED EQUIPMENT TABLE (OPTIMIZED FOR LONG INVOICES) ────────── */}
      <div style={{ margin: "4px 0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 800,
            fontSize: is58mm ? "9px" : "10px",
            marginBottom: "4px",
          }}
        >
          <span>ITEM / RENTAL PERIOD</span>
          <span style={{ textAlign: "right" }}>QTY & TOTAL</span>
        </div>

        <hr style={{ border: "none", borderTop: "1px dashed #000000", margin: "4px 0" }} />

        {normalized.lines.length === 0 ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            [ No equipment items selected ]
          </div>
        ) : (
          normalized.lines.map((line, idx) => (
            <div
              key={line.id}
              className="avoid-break"
              style={{
                marginBottom: isCompact ? "4px" : "6px",
                pageBreakInside: "avoid",
                breakInside: "avoid",
              }}
            >
              {/* Row 1: Item Number & Name (Bold) + Line Total (Right) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: fontSizeBase,
                    textTransform: "uppercase",
                    paddingRight: "4px",
                    flex: 1,
                  }}
                >
                  {String(idx + 1).padStart(2, "0")}. {line.name}
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: fontSizeBase,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmtMoney(line.lineTotal, currencyCode)}
                </div>
              </div>

              {/* Row 2: Rental duration & Qty */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: is58mm ? "8.5px" : "9.5px",
                  color: "#000000",
                  paddingLeft: "12px",
                  marginTop: "1px",
                }}
              >
                <span>
                  {fmtDate(line.start)} → {fmtDate(line.end)} ({line.days}d)
                </span>
                <span style={{ fontWeight: "bold" }}>Qty: {line.qty}</span>
              </div>

              {/* Row 3: Pricing math details */}
              <div
                style={{
                  fontSize: is58mm ? "8px" : "9px",
                  color: "#000000",
                  paddingLeft: "12px",
                }}
              >
                Rate: {line.pricingText}
              </div>

              {/* Line Status Badge (if Returned or Overdue) */}
              {line.returnedDate && (
                <div
                  style={{
                    fontSize: "8.5px",
                    fontWeight: "bold",
                    paddingLeft: "12px",
                  }}
                >
                  [RETURNED ON: {fmtDateTime(line.returnedDate)}]
                </div>
              )}

              {idx < normalized.lines.length - 1 && (
                <hr
                  style={{
                    border: "none",
                    borderTop: "1px dotted #000000",
                    margin: "4px 0 4px 12px",
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Equipment Metrics Count */}
      <div
        style={{
          borderTop: "1px dashed #000000",
          borderBottom: "1px dashed #000000",
          padding: "3px 0",
          display: "flex",
          justifyContent: "space-between",
          fontSize: is58mm ? "8.5px" : "9.5px",
          margin: "4px 0",
        }}
      >
        <span>TOTAL LINE ITEMS: {normalized.lines.length}</span>
        <span style={{ fontWeight: "bold" }}>
          TOTAL MACHINES: {normalized.totalUnits}
        </span>
      </div>

      {/* ── 5. FINANCIAL BREAKDOWN ───────────────────────────────────────────── */}
      <div style={{ margin: "6px 0", fontSize: fontSizeBase }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>EQUIPMENT SUBTOTAL:</span>
          <span>{fmtMoney(normalized.subtotal, currencyCode)}</span>
        </div>

        {normalized.transport > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>TRANSPORT / DELIVERY:</span>
            <span>+{fmtMoney(normalized.transport, currencyCode)}</span>
          </div>
        )}

        {normalized.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>DISCOUNT APPLIED:</span>
            <span>-{fmtMoney(normalized.discount, currencyCode)}</span>
          </div>
        )}

        {normalized.lateFees > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>LATE / OVERDUE CHARGES:</span>
            <span>+{fmtMoney(normalized.lateFees, currencyCode)}</span>
          </div>
        )}

        {/* Double solid border around GRAND TOTAL */}
        <div
          style={{
            borderTop: "2px solid #000000",
            borderBottom: "2px solid #000000",
            padding: "4px 0",
            margin: "5px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 900, fontSize: fontSizeTotal }}>
            NET TOTAL:
          </span>
          <span style={{ fontWeight: 900, fontSize: fontSizeTotal }}>
            {fmtMoney(normalized.grandTotal, currencyCode)}
          </span>
        </div>

        {/* Itemized Payments */}
        {normalized.payments.length > 0 && (
          <div style={{ margin: "4px 0" }}>
            {normalized.payments.map((p, pIdx) => (
              <div
                key={pIdx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: is58mm ? "8.5px" : "9.5px",
                }}
              >
                <span>
                  {p.label} ({p.method}):
                </span>
                <span>-{fmtMoney(p.amount, currencyCode)}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "bold",
                marginTop: "2px",
              }}
            >
              <span>TOTAL PAID TO DATE:</span>
              <span>{fmtMoney(normalized.totalPaid, currencyCode)}</span>
            </div>
          </div>
        )}

        {/* Double Border around BALANCE DUE */}
        <div
          style={{
            borderTop: "1px dashed #000000",
            borderBottom: "2px solid #000000",
            padding: "4px 0",
            marginTop: "4px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 900, fontSize: fontSizeTotal }}>
            BALANCE DUE:
          </span>
          <span
            style={{
              fontWeight: 900,
              fontSize: fontSizeTotal,
            }}
          >
            {normalized.balanceDue === 0 ? "PAID IN FULL" : fmtMoney(normalized.balanceDue, currencyCode)}
          </span>
        </div>
      </div>

      {/* ── 6. CUSTOM NOTES (IF SPECIFIED) ──────────────────────────────────── */}
      {customNotes && (
        <div
          style={{
            border: "1px dotted #000000",
            padding: "4px",
            margin: "5px 0",
            fontSize: is58mm ? "8.5px" : "9.5px",
          }}
        >
          <div style={{ fontWeight: "bold" }}>REMARKS / SITE NOTE:</div>
          <div>{customNotes}</div>
        </div>
      )}

      {/* ── 7. RENTAL CONDITIONS (COMPACT & LEGALLY ESSENTIAL) ───────────────── */}
      {showTerms && (
        <div
          className="avoid-break"
          style={{
            margin: "6px 0",
            fontSize: is58mm ? "8px" : "8.5px",
            lineHeight: "1.2",
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          <div style={{ fontWeight: 800, textAlign: "center", marginBottom: "2px" }}>
            RENTAL ACKNOWLEDGEMENT & CONDITIONS
          </div>
          <div>1. Hirer accepts equipment in good working order with all standard fittings.</div>
          <div>2. Return on or before agreed date; late returns incur daily overdue rates.</div>
          <div>3. Hirer is strictly liable for breakdown due to negligence, loss, or bad fuel.</div>
          <div>4. Retained collateral/NIC released upon inspection and complete settlement.</div>
        </div>
      )}

      {/* ── 8. DUAL SIGNATURE BLOCK ─────────────────────────────────────────── */}
      <div
        className="avoid-break"
        style={{
          marginTop: "12px",
          marginBottom: "8px",
          fontSize: is58mm ? "8.5px" : "9.5px",
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ borderBottom: "1px solid #000000", height: "24px", marginBottom: "2px" }} />
            <div style={{ fontWeight: "bold" }}>Customer Signature</div>
            <div style={{ fontSize: "8px" }}>{normalized.customer.name}</div>
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ borderBottom: "1px solid #000000", height: "24px", marginBottom: "2px" }} />
            <div style={{ fontWeight: "bold" }}>Authorized Signatory</div>
            <div style={{ fontSize: "8px" }}>{operatorName}</div>
          </div>
        </div>
      </div>

      {/* ── 9. VECTOR BARCODE & FOOTER ───────────────────────────────────────── */}
      {showBarcode && (
        <div className="avoid-break" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
          <Code39Barcode
            value={normalized.docNumber}
            height={is58mm ? 30 : 36}
            narrowWidth={is58mm ? 1.1 : 1.3}
            wideWidth={is58mm ? 2.6 : 3.2}
          />
        </div>
      )}

      <div
        style={{
          textAlign: "center",
          marginTop: "4px",
          fontSize: is58mm ? "8.5px" : "9.5px",
          color: "#000000",
        }}
      >
        <div>Thank you for choosing {companyName}!</div>
        <div style={{ fontSize: "8px", marginTop: "1px" }}>
          Powered by GearGrid System · www.geargrid.live
        </div>
      </div>

      {/* ── 10. CUTTER MARGIN (20mm safety feed space) ──────────────────────── */}
      <div style={{ height: "20mm", width: "100%" }} />
    </Box>
  );
};
