import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import BuildIcon from "@mui/icons-material/Build";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import UndoIcon from "@mui/icons-material/Undo";
import SortIcon from "@mui/icons-material/Sort";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useTranslation } from "react-i18next";
import { formatDisplayDate } from "@/lib/dates";
import { invoiceStatusLabel } from "@/features/invoices/lib/invoiceStatus";
import type {
  MachinesBarItem,
  OpenBillItem,
  OpenBillsDatePreset,
  OpenBillsFilter,
  OpenBillsSort,
  SettlementViewPreferences,
} from "../types";

interface SettlementBillsStepProps {
  bills: OpenBillItem[];
  totalCount: number;
  isLoading: boolean;
  isFetchingMore?: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  pickedIds: number[];
  onTogglePick: (invoiceId: number) => void;
  onPickBill: (invoiceId: number) => void;
  undoPickIds: number[];
  onUndoClearPick: () => void;
  filter: OpenBillsFilter;
  onFilterChange: (f: OpenBillsFilter) => void;
  datePreset: OpenBillsDatePreset;
  onDatePresetChange: (d: OpenBillsDatePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomDateChange: (from: string, to: string) => void;
  equipmentFilterId: number | null;
  onEquipmentFilterChange: (id: number | null) => void;
  machinesBar: MachinesBarItem[];
  sort: OpenBillsSort;
  onSortChange: (s: OpenBillsSort) => void;
  onOpenBillDetail: (invoiceId: number) => void;
  prefs: SettlementViewPreferences;
  totalOpenBillsCount: number;
}

const fmtLkr = (n: number) =>
  `Rs ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const ageColor = (bucket: string) => {
  if (bucket === "green") return "#10b981";
  if (bucket === "amber") return "#f59e0b";
  return "#ef4444";
};

function BillCard({
  bill,
  picked,
  onTogglePick,
  onOpenDetail,
  prefs,
  isDark,
  isPhone,
  draggable,
}: {
  bill: OpenBillItem;
  picked: boolean;
  onTogglePick: () => void;
  onOpenDetail: () => void;
  prefs: SettlementViewPreferences;
  isDark: boolean;
  isPhone: boolean;
  draggable?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const isSi = i18n.language?.startsWith("si");
  const isCompleted = bill.status === "Completed" || bill.status === "Returned";
  const paidRatio =
    bill.live_total > 0
      ? Math.min(100, Math.max(0, (bill.amount_paid / bill.live_total) * 100))
      : 100;
  const railColor = ageColor(bill.age_bucket);
  const isCompact = prefs.cardSize === "compact";
  const isDetailed = prefs.cardSize === "detailed";

  const hoverSummary = `INV-${bill.invoice_id} · ${fmtLkr(bill.balance)} owed · ${bill.machines_out_count} out`;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "stretch",
        position: "relative",
        pl: isPhone ? 0 : 2,
      }}
    >
      {/* Thin tree connector line on desktop */}
      {!isPhone && (
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 16,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Box sx={{ width: "2px", height: "100%", bgcolor: isDark ? "#334155" : "#cbd5e1" }} />
          <Box sx={{ width: 14, height: "2px", bgcolor: isDark ? "#334155" : "#cbd5e1" }} />
        </Box>
      )}

      <Tooltip title={!isPhone ? hoverSummary : ""} placement="top" enterDelay={450}>
        <Paper
          data-testid={`settlement-bill-card-${bill.invoice_id}`}
          draggable={draggable && !isCompleted}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", String(bill.invoice_id));
          }}
          elevation={0}
          onClick={onOpenDetail}
          sx={{
            flex: 1,
            minWidth: 0,
            p: isCompact ? 1 : 1.5,
            borderRadius: 2,
            border: "1px solid",
            borderColor: picked
              ? "#f59e0b"
              : isDark
                ? "#334155"
                : "#e2e8f0",
            borderLeft: `4px solid ${railColor}`,
            bgcolor: picked
              ? isDark
                ? "rgba(245, 158, 11, 0.1)"
                : "#fffbeb"
              : isDark
                ? "#0f172a"
                : "#ffffff",
            cursor: "pointer",
            opacity: isCompleted ? 0.75 : 1,
            transition: "border-color 0.15s, background-color 0.15s",
            "&:hover": {
              borderColor: picked ? "#d97706" : isDark ? "#475569" : "#94a3b8",
            },
          }}
        >
          {/* Top row: tick circle + bill number + status + balance */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, flexWrap: "wrap" }}>
              {!isCompleted && (
                <IconButton
                  size="small"
                  aria-label={
                    picked
                      ? t("settlement.bills.unpickBill", { id: bill.invoice_id, defaultValue: `Unpick INV-${bill.invoice_id}` })
                      : t("settlement.bills.pickBill", { id: bill.invoice_id, defaultValue: `Pick INV-${bill.invoice_id}` })
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePick();
                  }}
                  sx={{ p: 0.25, color: picked ? "#f59e0b" : "text.secondary" }}
                >
                  {picked ? <CheckCircleIcon fontSize="medium" /> : <RadioButtonUncheckedIcon fontSize="medium" />}
                </IconButton>
              )}

              <Typography
                variant="body2"
                sx={{
                  fontWeight: 900,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                INV-{bill.invoice_id}
              </Typography>

              {prefs.showDates && (
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatDisplayDate(bill.issued_date)}
                </Typography>
              )}

              <Chip
                size="small"
                label={t(invoiceStatusLabel(bill.status))}
                sx={{ height: 20, fontSize: "0.66rem", fontWeight: 700 }}
              />

              {bill.on_behalf_of_customer_id && (
                <Chip
                  size="small"
                  color="info"
                  variant="outlined"
                  label={t("settlement.bills.onBehalfOf", {
                    name: bill.on_behalf_of_customer_name || `#${bill.on_behalf_of_customer_id}`,
                    defaultValue: `On behalf of ${bill.on_behalf_of_customer_name || `#${bill.on_behalf_of_customer_id}`}`,
                  })}
                  sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                />
              )}
            </Box>

            <Box sx={{ textAlign: "right", flexShrink: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 900,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                  color: bill.balance > 0 ? "error.main" : "success.main",
                  fontSize: isCompact ? "0.85rem" : "0.95rem",
                }}
              >
                {fmtLkr(bill.balance)}
              </Typography>
              {prefs.showRunningCharge && bill.growing_per_day > 0 && !isCompact && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "warning.main",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t("settlement.bills.growingPerDay", {
                    amount: fmtLkr(bill.growing_per_day),
                    defaultValue: `growing +${fmtLkr(bill.growing_per_day)}/day`,
                  })}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Paid / owed bar */}
          {!isCompact && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={paidRatio}
                sx={{
                  height: 6,
                  borderRadius: 99,
                  bgcolor: isDark ? "#334155" : "#e2e8f0",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: bill.balance <= 0 ? "#10b981" : "#3b82f6",
                    borderRadius: 99,
                  },
                }}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem", fontVariantNumeric: "tabular-nums" }}>
                  {t("settlement.bills.paidOfTotal", {
                    paid: fmtLkr(bill.amount_paid),
                    total: fmtLkr(bill.live_total),
                    defaultValue: `Paid ${fmtLkr(bill.amount_paid)} of ${fmtLkr(bill.live_total)}`,
                  })}
                </Typography>
                {prefs.showDiscount && bill.discount_amount > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem", fontVariantNumeric: "tabular-nums" }}>
                    {t("settlement.bills.discountShort", {
                      amount: fmtLkr(bill.discount_amount),
                      defaultValue: `Disc ${fmtLkr(bill.discount_amount)}`,
                    })}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {/* Machine icons: filled for out, ticked for back */}
          {prefs.showMachineIcons && bill.machine_counts?.length > 0 && !isCompact && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6, mt: 1 }}>
              {bill.machine_counts.map((mc) => {
                const isBack = mc.out_qty <= 0;
                const labelName = isSi && mc.equipment_name_si ? mc.equipment_name_si : mc.equipment_name;
                return (
                  <Chip
                    key={`${bill.invoice_id}-${mc.equipment_id}`}
                    size="small"
                    icon={
                      isBack ? (
                        <CheckCircleOutlinedIcon sx={{ fontSize: "14px !important", color: "#10b981 !important" }} />
                      ) : (
                        <BuildIcon sx={{ fontSize: "13px !important" }} />
                      )
                    }
                    label={
                      isBack
                        ? `${labelName} (${mc.total_qty})`
                        : `${labelName} × ${mc.out_qty}`
                    }
                    variant={isBack ? "outlined" : "filled"}
                    color={isBack ? "success" : "default"}
                    sx={{
                      height: 22,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  />
                );
              })}
            </Box>
          )}

          {/* Detailed view extra machine lines */}
          {isDetailed && bill.machine_counts?.length > 0 && (
            <Box sx={{ mt: 1, pt: 0.75, borderTop: "1px dashed", borderColor: "divider", display: "flex", flexDirection: "column", gap: 0.4 }}>
              {bill.machine_counts.map((mc) => (
                <Box key={`det-${mc.equipment_id}`} sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem" }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {isSi && mc.equipment_name_si ? mc.equipment_name_si : mc.equipment_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {mc.out_qty} out / {mc.returned_qty} back
                    {mc.due_date ? ` · Due ${formatDisplayDate(mc.due_date)}` : ""}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
            <Typography
              variant="caption"
              color="primary"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.3, fontWeight: 700, fontSize: "0.68rem" }}
            >
              {t("settlement.bills.tapForDetails", "View bill")}
              <OpenInNewIcon sx={{ fontSize: 12 }} />
            </Typography>
          </Box>
        </Paper>
      </Tooltip>
    </Box>
  );
}

export function SettlementBillsStep({
  bills,
  totalCount,
  isLoading,
  isFetchingMore = false,
  hasMore,
  onLoadMore,
  pickedIds,
  onTogglePick,
  onPickBill,
  undoPickIds,
  onUndoClearPick,
  filter,
  onFilterChange,
  datePreset,
  onDatePresetChange,
  customFrom,
  customTo,
  onCustomDateChange,
  equipmentFilterId,
  onEquipmentFilterChange,
  machinesBar,
  sort,
  onSortChange,
  onOpenBillDetail,
  prefs,
  totalOpenBillsCount,
}: SettlementBillsStepProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));

  const [workingGroupOpen, setWorkingGroupOpen] = useState(true);
  const [dragOverWorking, setDragOverWorking] = useState(false);
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const [machineAnchor, setMachineAnchor] = useState<HTMLElement | null>(null);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [renderLimit, setRenderLimit] = useState(60);

  const pickedSet = useMemo(() => new Set(pickedIds), [pickedIds]);

  const pickedBills = useMemo(() => bills.filter((b) => pickedSet.has(b.invoice_id)), [bills, pickedSet]);
  const unpickedBills = useMemo(() => bills.filter((b) => !pickedSet.has(b.invoice_id)), [bills, pickedSet]);

  const workingTotals = useMemo(
    () => ({
      owed: pickedBills.reduce((s, b) => s + Number(b.balance || 0), 0),
      machines: pickedBills.reduce((s, b) => s + Number(b.machines_out_count || 0), 0),
    }),
    [pickedBills],
  );

  // Virtualised slice for long lists
  const visibleUnpicked = useMemo(() => unpickedBills.slice(0, renderLimit), [unpickedBills, renderLimit]);

  const groupedUnpicked = useMemo(() => {
    if (!prefs.groupByMonth) return null;
    const groups = new Map<string, OpenBillItem[]>();
    for (const b of visibleUnpicked) {
      const d = new Date(b.issued_date);
      const key = isNaN(d.getTime())
        ? "Other"
        : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(b);
    }
    return Array.from(groups.entries());
  }, [prefs.groupByMonth, visibleUnpicked]);

  const filterChips: Array<{ id: OpenBillsFilter; label: string }> = [
    { id: "payment_due", label: t("settlement.filters.paymentDue", "Payment due") },
    { id: "machines_out", label: t("settlement.filters.machinesOut", "Machines still out") },
    { id: "all_back", label: t("settlement.filters.allBack", "All machines back") },
    { id: "completed", label: t("settlement.filters.completed", "Completed") },
    { id: "all", label: t("settlement.filters.all", "All") },
  ];

  const selectedMachineLabel = useMemo(() => {
    if (!equipmentFilterId) return null;
    return machinesBar.find((m) => m.equipment_id === equipmentFilterId)?.equipment_name ?? `#${equipmentFilterId}`;
  }, [equipmentFilterId, machinesBar]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, minHeight: 0, flex: 1 }}>
      {/* Filter & sort chips */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          flexWrap: { xs: "nowrap", sm: "wrap" },
          overflowX: { xs: "auto", sm: "visible" },
          pb: 0.5,
          flexShrink: 0,
        }}
      >
        {filterChips.map((fc) => {
          const active = filter === fc.id;
          return (
            <Chip
              key={fc.id}
              label={fc.label}
              clickable
              onClick={() => onFilterChange(fc.id)}
              sx={{
                flexShrink: 0,
                minHeight: 32,
                fontWeight: active ? 800 : 600,
                bgcolor: active ? "#f59e0b" : isDark ? "#1e293b" : "#f1f5f9",
                color: active ? "#0f172a" : isDark ? "#e2e8f0" : "#0f172a",
                border: "1px solid",
                borderColor: active ? "#d97706" : "divider",
              }}
            />
          );
        })}

        <Chip
          icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 14 }} />}
          label={
            datePreset === "all"
              ? t("settlement.filters.date", "Date")
              : t(`settlement.datePreset.${datePreset}`, datePreset)
          }
          clickable
          variant={datePreset !== "all" ? "filled" : "outlined"}
          color={datePreset !== "all" ? "primary" : "default"}
          onClick={(e) => setDateAnchor(e.currentTarget)}
          sx={{ flexShrink: 0, minHeight: 32, fontWeight: 700 }}
        />

        {machinesBar.length > 0 && (
          <Chip
            icon={<PrecisionManufacturingOutlinedIcon sx={{ fontSize: 14 }} />}
            label={selectedMachineLabel || t("settlement.filters.machine", "Machine")}
            clickable
            variant={equipmentFilterId ? "filled" : "outlined"}
            color={equipmentFilterId ? "primary" : "default"}
            onClick={(e) => setMachineAnchor(e.currentTarget)}
            sx={{ flexShrink: 0, minHeight: 32, fontWeight: 700 }}
          />
        )}

        <Chip
          icon={<SortIcon sx={{ fontSize: 14 }} />}
          label={
            sort === "oldest"
              ? t("settlement.sort.oldest", "Oldest first")
              : sort === "biggest_balance"
                ? t("settlement.sort.biggest", "Biggest balance")
                : t("settlement.sort.newest", "Newest")
          }
          clickable
          variant="outlined"
          onClick={(e) => setSortAnchor(e.currentTarget)}
          sx={{ flexShrink: 0, minHeight: 32, fontWeight: 700 }}
        />
      </Box>

      {/* Date Menu */}
      <Menu anchorEl={dateAnchor} open={Boolean(dateAnchor)} onClose={() => setDateAnchor(null)}>
        {(["all", "this_month", "last_3_months", "this_year", "custom"] as OpenBillsDatePreset[]).map((dp) => (
          <MenuItem
            key={dp}
            selected={datePreset === dp}
            onClick={() => {
              onDatePresetChange(dp);
              if (dp !== "custom") setDateAnchor(null);
            }}
          >
            {t(`settlement.datePreset.${dp}`, dp)}
          </MenuItem>
        ))}
        {datePreset === "custom" && (
          <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
            <TextField
              size="small"
              type="date"
              label={t("settlement.datePreset.from", "From")}
              value={customFrom}
              onChange={(e) => onCustomDateChange(e.target.value, customTo)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              type="date"
              label={t("settlement.datePreset.to", "To")}
              value={customTo}
              onChange={(e) => onCustomDateChange(customFrom, e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        )}
      </Menu>

      {/* Machine Filter Menu */}
      <Menu anchorEl={machineAnchor} open={Boolean(machineAnchor)} onClose={() => setMachineAnchor(null)}>
        <MenuItem
          selected={!equipmentFilterId}
          onClick={() => {
            onEquipmentFilterChange(null);
            setMachineAnchor(null);
          }}
        >
          {t("settlement.filters.allMachines", "All machines")}
        </MenuItem>
        {machinesBar.map((m) => (
          <MenuItem
            key={m.equipment_id}
            selected={equipmentFilterId === m.equipment_id}
            onClick={() => {
              onEquipmentFilterChange(m.equipment_id);
              setMachineAnchor(null);
            }}
          >
            {m.equipment_name} ({m.units_out})
          </MenuItem>
        ))}
      </Menu>

      {/* Sort Menu */}
      <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}>
        {(["oldest", "biggest_balance", "newest"] as OpenBillsSort[]).map((s) => (
          <MenuItem
            key={s}
            selected={sort === s}
            onClick={() => {
              onSortChange(s);
              setSortAnchor(null);
            }}
          >
            {s === "oldest"
              ? t("settlement.sort.oldest", "Oldest first")
              : s === "biggest_balance"
                ? t("settlement.sort.biggest", "Biggest balance")
                : t("settlement.sort.newest", "Newest")}
          </MenuItem>
        ))}
      </Menu>

      {/* Plain words indicator + Undo chip */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap", flexShrink: 0 }}>
        <Typography
          data-testid="settlement-scope-words"
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
        >
          {pickedIds.length > 0
            ? t("settlement.bills.usingPicked", {
                count: pickedIds.length,
                defaultValue: `Returning and paying across your ${pickedIds.length} picked bills`,
              })
            : t("settlement.bills.usingAllOpen", {
                count: totalOpenBillsCount || totalCount,
                defaultValue: `Returning and paying across all ${totalOpenBillsCount || totalCount} open bills`,
              })}
        </Typography>

        {undoPickIds.length > 0 && (
          <Chip
            size="small"
            icon={<UndoIcon fontSize="small" />}
            label={t("settlement.bills.undoPick", {
              count: undoPickIds.length,
              defaultValue: `Undo (${undoPickIds.length} bills)`,
            })}
            clickable
            color="warning"
            onClick={onUndoClearPick}
            sx={{ fontWeight: 800 }}
          />
        )}
      </Box>

      {/* Working on N bills group (top of list, drop target on desktop, collapsible on phone) */}
      {(pickedBills.length > 0 || !isPhone) && (
        <Paper
          data-testid="settlement-working-on-group"
          elevation={0}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverWorking(true);
          }}
          onDragLeave={() => setDragOverWorking(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverWorking(false);
            const id = Number(e.dataTransfer.getData("text/plain"));
            if (id > 0) onPickBill(id);
          }}
          sx={{
            p: pickedBills.length > 0 ? 1.25 : 1,
            borderRadius: 2.5,
            border: "2px dashed",
            borderColor: dragOverWorking
              ? "#f59e0b"
              : pickedBills.length > 0
                ? "#f59e0b"
                : isDark
                  ? "#334155"
                  : "#cbd5e1",
            bgcolor: pickedBills.length > 0
              ? isDark
                ? "rgba(245, 158, 11, 0.08)"
                : "#fffbeb"
              : "transparent",
            flexShrink: 0,
          }}
        >
          {pickedBills.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t("settlement.bills.dragOrTickHint", "Tap the circle on any bill (or drag it here) to work on specific bills.")}
            </Typography>
          ) : (
            <>
              <Box
                role="button"
                tabIndex={0}
                onClick={() => isPhone && setWorkingGroupOpen((v) => !v)}
                onKeyDown={(e) => {
                  if (isPhone && (e.key === "Enter" || e.key === " ")) setWorkingGroupOpen((v) => !v);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: isPhone ? "pointer" : "default",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 900, fontVariantNumeric: "tabular-nums", color: isDark ? "#fbbf24" : "#b45309" }}
                >
                  {t("settlement.bills.workingOnHeader", {
                    count: pickedBills.length,
                    owed: fmtLkr(workingTotals.owed),
                    machines: workingTotals.machines,
                    defaultValue: `Working on ${pickedBills.length} bills · ${fmtLkr(workingTotals.owed)} owed · ${workingTotals.machines} machines out`,
                  })}
                </Typography>
                {isPhone && (
                  <IconButton size="small" aria-label="Toggle working group">
                    {workingGroupOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                )}
              </Box>

              <Collapse in={!isPhone || workingGroupOpen}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                  {pickedBills.map((b) => (
                    <BillCard
                      key={`picked-${b.invoice_id}`}
                      bill={b}
                      picked
                      onTogglePick={() => onTogglePick(b.invoice_id)}
                      onOpenDetail={() => onOpenBillDetail(b.invoice_id)}
                      prefs={prefs}
                      isDark={isDark}
                      isPhone={isPhone}
                      draggable={!isPhone}
                    />
                  ))}
                </Box>
              </Collapse>
            </>
          )}
        </Paper>
      )}

      {/* Unpicked bills list */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          pr: 0.5,
        }}
      >
        {isLoading && bills.length === 0 ? (
          <>
            <Skeleton variant="rounded" height={88} />
            <Skeleton variant="rounded" height={88} />
            <Skeleton variant="rounded" height={88} />
          </>
        ) : bills.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t("settlement.bills.noneFound", "No bills match these filters.")}
            </Typography>
          </Paper>
        ) : groupedUnpicked ? (
          groupedUnpicked.map(([monthLabel, monthBills]) => (
            <Box key={monthLabel} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                  {monthLabel} ({monthBills.length})
                </Typography>
              </Divider>
              {monthBills.map((b) => (
                <BillCard
                  key={b.invoice_id}
                  bill={b}
                  picked={false}
                  onTogglePick={() => onTogglePick(b.invoice_id)}
                  onOpenDetail={() => onOpenBillDetail(b.invoice_id)}
                  prefs={prefs}
                  isDark={isDark}
                  isPhone={isPhone}
                  draggable={!isPhone}
                />
              ))}
            </Box>
          ))
        ) : (
          visibleUnpicked.map((b) => (
            <BillCard
              key={b.invoice_id}
              bill={b}
              picked={false}
              onTogglePick={() => onTogglePick(b.invoice_id)}
              onOpenDetail={() => onOpenBillDetail(b.invoice_id)}
              prefs={prefs}
              isDark={isDark}
              isPhone={isPhone}
              draggable={!isPhone}
            />
          ))
        )}

        {unpickedBills.length > renderLimit && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => setRenderLimit((n) => n + 60)}
            sx={{ alignSelf: "center", textTransform: "none", fontWeight: 700 }}
          >
            {t("settlement.bills.showMoreRendered", {
              count: unpickedBills.length - renderLimit,
              defaultValue: `Show ${unpickedBills.length - renderLimit} more loaded bills`,
            })}
          </Button>
        )}

        {hasMore && (
          <Button
            size="small"
            variant="outlined"
            disabled={isFetchingMore}
            onClick={onLoadMore}
            sx={{ alignSelf: "center", textTransform: "none", fontWeight: 700 }}
          >
            {isFetchingMore
              ? t("common.loading", "Loading…")
              : t("settlement.bills.loadMore", "Load more bills")}
          </Button>
        )}
      </Box>
    </Box>
  );
}
