// features/invoices/components/InvoiceReceipt.tsx
import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useAuthStore } from "@/stores/useAuthStore";
import { CartItem, calculateLineMath } from "./PosLedgerPanel";
import { useInvoiceSignatures } from "@/features/signatures/hooks/useSignatures";

// Signature URLs come from the backend as paths like /uploads/signatures/...
// For the receipt (rendered in a print iframe or printed to a thermal
// printer), we need absolute URLs the browser can resolve against the API
// origin, not the frontend origin.
const resolveImageUrl = (url?: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  if (!origin) return url;
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
};

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
          fontSize: "9px",
          letterSpacing: "1.5px",
          fontWeight: "600",
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

// ─── Interface Definition & Localization Dictionary ──────────────────────────
export type ReceiptLanguage = "en" | "si";

export const RECEIPT_LABELS = {
  en: {
    category: "HEAVY MACHINERY & EQUIPMENT RENTALS",
    estimateTitle: "*** RENTAL ESTIMATE / QUOTATION ***",
    estimateSubtitle: "* ESTIMATE ONLY · GOODS NOT YET DISPATCHED *",
    dispatchTitle: "*** OFFICIAL RENTAL DISPATCH BILL ***",
    dispatchSubtitle: "* GEAR DISPATCHED · HIRER ACKNOWLEDGED *",
    completedTitle: "*** RENTAL INVOICE (COMPLETED & SETTLED) ***",
    completedSubtitle: "* ALL EQUIPMENT RETURNED & SETTLED *",
    docNumber: "DOC NUMBER:",
    dateTime: "DATE & TIME:",
    operator: "OPERATOR:",
    status: "STATUS:",
    statusActive: "ACTIVE",
    statusCompleted: "COMPLETED",
    statusDraft: "DRAFT",
    client: "CLIENT:",
    nicReg: "NIC / REG NO:",
    phone: "PHONE:",
    address: "ADDRESS:",
    onBehalfOf: "ON BEHALF OF:",
    vaultCollateral: "VAULT COLLATERAL:",
    vaultHeld: "HELD IN VAULT",
    vaultReleased: "RELEASED / NONE",
    vaultPending: "PENDING CHECK-IN",
    walkInCustomer: "Walk-in Customer",
    notOnFile: "Not on file",
    itemCol: "ITEM / RENTAL PERIOD",
    qtyTotalCol: "QTY & TOTAL",
    noItems: "[ No equipment items selected ]",
    qty: "Qty",
    rate: "Rate",
    returnedOn: "RETURNED ON:",
    totalLineItems: "TOTAL LINE ITEMS:",
    totalMachines: "TOTAL MACHINES:",
    subtotal: "EQUIPMENT SUBTOTAL:",
    transport: "TRANSPORT / DELIVERY:",
    discount: "DISCOUNT APPLIED:",
    lateFees: "LATE / OVERDUE CHARGES:",
    netTotal: "NET TOTAL:",
    advanceDeposit: "Advance Deposit",
    initialAdvance: "Initial Advance",
    payment: "Payment",
    totalPaid: "TOTAL PAID TO DATE:",
    balanceDue: "BALANCE DUE:",
    paidInFull: "PAID IN FULL",
    remarks: "REMARKS / SITE NOTE:",
    termsTitle: "RENTAL ACKNOWLEDGEMENT & CONDITIONS",
    term1: "1. Hirer accepts equipment in good working order with all standard fittings.",
    term2: "2. Return on or before agreed date; late returns incur daily overdue rates.",
    term3: "3. Hirer is strictly liable for breakdown due to negligence, loss, or bad fuel.",
    term4: "4. Retained collateral/NIC released upon inspection and complete settlement.",
    custSign: "Customer Signature",
    authSign: "Authorized Signatory",
    thankYou: (company: string) => `Thank you for choosing ${company}!`,
    poweredBy: "Powered by GearGrid System · www.geargrid.live",
  },
  si: {
    category: "බර යන්ත්‍රෝපකරණ සහ උපකරණ කුලියට දීම",
    estimateTitle: "*** කුලී ඇස්තමේන්තුව / මිල ගණන් පත්‍රිකාව ***",
    estimateSubtitle: "* ඇස්තමේන්තුවක් පමණි · භාණ්ඩ නිකුත් කර නැත *",
    dispatchTitle: "*** නිල කුලී නිකුත් කිරීමේ බිල්පත ***",
    dispatchSubtitle: "* උපකරණ නිකුත් කරන ලදී · කුලීකරු එකඟ විය *",
    completedTitle: "*** කුලී බිල්පත (සම්පූර්ණ කර අවසන්) ***",
    completedSubtitle: "* සියලු උපකරණ භාරගෙන ගෙවීම් අවසන් *",
    docNumber: "බිල්පත් අංකය:",
    dateTime: "දිනය සහ වේලාව:",
    operator: "නිකුත් කළේ:",
    status: "තත්ත්වය:",
    statusActive: "ක්‍රියාත්මකයි",
    statusCompleted: "සම්පූර්ණයි",
    statusDraft: "ඇස්තමේන්තුව",
    client: "පාරිභෝගිකයා:",
    nicReg: "ජා.හැ. / ලියාපදිංචි අංකය:",
    phone: "දුරකථන:",
    address: "ලිපිනය:",
    onBehalfOf: "වෙනුවෙන් නිකුත් කළේ:",
    vaultCollateral: "ඇප සුරැකුම (හැඳුනුම්පත):",
    vaultHeld: "ආරක්ෂිතව රඳවා ඇත",
    vaultReleased: "නිදහස් කර ඇත / නැත",
    vaultPending: "රඳවා ගැනීමට නියමිතයි",
    walkInCustomer: "පැමිණි පාරිභෝගිකයා",
    notOnFile: "සටහන් කර නැත",
    itemCol: "උපකරණය / කුලී කාලය",
    qtyTotalCol: "ප්‍රමාණය සහ එකතුව",
    noItems: "[ කිසිදු උපකරණයක් තෝරාගෙන නැත ]",
    qty: "ප්‍රමාණය",
    rate: "ගාස්තුව",
    returnedOn: "භාරගත් දිනය:",
    totalLineItems: "මුළු උපකරණ වර්ග:",
    totalMachines: "මුළු යන්ත්‍ර සංඛ්‍යාව:",
    subtotal: "උපකරණ අතුරු එකතුව:",
    transport: "ප්‍රවාහන ගාස්තු:",
    discount: "ලබාදුන් වට්ටම්:",
    lateFees: "ප්‍රමාද ගාස්තු:",
    netTotal: "මුළු මුදල:",
    advanceDeposit: "මූලික අත්තිකාරම් තැන්පතුව",
    initialAdvance: "මූලික අත්තිකාරම",
    payment: "ගෙවීම",
    totalPaid: "මුළු ගෙවූ මුදල:",
    balanceDue: "ගෙවිය යුතු ශේෂය:",
    paidInFull: "සම්පූර්ණයෙන්ම ගෙවා ඇත",
    remarks: "විශේෂ සටහන් / වැඩබිම් විස්තරය:",
    termsTitle: "කුලී කොන්දේසි සහ වගකීම් ප්‍රකාශය",
    term1: "1. උපකරණ නිසි ක්‍රියාකාරී තත්ත්වයෙන් හා සියලු උපාංග සහිතව පරීක්ෂා කර භාරගන්නා ලදී.",
    term2: "2. නියමිත දිනට හෝ ඊට පෙර භාරදිය යුතු අතර, ප්‍රමාද වන දින සඳහා අමතර දෛනික ගාස්තු අය කෙරේ.",
    term3: "3. නොසැලකිලිමත් භාවිතය, අලාභහානි, වැරදි ඉන්ධන හෝ අස්ථානගතවීම් සඳහා කුලීකරු සම්පූර්ණයෙන් වගකිව යුතුය.",
    term4: "4. සියලු ගෙවීම් අවසන් කර උපකරණ පරීක්ෂාවෙන් පසු ඇපයට තබාගත් හැඳුනුම්පත නිදහස් කෙරේ.",
    custSign: "පාරිභෝගික අත්සන",
    authSign: "බලයලත් නිලධාරී අත්සන",
    thankYou: (company: string) => `${company} තෝරාගත් ඔබට ස්තූතියි!`,
    poweredBy: "GearGrid පද්ධතිය මගින් ක්‍රියාත්මකයි · www.geargrid.live",
  },
};

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
  language?: ReceiptLanguage; // Supports "en" (English) or "si" (Sinhala)
  showTerms?: boolean;
  showBarcode?: boolean;
  customNotes?: string;
  cashierName?: string;
  isPreview?: boolean; // Render visibly on screen inside a dialog preview
}

