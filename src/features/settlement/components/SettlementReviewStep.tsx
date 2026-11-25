import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  FormControlLabel,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import PrintIcon from "@mui/icons-material/Print";
import SaveIcon from "@mui/icons-material/Save";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import { useTranslation } from "react-i18next";
import { formatDisplayDate } from "@/lib/dates";
import { SettlementReceiptDialog } from "./SettlementReceiptDialog";
import type {
  PreviewBillChange,
  PreviewBillResult,
  SettlementCommitResponse,
  SettlementPreviewResponse,
} from "../types";

interface SettlementReviewStepProps {
  preview: SettlementPreviewResponse | null;
  savedSettlement: SettlementCommitResponse | null;
  isSaving: boolean;
  conflictPreview: SettlementPreviewResponse | null;
  saveError: string | null;
  customerPhone?: string | null;
  onSave: () => void;
  onCompleteBills: (invoiceIds: number[], releaseIdCard: boolean) => void;
  isCompletingBills: boolean;
  completedBillIds: number[];
}

const fmtLkr = (n: number) =>
  `Rs ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const changeChipColors = (type: PreviewBillChange["type"]) => {
  switch (type) {
    case "payment":
    case "wallet":
      return { bgcolor: "#dcfce7", color: "#166534", borderColor: "#86efac" };
    case "discount":
      return { bgcolor: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" };
    case "late_fee":
      return { bgcolor: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" };
    case "return":
    default:
      return { bgcolor: "#e0f2fe", color: "#075985", borderColor: "#7dd3fc" };
  }
};

function ReviewBillCard({
  bill,
  isDark,
  highlighted,
}: {
  bill: PreviewBillResult;
  isDark: boolean;
  highlighted?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const isSi = i18n.language?.startsWith("si");

  return (
    <Paper
      data-testid={`review-bill-card-${bill.invoice_id}`}
      elevation={0}
      sx={{
        p: 1.75,
        borderRadius: 2.5,
        border: "1.5px solid",
        borderColor: highlighted
          ? "#ef4444"
          : bill.stamps?.paid_off
            ? "#10b981"
            : isDark
              ? "#334155"
              : "#cbd5e1",
        bgcolor: isDark ? "#0f172a" : "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: 1.1,
        minWidth: 0,
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 400, color: "text.primary", fontFamily: "'JetBrains Mono', monospace" }}
          >
            INV-{bill.invoice_id}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 400, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
            {formatDisplayDate(bill.issued_date)}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {bill.stamps?.paid_off && (
            <Chip
              size="small"
              color="success"
              label={t("settlement.review.paidOffStamp", "✓ Paid off")}
              sx={{ fontWeight: 800, height: 22 }}
            />
          )}
          {bill.stamps?.ready_to_close && (
            <Chip
              size="small"
              color="info"
              label={t("settlement.review.readyToCloseStamp", "Ready to close")}
              sx={{ fontWeight: 800, height: 22 }}
            />
          )}
        </Box>
      </Box>

      {/* Old -> New balance */}
      <Box sx={{ fontVariantNumeric: "tabular-nums", fontSize: "0.95rem" }}>
        <Typography component="span" variant="body2" sx={{ fontWeight: 400, color: "text.primary", textDecoration: "line-through", mr: 0.75 }}>
          {fmtLkr(bill.before.balance)}
        </Typography>
        {"→ "}
        <Typography component="span" variant="body1" sx={{ fontWeight: 900, color: bill.after.balance <= 0 ? "success.main" : "text.primary" }}>
          {fmtLkr(bill.after.balance)} {t("settlement.review.owed", "owed")}
        </Typography>
      </Box>

      {/* Highlighted change chips */}
      {bill.changes?.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
          {bill.changes.map((ch, idx) => {
            const colors = changeChipColors(ch.type);
            const label = isSi && ch.label_si ? ch.label_si : ch.label_en || ch.type;
            return (
              <Chip
                key={idx}
                data-testid={`review-change-chip-${bill.invoice_id}-${ch.type}`}
                size="small"
                label={ch.reason ? `${label} · ${ch.reason}` : label}
                sx={{
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  fontVariantNumeric: "tabular-nums",
                  bgcolor: colors.bgcolor,
                  color: colors.color,
                  border: `1px solid ${colors.borderColor}`,
                }}
              />
            );
          })}
        </Box>
      )}

      {/* Machine lines before -> after */}
      {bill.lines && bill.lines.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, pt: 0.5, borderTop: "1px dashed", borderColor: "divider" }}>
          {bill.lines.map((line) => {
            const name = isSi && line.equipment_name_si ? line.equipment_name_si : line.equipment_name;
            const nowBack = line.out_after === 0;
            return (
              <Box
                key={line.invoice_line_id}
                sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, fontVariantNumeric: "tabular-nums" }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, minWidth: 0 }}>
                  {nowBack ? (
                    <CheckCircleOutlinedIcon data-testid={`line-ticked-${line.invoice_line_id}`} sx={{ fontSize: 16, color: "#10b981" }} />
                  ) : (
                    <BuildIcon data-testid={`line-filled-${line.invoice_line_id}`} sx={{ fontSize: 15, color: "#f59e0b" }} />
                  )}
                  <Typography variant="caption" sx={{ fontWeight: 400, color: "text.primary" }} noWrap>
                    {name}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  <Box component="span" sx={{ fontWeight: 400, color: "text.primary", textDecoration: line.returned_qty > 0 ? "line-through" : "none" }}>
                    {line.out_before} out
                  </Box>
                  {line.returned_qty > 0 && (
                    <>
                      {" → "}
                      <Box component="span" sx={{ fontWeight: 900 }}>
                        {line.out_after} out
                      </Box>
                    </>
                  )}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
}

export function SettlementReviewStep({
  preview,
  savedSettlement,
  isSaving,
  conflictPreview,
  saveError,
  customerPhone,
  onSave,
  onCompleteBills,
  isCompletingBills,
  completedBillIds,
}: SettlementReviewStepProps) {
  const { t, i18n } = useTranslation();
  const isSi = i18n.language?.startsWith("si");
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [showUnchanged, setShowUnchanged] = useState(false);
  const [releaseIdCard, setReleaseIdCard] = useState(true);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const activeData = savedSettlement ?? conflictPreview ?? preview;
  const changedBills = useMemo(
    () => (activeData?.bills ?? []).filter((b) => b.changed),
    [activeData],
  );
  const unchangedBills = useMemo(
    () => (activeData?.bills ?? []).filter((b) => !b.changed),
    [activeData],
  );

  const readyToCloseIds = useMemo(
    () =>
      changedBills
        .filter((b) => b.stamps?.ready_to_close && !completedBillIds.includes(b.invoice_id))
        .map((b) => b.invoice_id),
    [changedBills, completedBillIds],
  );

  const hasIdCardHeld = useMemo(
    () => changedBills.some((b) => Number(b.id_card_status) === 1 || b.id_card_status === "RETAINED"),
    [changedBills],
  );

  if (!activeData) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          {t("settlement.review.nothingToReview", "Return machines or enter a payment to see what changes.")}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minHeight: 0, flex: 1 }}>
      {conflictPreview && !savedSettlement && (
        <Alert severity="warning" data-testid="settlement-conflict-alert" sx={{ fontWeight: 700 }}>
          {t(
            "settlement.review.conflictChanged",
            "Bills changed while you were reviewing. Check the updated numbers below and tap Confirm & save again.",
          )}
        </Alert>
      )}

      {saveError && (
        <Alert severity="error">{saveError}</Alert>
      )}

      {savedSettlement && (
        <Alert severity="success" data-testid="settlement-saved-alert" sx={{ fontWeight: 800 }}>
          {t("settlement.review.savedSuccess", {
            id: savedSettlement.settlement_id,
            defaultValue: `Settlement #S-${savedSettlement.settlement_id} saved.`,
          })}
        </Alert>
      )}

      {/* Totals strip on top */}
      <Paper
        data-testid="settlement-review-totals"
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 2.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: isDark ? "#0f172a" : "#ffffff",
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
          justifyContent: "space-between",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        <Typography variant="body1" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {t("settlement.review.owedLabel", "Owed")}{" "}
          <Box component="span" sx={{ textDecoration: "line-through", fontWeight: 400, color: "text.primary" }}>
            {fmtLkr(activeData.totals.owed_before)}
          </Box>{" "}
          → <strong>{fmtLkr(activeData.totals.owed_after)}</strong>
        </Typography>

        <Typography variant="body1" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {t("settlement.review.machinesOutLabel", "Machines out")}{" "}
          <Box component="span" sx={{ textDecoration: "line-through", fontWeight: 400, color: "text.primary" }}>
            {activeData.totals.machines_out_before}
          </Box>{" "}
          → <strong>{activeData.totals.machines_out_after}</strong>
        </Typography>
      </Paper>

      {/* Changed bills side by side (row on computer, stacked on phone) */}
      <Box sx={{ overflowY: "auto", minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {changedBills.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t("settlement.review.noChangesYet", "No changes on any bill yet.")}
            </Typography>
          </Paper>
        ) : (
          <Box
            data-testid="settlement-review-grid"
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(auto-fill, minmax(300px, 1fr))" },
              gap: 1.5,
            }}
          >
            {changedBills.map((bill) => (
              <ReviewBillCard
                key={bill.invoice_id}
                bill={bill}
                isDark={isDark}
                highlighted={Boolean(conflictPreview && !savedSettlement)}
              />
            ))}
          </Box>
        )}

        {unchangedBills.length > 0 && (
          <Box>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowUnchanged((v) => !v)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {showUnchanged
                ? t("settlement.review.hideUnchanged", "Hide unchanged bills")
                : t("settlement.review.showUnchanged", {
                    count: unchangedBills.length,
                    defaultValue: `Show the other ${unchangedBills.length} bills`,
                  })}
            </Button>
            <Collapse in={showUnchanged} unmountOnExit>
              <Box
                sx={{
                  mt: 1,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(auto-fill, minmax(280px, 1fr))" },
                  gap: 1,
                }}
              >
                {unchangedBills.map((b) => (
                  <ReviewBillCard key={`unchanged-${b.invoice_id}`} bill={b} isDark={isDark} />
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>

      {/* Plain-words summary */}
      {(activeData.summary?.en || activeData.summary?.si) && (
        <Paper
          data-testid="settlement-plain-summary"
          variant="outlined"
          sx={{ p: 1.25, borderRadius: 2, bgcolor: isDark ? "#1e293b" : "#f8fafc", flexShrink: 0 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {isSi && activeData.summary.si ? activeData.summary.si : activeData.summary.en}
          </Typography>
        </Paper>
      )}

      {/* Save OR Post-save actions */}
      {!savedSettlement ? (
        <Box sx={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <Button
            data-testid="settlement-save-btn"
            variant="contained"
            size="large"
            disabled={isSaving || changedBills.length === 0}
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={onSave}
            sx={{
              textTransform: "none",
              fontWeight: 900,
              borderRadius: 2,
              bgcolor: "#10b981",
              color: "#ffffff",
              "&:hover": { bgcolor: "#059669" },
            }}
          >
            {conflictPreview
              ? t("settlement.review.confirmAgain", "Confirm & save")
              : t("settlement.review.save", "Save")}
          </Button>
        </Box>
      ) : (
        <Paper
          data-testid="settlement-post-save-actions"
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            display: "flex",
            flexWrap: "wrap",
            gap: 1.25,
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            {readyToCloseIds.length > 0 && (
              <>
                {hasIdCardHeld && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={releaseIdCard}
                        onChange={(e) => setReleaseIdCard(e.target.checked)}
                      />
                    }
                    label={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <BadgeOutlinedIcon fontSize="small" />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {t("settlement.review.giveBackIdCard", "Give back the ID card")}
                        </Typography>
                      </Box>
                    }
                  />
                )}
                <Button
                  data-testid="settlement-close-bills-btn"
                  variant="contained"
                  color="success"
                  disabled={isCompletingBills}
                  startIcon={<TaskAltIcon />}
                  onClick={() => onCompleteBills(readyToCloseIds, releaseIdCard)}
                  sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2 }}
                >
                  {t("settlement.review.closeTheseBills", {
                    count: readyToCloseIds.length,
                    defaultValue: `Close these bills (${readyToCloseIds.length})`,
                  })}
                </Button>
              </>
            )}
            {completedBillIds.length > 0 && (
              <Chip
                color="success"
                label={t("settlement.review.billsClosedCount", {
                  count: completedBillIds.length,
                  defaultValue: `${completedBillIds.length} bill(s) closed`,
                })}
                sx={{ fontWeight: 800 }}
              />
            )}
          </Box>

          <Button
            data-testid="settlement-open-receipt-btn"
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => setReceiptOpen(true)}
            sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2 }}
          >
            {t("settlement.review.receiptAndWhatsApp", "Receipt & WhatsApp")}
          </Button>
        </Paper>
      )}

      <SettlementReceiptDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        settlement={savedSettlement}
        customerPhone={customerPhone}
      />
    </Box>
  );
}
