import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  Divider,
  Chip,
  Button,
  InputAdornment,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SecurityIcon from "@mui/icons-material/Security";
import AssignmentReturnedIcon from "@mui/icons-material/AssignmentReturned";
import HistoryIcon from "@mui/icons-material/History";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentIcon from "@mui/icons-material/Payment";
import EditIcon from "@mui/icons-material/Edit";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import DescriptionIcon from "@mui/icons-material/Description";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import {
  useInvoiceSearch,
  useInvoiceList,
  useAddPayment,
  useToggleVault,
  useUpdateFees,
} from "../hooks/useInvoiceHooks";
import { formatDisplayDate } from "@/lib/dates";
import { useInvoiceReviews } from "@/features/reviews/hooks/useInvoiceReviews";
import { ReviewThread } from "@/features/reviews/components/ReviewThread";
import { ReviewComposer } from "@/features/reviews/components/ReviewComposer";

const scroll = {
  "&::-webkit-scrollbar": { width: "5px" },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" },
};

const StatusDot = ({ color }: { color: string }) => (
  <Box
    sx={{
      width: 8,
      height: 8,
      borderRadius: "50%",
      bgcolor: color,
      boxShadow: `0 0 6px 2px ${color}60`,
      flexShrink: 0,
    }}
  />
);

const relDate = (dateStr: string) => {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return formatDisplayDate(dateStr);
};

// ============================================================================
// PANE 1: INVOICE ROSTER (search + status filter + live list)
// ============================================================================
export function ManageSearchPanel({
  onSelectInvoice,
  selectedInvoiceId = null,
}: {
  onSelectInvoice: (id: number) => void;
  selectedInvoiceId?: number | null;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Completed">("All");

  const { data: searchResults = [], isLoading: searching } = useInvoiceSearch(searchInput);
  const { data: listData, isLoading: listLoading } = useInvoiceList(
    1,
    25,
    statusFilter === "All" ? undefined : statusFilter
  );

  const isSearchMode = searchInput.length > 0;
  const displayInvoices: any[] = isSearchMode
    ? searchResults
    : listData?.invoices || [];
  const isLoading = isSearchMode ? searching : listLoading;

  const borderColor = (inv: any) => {
    if (inv.invoice_id === selectedInvoiceId) return "#2563eb";
    return inv.status === "Active" ? "#fbbf24" : "#e2e8f0";
  };

  const bgColor = (inv: any) => {
    if (inv.invoice_id === selectedInvoiceId) return "#eff6ff";
    return "white";
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Search */}
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search INV #, name, or phone…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ color: "action.disabled", mr: 1, fontSize: 18 }} />,
              endAdornment: isLoading ? <CircularProgress size={16} /> : null,
              sx: {
                borderRadius: 2,
                bgcolor: "white",
                "& fieldset": { borderColor: "#e2e8f0" },
              },
            },
          }}
        />
      </Box>

      {/* Status filter chips */}
      <Box sx={{ px: 2, pb: 1.5, display: "flex", gap: 1, flexShrink: 0 }}>
        {(["All", "Active", "Completed"] as const).map((s) => (
          <Chip
            key={s}
            size="small"
            label={s}
            clickable
            onClick={() => setStatusFilter(s)}
            variant={statusFilter === s ? "filled" : "outlined"}
            color={statusFilter === s ? (s === "Active" ? "warning" : s === "Completed" ? "success" : "primary") : "default"}
            sx={{ fontWeight: 700, fontSize: "0.72rem" }}
          />
        ))}
        {!isSearchMode && listData?.totalItems != null && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", alignSelf: "center" }}>
            {listData.totalItems} total
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Invoice list */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", ...scroll }}>
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 4 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!isLoading && displayInvoices.length === 0 && (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <DescriptionIcon sx={{ fontSize: 36, color: "#cbd5e1", mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {isSearchMode ? "No invoices match your search." : "No invoices found."}
            </Typography>
          </Box>
        )}

        {!isLoading &&
          displayInvoices.map((inv: any) => {
            const isActive = inv.status === "Active";
            const customerName =
              inv.Customer?.company_name ||
              `${inv.Customer?.first_name || ""} ${inv.Customer?.last_name || ""}`.trim() ||
              "Unknown";
            const isSelected = inv.invoice_id === selectedInvoiceId;
            const payments = inv.Payments || [];
            const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.payment_amount), 0);
            const balance = Math.max(0, Number(inv.total_amount) - totalPaid);

            return (
              <Box
                key={inv.invoice_id}
                onClick={() => onSelectInvoice(inv.invoice_id)}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: "1px solid #f1f5f9",
                  borderLeft: "3px solid",
                  borderLeftColor: borderColor(inv),
                  bgcolor: bgColor(inv),
                  cursor: "pointer",
                  transition: "all 0.15s",
                  "&:hover": {
                    bgcolor: isSelected ? "#eff6ff" : "#f8fafc",
                    borderLeftColor: isSelected ? "#2563eb" : (isActive ? "#f59e0b" : "#10b981"),
                  },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: isSelected ? "primary.main" : "#1e293b" }}>
                      INV-{inv.invoice_id}
                    </Typography>
                    <Chip
                      size="small"
                      label={inv.status}
                      color={isActive ? "warning" : "success"}
                      variant={isSelected ? "filled" : "outlined"}
                      sx={{ fontWeight: 700, fontSize: "0.65rem", height: 18 }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: balance > 0 ? "#dc2626" : "#059669" }}>
                    Rs. {Number(inv.total_amount).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: "65%" }}>
                    {customerName}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {relDate(inv.issued_date)}
                  </Typography>
                </Box>
                {balance > 0 && isActive && (
                  <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 600, fontSize: "0.68rem" }}>
                    Balance due: Rs. {balance.toLocaleString()}
                  </Typography>
                )}
              </Box>
            );
          })}
      </Box>
    </Box>
  );
}

