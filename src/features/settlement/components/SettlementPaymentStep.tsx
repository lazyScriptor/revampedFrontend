import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { useTranslation } from "react-i18next";
import { todayLocalStr } from "@/lib/dates";
import { ReasonChips, isReasonValid } from "@/components/ui/ReasonChips";
import type { ReasonValue } from "@/features/activity/types";
import { useAuthStore } from "@/stores/useAuthStore";
import type {
  LeftoverMode,
  QueueRule,
  SettlementDiscountInput,
  SettlementPaymentInput,
  SettlementPreviewResponse,
} from "../types";

interface SettlementPaymentStepProps {
  payments: SettlementPaymentInput[];
  onChangePayments: (next: SettlementPaymentInput[]) => void;
  useWalletAmount: number;
  onChangeUseWalletAmount: (amount: number) => void;
  walletBalance: number;
  leftoverMode: LeftoverMode;
  onChangeLeftoverMode: (mode: LeftoverMode) => void;
  queueOrder: number[];
  onChangeQueueOrder: (order: number[]) => void;
  queueRule: QueueRule;
  onChangeQueueRule: (rule: QueueRule) => void;
  billAmounts: Record<number, number>;
  onChangeBillAmounts: (next: Record<number, number>) => void;
  discounts: SettlementDiscountInput[];
  onChangeDiscounts: (next: SettlementDiscountInput[]) => void;
  preview: SettlementPreviewResponse | null;
  onNextStep?: () => void;
}

const METHODS = ["Cash", "Card", "Transfer", "Cheque", "Wallet"] as const;
const QUICK_AMOUNTS = [1000, 5000, 10000] as const;