export function buildSnapshotReceiptProps(log: any) {
  const snap = log?.bill_snapshot || {};
  const isDraft = log?.doc_type === "DRAFT";
  const cust =
    snap.Customer ||
    snap.customer ||
    (log?.customer_name
      ? {
          first_name: log.customer_name,
          last_name: "",
          phone_number: log.customer_phone || "N/A",
        }
      : {});
  const lines = snap.InvoiceLines || snap.items || [];
  const subtotal = Number(snap.sub_total ?? snap.fees?.subtotal ?? log?.subtotal ?? 0);
  const transport = Number(
    snap.transport_fee ?? snap.fees?.transportFee ?? snap.fees?.transport ?? log?.transport_fee ?? 0
  );
  const discount = Number(
    snap.discount_amount ?? snap.fees?.discountAmount ?? snap.fees?.discount ?? log?.discount_amount ?? 0
  );
  const grandTotal = Number(
    snap.total_amount ?? snap.fees?.grandTotal ?? log?.grand_total ?? Math.max(0, subtotal + transport - discount)
  );
  const totalPaid = Number(
    snap.fees?.totalPaid ?? snap.fees?.advance ?? log?.total_paid ?? 0
  );
  const balanceDue = Number(
    snap.fees?.balanceDue ?? log?.balance_due ?? Math.max(0, grandTotal - totalPaid)
  );

  const printedByDisplay = log?.PrintedBy?.first_name
    ? `${log.PrintedBy.first_name} ${log.PrintedBy.last_name || ""}`.trim()
    : log?.printed_by_name || undefined;

  if (isDraft) {
    return {
      isDraft: true,
      invoice: undefined,
      draftData: {
        ...snap,
        draftId: snap.draftId || snap.doc_number || log?.doc_number,
        customer: cust,
        onBehalfOfCustomer: snap.onBehalfOfCustomer || snap.OnBehalfOfCustomer,
        items: lines,
        fees: {
          transport,
          discount,
          advance: totalPaid,
        },
      },
      paperWidth: (log?.paper_width === "58mm" ? "58mm" : "80mm") as "80mm" | "58mm",
      language: (log?.language === "si" ? "si" : "en") as ReceiptLanguage,
      customNotes: log?.custom_notes || snap.customNotes || undefined,
      cashierName: printedByDisplay,
    };
  }

  return {
    isDraft: false,
    draftData: undefined,
    invoice: {
      ...snap,
      invoice_id: snap.invoice_id || log?.invoice_id || log?.doc_number?.replace(/^INV-/i, "") || "POS",
      doc_number: snap.doc_number || log?.doc_number,
      status:
        snap.status ||
        (log?.doc_type === "COMPLETED" ? "Completed" : "Active"),
      issued_date: snap.issued_date || log?.printed_at,
      Customer: cust,
      customer: cust,
      OnBehalfOfCustomer: snap.OnBehalfOfCustomer || snap.onBehalfOfCustomer,
      InvoiceLines: lines,
      items: lines,
      Payments: snap.Payments || [],
      sub_total: subtotal,
      transport_fee: transport,
      discount_amount: discount,
      total_amount: grandTotal,
      total_paid: totalPaid,
      fees: {
        subtotal,
        transportFee: transport,
        discountAmount: discount,
        grandTotal,
        totalPaid,
        balanceDue,
      },
      id_card_status: Boolean(
        snap.id_card_status ?? cust?.is_id_retained_currently ?? false
      ),
    },
    paperWidth: (log?.paper_width === "58mm" ? "58mm" : "80mm") as "80mm" | "58mm",
    language: (log?.language === "si" ? "si" : "en") as ReceiptLanguage,
    customNotes: log?.custom_notes || snap.customNotes || undefined,
    cashierName: printedByDisplay,
  };
}

