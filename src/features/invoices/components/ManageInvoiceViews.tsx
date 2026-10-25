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
    return inv.status === "Active" ? "#f59e0b" : "#10b981";
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
            const isActive = inv.status === "Active";
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
                      label={inv.status}
                      color={isActive ? "warning" : "success"}
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

/** One icon + value + short label — keeps mixed Sinhala/English/number details scannable. */
function InfoTile({
  icon,
  tone,
  value,
  label,
  note,
  muted = false,
}: {
  icon: React.ReactNode;
  tone: string; // accent colour of the icon circle
  value: React.ReactNode;
  label: string;
  note?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        p: 1.1,
        bgcolor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 2,
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          bgcolor: `${tone}1f`,
          color: tone,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          "& svg": { fontSize: 19 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: "0.92rem",
            lineHeight: 1.25,
            color: muted ? "#64748b" : "#0f172a",
            fontStyle: muted ? "italic" : "normal",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </Typography>
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: "#475569", lineHeight: 1.3 }}>{label}</Typography>
        {note && <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#b45309", lineHeight: 1.3, fontVariantNumeric: "tabular-nums" }}>{note}</Typography>}
      </Box>
    </Box>
  );
}

function LedgerLineRow({
  line,
  info,
  commonOutDate,
  returnTraces,
}: {
  line: any;
  info: LineToday;
  commonOutDate: string;
  returnTraces: any[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const equipName = line.Equipment?.equipment_name || t("invoices.ManageInvoiceViews.unknownAsset");
  const equipNameSi = line.Equipment?.equipment_name_si;

  const dotColor = !info.isActive ? "#10b981" : info.isOverdue ? "#ef4444" : "#f59e0b";
  const statusChip = !info.isActive
    ? { label: t("invoices.returned"), color: "success" as const, variant: "outlined" as const }
    : info.isOverdue
      ? { label: t("orders.ledger.lateBy", { count: info.daysLate }), color: "error" as const, variant: "filled" as const }
      : {
          label: info.returned > 0 ? t("orders.ledger.outPartial", { pending: info.pending, qty: info.qty }) : t("orders.ledger.statusOut"),
          color: "warning" as const,
          variant: "filled" as const,
        };

  const formula = !info.isActive
    ? t("invoices.ManageInvoiceViews.finalCostLocked")
    : info.isOverdue
      ? t("orders.ledger.lateFormula", {
          base: money(info.lockedCost),
          days: info.daysLate,
          rate: money(Number(line.locked_extra_daily_rate) || 0),
          pending: info.pending,
        })
      : t("orders.ledger.lockedAtDispatch", { base: money(info.lockedCost) });

  const lineIterations = returnTraces
    .map((trace: any) => {
      let payload = trace.state_payload || {};
      if (typeof payload === "string") {
        try { payload = JSON.parse(payload); } catch { payload = {}; }
      }
      const rl = (payload.lines_returned || []).find((l: any) => l.line_id === line.line_id);
      if (rl && (Number(rl.good_qty) > 0 || Number(rl.defective_qty) > 0)) {
        return { date: trace.occurred_at || trace.createdAt, good: Number(rl.good_qty) || 0, defective: Number(rl.defective_qty) || 0 };
      }
      return null;
    })
    .filter(Boolean) as { date: string; good: number; defective: number }[];

  const showOwnOutDate = info.outDate && info.outDate !== commonOutDate;

  return (
    <Box
      sx={{
        bgcolor: "white",
        border: "1px solid",
        borderColor: info.isOverdue ? "#fca5a5" : "#e2e8f0",
        borderRadius: 2,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.25,
          minHeight: 56,
          cursor: "pointer",
          "&:hover": { bgcolor: "#f8fafc" },
          "&:focus-visible": { outline: "2px solid #2563eb", outlineOffset: -2 },
        }}
      >
        <StatusDot color={dotColor} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a" }}>
              {equipName}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "#475569", fontVariantNumeric: "tabular-nums" }}>
              ×{info.qty}
            </Typography>
            {equipNameSi && (
              <Typography variant="caption" sx={{ color: "#475569", fontWeight: 600 }}>
                {equipNameSi}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
            <Chip
              size="small"
              label={statusChip.label}
              color={statusChip.color}
              variant={statusChip.variant}
              sx={{ fontWeight: 800, fontSize: "0.68rem", height: 20, fontVariantNumeric: "tabular-nums" }}
            />
            {info.isActive && info.tracked && info.dueDate && (
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: info.isOverdue ? "#b91c1c" : "#475569", display: "inline-flex", alignItems: "center", gap: 0.4, fontVariantNumeric: "tabular-nums" }}
              >
                {info.isOverdue && <AccessTimeIcon sx={{ fontSize: 13 }} />}
                {t("orders.ledger.dueOn", { date: formatDisplayDate(info.dueDate) })}
              </Typography>
            )}
            {showOwnOutDate && (
              <Typography variant="caption" sx={{ color: "#475569", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {t("orders.ledger.outOn", { date: formatDisplayDate(info.outDate) })}
              </Typography>
            )}
          </Box>
        </Box>
        <Typography
          sx={{
            fontWeight: 900,
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: info.isActive ? "primary.main" : "#0f172a",
            whiteSpace: "nowrap",
          }}
        >
          Rs. {money(info.costToday)}
        </Typography>
        <ExpandMoreIcon sx={{ color: "#64748b", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </Box>

      {open && (
        <Box sx={{ px: 2, py: 1.5, bgcolor: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 1 }}>
            <InfoTile icon={<Inventory2OutlinedIcon />} tone="#2563eb" value={info.qty} label={t("orders.ledger.tileRented")} />
            <InfoTile icon={<AssignmentReturnedOutlinedIcon />} tone="#059669" value={info.returned} label={t("orders.ledger.tileReturned")} />
            <InfoTile icon={<HourglassTopOutlinedIcon />} tone="#d97706" value={info.pending} label={t("orders.ledger.tileStillOut")} />
            <InfoTile icon={<LocalShippingOutlinedIcon />} tone="#475569" value={info.outDate ? formatDisplayDate(info.outDate) : "—"} label={t("orders.ledger.tileOutOn")} />
            <InfoTile
              icon={<EventAvailableOutlinedIcon />}
              tone={info.isOverdue ? "#dc2626" : "#7c3aed"}
              value={info.tracked && info.dueDate ? formatDisplayDate(info.dueDate) : t("orders.ledger.notSet")}
              muted={!(info.tracked && info.dueDate)}
              label={t("orders.ledger.tileReturnBy")}
              note={info.isOverdue ? t("orders.ledger.lateBy", { count: info.daysLate }) : undefined}
            />
            <InfoTile
              icon={<SellOutlinedIcon />}
              tone="#0f766e"
              value={`Rs. ${money(info.costToday)}`}
              label={!info.isActive ? t("orders.ledger.finalPrice") : t("orders.ledger.agreedAtDispatch")}
              note={info.isOverdue ? t("orders.ledger.includesLateFee", { fee: money(info.lateFee) }) : undefined}
            />
          </Box>
          {info.isOverdue && (
            <Typography variant="caption" sx={{ color: "#334155", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.74rem", fontVariantNumeric: "tabular-nums" }}>
              {formula}
            </Typography>
          )}
          {lineIterations.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#475569", fontSize: "0.66rem" }}>
                {t("orders.handoverHistory")}
              </Typography>
              {lineIterations.map((iter, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <SubdirectoryArrowRightIcon sx={{ color: "#94a3b8", fontSize: 15 }} />
                  <Typography variant="caption" sx={{ color: "#475569", fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                    {new Date(iter.date).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </Typography>
                  {iter.good > 0 && (
                    <Chip size="small" label={t("invoices.ManageInvoiceViews.good", { good: iter.good })} color="success" variant="outlined" sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />
                  )}
                  {iter.defective > 0 && (
                    <Chip size="small" label={t("invoices.ManageInvoiceViews.broken", { defective: iter.defective })} color="error" sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

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
  // When every machine went out the same day, say it once instead of on every row.
  const commonOutDate = summary.lines.length > 0 && summary.lines.every((l) => l.outDate === summary.lines[0].outDate) ? summary.lines[0].outDate : "";

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
        <Box sx={{ bgcolor: "#0f172a", borderRadius: 2.5, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", fontSize: "0.68rem" }}>
              {t("orders.ledger.costToday")}
            </Typography>
            <Typography sx={{ color: "#f8fafc", fontWeight: 900, fontSize: { xs: "1.6rem", md: "1.9rem" }, lineHeight: 1.15, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
              Rs. {money(summary.costToday)}
            </Typography>
            {summary.earliestOut && (
              <Typography variant="caption" sx={{ color: "#cbd5e1", fontVariantNumeric: "tabular-nums" }}>
                {t("orders.ledger.outSince", { date: formatDisplayDate(summary.earliestOut) })}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {summary.outCount > 0 && <Chip size="small" label={t("orders.ledger.machinesOut", { count: summary.outCount })} sx={{ bgcolor: "#f59e0b", color: "#0f172a", fontWeight: 800 }} />}
            {summary.returnedCount > 0 && <Chip size="small" label={t("orders.ledger.machinesReturned", { count: summary.returnedCount })} sx={{ bgcolor: "#10b981", color: "#0f172a", fontWeight: 800 }} />}
            {summary.overdueCount > 0 && <Chip size="small" label={t("orders.ledger.overdueCount", { count: summary.overdueCount })} sx={{ bgcolor: "#ef4444", color: "#ffffff", fontWeight: 800 }} />}
          </Box>
        </Box>
        {summary.lateFeeToday > 0 && (
          <Typography variant="caption" sx={{ color: "#92400e", bgcolor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 1.5, px: 1.5, py: 0.75, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {t("orders.ledger.lateFeeNote", { amount: money(summary.lateFeeToday) })}
          </Typography>
        )}

        {rawLines.map((line: any, i: number) => (
          <LedgerLineRow key={line.line_id} line={line} info={summary.lines[i]} commonOutDate={commonOutDate} returnTraces={returnTraces} />
        ))}

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
// PANE 3: FINANCIAL TERMINAL
// ============================================================================
const PAYMENT_METHODS = ["Cash", "Card", "Transfer", "Cheque"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function ManageFinancialPanel({
  invoice,
  showToast,
  isCollapsed,
  onToggleCollapse,
  onInvoiceDeleted,
}: {
  invoice: any;
  showToast: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onInvoiceDeleted?: () => void;
}) {
  const { t } = useTranslation();
  const paymentMutation = useAddPayment();
  const vaultMutation = useToggleVault();
  const updateFeesMutation = useUpdateFees();

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [isEditingFees, setIsEditingFees] = useState(false);
  const [receiptExpanded, setReceiptExpanded] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isPrintHistoryOpen, setIsPrintHistoryOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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
              {t("invoices.ManageInvoiceViews.selectAnInvoiceToOpen")}
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
        <Tooltip title={t("invoices.ManageInvoiceViews.expandTerminal")} placement="left">
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
          {t("invoices.ManageInvoiceViews.balanceRs", { balance: balance.toLocaleString() })}
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
      label = t("invoices.ManageInvoiceViews.refundLabel");
    } else if (collectionCounter === 0) {
      label = t("invoices.ManageInvoiceViews.advanceLabel");
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

  const printCount = rawTraces.filter((t: any) => t.event_action === "RECEIPT_PRINTED").length;

  const unifiedLedger = [...paymentEvents, ...feeEvents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleUpdateFees = () => {
    updateFeesMutation.mutate(
      { id: invoice.invoice_id, data: { transport_fee: fees.transport, discount_amount: fees.discount } },
      {
        onSuccess: () => { showToast(t("invoices.ManageInvoiceViews.feesUpdated"), "success"); setIsEditingFees(false); },
      }
    );
  };

  const handlePayment = (isRefund: boolean) => {
    const amt = Number(paymentAmount);
    if (amt <= 0) return showToast(t("invoices.ManageInvoiceViews.enterAValidAmount"), "error");
    if (isRefund && amt > totalPaid) return showToast(t("invoices.ManageInvoiceViews.cannotRefundMoreThanPaid"), "error");
    paymentMutation.mutate(
      { id: invoice.invoice_id, data: { amount: amt, method: paymentMethod, is_refund: isRefund } },
      {
        onSuccess: () => {
          showToast(isRefund ? t("invoices.ManageInvoiceViews.refundIssued") : t("invoices.ManageInvoiceViews.paymentRecorded"), "success");
          setPaymentAmount("");
        },
      }
    );
  };

  // ── Expanded terminal ──────────────────────────────────────────────────────
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, maxHeight: "100%", bgcolor: "#0f172a", overflow: "hidden" }}>
      {/* Terminal header */}
      <Box
        sx={{
          flexShrink: 0,
          px: 2,
          py: 0.75,
          borderBottom: "1px solid #1e293b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: balance > 0 ? "#f87171" : "#4ade80", boxShadow: `0 0 6px ${balance > 0 ? "#f87171" : "#4ade80"}` }} />
          <Typography variant="overline" noWrap sx={{ color: "#64748b", fontWeight: 700, letterSpacing: 1, fontSize: "0.68rem", lineHeight: 1.4 }}>
            {t("orders.financialTerminal").toUpperCase()}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            variant={invoice.id_card_status ? "contained" : "outlined"}
            color={invoice.id_card_status ? "warning" : "inherit"}
            startIcon={<SecurityIcon sx={{ fontSize: 14 }} />}
            onClick={() => vaultMutation.mutate(invoice.invoice_id)}
            disabled={vaultMutation.isPending}
            sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
              py: 0.35,
              px: 1.2,
              borderRadius: 1.5,
              ...(invoice.id_card_status
                ? { bgcolor: "#fde047", color: "#854d0e", "&:hover": { bgcolor: "#facc15" } }
                : { borderColor: "#334155", color: "#94a3b8", "&:hover": { borderColor: "#475569", color: "#f8fafc" } }),
            }}
          >
            {invoice.id_card_status ? t("orders.releaseId") : t("invoices.ManageInvoiceViews.retainId")}
          </Button>
          <IconButton onClick={onToggleCollapse} size="small" sx={{ color: "#475569" }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Scrollable body */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          p: 1.5,
          pb: 3,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          "& > *": { flexShrink: 0 },
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-thumb": { background: "#334155", borderRadius: "4px" },
        }}
      >
        {/* Balance card */}
        <Box
          sx={{
            bgcolor: "#1e293b",
            borderRadius: 2,
            p: 1.5,
            textAlign: "center",
            border: "1px solid #334155",
          }}
        >
          <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1.5 }}>
            {t("orders.balanceDue").toUpperCase()}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              color: balance > 0 ? "#f87171" : "#4ade80",
              my: 0.25,
              fontSize: { xs: "1.6rem", md: "1.9rem" },
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -1,
            }}
          >
            Rs. {balance.toLocaleString()}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, my: 0.5 }}>
            <SecurityIcon sx={{ fontSize: 14, color: invoice.id_card_status ? "#fde047" : "#64748b" }} />
            <Typography variant="caption" sx={{ color: invoice.id_card_status ? "#fde047" : "#94a3b8", fontWeight: 700 }}>
              {invoice.id_card_status ? t("invoices.ManageInvoiceViews.idCurrentlyHeldInVault") : t("invoices.ManageInvoiceViews.idReleasedToClient")}
            </Typography>
          </Box>
          {isCompleted && balance === 0 && (
            <Typography variant="caption" sx={{ color: "#4ade80", fontWeight: 700, display: "block" }}>
              {t("invoices.ManageInvoiceViews.fullySettled")}
            </Typography>
          )}

          <Button
            fullWidth
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => setIsPrintDialogOpen(true)}
            sx={{
              mt: 1,
              bgcolor: "#2563eb",
              "&:hover": { bgcolor: "#1d4ed8" },
              fontWeight: 800,
              fontSize: "0.82rem",
              borderRadius: 2,
              py: 0.5,
              textTransform: "none",
            }}
          >
            {t("invoices.ManageInvoiceViews.printPosBillInv", { invoice_id: invoice.invoice_id })}
          </Button>

          <Can perform="invoice:print_log:view">
            <Button
              fullWidth
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => setIsPrintHistoryOpen(true)}
              sx={{
                mt: 0.75,
                borderColor: "#334155",
                color: "#94a3b8",
                "&:hover": { borderColor: "#475569", color: "#f8fafc", bgcolor: "rgba(255,255,255,0.03)" },
                fontWeight: 700,
                fontSize: "0.78rem",
                borderRadius: 2,
                py: 0.4,
                textTransform: "none",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {t("invoices.ManageInvoiceViews.viewBillPrintHistory")}{printCount > 0 ? ` (${printCount})` : ""}
            </Button>
          </Can>

          <Can perform={["invoice:delete", "invoice:delete:any"]}>
            <Button
              fullWidth
              variant="text"
              startIcon={<DeleteOutlinedIcon />}
              onClick={() => setIsDeleteOpen(true)}
              sx={{
                mt: 0.75,
                color: "#f87171",
                "&:hover": { color: "#fecaca", bgcolor: "rgba(248,113,113,0.1)" },
                fontWeight: 700,
                fontSize: "0.78rem",
                borderRadius: 2,
                py: 0.4,
                textTransform: "none",
              }}
            >
              {t("invoices.delete.button")}
            </Button>
          </Can>
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
                bgcolor: "#1e293b",
                color: "#f8fafc",
                borderRadius: 1.5,
                "& fieldset": { borderColor: "#334155" },
                "&:hover fieldset": { borderColor: "#475569" },
                "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
              },
              "& .MuiInputBase-input": {
                color: "#f8fafc !important",
                fontWeight: 700,
                fontSize: "0.95rem",
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: "tabular-nums",
                WebkitTextFillColor: "#f8fafc !important",
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <Typography sx={{ color: "#94a3b8", mr: 0.5, fontWeight: 700, fontSize: "0.85rem" }}>
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
            {t("orders.collect")}
          </Button>
          <Button
            variant="outlined"
            color="error"
            disableElevation
            onClick={() => handlePayment(true)}
            disabled={paymentMutation.isPending || totalPaid === 0}
            sx={{ fontWeight: 700, px: 1.5, borderRadius: 1.5, borderColor: "#334155" }}
          >
            {t("invoices.ManageInvoiceViews.refund")}
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
            sx={{ px: 2, minHeight: 34, "&.Mui-expanded": { minHeight: 34 }, "& .MuiAccordionSummary-content": { my: 0.75, "&.Mui-expanded": { my: 0.75 } }, borderBottom: receiptExpanded ? "1px solid #f1f5f9" : "none" }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 1 }}>
              <ReceiptLongIcon fontSize="small" /> {t("orders.receiptBreakdown")}
            </Typography>
          </AccordionSummary>
          <AccordionDetails
            sx={{
              px: 2.5,
              py: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
              scrollbarColor: "#cbd5e1 transparent",
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "4px" },
            }}
          >
            {!isEditingFees && !isCompleted && (
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  onClick={() => setIsEditingFees(true)}
                  startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                  sx={{ fontSize: "0.75rem", fontWeight: 700 }}
                >
                  {t("invoices.ManageInvoiceViews.editFees")}
                </Button>
              </Box>
            )}
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">{t("orders.baseSubtotal")}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                Rs. {subTotal.toLocaleString()}
              </Typography>
            </Box>

            {isEditingFees ? (
              <Box sx={{ bgcolor: "#fffbeb", border: "1px dashed #fde047", borderRadius: 2, p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                <TextField
                  label={t("invoices.ManageInvoiceViews.transportFee")}
                  size="small"
                  type="number"
                  value={fees.transport}
                  onChange={(e) => setFees({ ...fees, transport: Number(e.target.value) || 0 })}
                  sx={{
                    "& .MuiInputBase-input": {
                      color: "#0f172a !important",
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: "tabular-nums",
                      WebkitTextFillColor: "#0f172a !important",
                    },
                  }}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">Rs.</InputAdornment> } }}
                />
                <TextField
                  label={t("common.discount")}
                  size="small"
                  type="number"
                  value={fees.discount}
                  onChange={(e) => setFees({ ...fees, discount: Number(e.target.value) || 0 })}
                  sx={{
                    "& .MuiInputBase-input": {
                      color: "#0f172a !important",
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: "tabular-nums",
                      WebkitTextFillColor: "#0f172a !important",
                    },
                  }}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">Rs.</InputAdornment> } }}
                />
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => { setFees({ transport: initialTransport, discount: initialDiscount }); setIsEditingFees(false); }}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    disableElevation
                    onClick={handleUpdateFees}
                    disabled={updateFeesMutation.isPending}
                  >
                    {t("common.save")}
                  </Button>
                </Box>
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <LocalShippingIcon sx={{ fontSize: 14 }} /> {t("invoices.transport")}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                    + Rs. {initialTransport.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">{t("common.discount")}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main", fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                    − Rs. {initialDiscount.toLocaleString()}
                  </Typography>
                </Box>
              </>
            )}

            {lateFees > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "error.main", fontWeight: 700 }}>{t("invoices.ManageInvoiceViews.lateFees")}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main", fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                  + Rs. {lateFees.toLocaleString()}
                </Typography>
              </Box>
            )}

            <Divider sx={{ borderStyle: "dashed" }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{t("invoices.grandTotal")}</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                Rs. {grandTotal.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "success.main", fontWeight: 700 }}>{t("orders.totalPaid")}</Typography>
              <Typography variant="body2" sx={{ color: "success.main", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                − Rs. {totalPaid.toLocaleString()}
              </Typography>
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
            sx={{ px: 2, minHeight: 34, "&.Mui-expanded": { minHeight: 34 }, "& .MuiAccordionSummary-content": { my: 0.75, "&.Mui-expanded": { my: 0.75 } }, borderBottom: timelineExpanded ? "1px solid #f1f5f9" : "none" }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
              <HistoryIcon fontSize="small" /> {t("orders.transactionLedger")}
            </Typography>
          </AccordionSummary>
          <AccordionDetails
            sx={{
              p: 0,
              WebkitOverflowScrolling: "touch",
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "4px" },
            }}
          >
            {unifiedLedger.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">{t("orders.noTransactions")}</Typography>
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
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "warning.dark" }}>{t("invoices.ManageInvoiceViews.feesAdjusted")}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                          {t("invoices.ManageInvoiceViews.transportRsDiscountRs", { transport: (item as any).transport, discount: (item as any).discount })}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: item.type === "REFUND" ? "error.main" : "success.main",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {(item as any).label || (item.type === "REFUND" ? t("invoices.ManageInvoiceViews.refund") : t("invoices.ManageInvoiceViews.payment"))} · Rs.{(item as any).amount.toLocaleString()}
                          </Typography>
                          <Chip size="small" label={(item as any).method} sx={{ height: 16, fontSize: "0.6rem", fontWeight: 700 }} />
                        </Box>
                      </>
                    )}
                    <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {new Date(item.date).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* ── Thermal Receipt Print & Preview Dialog ── */}
      <ReceiptPrintDialog
        open={isPrintDialogOpen}
        onClose={() => setIsPrintDialogOpen(false)}
        invoice={invoice}
      />

      {/* ── Print Audit Trail & Reprint Dialog ── */}
      <InvoicePrintHistoryDialog
        open={isPrintHistoryOpen}
        onClose={() => setIsPrintHistoryOpen(false)}
        invoiceId={invoice.invoice_id}
        invoiceNumber={invoice.invoice_number || `INV-${invoice.invoice_id}`}
      />

      <DeleteInvoiceDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        invoice={invoice}
        onDeleted={onInvoiceDeleted}
      />
    </Box>
  );
}