const fmtLkr = (n: number) =>
  `Rs ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function SettlementPaymentStep({
  payments,
  onChangePayments,
  useWalletAmount,
  onChangeUseWalletAmount,
  walletBalance,
  leftoverMode,
  onChangeLeftoverMode,
  queueOrder,
  onChangeQueueOrder,
  queueRule,
  onChangeQueueRule,
  billAmounts,
  onChangeBillAmounts,
  discounts,
  onChangeDiscounts,
  preview,
  onNextStep,
}: SettlementPaymentStepProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const canEditFees = useAuthStore((s) => s.hasPermission("inventory_permission"));

  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [discountOpenBillId, setDiscountOpenBillId] = useState<number | null>(null);
  const [discMode, setDiscMode] = useState<"amount" | "pct">("amount");
  const [discValue, setDiscValue] = useState<string>("");
  const [discReason, setDiscReason] = useState<ReasonValue | null>(null);
  const [draggedBillId, setDraggedBillId] = useState<number | null>(null);

  const todayStr = todayLocalStr();
  const primaryPayment = payments[0] ?? { amount: 0, method: "Cash", payment_date: todayStr };
  const totalOwedBeforePay = preview?.totals?.owed_before ?? 0;

  const totalCashPaying = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalBucket = totalCashPaying + Number(useWalletAmount || 0);
  const leftoverAmount = preview?.totals?.leftover_amount ?? Math.max(0, totalBucket - totalOwedBeforePay);

  const updateLine = (idx: number, patch: Partial<SettlementPaymentInput>) => {
    const next = [...payments];
    if (!next[idx]) {
      next[idx] = { amount: 0, method: "Cash", payment_date: todayStr };
    }
    next[idx] = { ...next[idx], ...patch };
    onChangePayments(next);
  };

  const addSecondLine = () => {
    if (payments.length >= 2) return;
    onChangePayments([...payments, { amount: 0, method: "Transfer", payment_date: todayStr }]);
    setActiveLineIdx(1);
  };

  const removeSecondLine = () => {
    if (payments.length <= 1) return;
    onChangePayments([payments[0]]);
    setActiveLineIdx(0);
  };

  const applyPadDigit = (d: string) => {
    const target = payments[activeLineIdx] ?? primaryPayment;
    const current = Math.floor(Number(target.amount || 0));
    const nextStr = d === "C" ? "0" : `${current === 0 ? "" : current}${d}`;
    updateLine(activeLineIdx, { amount: Number(nextStr) || 0 });
  };

  const orderedBills = useMemo(() => {
    const list = preview?.bills ?? [];
    if (!queueOrder.length) {
      return [...list].sort((a, b) => a.queue_position - b.queue_position);
    }
    const pos = new Map(queueOrder.map((id, idx) => [id, idx]));
    return [...list].sort((a, b) => {
      const pa = pos.has(a.invoice_id) ? pos.get(a.invoice_id)! : 9999 + a.queue_position;
      const pb = pos.has(b.invoice_id) ? pos.get(b.invoice_id)! : 9999 + b.queue_position;
      return pa - pb;
    });
  }, [preview?.bills, queueOrder]);

  const applyRule = (rule: QueueRule) => {
    onChangeQueueRule(rule);
    const list = preview?.bills ?? [];
    if (rule === "biggest_balance") {
      onChangeQueueOrder(
        [...list]
          .sort((a, b) => b.before.balance - a.before.balance)
          .map((b) => b.invoice_id),
      );
    } else if (rule === "fully_back_first") {
      onChangeQueueOrder(
        [...list]
          .sort((a, b) => {
            const aBack = a.after.machines_out === 0 ? 0 : 1;
            const bBack = b.after.machines_out === 0 ? 0 : 1;
            if (aBack !== bBack) return aBack - bBack;
            return new Date(a.issued_date).getTime() - new Date(b.issued_date).getTime();
          })
          .map((b) => b.invoice_id),
      );
    } else if (rule === "split_evenly" && list.length > 0 && totalBucket > 0) {
      const share = Math.floor(totalBucket / list.length);
      const nextAmounts: Record<number, number> = {};
      list.forEach((b) => {
        nextAmounts[b.invoice_id] = Math.min(b.before.balance, share);
      });
      onChangeBillAmounts(nextAmounts);
    }
  };

  const moveBillFirst = (invoiceId: number) => {
    const base = orderedBills.map((b) => b.invoice_id).filter((id) => id !== invoiceId);
    onChangeQueueOrder([invoiceId, ...base]);
  };

  const reorderBill = (fromId: number, toId: number) => {
    if (fromId === toId) return;
    const ids = orderedBills.map((b) => b.invoice_id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, fromId);
    onChangeQueueOrder(ids);
  };

  const openDiscountEditor = (invoiceId: number) => {
    const existing = discounts.find((d) => d.invoice_id === invoiceId);
    if (existing) {
      setDiscMode(existing.pct !== undefined ? "pct" : "amount");
      setDiscValue(String(existing.pct ?? existing.amount ?? ""));
      setDiscReason(existing.reason);
    } else {
      setDiscMode("amount");
      setDiscValue("");
      setDiscReason(null);
    }
    setDiscountOpenBillId(invoiceId);
  };

  const saveDiscountForBill = (invoiceId: number) => {
    const num = Number(discValue) || 0;
    if (num <= 0) {
      onChangeDiscounts(discounts.filter((d) => d.invoice_id !== invoiceId));
      setDiscountOpenBillId(null);
      return;
    }
    if (!isReasonValid(discReason, true) || !discReason) return;
    const entry: SettlementDiscountInput = {
      invoice_id: invoiceId,
      ...(discMode === "pct" ? { pct: num } : { amount: num }),
      reason: discReason,
    };
    onChangeDiscounts([...discounts.filter((d) => d.invoice_id !== invoiceId), entry]);
    setDiscountOpenBillId(null);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minHeight: 0, flex: 1 }}>
      {/* Paying today box */}
      <Paper
        data-testid="settlement-paying-box"
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 2.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: isDark ? "#0f172a" : "#ffffff",
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            {t("settlement.payment.payingToday", "Paying today")}
          </Typography>
          <Chip
            data-testid="settlement-bucket-chip"
            color={leftoverAmount > 0 ? "info" : "success"}
            label={t("settlement.payment.bucketSummary", {
              total: fmtLkr(totalBucket),
              left: fmtLkr(leftoverAmount),
              defaultValue: `${fmtLkr(totalBucket)} to share · ${fmtLkr(leftoverAmount)} left`,
            })}
            sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
          />
        </Box>

        {payments.map((pay, idx) => {
          const payDate = pay.payment_date || todayStr;
          const isBackdated = payDate < todayStr;
          const isFuture = payDate > todayStr;
          return (
            <Box
              key={idx}
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: "1px solid",
                borderColor: activeLineIdx === idx ? "#f59e0b" : "divider",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
              onClick={() => setActiveLineIdx(idx)}
            >
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", justifyContent: "space-between" }}>
                <TextField
                  size="small"
                  label={t("settlement.payment.amountLabel", "Amount (Rs)")}
                  value={pay.amount || ""}
                  onChange={(e) => {
                    const num = Math.max(0, Number(e.target.value.replace(/[^0-9.]/g, "")) || 0);
                    updateLine(idx, { amount: num });
                  }}
                  slotProps={{
                    htmlInput: {
                      inputMode: "decimal",
                      "aria-label": t("settlement.payment.amountInput", "Payment amount"),
                      style: { fontWeight: 900, fontSize: "1.1rem", fontVariantNumeric: "tabular-nums" },
                    },
                  }}
                  sx={{ width: { xs: "100%", sm: 180 } }}
                />

                {/* Quick chips */}
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {QUICK_AMOUNTS.map((amt) => (
                    <Chip
                      key={amt}
                      size="small"
                      clickable
                      label={fmtLkr(amt)}
                      onClick={() => updateLine(idx, { amount: amt })}
                      sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                    />
                  ))}
                  {totalOwedBeforePay > 0 && idx === 0 && (
                    <Chip
                      size="small"
                      clickable
                      color="warning"
                      label={t("settlement.payment.payEverything", "Pay everything")}
                      onClick={() => updateLine(0, { amount: Math.max(0, totalOwedBeforePay - useWalletAmount) })}
                      sx={{ fontWeight: 800 }}
                    />
                  )}
                </Box>

                {idx === 1 && (
                  <IconButton size="small" color="error" aria-label="Remove second method" onClick={removeSecondLine}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              {/* Method chips & date */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {METHODS.map((m) => {
                    const selected = pay.method === m;
                    return (
                      <Chip
                        key={m}
                        size="small"
                        clickable
                        label={t(`settlement.payment.method.${m}`, m)}
                        onClick={() => updateLine(idx, { method: m })}
                        sx={{
                          fontWeight: selected ? 800 : 600,
                          bgcolor: selected ? "#f59e0b" : isDark ? "#1e293b" : "#f1f5f9",
                          color: selected ? "#0f172a" : "text.primary",
                        }}
                      />
                    );
                  })}
                </Box>

                <TextField
                  size="small"
                  type="date"
                  label={t("settlement.payment.date", "Payment date")}
                  value={payDate}
                  onChange={(e) => updateLine(idx, { payment_date: e.target.value })}
                  error={isFuture}
                  helperText={isFuture ? t("reasons.futureDateBlocked", "Future date is not allowed") : undefined}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { max: todayStr },
                  }}
                />
              </Box>

              {isBackdated && (
                <ReasonChips
                  list="backdate"
                  value={pay.date_reason ?? null}
                  onChange={(r) => updateLine(idx, { date_reason: r ?? undefined })}
                  required
                  error={!isReasonValid(pay.date_reason, true)}
                  label={t("settlement.payment.backdateReason", "Reason for back-dated payment")}
                />
              )}
            </Box>
          );
        })}

        {/* Number pad + second method + wallet credit + leftover */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 0.4, flexWrap: "wrap" }}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "00", "C"].map((d) => (
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

          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
            {payments.length < 2 && (
              <Button size="small" variant="text" startIcon={<AddIcon />} onClick={addSecondLine} sx={{ textTransform: "none", fontWeight: 700 }}>
                {t("settlement.payment.addSecondMethod", "Add second method")}
              </Button>
            )}

            {walletBalance > 0 && (
              <Chip
                data-testid="use-wallet-credit-chip"
                icon={<AccountBalanceWalletOutlinedIcon />}
                clickable
                color={useWalletAmount > 0 ? "success" : "default"}
                variant={useWalletAmount > 0 ? "filled" : "outlined"}
                label={t("settlement.payment.useCredit", {
                  amount: fmtLkr(walletBalance),
                  defaultValue: `Use ${fmtLkr(walletBalance)} credit`,
                })}
                onClick={() =>
                  onChangeUseWalletAmount(
                    useWalletAmount > 0
                      ? 0
                      : Math.min(walletBalance, Math.max(0, totalOwedBeforePay - totalCashPaying) || walletBalance),
                  )
                }
                sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
              />
            )}
          </Box>
        </Box>

        {/* Leftover choice */}
        {leftoverAmount > 0 && (
          <Box
            data-testid="settlement-leftover-choice"
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: isDark ? "rgba(56, 189, 248, 0.1)" : "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {t("settlement.payment.leftoverLabel", {
                amount: fmtLkr(leftoverAmount),
                defaultValue: `Leftover ${fmtLkr(leftoverAmount)}:`,
              })}
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={leftoverMode}
              onChange={(_, v) => v && onChangeLeftoverMode(v)}
            >
              <ToggleButton value="credit">{t("settlement.payment.keepAsCredit", "Keep as credit")}</ToggleButton>
              <ToggleButton value="change">{t("settlement.payment.giveChange", "Give change")}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
      </Paper>

      {/* Rule chips */}
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          {t("settlement.payment.queueOrder", "Share order:")}
        </Typography>
        {(
          [
            { id: "fully_back_first", label: t("settlement.queueRule.fullyBack", "Fully back first") },
            { id: "biggest_balance", label: t("settlement.queueRule.biggest", "Biggest balance first") },
            { id: "split_evenly", label: t("settlement.queueRule.even", "Split evenly") },
          ] as const
        ).map((r) => (
          <Chip
            key={r.id}
            size="small"
            clickable
            label={r.label}
            color={queueRule === r.id ? "primary" : "default"}
            variant={queueRule === r.id ? "filled" : "outlined"}
            onClick={() => applyRule(r.id)}
            sx={{ fontWeight: 700 }}
          />
        ))}
      </Box>

      {/* Numbered queue on cards */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", minHeight: 0, flex: 1 }}>
        {orderedBills.map((bill, idx) => {
          const allocated = bill.payment_allocated ?? Math.max(0, bill.after.paid - bill.before.paid);
          const ratio = bill.before.balance > 0 ? Math.min(100, (allocated / bill.before.balance) * 100) : 100;
          const activeDisc = discounts.find((d) => d.invoice_id === bill.invoice_id);
          const isDiscOpen = discountOpenBillId === bill.invoice_id;
          const overrideVal = billAmounts[bill.invoice_id];

          return (
            <Paper
              key={bill.invoice_id}
              data-testid={`queue-bill-${bill.invoice_id}`}
              draggable
              onDragStart={() => setDraggedBillId(bill.invoice_id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedBillId !== null) reorderBill(draggedBillId, bill.invoice_id);
                setDraggedBillId(null);
              }}
              variant="outlined"
              sx={{
                p: 1.25,
                borderRadius: 2,
                borderColor: allocated > 0 ? "#10b981" : "divider",
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    size="small"
                    label={`#${idx + 1}`}
                    sx={{
                      width: 28,
                      height: 24,
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                      bgcolor: "#f59e0b",
                      color: "#0f172a",
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 900, fontFamily: "'JetBrains Mono', monospace" }}>
                    INV-{bill.invoice_id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {t("settlement.payment.balanceWas", {
                      amount: fmtLkr(bill.before.balance),
                      defaultValue: `Owed ${fmtLkr(bill.before.balance)}`,
                    })}
                  </Typography>
                  {bill.after.machines_out === 0 && (
                    <Chip size="small" color="success" variant="outlined" label={t("settlement.payment.allBackTag", "All back")} sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                  )}
                </Box>

                <Typography variant="body2" sx={{ fontWeight: 900, color: allocated > 0 ? "success.main" : "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  +{fmtLkr(allocated)}
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={ratio}
                sx={{
                  height: 6,
                  borderRadius: 99,
                  bgcolor: isDark ? "#334155" : "#e2e8f0",
                  "& .MuiLinearProgress-bar": { bgcolor: "#10b981", borderRadius: 99 },
                }}
              />

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 0.75 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                  {idx > 0 && (
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<VerticalAlignTopIcon fontSize="small" />}
                      onClick={() => moveBillFirst(bill.invoice_id)}
                      sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.72rem" }}
                    >
                      {t("settlement.payment.payThisFirst", "Pay this first")}
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="text"
                    onClick={() =>
                      onChangeBillAmounts({
                        ...billAmounts,
                        [bill.invoice_id]: bill.before.balance,
                      })
                    }
                    sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.72rem" }}
                  >
                    {t("settlement.payment.payBillOff", "Pay this bill off")}
                  </Button>
                  {canEditFees && (
                    <Button
                      size="small"
                      variant={activeDisc ? "contained" : "outlined"}
                      color={activeDisc ? "warning" : "inherit"}
                      startIcon={<LocalOfferOutlinedIcon sx={{ fontSize: 14 }} />}
                      onClick={() => openDiscountEditor(bill.invoice_id)}
                      sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.72rem" }}
                    >
                      {activeDisc
                        ? activeDisc.pct
                          ? `${activeDisc.pct}%`
                          : fmtLkr(activeDisc.amount || 0)
                        : t("settlement.payment.discount", "Discount")}
                    </Button>
                  )}
                </Box>

                {/* + / - manual override */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <IconButton
                    size="small"
                    aria-label={`Decrease payment for INV-${bill.invoice_id}`}
                    onClick={() => {
                      const base = overrideVal ?? allocated;
                      onChangeBillAmounts({
                        ...billAmounts,
                        [bill.invoice_id]: Math.max(0, base - 500),
                      });
                    }}
                    sx={{ border: "1px solid", borderColor: "divider" }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Increase payment for INV-${bill.invoice_id}`}
                    onClick={() => {
                      const base = overrideVal ?? allocated;
                      onChangeBillAmounts({
                        ...billAmounts,
                        [bill.invoice_id]: Math.min(bill.before.balance, base + 500),
                      });
                    }}
                    sx={{ border: "1px solid", borderColor: "divider" }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Inline discount editor with ReasonChips */}
              <Collapse in={isDiscOpen} unmountOnExit>
                <Box
                  data-testid={`discount-editor-${bill.invoice_id}`}
                  sx={{
                    mt: 1,
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: isDark ? "#1e293b" : "#f8fafc",
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={discMode}
                      onChange={(_, v) => v && setDiscMode(v)}
                    >
                      <ToggleButton value="amount">Rs</ToggleButton>
                      <ToggleButton value="pct">%</ToggleButton>
                    </ToggleButtonGroup>
                    <TextField
                      size="small"
                      label={discMode === "pct" ? "%" : "Rs"}
                      value={discValue}
                      onChange={(e) => setDiscValue(e.target.value.replace(/[^0-9.]/g, ""))}
                      slotProps={{
                        htmlInput: {
                          inputMode: "decimal",
                          "aria-label": t("settlement.payment.discountAmount", "Discount value"),
                          style: { width: 90, fontVariantNumeric: "tabular-nums", fontWeight: 800 },
                        },
                      }}
                    />
                  </Box>
                  <ReasonChips
                    list="discount"
                    value={discReason}
                    onChange={setDiscReason}
                    required
                    error={Number(discValue) > 0 && !isReasonValid(discReason, true)}
                  />
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                    <Button size="small" onClick={() => setDiscountOpenBillId(null)} sx={{ textTransform: "none" }}>
                      {t("common.cancel", "Cancel")}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={Number(discValue) > 0 && !isReasonValid(discReason, true)}
                      onClick={() => saveDiscountForBill(bill.invoice_id)}
                      sx={{ textTransform: "none", fontWeight: 800 }}
                    >
                      {t("settlement.payment.applyDiscount", "Apply discount")}
                    </Button>
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          );
        })}
      </Box>

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
            {t("settlement.payment.continueToReview", "Check & save")}
          </Button>
        </Box>
      )}
    </Box>
  );
}