export const InvoiceReceipt = ({
  id,
  invoice,
  isDraft = false,
  draftData,
  paperWidth = "80mm",
  density = "standard",
  language,
  showTerms = true,
  showBarcode = true,
  customNotes,
  cashierName,
  isPreview = false,
}: InvoiceReceiptProps) => {
  const user = useAuthStore((s) => s.user);
  const config = (user as any)?.configData || {};

  const activeLang: ReceiptLanguage =
    language ||
    (typeof window !== "undefined"
      ? ((localStorage.getItem("pos_receipt_language") as ReceiptLanguage) || "en")
      : "en");

  const t = RECEIPT_LABELS[activeLang] || RECEIPT_LABELS.en;

  // Captured signatures for this invoice. Hook returns null when invoice has
  // no id (draft / snapshot preview). We pick the most recent CUSTOMER +
  // OPERATOR signature across all checkpoints; receipt shows one of each.
  const signaturesQuery = useInvoiceSignatures(
    !isDraft && invoice?.invoice_id ? Number(invoice.invoice_id) : null,
  );
  const capturedCustomer = useMemo(() => {
    const list = signaturesQuery.data?.signatures || [];
    const customers = list.filter((s) => s.role === "CUSTOMER");
    return customers[customers.length - 1] || null;
  }, [signaturesQuery.data]);
  const capturedOperator = useMemo(() => {
    const list = signaturesQuery.data?.signatures || [];
    const operators = list.filter((s) => s.role === "OPERATOR");
    return operators[operators.length - 1] || null;
  }, [signaturesQuery.data]);

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
      : user?.username || (activeLang === "si" ? "බලයලත් නිලධාරී" : "Authorized Operator"));

  // Normalization logic: handles BOTH active/completed invoices, point-in-time snapshots, AND mid-way draft quotes
  const normalized = useMemo(() => {
    if (isDraft || !invoice) {
      const cust = draftData?.customer || {};
      const benef = draftData?.onBehalfOfCustomer;
      const items = draftData?.items || [];
      const fees: any = draftData?.fees || { transport: 0, discount: 0, advance: 0 };

      const lines = items.map((item: any, idx: number) => {
        const math = calculateLineMath(item);
        let pricingText = math.calculationText;
        if (activeLang === "si") {
          const isDailyDraft =
            Number(item.minimum_rental_period || item.locked_minimum_days || 1) <= 1 &&
            Number(item.base_price || item.locked_base_price || 0) ===
              Number(item.extra_daily_rate || item.locked_extra_daily_rate || item.base_price || 0);
          pricingText = isDailyDraft
            ? `දින ${math.totalDays}ක් (දිනකට ${fmtMoney(item.daily_rate || item.base_price || item.locked_base_price, currencyCode)})`
            : `මූලික: ${fmtMoney(item.base_price || item.locked_base_price, currencyCode)} (දින ${item.minimum_rental_period || item.locked_minimum_days || 1}) + අමතර: ${fmtMoney(item.extra_daily_rate || item.locked_extra_daily_rate, currencyCode)}/දිනකට`;
        }

        return {
          id: item.cart_id || item.line_id || `draft-line-${idx}`,
          name:
            item.equipment_name ||
            item.Equipment?.equipment_name ||
            (activeLang === "si" ? "උපකරණය" : "Equipment Item"),
          qty: Number(item.borrow_quantity || 1),
          start: item.borrow_date,
          end: item.expected_return_date,
          days: math.totalDays,
          lineTotal: Number(item.line_total_amount || math.lineCost || 0),
          pricingText,
          status: "Draft",
          returnedDate: null,
        };
      });

      const subtotal =
        Number(fees.subtotal || 0) || lines.reduce((acc, l) => acc + l.lineTotal, 0);
      const transport = Number(fees.transport ?? fees.transportFee ?? 0);
      const discount = Number(fees.discount ?? fees.discountAmount ?? 0);
      const advance = Number(fees.advance ?? fees.totalPaid ?? 0);
      const grandTotal = Number(fees.grandTotal ?? Math.max(0, subtotal + transport - discount));
      const balanceDue = Number(fees.balanceDue ?? Math.max(0, grandTotal - advance));

      return {
        docType: "ESTIMATE" as const,
        docTitle: t.estimateTitle,
        docSubtitle: t.estimateSubtitle,
        docNumber:
          draftData?.draftId ||
          (draftData as any)?.doc_number ||
          `EST-${Math.floor(100000 + Math.random() * 900000)}`,
        issuedDate: new Date().toISOString(),
        customer: {
          name:
            cust.customer_type === "Business" && cust.company_name
              ? cust.company_name
              : cust.company_name ||
                `${cust.first_name || ""} ${cust.last_name || ""}`.trim() ||
                t.walkInCustomer,
          nic: cust.nic_number || t.notOnFile,
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
            ? [
                {
                  label: t.advanceDeposit,
                  amount: advance,
                  method: activeLang === "si" ? "මුදලින් (Cash)" : "Cash/Wallet",
                  date: new Date().toISOString(),
                },
              ]
            : [],
        totalPaid: advance,
        balanceDue,
        vaultStatus: t.vaultPending,
        statusDisplay: t.statusDraft,
      };
    }

    // Official backend invoice OR point-in-time bill_snapshot
    const cust = invoice.Customer || invoice.customer || {};
    const benef = invoice.OnBehalfOfCustomer || invoice.onBehalfOfCustomer;
    const invLines = invoice.InvoiceLines || invoice.items || [];
    const rawPayments = invoice.Payments || invoice.payments || [];
    const isCompleted =
      (invoice.status || "").toLowerCase() === "completed" ||
      invoice.status === "Returned";

    const lines = invLines.map((line: any, idx: number) => {
      const days = calculateDays(line.borrow_date, line.expected_return_date);
      const basePrice = Number(line.locked_base_price ?? line.base_price ?? 0);
      const extraRate = Number(line.locked_extra_daily_rate ?? line.extra_daily_rate ?? basePrice);
      const minDays = Number(line.locked_minimum_days ?? line.minimum_rental_period ?? 1);
      const isDaily = minDays <= 1 && basePrice === extraRate;

      const pricingText = isDaily
        ? activeLang === "si"
          ? `දින ${days}ක් (දිනකට ${fmtMoney(basePrice, currencyCode)})`
          : `${days} day${days !== 1 ? "s" : ""} @ ${fmtMoney(basePrice, currencyCode)}/d`
        : activeLang === "si"
        ? `මූලික: ${fmtMoney(basePrice, currencyCode)} (දින ${minDays}) + අමතර: ${fmtMoney(extraRate, currencyCode)}/දිනකට`
        : `Base: ${fmtMoney(basePrice, currencyCode)} (${minDays}d) + Extra: ${fmtMoney(extraRate, currencyCode)}/d`;

      return {
        id: line.line_id || `line-${idx}`,
        name:
          line.Equipment?.equipment_name ||
          line.equipment_name ||
          (activeLang === "si" ? `උපකරණ අංක #${line.equipment_id}` : `Equipment #${line.equipment_id}`),
        qty: Number(line.borrow_quantity ?? line.quantity ?? 1),
        start: line.borrow_date,
        end: line.expected_return_date,
        days,
        lineTotal: Number(line.line_total_amount ?? line.line_total ?? 0),
        pricingText,
        status: line.line_status || "Active",
        returnedDate: line.returned_date || line.actual_return_date || null,
      };
    });

    const computedLinesSubtotal = lines.reduce((acc: number, l: any) => acc + l.lineTotal, 0);
    const subtotal =
      Number(invoice.sub_total ?? invoice.fees?.subtotal ?? 0) || computedLinesSubtotal;
    const transport = Number(
      invoice.transport_fee ?? invoice.fees?.transportFee ?? invoice.fees?.transport ?? 0
    );
    const discount = Number(
      invoice.discount_amount ?? invoice.fees?.discountAmount ?? invoice.fees?.discount ?? 0
    );
    const grandTotal =
      Number(invoice.total_amount ?? invoice.fees?.grandTotal ?? 0) ||
      Math.max(0, subtotal + transport - discount);
    const lateFees = Math.max(0, grandTotal - (subtotal + transport - discount));

    const paidFromPayments = rawPayments.reduce(
      (sum: number, p: any) => sum + Number(p.payment_amount ?? p.amount ?? 0),
      0
    );
    const totalPaid =
      rawPayments.length > 0
        ? paidFromPayments
        : Number(invoice.fees?.totalPaid ?? invoice.total_paid ?? 0);
    const balanceDue =
      invoice.fees?.balanceDue !== undefined
        ? Number(invoice.fees.balanceDue)
        : Math.max(0, grandTotal - totalPaid);

    const formatPaymentMethod = (m: string) => {
      if (!m) return activeLang === "si" ? "මුදලින් (Cash)" : "Cash";
      if (m.toLowerCase().includes("cash")) return activeLang === "si" ? "මුදලින් (Cash)" : "Cash";
      if (m.toLowerCase().includes("bank") || m.toLowerCase().includes("transfer"))
        return activeLang === "si" ? "බැංකු (Bank)" : "Bank Transfer";
      if (m.toLowerCase().includes("card")) return activeLang === "si" ? "කාඩ්පත් (Card)" : "Card";
      return m;
    };

    const paymentItems =
      rawPayments.length > 0
        ? rawPayments.map((p: any, idx: number) => ({
            label: idx === 0 ? t.initialAdvance : `${t.payment} ${idx + 1}`,
            amount: Math.abs(Number(p.payment_amount ?? p.amount ?? 0)),
            method: formatPaymentMethod(p.method),
            date: p.payment_date || p.createdAt,
          }))
        : totalPaid > 0
        ? [
            {
              label: t.initialAdvance,
              amount: totalPaid,
              method: formatPaymentMethod("Cash"),
              date: invoice.issued_date || invoice.createdAt || new Date().toISOString(),
            },
          ]
        : [];

    const docNumber =
      invoice.doc_number ||
      (invoice.invoice_id ? `INV-${invoice.invoice_id}` : "POS Receipt");

    return {
      docType: isCompleted ? ("COMPLETED" as const) : ("DISPATCH" as const),
      docTitle: isCompleted ? t.completedTitle : t.dispatchTitle,
      docSubtitle: isCompleted ? t.completedSubtitle : t.dispatchSubtitle,
      docNumber,
      issuedDate: invoice.issued_date || invoice.createdAt || new Date().toISOString(),
      customer: {
        name:
          cust.customer_type === "Business" && cust.company_name
            ? cust.company_name
            : cust.company_name ||
              `${cust.first_name || ""} ${cust.last_name || ""}`.trim() ||
              t.walkInCustomer,
        nic: cust.nic_number || t.notOnFile,
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
      totalUnits: lines.reduce((acc: number, l: any) => acc + l.qty, 0),
      subtotal,
      transport,
      discount,
      lateFees,
      grandTotal,
      payments: paymentItems,
      totalPaid,
      balanceDue,
      vaultStatus:
        invoice.id_card_status || cust.is_id_retained_currently
          ? t.vaultHeld
          : t.vaultReleased,
      statusDisplay: isCompleted ? t.statusCompleted : t.statusActive,
    };
  }, [invoice, isDraft, draftData, currencyCode, activeLang, t]);

  // Styling metrics based on paperWidth & density
  const is58mm = paperWidth === "58mm";
  const isCompact = density === "compact";
  const fontSizeBase = is58mm ? "10px" : isCompact ? "10.5px" : "11px";
  const fontSizeHeader = is58mm ? "14px" : "16px";
  const fontSizeTotal = is58mm ? "13px" : "15px";
  const lineHeight = "1.25";

  // Clean sans-serif and Sinhala font stack
  const activeFont =
    activeLang === "si"
      ? "'Noto Sans Sinhala', 'Sinhala Sangam MN', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans Sinhala', sans-serif";

  // Container styling
  const containerStyle: React.CSSProperties = isPreview
    ? {
        width: is58mm ? "48mm" : "72mm",
        maxWidth: is58mm ? "48mm" : "72mm",
        margin: "0 auto",
        padding: "2mm 2mm 6mm 2mm",
        backgroundColor: "#ffffff",
        color: "#000000",
        fontFamily: activeFont,
        fontWeight: 500,
        fontSize: fontSizeBase,
        lineHeight,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        border: "1px solid #cbd5e1",
        borderRadius: "4px",
      }
    : {
        display: "none", // Keeps it hidden on dashboard; iframe clones innerHTML directly
        fontFamily: activeFont,
        fontWeight: 500,
        color: "#000000",
        backgroundColor: "#ffffff",
        fontSize: fontSizeBase,
        lineHeight,
      };

  return (
    <Box id={id} sx={containerStyle}>
      {/* ── 1. STORE HEADER ─────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: "3px", marginTop: "0" }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: fontSizeHeader,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "#000000",
            lineHeight: 1.15,
          }}
        >
          {companyName}
        </div>
        <div style={{ fontSize: is58mm ? "9px" : "10px", marginTop: "1px", color: "#000000", fontWeight: 600 }}>
          {t.category}
        </div>
        <div style={{ fontSize: is58mm ? "8.5px" : "9.5px", marginTop: "1px", color: "#000000", fontWeight: 500 }}>
          {companyAddress}
        </div>
        <div style={{ fontSize: is58mm ? "8.5px" : "9.5px", color: "#000000", fontWeight: 500 }}>
          Tel: {companyPhone} · {companyEmail}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px dashed #000000", margin: "2.5px 0" }} />

      {/* ── 2. DOCUMENT TYPE BANNER & METADATA ───────────────────────────────── */}
      <div
        style={{
          border: "1px solid #000000",
          padding: "2px 4px",
          textAlign: "center",
          margin: "2.5px 0",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: is58mm ? "10px" : "11.5px", color: "#000000" }}>
          {normalized.docTitle}
        </div>
        <div style={{ fontSize: is58mm ? "8px" : "9px", color: "#000000", fontWeight: 500 }}>
          {normalized.docSubtitle}
        </div>
      </div>

      <div style={{ fontSize: fontSizeBase, margin: "3px 0", fontWeight: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600 }}>{t.docNumber}</span>
          <span style={{ fontWeight: 700 }}>{normalized.docNumber}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{t.dateTime}</span>
          <span>{fmtDateTime(normalized.issuedDate)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{t.operator}</span>
          <span>{operatorName}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{t.status}</span>
          <span style={{ fontWeight: 700 }}>{normalized.statusDisplay.toUpperCase()}</span>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px dashed #000000", margin: "2.5px 0" }} />

      {/* ── 3. CLIENT & VERIFICATION DETAILS ─────────────────────────────────── */}
      <div style={{ fontSize: fontSizeBase, margin: "3px 0", fontWeight: 500 }}>
        <div style={{ fontWeight: 700, marginBottom: "1px" }}>
          {t.client} {normalized.customer.name.toUpperCase()}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{t.nicReg}</span>
          <span style={{ fontWeight: 600 }}>{normalized.customer.nic}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{t.phone}</span>
          <span>{normalized.customer.phone}</span>
        </div>
        {normalized.customer.address && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t.address}</span>
            <span style={{ textAlign: "right", maxWidth: "60%" }}>
              {normalized.customer.address}
            </span>
          </div>
        )}
        {normalized.beneficiary && (
          <div
            style={{
              marginTop: "2px",
              paddingTop: "2px",
              borderTop: "1px dotted #000000",
              fontSize: is58mm ? "8.5px" : "9.5px",
            }}
          >
            <span style={{ fontWeight: 600 }}>{t.onBehalfOf} </span>
            {normalized.beneficiary.name} ({normalized.beneficiary.phone})
          </div>
        )}
        <div
          style={{
            marginTop: "2px",
            fontSize: is58mm ? "9px" : "10px",
            fontWeight: 600,
          }}
        >
          {t.vaultCollateral} [{normalized.vaultStatus}]
        </div>
      </div>

      {/* Double divider before equipment table */}
      <div
        style={{
          borderTop: "1.5px solid #000000",
          borderBottom: "1px solid #000000",
          height: "2px",
          margin: "3px 0",
        }}
      />

      {/* ── 4. ITEMIZED EQUIPMENT TABLE (OPTIMIZED FOR LONG INVOICES) ────────── */}
      <div style={{ margin: "2px 0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
            fontSize: is58mm ? "9px" : "10px",
            marginBottom: "2px",
          }}
        >
          <span>{t.itemCol}</span>
          <span style={{ textAlign: "right" }}>{t.qtyTotalCol}</span>
        </div>

        <hr style={{ border: "none", borderTop: "1px dashed #000000", margin: "2px 0" }} />

        {normalized.lines.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4px 0", fontWeight: 500 }}>
            {t.noItems}
          </div>
        ) : (
          normalized.lines.map((line, idx) => (
            <div
              key={line.id}
              className="avoid-break"
              style={{
                marginBottom: isCompact ? "2.5px" : "4px",
                pageBreakInside: "avoid",
                breakInside: "avoid",
              }}
            >
              {/* Row 1: Item Number & Name + Line Total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
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
                    fontWeight: 700,
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
                  fontWeight: 500,
                  paddingLeft: "8px",
                  marginTop: "0.5px",
                }}
              >
                <span>
                  {fmtDate(line.start)} → {fmtDate(line.end)} ({line.days}{activeLang === "si" ? " දින" : "d"})
                </span>
                <span style={{ fontWeight: 600 }}>{t.qty}: {line.qty}</span>
              </div>

              {/* Row 3: Pricing math details */}
              <div
                style={{
                  fontSize: is58mm ? "8px" : "9px",
                  color: "#000000",
                  fontWeight: 500,
                  paddingLeft: "8px",
                }}
              >
                {t.rate}: {line.pricingText}
              </div>

              {/* Line Status Badge (if Returned) */}
              {line.returnedDate && (
                <div
                  style={{
                    fontSize: "8.5px",
                    fontWeight: 600,
                    paddingLeft: "8px",
                  }}
                >
                  [{t.returnedOn} {fmtDateTime(line.returnedDate)}]
                </div>
              )}

              {idx < normalized.lines.length - 1 && (
                <hr
                  style={{
                    border: "none",
                    borderTop: "1px dotted #000000",
                    margin: "2px 0 2px 8px",
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
          padding: "2px 0",
          display: "flex",
          justifyContent: "space-between",
          fontSize: is58mm ? "8.5px" : "9.5px",
          fontWeight: 600,
          margin: "2.5px 0",
        }}
      >
        <span>{t.totalLineItems} {normalized.lines.length}</span>
        <span style={{ fontWeight: 700 }}>
          {t.totalMachines} {normalized.totalUnits}
        </span>
      </div>

      {/* ── 5. FINANCIAL BREAKDOWN ───────────────────────────────────────────── */}
      <div style={{ margin: "3px 0", fontSize: fontSizeBase, fontWeight: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{t.subtotal}</span>
          <span style={{ fontWeight: 600 }}>{fmtMoney(normalized.subtotal, currencyCode)}</span>
        </div>

        {normalized.transport > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t.transport}</span>
            <span style={{ fontWeight: 600 }}>+{fmtMoney(normalized.transport, currencyCode)}</span>
          </div>
        )}

        {normalized.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t.discount}</span>
            <span style={{ fontWeight: 600 }}>-{fmtMoney(normalized.discount, currencyCode)}</span>
          </div>
        )}

        {normalized.lateFees > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t.lateFees}</span>
            <span style={{ fontWeight: 600 }}>+{fmtMoney(normalized.lateFees, currencyCode)}</span>
          </div>
        )}

        {/* Double solid border around GRAND TOTAL */}
        <div
          style={{
            borderTop: "1.5px solid #000000",
            borderBottom: "1.5px solid #000000",
            padding: "2.5px 0",
            margin: "3px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: fontSizeTotal }}>
            {t.netTotal}
          </span>
          <span style={{ fontWeight: 800, fontSize: fontSizeTotal }}>
            {fmtMoney(normalized.grandTotal, currencyCode)}
          </span>
        </div>

        {/* Itemized Payments */}
        {normalized.payments.length > 0 && (
          <div style={{ margin: "2.5px 0" }}>
            {normalized.payments.map((p, pIdx) => (
              <div
                key={pIdx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: is58mm ? "8.5px" : "9.5px",
                  fontWeight: 500,
                }}
              >
                <span>
                  {p.label} ({p.method}):
                </span>
                <span style={{ fontWeight: 600 }}>-{fmtMoney(p.amount, currencyCode)}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                marginTop: "1.5px",
              }}
            >
              <span>{t.totalPaid}</span>
              <span>{fmtMoney(normalized.totalPaid, currencyCode)}</span>
            </div>
          </div>
        )}

        {/* Double Border around BALANCE DUE */}
        <div
          style={{
            borderTop: "1px dashed #000000",
            borderBottom: "1.5px solid #000000",
            padding: "2.5px 0",
            marginTop: "2.5px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: fontSizeTotal }}>
            {t.balanceDue}
          </span>
          <span
            style={{
              fontWeight: 800,
              fontSize: fontSizeTotal,
            }}
          >
            {normalized.balanceDue === 0 ? t.paidInFull : fmtMoney(normalized.balanceDue, currencyCode)}
          </span>
        </div>
      </div>

      {/* ── 6. CUSTOM NOTES (IF SPECIFIED) ──────────────────────────────────── */}
      {customNotes && (
        <div
          style={{
            border: "1px dotted #000000",
            padding: "2.5px",
            margin: "3px 0",
            fontSize: is58mm ? "8.5px" : "9.5px",
            fontWeight: 500,
          }}
        >
          <div style={{ fontWeight: 700 }}>{t.remarks}</div>
          <div>{customNotes}</div>
        </div>
      )}

      {/* ── 7. RENTAL CONDITIONS (COMPACT & LEGALLY ESSENTIAL) ───────────────── */}
      {showTerms && (
        <div
          className="avoid-break"
          style={{
            margin: "4px 0",
            fontSize: is58mm ? "8px" : "8.5px",
            lineHeight: "1.25",
            fontWeight: 500,
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          <div style={{ fontWeight: 700, textAlign: "center", marginBottom: "1.5px" }}>
            {t.termsTitle}
          </div>
          <div style={{ margin: "0.5px 0" }}>{t.term1}</div>
          <div style={{ margin: "0.5px 0" }}>{t.term2}</div>
          <div style={{ margin: "0.5px 0" }}>{t.term3}</div>
          <div style={{ margin: "0.5px 0" }}>{t.term4}</div>
        </div>
      )}

      {/* ── 8. DUAL SIGNATURE BLOCK ─────────────────────────────────────────── */}
      <div
        className="avoid-break"
        style={{
          marginTop: "8px",
          marginBottom: "4px",
          fontSize: is58mm ? "8.5px" : "9.5px",
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ flex: 1, textAlign: "left" }}>
            {capturedCustomer ? (
              <img
                src={resolveImageUrl(capturedCustomer.image_url) || ""}
                alt="Customer signature"
                style={{
                  display: "block",
                  maxHeight: 42,
                  maxWidth: "100%",
                  objectFit: "contain",
                  marginBottom: 2,
                }}
              />
            ) : (
              <div style={{ borderBottom: "1px solid #000000", height: "18px", marginBottom: "2px" }} />
            )}
            <div style={{ fontWeight: 700 }}>{t.custSign}</div>
            <div style={{ fontSize: "8px", fontWeight: 500 }}>
              {capturedCustomer?.signatory_name || normalized.customer.name}
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            {capturedOperator ? (
              <img
                src={resolveImageUrl(capturedOperator.image_url) || ""}
                alt="Operator signature"
                style={{
                  display: "block",
                  maxHeight: 42,
                  maxWidth: "100%",
                  objectFit: "contain",
                  marginBottom: 2,
                  marginLeft: "auto",
                }}
              />
            ) : (
              <div style={{ borderBottom: "1px solid #000000", height: "18px", marginBottom: "2px" }} />
            )}
            <div style={{ fontWeight: 700 }}>{t.authSign}</div>
            <div style={{ fontSize: "8px", fontWeight: 500 }}>
              {capturedOperator?.signatory_name || operatorName}
            </div>
          </div>
        </div>
      </div>

      {/* ── 9. VECTOR BARCODE & FOOTER ───────────────────────────────────────── */}
      {showBarcode && (
        <div className="avoid-break" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
          <Code39Barcode
            value={normalized.docNumber}
            height={is58mm ? 26 : 30}
            narrowWidth={is58mm ? 1.1 : 1.3}
            wideWidth={is58mm ? 2.6 : 3.2}
          />
        </div>
      )}

      <div
        style={{
          textAlign: "center",
          marginTop: "2.5px",
          fontSize: is58mm ? "8.5px" : "9.5px",
          fontWeight: 600,
          color: "#000000",
        }}
      >
        <div>{t.thankYou(companyName)}</div>
        <div style={{ fontSize: "8px", marginTop: "1px", fontWeight: 500 }}>
          {t.poweredBy}
        </div>
      </div>

      {/* Minimal 2mm cutter gap so footer is never clipped */}
      <div style={{ height: "2mm", width: "100%" }} />
    </Box>
  );
};
