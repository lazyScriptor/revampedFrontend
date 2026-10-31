import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  CircularProgress,
  FormControlLabel,
  Switch,
  Alert,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AssignmentReturnedOutlinedIcon from "@mui/icons-material/AssignmentReturnedOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useProcessReturn } from "../hooks/useInvoiceHooks";
import { HandoverLine, HandoverLineCard } from "./HandoverLineCard";
import { NumberInput } from "@/components/ui/NumberInput";
import { todayLocalStr } from "@/lib/dates";
import { isOpenEnded, openEndedExtraDays, toYmd } from "../lib/lineCost";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

// ─── Extra-day engine (mirrors backend `processReturn`) ────────────────────────
// A tracked line is charged only for days AFTER its due date. A line dispatched with no return date
// was priced for 1 day, so it is charged for every day out beyond what its price already covers.
const DAY = 1000 * 60 * 60 * 24;

type DayLine = Pick<HandoverLine, "track_overdue" | "expected_return"> & Partial<Pick<HandoverLine, "borrow_date" | "min_days" | "open_ended">>;

/** Days this handover is charged for: days late (tracked line) or extra days out (no-return-date line). */
export const calcDaysLate = (line: DayLine, handoverDate: string): number => {
  if (!handoverDate) return 0;
  if (line.open_ended) {
    return line.borrow_date ? openEndedExtraDays(toYmd(line.borrow_date), handoverDate, line.min_days || 1) : 0;
  }
  if (line.track_overdue === false || !line.expected_return) return 0;
  const expected = new Date(line.expected_return).getTime();
  const actual = new Date(handoverDate).getTime();
  return Math.max(0, Math.ceil((actual - expected) / DAY));
};

export const calcLateFee = (line: HandoverLine, handoverDate: string): number =>
  calcDaysLate(line, handoverDate) * (line.locked_extra_rate || 0) * (line.good_qty + line.defective_qty);
// ──────────────────────────────────────────────────────────────────────────────

const money = (n: number) => Number(n.toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 });

