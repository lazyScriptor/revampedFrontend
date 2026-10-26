import React, { useState, useEffect } from "react";
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
import { useTheme } from "@mui/material/styles";
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
import PrintIcon from "@mui/icons-material/Print";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AssignmentReturnedOutlinedIcon from "@mui/icons-material/AssignmentReturnedOutlined";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import { ReceiptPrintDialog } from "./ReceiptPrintDialog";
import { LedgerTable } from "./LedgerTable";
import { WhatsAppButton } from "@/features/whatsapp/components/WhatsAppButton";
import { suggestedTemplate } from "@/features/whatsapp/lib/whatsapp";
import { DeleteInvoiceDialog } from "./DeleteInvoiceDialog";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { InvoicePrintHistoryDialog } from "./InvoicePrintHistoryDialog";
import { Can } from "@/components/auth/Can";
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
import { useTranslation } from "react-i18next";
import { relativeDay } from "@/lib/relativeTime";
import { summariseInvoice, type LineToday } from "../lib/lineCost";
import { invoiceStatusColor, invoiceStatusLabel } from "../lib/invoiceStatus";

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

const relDate = (dateStr: string) => relativeDay(dateStr, formatDisplayDate);

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
  const { t } = useTranslation();
  const theme = useTheme();
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Completed">("All");
  const [pageSize, setPageSize] = useState(25);

  const { data: searchResults = [], isLoading: searching } = useInvoiceSearch(searchInput);
  const { data: listData, isLoading: listLoading, isFetching } = useInvoiceList(
    1,
    pageSize,
    statusFilter === "All" ? undefined : statusFilter
  );

  const isSearchMode = searchInput.length > 0;
  const displayInvoices: any[] = isSearchMode
    ? searchResults
    : listData?.invoices || [];
  const isLoading = isSearchMode ? searching : listLoading;

  const counts = listData?.counts || { all: 0, active: 0, completed: 0 };
  const currentFilterTotal =
    statusFilter === "All"
      ? counts.all
      : statusFilter === "Active"
        ? counts.active
        : counts.completed;

  const borderColor = (inv: any) => {
    if (inv.invoice_id === selectedInvoiceId) return "#2563eb";
    return inv.status === "Completed" ? "#10b981" : inv.status === "PendingPayment" ? "#0ea5e9" : "#f59e0b";
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
          placeholder={t("invoices.findOrderPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ color: "text.secondary", mr: 1, fontSize: 18 }} />,
              endAdornment: isLoading ? <CircularProgress size={16} /> : null,
              sx: {
                borderRadius: 2,
                bgcolor: theme.palette.mode === "dark" ? "#1e293b" : "#ffffff",
                "& .MuiInputBase-input": {
                  color: theme.palette.mode === "dark" ? "#f8fafc" : "#0f172a",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                },
                "& fieldset": { borderColor: theme.palette.mode === "dark" ? "#334155" : "#e2e8f0" },
                "&:hover fieldset": { borderColor: theme.palette.mode === "dark" ? "#475569" : "#cbd5e1" },
                "&.Mui-focused fieldset": { borderColor: "primary.main" },
              },
            },
          }}
        />
      </Box>

      {/* Status filter chips with exact counts */}
      <Box sx={{ px: 2, pb: 1.5, display: "flex", alignItems: "center", gap: 1, flexShrink: 0, overflowX: "auto" }}>
        {(["All", "Active", "Completed"] as const).map((s) => {
          const count = s === "All" ? counts.all : s === "Active" ? counts.active : counts.completed;
          const baseLabel =
            s === "All"
              ? t("common.all")
              : s === "Active"
                ? t("invoices.active")
                : t("invoices.completed");
          const label = `${baseLabel} (${count})`;

          return (
            <Chip
              key={s}
              size="small"
              label={label}
              clickable
              onClick={() => {
                setStatusFilter(s);
                setPageSize(25);
              }}
              variant={statusFilter === s ? "filled" : "outlined"}
              color={statusFilter === s ? (s === "Active" ? "warning" : s === "Completed" ? "success" : "primary") : "default"}
              sx={{ fontWeight: 700, fontSize: "0.72rem", fontVariantNumeric: "tabular-nums" }}
            />
          );
        })}
        {!isSearchMode && currentFilterTotal > 0 && (
          <Typography
            variant="caption"
            sx={{
              ml: "auto",
              alignSelf: "center",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 700,
              color: "text.secondary",
              fontSize: "0.72rem",
              whiteSpace: "nowrap",
            }}
          >
            {t("invoices.ManageInvoiceViews.of", { displayInvoicesCount: displayInvoices.length, currentFilterTotal })}
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
              {isSearchMode ? t("invoices.ManageInvoiceViews.noInvoicesMatchYourSearch") : t("invoices.ManageInvoiceViews.noInvoicesFound")}
            </Typography>
          </Box>
        )}

        {!isLoading &&
          displayInvoices.map((inv: any) => {
            const isActive = inv.status !== "Completed";
            const customerName =
              inv.Customer?.company_name ||
              `${inv.Customer?.first_name || ""} ${inv.Customer?.last_name || ""}`.trim() ||
              t("invoices.ManageInvoiceViews.unknown");
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
                  borderLeft: "4px solid",
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
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 800,
                        color: isSelected ? "primary.main" : "#0f172a",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      INV-{inv.invoice_id}
                    </Typography>
                    <Chip
                      size="small"
                      label={t(invoiceStatusLabel(inv.status))}
                      color={invoiceStatusColor(inv.status)}
                      variant={isSelected ? "filled" : "outlined"}
                      sx={{ fontWeight: 800, fontSize: "0.65rem", height: 18 }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: balance > 0 ? "#dc2626" : "#059669",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    Rs. {Number(inv.total_amount).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: "65%", fontWeight: 500 }}>
                    {customerName}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
                    {relDate(inv.issued_date)}
                  </Typography>
                </Box>
                {balance > 0 && isActive && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#dc2626",
                      fontWeight: 700,
                      fontSize: "0.68rem",
                      display: "block",
                      mt: 0.25,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {t("invoices.ManageInvoiceViews.balanceDueRs", { balance: balance.toLocaleString() })}
                  </Typography>
                )}
              </Box>
            );
          })}

        {!isSearchMode && displayInvoices.length < currentFilterTotal && (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setPageSize((prev) => prev + 25)}
              disabled={isFetching}
              sx={{
                fontSize: "0.75rem",
                fontWeight: 700,
                borderRadius: 2,
                textTransform: "none",
                color: "primary.main",
                borderColor: "#cbd5e1",
                fontVariantNumeric: "tabular-nums",
                px: 2,
                py: 0.75,
              }}
            >
              {isFetching ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null}
              {t("invoices.ManageInvoiceViews.loadMoreInvoicesRemaining", { value: currentFilterTotal - displayInvoices.length })}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ============================================================================
// PANE 2: ASSET TRACKING BOARD
//  • "Cost for today" summary on top (what the customer would owe for the machines right now)
//  • one compact row per machine; out/due dates only appear when they add information
//    (a return date is shown — and can go overdue — ONLY if it is tracked on that line)
// ============================================================================
const money = (n: number) =>
  Number(n.toFixed(2)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function ManageLedgerPanel({
  invoice,
  onOpenReturn,
}: {
  invoice: any;
  onOpenReturn: () => void;
}) {
  const { t } = useTranslation();
  if (!invoice)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 1.5, color: "#94a3b8" }}>
        <DescriptionIcon sx={{ fontSize: 48, opacity: 0.3 }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {t("invoices.ManageInvoiceViews.selectAnInvoiceFromThe")}
        </Typography>
      </Box>
    );

  const rawLines = invoice.InvoiceLines || invoice.invoice_lines || invoice.lines || [];
  const rawTraces = invoice.InvoiceTraces || invoice.InvoiceTrace || invoice.invoice_traces || invoice.traces || [];
  const returnTraces = rawTraces.filter((tr: any) => tr.event_action === "RETURN_PROCESSED");
  const summary = summariseInvoice(rawLines);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}>
      {/* Board header */}
      <Box sx={{ flexShrink: 0, px: 3, py: 2, bgcolor: "white", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t("orders.assetTrackingBoard")}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {t("invoices.lineItem", { count: rawLines.length })} · INV-{invoice.invoice_id}
          </Typography>
        </Box>
        {invoice.status === "Active" && (
          <Button variant="contained" color="primary" size="small" startIcon={<AssignmentReturnedIcon />} disableElevation onClick={onOpenReturn} sx={{ fontWeight: 700, borderRadius: 2 }}>
            {t("invoices.ManageInvoiceViews.processHandover")}
          </Button>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: "auto", p: 2.5, display: "flex", flexDirection: "column", gap: 1.5, ...scroll, "& > *": { flexShrink: 0 } }}>
        {/* Cost for today */}
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 3, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", fontSize: "0.68rem" }}>
              {t("orders.ledger.costToday")}
            </Typography>
            <Typography sx={{ color: "text.primary", fontWeight: 900, fontSize: { xs: "1.6rem", md: "1.9rem" }, lineHeight: 1.15, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
              Rs. {money(summary.costToday)}
            </Typography>
            {summary.earliestOut && (
              <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                {t("orders.ledger.outSince", { date: formatDisplayDate(summary.earliestOut) })}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {summary.outCount > 0 && <Chip size="small" color="warning" label={t("orders.ledger.machinesOut", { count: summary.outCount })} sx={{ fontWeight: 800 }} />}
            {summary.returnedCount > 0 && <Chip size="small" color="success" variant="outlined" label={t("orders.ledger.machinesReturned", { count: summary.returnedCount })} sx={{ fontWeight: 800 }} />}
            {summary.overdueCount > 0 && <Chip size="small" color="error" label={t("orders.ledger.overdueCount", { count: summary.overdueCount })} sx={{ fontWeight: 800 }} />}
          </Box>
        </Box>
        {summary.lateFeeToday > 0 && (
          <Typography variant="caption" sx={{ color: "#92400e", bgcolor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 1.5, px: 1.5, py: 0.75, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {t("orders.ledger.lateFeeNote", { amount: money(summary.lateFeeToday) })}
          </Typography>
        )}

        <LedgerTable lines={rawLines} infos={summary.lines} returnTraces={returnTraces} />

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
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { data: reviews = [], isLoading } = useInvoiceReviews(invoiceId);
  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      disableGutters
      elevation={0}
      sx={{
        mt: 1.5,
        bgcolor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "10px !important",
        overflow: "hidden",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          px: 2,
          py: 0.5,
          minHeight: 44,
          "&.Mui-expanded": { minHeight: 44, borderBottom: "1px solid #f1f5f9" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", pr: 1 }}>
          <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.2, color: "#64748b", fontSize: "0.68rem" }}>
            {t("orders.reviewsHeader").toUpperCase()}
          </Typography>
          <Chip
            size="small"
            label={t("invoices.entries", { count: reviews.length })}
            sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#f1f5f9", color: "#475569" }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 320, overflowY: "auto" }}>
        <ReviewThread invoiceId={invoiceId} reviews={reviews} isLoading={isLoading} />
        <ReviewComposer invoiceId={invoiceId} />
      </AccordionDetails>
    </Accordion>
  );
}

// ============================================================================
// PANE 3: FINANCIAL PANEL — lives in ./ManageFinancialPanel.tsx
// ============================================================================
export { ManageFinancialPanel } from "./ManageFinancialPanel";
