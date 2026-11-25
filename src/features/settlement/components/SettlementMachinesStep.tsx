import { useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import BuildIcon from "@mui/icons-material/Build";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTranslation } from "react-i18next";
import { todayLocalStr } from "@/lib/dates";
import { ReasonChips, isReasonValid } from "@/components/ui/ReasonChips";
import type { ReasonValue } from "@/features/activity/types";
import type {
  MachinesBarItem,
  OpenBillItem,
  SettlementPreviewResponse,
  SettlementReturnInput,
  SplitRule,
} from "../types";

interface SettlementMachinesStepProps {
  machinesBar: MachinesBarItem[];
  pickedIds: number[];
  openBills: OpenBillItem[];
  returns: SettlementReturnInput[];
  onChangeReturns: (next: SettlementReturnInput[]) => void;
  returnDate: string;
  onChangeReturnDate: (date: string) => void;
  dateReason: ReasonValue | null;
  onChangeDateReason: (r: ReasonValue | null) => void;
  splitRule: SplitRule;
  onChangeSplitRule: (rule: SplitRule) => void;
  preview: SettlementPreviewResponse | null;
  onClearPicked?: () => void;
  onNextStep?: () => void;
}

const fmtLkr = (n: number) =>
  `Rs ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function SettlementMachinesStep({
  machinesBar,
  pickedIds,
  openBills,
  returns,
  onChangeReturns,
  returnDate,
  onChangeReturnDate,
  dateReason,
  onChangeDateReason,
  splitRule,
  onChangeSplitRule,
  preview,
  onClearPicked,
  onNextStep,
}: SettlementMachinesStepProps) {
  const { t, i18n } = useTranslation();
  const isSi = i18n.language?.startsWith("si");
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(
    machinesBar[0]?.equipment_id ?? null,
  );
  const [padTarget, setPadTarget] = useState<"qty" | "damaged">("qty");

  const activeMachines = useMemo(() => {
    if (pickedIds.length === 0) return machinesBar;
    const pickedSet = new Set(pickedIds);
    return machinesBar.filter((m) =>
      m.invoice_ids?.some((id) => pickedSet.has(id)),
    );
  }, [machinesBar, pickedIds]);

  const activeEquipId = useMemo(() => {
    if (selectedEquipmentId && machinesBar.some((m) => m.equipment_id === selectedEquipmentId)) {
      return selectedEquipmentId;
    }
    return activeMachines[0]?.equipment_id ?? machinesBar[0]?.equipment_id ?? null;
  }, [selectedEquipmentId, activeMachines, machinesBar]);

  const selectedMachine = useMemo(
    () => machinesBar.find((m) => m.equipment_id === activeEquipId) ?? null,
    [machinesBar, activeEquipId],
  );

  const notOnPickedBills = useMemo(() => {
    if (!selectedMachine || pickedIds.length === 0) return false;
    const pickedSet = new Set(pickedIds);
    return !selectedMachine.invoice_ids?.some((id) => pickedSet.has(id));
  }, [selectedMachine, pickedIds]);

  const currentReturn = useMemo(() => {
    if (!selectedMachine) return { equipment_id: 0, qty: 0, damaged_qty: 0 };
    return (
      returns.find((r) => r.equipment_id === selectedMachine.equipment_id) ?? {
        equipment_id: selectedMachine.equipment_id,
        qty: 0,
        damaged_qty: 0,
      }
    );
  }, [returns, selectedMachine]);

  const updateReturnFor = (
    equipmentId: number,
    maxOut: number,
    patch: Partial<SettlementReturnInput>,
  ) => {
    const existing = returns.find((r) => r.equipment_id === equipmentId) ?? {
      equipment_id: equipmentId,
      qty: 0,
      damaged_qty: 0,
    };
    const nextQty = Math.max(0, Math.min(maxOut, patch.qty ?? existing.qty));
    const nextDamaged = Math.max(
      0,
      Math.min(nextQty, patch.damaged_qty ?? existing.damaged_qty),
    );
    const updated: SettlementReturnInput = {
      ...existing,
      ...patch,
      equipment_id: equipmentId,
      qty: nextQty,
      damaged_qty: nextDamaged,
      // Clear manual placement if total qty changed so server re-computes split cleanly
      placement:
        patch.placement !== undefined
          ? patch.placement
          : patch.qty !== undefined && patch.qty !== existing.qty
            ? undefined
            : existing.placement,
    };

    const others = returns.filter((r) => r.equipment_id !== equipmentId);
    if (updated.qty === 0 && updated.damaged_qty === 0) {
      onChangeReturns(others);
    } else {
      onChangeReturns([...others, updated]);
    }
  };

  // Lines holding this machine from preview (or fallback from openBills)
  const machineBillLines = useMemo(() => {
    if (!selectedMachine) return [];
    const equipId = selectedMachine.equipment_id;
    const rows: Array<{
      invoice_id: number;
      invoice_line_id: number;
      out_before: number;
      out_after: number;
      returned_qty: number;
      damaged_qty: number;
      is_serial: boolean;
    }> = [];

    if (preview?.bills?.length) {
      for (const b of preview.bills) {
        for (const l of b.lines || []) {
          if (l.equipment_id === equipId) {
            rows.push({
              invoice_id: b.invoice_id,
              invoice_line_id: l.invoice_line_id,
              out_before: l.out_before,
              out_after: l.out_after,
              returned_qty: l.returned_qty,
              damaged_qty: l.damaged_qty,
              is_serial: Boolean(l.serial_number || l.is_bulk_item === false),
            });
          }
        }
      }
    }

    if (rows.length === 0) {
      const targetBills =
        pickedIds.length > 0
          ? openBills.filter((b) => pickedIds.includes(b.invoice_id))
          : openBills;
      for (const b of targetBills) {
        for (const mc of b.machine_counts || []) {
          if (mc.equipment_id === equipId && mc.out_qty > 0) {
            rows.push({
              invoice_id: b.invoice_id,
              invoice_line_id: mc.invoice_line_id || b.invoice_id * 1000 + mc.equipment_id,
              out_before: mc.out_qty,
              out_after: mc.out_qty,
              returned_qty: 0,
              damaged_qty: 0,
              is_serial: Boolean(mc.serial_number || mc.is_bulk_item === false),
            });
          }
        }
      }
    }
    return rows;
  }, [selectedMachine, preview, openBills, pickedIds]);

  const handleMoveUnit = (targetLineId: number, delta: 1 | -1) => {
    if (!selectedMachine || currentReturn.qty <= 0) return;
    // Build current placement from machineBillLines
    const currentLines = machineBillLines.map((l) => ({
      invoice_line_id: l.invoice_line_id,
      out_before: l.out_before,
      qty: l.returned_qty,
      damaged_qty: l.damaged_qty,
    }));
    const targetIdx = currentLines.findIndex((l) => l.invoice_line_id === targetLineId);
    if (targetIdx === -1) return;

    const target = currentLines[targetIdx];
    if (delta === 1 && target.qty >= target.out_before) return;
    if (delta === -1 && target.qty <= 0) return;

    // Find another line to absorb the opposite delta so total qty stays fixed!
    const donorIdx = currentLines.findIndex((l, idx) =>
      idx !== targetIdx &&
      (delta === 1 ? l.qty > 0 : l.qty < l.out_before),
    );
    if (donorIdx === -1) return;

    currentLines[targetIdx] = { ...target, qty: target.qty + delta };
    currentLines[donorIdx] = {
      ...currentLines[donorIdx],
      qty: currentLines[donorIdx].qty - delta,
    };

    updateReturnFor(selectedMachine.equipment_id, selectedMachine.units_out, {
      placement: currentLines.map((l) => ({
        invoice_line_id: l.invoice_line_id,
        qty: l.qty,
        damaged_qty: Math.min(l.damaged_qty, l.qty),
      })),
    });
  };

  const todayStr = todayLocalStr();
  const isBackdated = Boolean(returnDate && returnDate < todayStr);
  const isFutureDate = Boolean(returnDate && returnDate > todayStr);

  const applyPadDigit = (digit: string) => {
    if (!selectedMachine) return;
    const currentVal = padTarget === "qty" ? currentReturn.qty : currentReturn.damaged_qty;
    const nextStr = digit === "C" ? "0" : `${currentVal === 0 ? "" : currentVal}${digit}`;
    const nextNum = Math.min(
      padTarget === "qty" ? selectedMachine.units_out : currentReturn.qty,
      Number(nextStr) || 0,
    );
    updateReturnFor(
      selectedMachine.equipment_id,
      selectedMachine.units_out,
      padTarget === "qty" ? { qty: nextNum } : { damaged_qty: nextNum },
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minHeight: 0, flex: 1 }}>
      {/* Machines bar */}
      <Box
        data-testid="settlement-machines-bar"
        sx={{
          display: "flex",
          gap: 1,
          overflowX: "auto",
          pb: 0.5,
          flexShrink: 0,
        }}
      >
        {machinesBar.length === 0 ? (
          <Alert severity="info" sx={{ width: "100%" }}>
            {t("settlement.machines.noMachinesOut", "No machines are currently out for this customer.")}
          </Alert>
        ) : (
          machinesBar.map((m) => {
            const ret = returns.find((r) => r.equipment_id === m.equipment_id);
            const selected = activeEquipId === m.equipment_id;
            const name = isSi && m.equipment_name_si ? m.equipment_name_si : m.equipment_name;
            return (
              <Paper
                key={m.equipment_id}
                data-testid={`machine-chip-${m.equipment_id}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedEquipmentId(m.equipment_id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedEquipmentId(m.equipment_id);
                }}
                elevation={0}
                sx={{
                  flexShrink: 0,
                  p: 1,
                  pr: 1.5,
                  borderRadius: 2.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  border: "2px solid",
                  borderColor: selected
                    ? "#f59e0b"
                    : ret && ret.qty > 0
                      ? "#10b981"
                      : isDark
                        ? "#334155"
                        : "#e2e8f0",
                  bgcolor: selected
                    ? isDark
                      ? "rgba(245, 158, 11, 0.14)"
                      : "#fffbeb"
                    : isDark
                      ? "#0f172a"
                      : "#ffffff",
                }}
              >
                <Avatar
                  src={m.image_url || undefined}
                  variant="rounded"
                  sx={{ width: 34, height: 34, bgcolor: isDark ? "#1e293b" : "#f1f5f9", color: "text.primary" }}
                >
                  <BuildIcon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                    {name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {t("settlement.machines.outOnBills", {
                      count: m.units_out,
                      bills: m.bills_count,
                      defaultValue: `${m.units_out} out on ${m.bills_count} bills`,
                    })}
                    {ret && ret.qty > 0 ? ` · ${ret.qty} back` : ""}
                  </Typography>
                </Box>
              </Paper>
            );
          })
        )}
      </Box>

      {notOnPickedBills && onClearPicked && (
        <Alert
          severity="warning"
          action={
            <Button size="small" color="inherit" onClick={onClearPicked} sx={{ fontWeight: 800, textTransform: "none" }}>
              {t("settlement.machines.showAllBills", "Show all bills")}
            </Button>
          }
        >
          {t("settlement.machines.notOnPicked", "Not on these bills, show all bills?")}
        </Alert>
      )}

      {/* Selected machine controls + return date + cheaper chip */}
      {selectedMachine && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: isDark ? "#0f172a" : "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
            {/* Returned count +/− */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
                {t("settlement.machines.returnedCount", "Came back")}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <IconButton
                  size="small"
                  aria-label={t("settlement.machines.decreaseReturned", "Decrease returned")}
                  onClick={() => {
                    setPadTarget("qty");
                    updateReturnFor(selectedMachine.equipment_id, selectedMachine.units_out, {
                      qty: currentReturn.qty - 1,
                    });
                  }}
                  sx={{ border: "1px solid", borderColor: "divider", minWidth: 36, minHeight: 36 }}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <TextField
                  size="small"
                  value={currentReturn.qty}
                  onFocus={() => setPadTarget("qty")}
                  onChange={(e) => {
                    const n = Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0);
                    updateReturnFor(selectedMachine.equipment_id, selectedMachine.units_out, { qty: n });
                  }}
                  slotProps={{
                    htmlInput: {
                      inputMode: "numeric",
                      "aria-label": t("settlement.machines.returnedInput", "Returned quantity"),
                      style: { textAlign: "center", width: 52, fontWeight: 900, fontVariantNumeric: "tabular-nums" },
                    },
                  }}
                />
                <IconButton
                  size="small"
                  aria-label={t("settlement.machines.increaseReturned", "Increase returned")}
                  onClick={() => {
                    setPadTarget("qty");
                    updateReturnFor(selectedMachine.equipment_id, selectedMachine.units_out, {
                      qty: currentReturn.qty + 1,
                    });
                  }}
                  sx={{ border: "1px solid", borderColor: "divider", minWidth: 36, minHeight: 36 }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    updateReturnFor(selectedMachine.equipment_id, selectedMachine.units_out, {
                      qty: selectedMachine.units_out,
                    })
                  }
                  sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                >
                  {t("settlement.machines.allBack", "All")} ({selectedMachine.units_out})
                </Button>
              </Box>
            </Box>

            {/* Damaged count +/− */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
                {t("settlement.machines.damagedCount", "Damaged")}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <IconButton
                  size="small"
                  aria-label={t("settlement.machines.decreaseDamaged", "Decrease damaged")}
                  onClick={() => {
                    setPadTarget("damaged");
                    updateReturnFor(selectedMachine.equipment_id, selectedMachine.units_out, {
                      damaged_qty: currentReturn.damaged_qty - 1,
                    });
                  }}
                  sx={{ border: "1px solid", borderColor: "divider", minWidth: 36, minHeight: 36 }}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <TextField
                  size="small"
                  value={currentReturn.damaged_qty}
                  onFocus={() => setPadTarget("damaged")}
                  onChange={(e) => {
                    const n = Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0);
                    updateReturnFor(selectedMachine.equipment_id, selectedMachine.units_out, {
                      damaged_qty: n,
                    });
                  }}
                  slotProps={{
                    htmlInput: {
                      inputMode: "numeric",
                      "aria-label": t("settlement.machines.damagedInput", "Damaged quantity"),
                      style: { textAlign: "center", width: 52, fontWeight: 900, fontVariantNumeric: "tabular-nums" },
                    },
                  }}
                />
                <IconButton
                  size="small"
                  aria-label={t("settlement.machines.increaseDamaged", "Increase damaged")}
                  onClick={() => {
                    setPadTarget("damaged");
                    updateReturnFor(selectedMachine.equipment_id, selectedMachine.units_out, {
                      damaged_qty: currentReturn.damaged_qty + 1,
                    });
                  }}
                  sx={{ border: "1px solid", borderColor: "divider", minWidth: 36, minHeight: 36 }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                {currentReturn.qty > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                    {currentReturn.qty - currentReturn.damaged_qty} {t("settlement.machines.good", "good")}, {currentReturn.damaged_qty}{" "}
                    {t("settlement.machines.damagedShort", "damaged")}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Compact number pad */}
            <Box sx={{ display: "flex", gap: 0.4, flexWrap: "wrap", maxWidth: 240 }}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "C"].map((d) => (
                <Button
                  key={d}
                  size="small"
                  variant="outlined"
                  onClick={() => applyPadDigit(d)}
                  sx={{ minWidth: 34, minHeight: 30, p: 0, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
                >
                  {d}
                </Button>
              ))}
            </Box>
          </Box>

          {/* Return date + Cheaper for customer chip */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EventOutlinedIcon fontSize="small" color="action" />
              <TextField
                size="small"
                type="date"
                label={t("settlement.machines.returnDate", "Return date")}
                value={returnDate}
                onChange={(e) => onChangeReturnDate(e.target.value)}
                error={isFutureDate}
                helperText={isFutureDate ? t("reasons.futureDateBlocked", "Future date is not allowed") : undefined}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: todayStr },
                }}
              />
            </Box>

            {preview?.cheaper_alternative?.available && (
              <Chip
                data-testid="cheaper-for-customer-chip"
                icon={<SavingsOutlinedIcon />}
                clickable
                onClick={() =>
                  onChangeSplitRule(
                    splitRule === "cheaper_for_customer" ? "oldest_first" : "cheaper_for_customer",
                  )
                }
                label={t("settlement.machines.cheaperForCustomer", {
                  amount: fmtLkr(preview.cheaper_alternative.saving),
                  defaultValue: `Cheaper for customer: saves ${fmtLkr(preview.cheaper_alternative.saving)}`,
                })}
                color={splitRule === "cheaper_for_customer" ? "success" : "default"}
                variant={splitRule === "cheaper_for_customer" ? "filled" : "outlined"}
                sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", minHeight: 34 }}
              />
            )}
          </Box>

          {isBackdated && (
            <Box sx={{ pt: 0.5 }}>
              <ReasonChips
                list="backdate"
                value={dateReason}
                onChange={onChangeDateReason}
                required
                error={!isReasonValid(dateReason, true)}
                label={t("settlement.machines.backdateReason", "Reason for back-dated return")}
              />
            </Box>
          )}
        </Paper>
      )}

      {/* Placement across bills with connector lines & manual +/- moves */}
      {selectedMachine && machineBillLines.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", minHeight: 0, flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t("settlement.machines.placementHint", "Placement across bills (oldest first by default; use +/− to move units while keeping total fixed):")}
          </Typography>
          {machineBillLines.map((line) => {
            const allBack = line.out_after === 0 && line.returned_qty > 0;
            return (
              <Box key={line.invoice_line_id} sx={{ display: "flex", alignItems: "center", gap: 1, pl: 1.5, position: "relative" }}>
                <Box
                  aria-hidden="true"
                  sx={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 12,
                    borderLeft: "2px solid",
                    borderBottom: "2px solid",
                    borderColor: line.returned_qty > 0 ? "#10b981" : "divider",
                    height: "50%",
                  }}
                />
                <Paper
                  data-testid={`placement-bill-${line.invoice_id}`}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    p: 1.25,
                    borderRadius: 2,
                    borderColor: line.returned_qty > 0 ? "#10b981" : "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="body2" sx={{ fontWeight: 900, fontFamily: "'JetBrains Mono', monospace" }}>
                        INV-{line.invoice_id}
                      </Typography>
                      <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        <Box component="span" sx={{ textDecoration: line.returned_qty > 0 ? "line-through" : "none", color: "text.secondary" }}>
                          {line.out_before} out
                        </Box>
                        {" → "}
                        <strong>{line.out_after} out</strong>
                        {line.returned_qty > 0 && ` (${line.returned_qty} back)`}
                      </Typography>
                      {allBack && (
                        <Chip
                          size="small"
                          color="success"
                          icon={<CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />}
                          label={t("settlement.machines.allMachinesBack", "all machines back")}
                          sx={{ height: 22, fontWeight: 800, fontSize: "0.68rem" }}
                        />
                      )}
                    </Box>
                  </Box>

                  {!line.is_serial && currentReturn.qty > 0 && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <IconButton
                        size="small"
                        aria-label={`Move 1 unit off INV-${line.invoice_id}`}
                        disabled={line.returned_qty <= 0}
                        onClick={() => handleMoveUnit(line.invoice_line_id, -1)}
                        sx={{ border: "1px solid", borderColor: "divider" }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label={`Move 1 unit onto INV-${line.invoice_id}`}
                        disabled={line.returned_qty >= line.out_before}
                        onClick={() => handleMoveUnit(line.invoice_line_id, 1)}
                        sx={{ border: "1px solid", borderColor: "divider" }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Paper>
              </Box>
            );
          })}
        </Box>
      )}

      {onNextStep && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={onNextStep}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              borderRadius: 2,
              bgcolor: "#f59e0b",
              color: "#0f172a",
              "&:hover": { bgcolor: "#d97706" },
            }}
          >
            {t("settlement.machines.continueToPayment", "Continue to payment")}
          </Button>
        </Box>
      )}
    </Box>
  );
}