// ============================================================================
// PANE 2: ASSET TRACKING BOARD
// ============================================================================
export function ManageLedgerPanel({
  invoice,
  onOpenReturn,
}: {
  invoice: any;
  onOpenReturn: () => void;
}) {
  if (!invoice)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 1.5,
          color: "#94a3b8",
        }}
      >
        <DescriptionIcon sx={{ fontSize: 48, opacity: 0.3 }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Select an invoice from the list to view its asset board.
        </Typography>
      </Box>
    );

  const rawLines = invoice.InvoiceLines || invoice.invoice_lines || invoice.lines || [];
  const rawTraces =
    invoice.InvoiceTraces ||
    invoice.InvoiceTrace ||
    invoice.invoice_traces ||
    invoice.traces ||
    [];
  const returnTraces = rawTraces.filter((t: any) => t.event_action === "RETURN_PROCESSED");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Board header */}
      <Box
        sx={{
          flexShrink: 0,
          px: 3,
          py: 2,
          bgcolor: "white",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Asset Tracking Board
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {rawLines.length} line item{rawLines.length !== 1 ? "s" : ""} · INV-{invoice.invoice_id}
          </Typography>
        </Box>
        {invoice.status === "Active" && (
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<AssignmentReturnedIcon />}
            disableElevation
            onClick={onOpenReturn}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Process Handover
          </Button>
        )}
      </Box>

      {/* Line cards */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2.5, display: "flex", flexDirection: "column", gap: 2, ...scroll }}>
        {rawLines.map((line: any) => {
          const isActive = line.line_status === "Active" || line.status === "Active";
          const equipName = line.Equipment?.equipment_name || "Unknown Asset";
          const alreadyReturned = (line.good_returned_qty || 0) + (line.defective_returned_qty || 0);
          const pending = line.borrow_quantity - alreadyReturned;

          const start = new Date(line.borrow_date).getTime();
          const today = Date.now();
          let daysOut = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
          if (daysOut < 1) daysOut = 1;

          const lockedBase = Number(line.locked_base_price) || 0;
          const lockedExtra = Number(line.locked_extra_daily_rate) || 0;
          const lockedMinDays = Number(line.locked_minimum_days) || 1;
          const borrowQty = Number(line.borrow_quantity) || 1;

          let accruedCost = 0;
          if (!isActive) {
            accruedCost = Number(line.line_total_amount) || 0;
          } else if (daysOut <= lockedMinDays) {
            accruedCost = lockedBase * borrowQty;
          } else {
            accruedCost = (lockedBase + (daysOut - lockedMinDays) * lockedExtra) * borrowQty;
          }

          const isDailyMode = lockedMinDays <= 1 && lockedBase === lockedExtra;
          const isOverdue = isActive && daysOut > lockedMinDays;

          let breakdownBadge = "";
          let breakdownFormula = "";
          if (!isActive) {
            breakdownBadge = "Settled";
            breakdownFormula = "Final cost locked at return.";
          } else if (isDailyMode) {
            breakdownBadge = "Flat Daily";
            breakdownFormula = `Rs.${lockedBase.toLocaleString()} × ${daysOut}d × ${borrowQty} unit${borrowQty > 1 ? "s" : ""}`;
          } else {
            breakdownBadge = `Tiered (${lockedMinDays}d base)`;
            if (daysOut <= lockedMinDays) {
              breakdownFormula = `Base Rs.${lockedBase.toLocaleString()} × ${borrowQty} unit${borrowQty > 1 ? "s" : ""} (covers ${lockedMinDays}d)`;
            } else {
              const extraDays = daysOut - lockedMinDays;
              breakdownFormula = `[Rs.${lockedBase.toLocaleString()} + ${extraDays}d × Rs.${lockedExtra.toLocaleString()}] × ${borrowQty}`;
            }
          }

          const formattedCost = Number(accruedCost.toFixed(2)).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          });

          const lineIterations = returnTraces
            .map((trace: any) => {
              let payload = trace.state_payload || {};
              if (typeof payload === "string") {
                try { payload = JSON.parse(payload); } catch { payload = {}; }
              }
              const rl = (payload.lines_returned || []).find((l: any) => l.line_id === line.line_id);
              if (rl && (Number(rl.good_qty) > 0 || Number(rl.defective_qty) > 0)) {
                return {
                  date: trace.occurred_at || trace.createdAt,
                  good: Number(rl.good_qty) || 0,
                  defective: Number(rl.defective_qty) || 0,
                };
              }
              return null;
            })
            .filter(Boolean);

          return (
            <Box
              key={line.line_id}
              sx={{
                bgcolor: "white",
                border: "1px solid",
                borderColor: isOverdue ? "#fca5a5" : isActive ? "#fde68a" : "#e2e8f0",
                borderRadius: 2.5,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {/* Line header */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  bgcolor: "#fafafa",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <StatusDot color={isActive ? (isOverdue ? "#ef4444" : "#f59e0b") : "#10b981"} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {equipName}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={isActive ? (isOverdue ? "Overdue" : "Out on Rent") : "Returned"}
                  color={isActive ? (isOverdue ? "error" : "warning") : "success"}
                  variant={isActive ? "filled" : "outlined"}
                  sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                />
              </Box>

              {/* Data grid */}
              <Box sx={{ p: 2, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 2fr" }, gap: 2 }}>
                {/* Timeline */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", display: "block", mb: 0.5 }}>
                    Timeline
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Out: {formatDisplayDate(line.borrow_date)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: isOverdue ? "error.main" : "text.primary", display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    {isOverdue && <AccessTimeIcon sx={{ fontSize: 13 }} />}
                    Due: {formatDisplayDate(line.expected_return_date)}
                  </Typography>
                  {isActive && (
                    <Typography variant="caption" color={isOverdue ? "error.main" : "text.secondary"} sx={{ fontWeight: 600 }}>
                      {daysOut} day{daysOut !== 1 ? "s" : ""} out
                    </Typography>
                  )}
                </Box>

                {/* Qty stats */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", display: "block", mb: 0.5 }}>
                    Quantities
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Borrowed: {borrowQty}</Typography>
                  {alreadyReturned > 0 && (
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "success.main" }}>
                      Returned: {alreadyReturned}
                    </Typography>
                  )}
                  {isActive && (
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "warning.dark" }}>
                      Pending: {pending}
                    </Typography>
                  )}
                </Box>

                {/* Financial */}
                <Box
                  sx={{
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 2,
                    p: 1.5,
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
                      Cost {isActive ? "to Date" : "Final"}
                    </Typography>
                    <Chip
                      size="small"
                      label={breakdownBadge}
                      color={isActive ? "primary" : "default"}
                      variant={isActive ? "outlined" : "filled"}
                      sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700 }}
                    />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: isActive ? "primary.main" : "text.primary" }}>
                    Rs. {formattedCost}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", borderTop: "1px dashed #cbd5e1", pt: 0.5, mt: 0.5, lineHeight: 1.3 }}
                  >
                    {breakdownFormula}
                  </Typography>
                </Box>
              </Box>

              {/* Return iterations */}
              {lineIterations.length > 0 && (
                <Box sx={{ bgcolor: "#f8fafc", borderTop: "1px dashed #e2e8f0", p: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", display: "block", mb: 1 }}>
                    Handover History
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    {lineIterations.map((iter: any, i: number) => (
                      <Box
                        key={i}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          p: 1,
                          bgcolor: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: 1.5,
                        }}
                      >
                        <SubdirectoryArrowRightIcon sx={{ color: "#94a3b8", fontSize: 15 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ width: 130 }}>
                          {new Date(iter.date).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </Typography>
                        {iter.good > 0 && (
                          <Chip size="small" label={`${iter.good} Good`} color="success" variant="outlined" sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />
                        )}
                        {iter.defective > 0 && (
                          <Chip size="small" label={`${iter.defective} Broken`} color="error" variant="filled" sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          );
        })}

        {/* Reviews thread — staff-only ratings + comments for this invoice */}
        <InvoiceReviewsSection invoiceId={invoice.invoice_id} />
      </Box>
    </Box>
  );
}

// Reviews section embedded into the ledger so the operator can record a star
// rating + note without leaving the manage panel. The composer triggers
// recomputation of Customer.rating in the backend.
function InvoiceReviewsSection({ invoiceId }: { invoiceId: number }) {
  const { data: reviews = [], isLoading } = useInvoiceReviews(invoiceId);
  return (
    <Box
      sx={{
        mt: 2.5,
        p: 2,
        bgcolor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b", fontSize: "0.68rem" }}>
          REVIEWS & FEEDBACK
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {reviews.length} {reviews.length === 1 ? "entry" : "entries"}
        </Typography>
      </Box>
      <ReviewThread invoiceId={invoiceId} reviews={reviews} isLoading={isLoading} />
      <ReviewComposer invoiceId={invoiceId} />
    </Box>
  );
}

// ============================================================================
// PANE 3: FINANCIAL TERMINAL
// ============================================================================
const PAYMENT_METHODS = ["Cash", "Card", "Transfer", "Cheque"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function ManageFinancialPanel({
  invoice,
  showToast,
  isCollapsed,
  onToggleCollapse,
}: {
  invoice: any;
  showToast: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const paymentMutation = useAddPayment();
  const vaultMutation = useToggleVault();
  const updateFeesMutation = useUpdateFees();

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [isEditingFees, setIsEditingFees] = useState(false);
  const [receiptExpanded, setReceiptExpanded] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);

  const initialTransport = Number(invoice?.transport_fee) || 0;
  const initialDiscount = Number(invoice?.discount_amount) || 0;
  const [fees, setFees] = useState({ transport: initialTransport, discount: initialDiscount });

  useEffect(() => {
    setFees({ transport: initialTransport, discount: initialDiscount });
    setIsEditingFees(false);
  }, [invoice?.invoice_id, initialTransport, initialDiscount]);

  if (!invoice)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#0f172a",
          color: "#475569",
          gap: 1,
        }}
      >
        {!isCollapsed && (
          <Box sx={{ textAlign: "center", p: 3 }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Select an invoice to open the Financial Terminal.
            </Typography>
          </Box>
        )}
        {isCollapsed && (
          <Box
            onClick={onToggleCollapse}
            sx={{ height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <ChevronLeftIcon sx={{ color: "#475569" }} />
          </Box>
        )}
      </Box>
    );

  const payments = invoice.Payments || [];
  const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.payment_amount), 0) || 0;
  const subTotal = Number(invoice.sub_total) || 0;
  const grandTotal = Number(invoice.total_amount) || 0;
  const lateFees = Math.max(0, grandTotal - (subTotal + initialTransport - initialDiscount));
  const balance = Math.max(0, grandTotal - totalPaid);
  const isCompleted = invoice.status === "Completed";

  // ── Collapsed bar ──────────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <Box
        onClick={onToggleCollapse}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          alignItems: "center",
          py: 3,
          cursor: "pointer",
          bgcolor: "#0f172a",
          color: "white",
          "&:hover": { bgcolor: "#1e293b" },
        }}
      >
        <Tooltip title="Expand Terminal" placement="left">
          <IconButton color="inherit" size="small" sx={{ mb: 4 }}>
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
        <Typography
          sx={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontWeight: 800,
            letterSpacing: 2,
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
            color: balance > 0 ? "#f87171" : "#4ade80",
          }}
        >
          BALANCE · Rs. {balance.toLocaleString()}
        </Typography>
      </Box>
    );
  }

  // ── Payment event stream ───────────────────────────────────────────────────
  // Label payments chronologically: the first non-refund payment is the
  // "Advance" (captured at dispatch), then Payment 1, 2, 3… for each
  // subsequent collection. Refunds keep their own label and don't increment
  // the counter. The display ledger is sorted DESC for readability, but
  // labels are assigned in ASC order so they match the order of events as
  // they actually occurred.
  const paymentsByDateAsc = [...payments].sort(
    (a: any, b: any) =>
      new Date(a.payment_date || a.createdAt).getTime() -
      new Date(b.payment_date || b.createdAt).getTime()
  );
  let collectionCounter = 0;
  const paymentEvents = paymentsByDateAsc.map((p: any) => {
    const isRefund = Number(p.payment_amount) < 0;
    let label: string;
    if (isRefund) {
      label = "Refund";
    } else if (collectionCounter === 0) {
      label = "Advance";
      collectionCounter += 1;
    } else {
      label = `Payment ${collectionCounter}`;
      collectionCounter += 1;
    }
    return {
      id: `pay-${p.payment_id}`,
      type: isRefund ? "REFUND" : "PAYMENT",
      label,
      amount: Math.abs(Number(p.payment_amount)),
      method: p.method,
      date: p.payment_date || p.createdAt,
    };
  });

  const rawTraces =
    invoice.InvoiceTraces ||
    invoice.InvoiceTrace ||
    invoice.invoice_traces ||
    invoice.traces ||
    [];
  const feeEvents = rawTraces
    .filter((t: any) => t.event_action === "FEES_UPDATED")
    .map((t: any) => {
      let payload = t.state_payload || {};
      if (typeof payload === "string") {
        try { payload = JSON.parse(payload); } catch { payload = {}; }
      }
      return {
        id: `fee-${t.trace_id}`,
        type: "FEE_ADJUSTMENT",
        transport: payload.transport_fee,
        discount: payload.discount_amount,
        date: t.occurred_at || t.createdAt,
      };
    });

  const unifiedLedger = [...paymentEvents, ...feeEvents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleUpdateFees = () => {
    updateFeesMutation.mutate(
      { id: invoice.invoice_id, data: { transport_fee: fees.transport, discount_amount: fees.discount } },
      {
        onSuccess: () => { showToast("Fees updated.", "success"); setIsEditingFees(false); },
      }
    );
  };

  const handlePayment = (isRefund: boolean) => {
    const amt = Number(paymentAmount);
    if (amt <= 0) return showToast("Enter a valid amount.", "error");
    if (isRefund && amt > totalPaid) return showToast("Cannot refund more than paid.", "error");
    paymentMutation.mutate(
      { id: invoice.invoice_id, data: { amount: amt, method: paymentMethod, is_refund: isRefund } },
      {
        onSuccess: () => {
          showToast(isRefund ? "Refund issued." : "Payment recorded.", "success");
          setPaymentAmount("");
        },
      }
    );
  };

  // ── Expanded terminal ──────────────────────────────────────────────────────
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#0f172a", overflow: "hidden" }}>
      {/* Terminal header */}
      <Box
        sx={{
          flexShrink: 0,
          px: 3,
          py: 2,
          borderBottom: "1px solid #1e293b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: balance > 0 ? "#f87171" : "#4ade80", boxShadow: `0 0 6px ${balance > 0 ? "#f87171" : "#4ade80"}` }} />
          <Typography variant="overline" sx={{ color: "#64748b", fontWeight: 700, letterSpacing: 2 }}>
            FINANCIAL TERMINAL
          </Typography>
        </Box>
        <IconButton onClick={onToggleCollapse} size="small" sx={{ color: "#475569" }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Scrollable body */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-thumb": { background: "#334155", borderRadius: "4px" },
        }}
      >
        {/* Balance card */}
        <Box
          sx={{
            bgcolor: "#1e293b",
            borderRadius: 3,
            p: 3,
            textAlign: "center",
            border: "1px solid #334155",
          }}
        >
          <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, letterSpacing: 1.5 }}>
            BALANCE DUE
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              color: balance > 0 ? "#f87171" : "#4ade80",
              my: 1,
              fontSize: { xs: "2rem", md: "2.5rem" },
            }}
          >
            Rs. {balance.toLocaleString()}
          </Typography>
          {isCompleted && balance === 0 && (
            <Typography variant="caption" sx={{ color: "#4ade80", fontWeight: 700 }}>
              ✓ Fully Settled
            </Typography>
          )}
        </Box>

        {/* Payment method selector */}
        <Box>
          <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, letterSpacing: 1, display: "block", mb: 1 }}>
            PAYMENT METHOD
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {PAYMENT_METHODS.map((m) => (
              <Button
                key={m}
                size="small"
                variant={paymentMethod === m ? "contained" : "outlined"}
                disableElevation
                onClick={() => setPaymentMethod(m)}
                sx={{
                  flex: 1,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  color: paymentMethod === m ? "white" : "#475569",
                  borderColor: paymentMethod === m ? "primary.main" : "#334155",
                  bgcolor: paymentMethod === m ? "primary.main" : "transparent",
                  "&:hover": { borderColor: "primary.main" },
                  minWidth: 0,
                }}
              >
                {m}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Payment input */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            placeholder="0.00"
            size="small"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            disabled={isCompleted && balance === 0}
            sx={{
              flexGrow: 1,
              "& .MuiOutlinedInput-root": {
                color: "white",
                "& fieldset": { borderColor: "#334155" },
                "&:hover fieldset": { borderColor: "#475569" },
                "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <Typography sx={{ color: "#64748b", mr: 0.5, fontWeight: 700, fontSize: "0.85rem" }}>
                    Rs.
                  </Typography>
                ),
              },
            }}
          />
          <Button
            variant="contained"
            color="success"
            disableElevation
            onClick={() => handlePayment(false)}
            disabled={paymentMutation.isPending || balance === 0}
            sx={{ fontWeight: 800, px: 2, borderRadius: 1.5 }}
          >
            Collect
          </Button>
          <Button
            variant="outlined"
            color="error"
            disableElevation
            onClick={() => handlePayment(true)}
            disabled={paymentMutation.isPending || totalPaid === 0}
            sx={{ fontWeight: 700, px: 1.5, borderRadius: 1.5, borderColor: "#334155" }}
          >
            Refund
          </Button>
        </Box>

        {/* Receipt accordion */}
        <Accordion
          expanded={receiptExpanded}
          onChange={() => setReceiptExpanded(!receiptExpanded)}
          disableGutters
          elevation={0}
          sx={{
            bgcolor: "white",
            borderRadius: "10px !important",
            overflow: "hidden",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ px: 2.5, py: 1, borderBottom: receiptExpanded ? "1px solid #f1f5f9" : "none" }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
              <ReceiptLongIcon fontSize="small" /> Receipt Breakdown
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2.5, py: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            {!isEditingFees && !isCompleted && (
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  onClick={() => setIsEditingFees(true)}
                  startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                  sx={{ fontSize: "0.75rem", fontWeight: 700 }}
                >
                  Edit Fees
                </Button>
              </Box>
            )}
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">Base Subtotal</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Rs. {subTotal.toLocaleString()}</Typography>
            </Box>

            {isEditingFees ? (
              <Box sx={{ bgcolor: "#fffbeb", border: "1px dashed #fde047", borderRadius: 2, p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                <TextField
                  label="Transport Fee"
                  size="small"
                  type="number"
                  value={fees.transport}
                  onChange={(e) => setFees({ ...fees, transport: Number(e.target.value) || 0 })}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">Rs.</InputAdornment> } }}
                />
                <TextField
                  label="Discount"
                  size="small"
                  type="number"
                  value={fees.discount}
                  onChange={(e) => setFees({ ...fees, discount: Number(e.target.value) || 0 })}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">Rs.</InputAdornment> } }}
                />
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => { setFees({ transport: initialTransport, discount: initialDiscount }); setIsEditingFees(false); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    disableElevation
                    onClick={handleUpdateFees}
                    disabled={updateFeesMutation.isPending}
                  >
                    Save
                  </Button>
                </Box>
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <LocalShippingIcon sx={{ fontSize: 14 }} /> Transport
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>+ Rs. {initialTransport.toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">Discount</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main" }}>− Rs. {initialDiscount.toLocaleString()}</Typography>
                </Box>
              </>
            )}

            {lateFees > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "error.main", fontWeight: 700 }}>Late Fees</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>+ Rs. {lateFees.toLocaleString()}</Typography>
              </Box>
            )}

            <Divider sx={{ borderStyle: "dashed" }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Grand Total</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Rs. {grandTotal.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "success.main", fontWeight: 700 }}>Total Paid</Typography>
              <Typography variant="body2" sx={{ color: "success.main", fontWeight: 700 }}>− Rs. {totalPaid.toLocaleString()}</Typography>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Transaction timeline accordion */}
        <Accordion
          expanded={timelineExpanded}
          onChange={() => setTimelineExpanded(!timelineExpanded)}
          disableGutters
          elevation={0}
          sx={{ bgcolor: "white", borderRadius: "10px !important", overflow: "hidden", "&:before": { display: "none" } }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ px: 2.5, py: 1, borderBottom: timelineExpanded ? "1px solid #f1f5f9" : "none" }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
              <HistoryIcon fontSize="small" /> Transaction Ledger
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {unifiedLedger.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">No transactions recorded.</Typography>
              </Box>
            ) : (
              unifiedLedger.map((item, index) => (
                <Box
                  key={item.id}
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    borderBottom: index < unifiedLedger.length - 1 ? "1px solid #f8fafc" : "none",
                    display: "flex",
                    gap: 1.5,
                    alignItems: "flex-start",
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1.5,
                      bgcolor:
                        item.type === "PAYMENT"
                          ? "#f0fdf4"
                          : item.type === "REFUND"
                          ? "#fef2f2"
                          : "#fffbeb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    {item.type === "PAYMENT" && <PaymentIcon sx={{ fontSize: 14, color: "success.main" }} />}
                    {item.type === "REFUND" && <PaymentIcon sx={{ fontSize: 14, color: "error.main" }} />}
                    {item.type === "FEE_ADJUSTMENT" && <EditIcon sx={{ fontSize: 14, color: "warning.main" }} />}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    {item.type === "FEE_ADJUSTMENT" ? (
                      <>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "warning.dark" }}>Fees Adjusted</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Transport: Rs.{item.transport} · Discount: Rs.{item.discount}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: item.type === "REFUND" ? "error.main" : "success.main" }}
                          >
                            {(item as any).label || (item.type === "REFUND" ? "Refund" : "Payment")} · Rs.{item.amount.toLocaleString()}
                          </Typography>
                          <Chip size="small" label={item.method} sx={{ height: 16, fontSize: "0.6rem", fontWeight: 700 }} />
                        </Box>
                      </>
                    )}
                    <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600 }}>
                      {new Date(item.date).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </AccordionDetails>
        </Accordion>

        {/* Vault control */}
        <Box
          sx={{
            bgcolor: invoice.id_card_status ? "#1a1200" : "white",
            border: "1px solid",
            borderColor: invoice.id_card_status ? "#fde047" : "#334155",
            borderRadius: 2.5,
            p: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
            <SecurityIcon sx={{ fontSize: 16, color: invoice.id_card_status ? "#fde047" : "#475569" }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: invoice.id_card_status ? "#fde047" : "#94a3b8" }}>
              Security Vault
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: invoice.id_card_status ? "#fde047" : "#64748b", display: "block", mb: 1.5 }}>
            {invoice.id_card_status ? "Client's ID is locked in the vault." : "ID has been released to client."}
          </Typography>
          <Button
            fullWidth
            variant={invoice.id_card_status ? "outlined" : "contained"}
            color={invoice.id_card_status ? "warning" : "inherit"}
            onClick={() => vaultMutation.mutate(invoice.invoice_id)}
            disabled={vaultMutation.isPending}
            disableElevation
            size="small"
            sx={{
              fontWeight: 700,
              borderRadius: 1.5,
              ...(!invoice.id_card_status && { bgcolor: "#1e293b", color: "#94a3b8", "&:hover": { bgcolor: "#334155" } }),
            }}
          >
            {invoice.id_card_status ? "Release ID from Vault" : "Retain ID in Vault"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