export function ReturnSettlementDialog({ open, onClose, invoice, showToast }: any) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const returnMutation = useProcessReturn();

  const [releaseId, setReleaseId] = useState(true);
  const [payment, setPayment] = useState<number | "">("");
  const [handoverDate, setHandoverDate] = useState(todayLocalStr());
  const [lines, setLines] = useState<HandoverLine[]>([]);

  // Start fresh every time the dialog opens (and only then — a background refetch must not wipe what was typed).
  useEffect(() => {
    if (!open || !invoice) return;
    const rawLines = invoice.InvoiceLines || invoice.invoice_lines || invoice.lines || [];
    const active = rawLines.filter(
      (l: any) => l.line_status === "Active" || l.status === "Active" || (!l.line_status && l.status !== "Returned"),
    );
    setLines(
      active.map((line: any) => {
        const alreadyReturned = (line.good_returned_qty || 0) + (line.defective_returned_qty || 0);
        const remaining = line.borrow_quantity - alreadyReturned;
        const wasTracked = line.track_overdue !== false;
        return {
          line_id: line.line_id,
          equipment_name: line.Equipment?.equipment_name || i18n.t("invoices.ReturnSettlementDialog.unknownItem"),
          borrow_qty: line.borrow_quantity,
          remaining_qty: remaining,
          locked_extra_rate: Number(line.locked_extra_daily_rate) || 0,
          expected_return: line.expected_return_date,
          borrow_date: line.borrow_date,
          min_days: Number(line.locked_minimum_days) || 1,
          open_ended: isOpenEnded(line),
          track_overdue: wasTracked,
          // frozen: was this line tracked when the handover started? (decides whether "waive" can be offered)
          _orig_tracked: wasTracked,
          good_qty: remaining, // default = everything comes back in good condition
          defective_qty: 0,
        };
      }),
    );
    setPayment("");
    setReleaseId(true);
    setHandoverDate(todayLocalStr());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice?.invoice_id]);

  const patchLine = (id: number, updates: Partial<HandoverLine>) =>
    setLines((prev) => prev.map((l) => (l.line_id === id ? { ...l, ...updates } : l)));

  const returnEverything = () => setLines((prev) => prev.map((l) => ({ ...l, good_qty: l.remaining_qty - l.defective_qty })));

  const totalLateFees = useMemo(() => lines.reduce((s, l) => s + calcLateFee(l, handoverDate), 0), [lines, handoverDate]);
  const totalReturning = lines.reduce((s, l) => s + l.good_qty + l.defective_qty, 0);
  const totalRemaining = lines.reduce((s, l) => s + l.remaining_qty, 0);

  // What the customer still owes once these late fees are added.
  const paid = (invoice?.Payments || []).reduce((s: number, p: any) => s + Number(p.payment_amount || 0), 0);
  const balanceAfter = Math.max(0, Number(invoice?.total_amount || 0) + totalLateFees - paid);
  const paymentNum = Number(payment) || 0;
  const canConfirm = !returnMutation.isPending && (totalReturning > 0 || paymentNum > 0);

  const handleSubmit = () => {
    const payload = {
      invoice_id: invoice.invoice_id,
      final_payment_amount: paymentNum,
      release_id_card: releaseId,
      lines_returned: lines.map((l) => ({ ...l, actual_return_date: handoverDate })),
    };
    returnMutation.mutate(
      { id: invoice.invoice_id, data: payload },
      {
        onSuccess: () => {
          showToast(t("invoices.ReturnSettlementDialog.handoverProcessedLedgerUpdated"), "success");
          onClose();
        },
        onError: (err: any) =>
          showToast(err.response?.data?.message || err?.message || t("invoices.ReturnSettlementDialog.returnFailed"), "error"),
      },
    );
  };

  if (!invoice) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: 3 }, bgcolor: "#f8fafc", maxHeight: { xs: "100vh", sm: "92dvh" } } } }}
    >
      <DialogTitle sx={{ bgcolor: "white", borderBottom: "1px solid #e2e8f0", p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: "#eff6ff", color: "primary.main", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AssignmentReturnedOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {t("invoices.ReturnSettlementDialog.equipmentHandoverInv", { invoice_id: invoice.invoice_id })}
            </Typography>
            <Typography variant="caption" sx={{ color: "#475569", fontWeight: 600 }}>
              {t("invoices.handover.subtitle")}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {/* when + shortcut */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EventOutlinedIcon sx={{ color: "#7c3aed" }} />
              <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", color: "#0f172a" }}>{t("invoices.handover.handoverDate")}</Typography>
              <TextField
                type="date"
                size="small"
                value={handoverDate}
                onChange={(e) => e.target.value && setHandoverDate(e.target.value)}
                slotProps={{ htmlInput: { "aria-label": t("invoices.handover.handoverDate") } }}
                sx={{ "& .MuiOutlinedInput-root": { bgcolor: "white" }, "& input": { color: "#0f172a", fontVariantNumeric: "tabular-nums" } }}
              />
            </Box>
            {lines.length > 1 && totalReturning < totalRemaining && (
              <Button size="small" variant="outlined" onClick={returnEverything} sx={{ textTransform: "none", fontWeight: 800 }}>
                {t("invoices.handover.returnEverything")}
              </Button>
            )}
          </Box>

          {totalLateFees > 0 && (
            <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {t("invoices.ReturnSettlementDialog.estimatedLateFeesRs", { totalLateFees: totalLateFees.toLocaleString() })}
              </Typography>
            </Alert>
          )}

          {lines.map((line) => (
            <HandoverLineCard
              key={line.line_id}
              line={line}
              daysLate={calcDaysLate(line, handoverDate)}
              lateFee={calcLateFee(line, handoverDate)}
              onChange={(u) => patchLine(line.line_id, u)}
            />
          ))}

          {/* payment */}
          <Box sx={{ bgcolor: "white", border: "1px solid #e2e8f0", borderRadius: 2.5, p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PaymentsOutlinedIcon sx={{ color: "#0f766e" }} />
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("invoices.handover.paymentTitle")}</Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: "#475569" }}>{t("invoices.handover.balanceAfter")}</Typography>
                <Typography sx={{ fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums", color: balanceAfter > 0 ? "#b91c1c" : "#15803d" }}>
                  Rs. {money(balanceAfter)}
                </Typography>
                {totalLateFees > 0 && (
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#b45309", fontVariantNumeric: "tabular-nums" }}>
                    {t("invoices.handover.inclLate", { fee: money(totalLateFees) })}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <NumberInput
                value={payment}
                onChange={setPayment}
                decimals
                size="small"
                label={t("invoices.handover.collectNow")}
                placeholder="0"
                sx={{ flex: 1, minWidth: 180, "& .MuiOutlinedInput-root": { bgcolor: "white" }, "& input": { color: "#0f172a", fontWeight: 700, fontVariantNumeric: "tabular-nums" } }}
              />
              {balanceAfter > 0 && paymentNum !== balanceAfter && (
                <Button size="small" variant="outlined" onClick={() => setPayment(Number(balanceAfter.toFixed(2)))} sx={{ textTransform: "none", fontWeight: 800 }}>
                  {t("invoices.handover.fullBalance")}
                </Button>
              )}
            </Box>
          </Box>

          {/* ID in the vault */}
          {invoice.Customer?.is_id_retained_currently && (
            <Box sx={{ bgcolor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 2.5, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <VerifiedUserOutlinedIcon sx={{ color: "#b45309" }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "#92400e" }}>
                    {t("invoices.ReturnSettlementDialog.securityVaultAction")}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#92400e", fontWeight: 600 }}>
                    {t("invoices.ReturnSettlementDialog.clientSIdIsCurrently")}
                  </Typography>
                </Box>
              </Box>
              <FormControlLabel
                control={<Switch checked={releaseId} onChange={(e) => setReleaseId(e.target.checked)} color="warning" />}
                label={
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "#92400e" }}>
                    {releaseId ? t("orders.releaseId") : t("invoices.ReturnSettlementDialog.keepInVault")}
                  </Typography>
                }
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: "white", borderTop: "1px solid #e2e8f0", gap: 1, flexWrap: "wrap" }}>
        {!canConfirm && !returnMutation.isPending && (
          <Typography variant="caption" sx={{ color: "#92400e", fontWeight: 700, mr: "auto" }}>
            {t("invoices.handover.nothingToConfirm")}
          </Typography>
        )}
        <Button onClick={onClose} disabled={returnMutation.isPending} color="inherit" sx={{ fontWeight: 700 }}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canConfirm} disableElevation sx={{ fontWeight: 800, px: 3 }}>
          {returnMutation.isPending ? <CircularProgress size={20} /> : t("invoices.ReturnSettlementDialog.confirmReturn")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
