import { Box, Button, Chip, IconButton, Typography } from "@mui/material";
import AssignmentReturnedOutlinedIcon from "@mui/icons-material/AssignmentReturnedOutlined";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import RestoreIcon from "@mui/icons-material/Restore";
import { useTranslation } from "react-i18next";
import { NumberInput } from "@/components/ui/NumberInput";
import { formatDisplayDate } from "@/lib/dates";

/** One machine in the handover: how many come back, how many of those are damaged. Both are typeable. */
export interface HandoverLine {
  line_id: number;
  equipment_name: string;
  borrow_qty: number;
  remaining_qty: number;
  good_qty: number;
  defective_qty: number;
  track_overdue: boolean;
  _orig_tracked: boolean;
  expected_return?: string;
  locked_extra_rate: number;
}

interface Props {
  line: HandoverLine;
  daysLate: number;
  lateFee: number;
  onChange: (updates: Partial<HandoverLine>) => void;
}

function QtyField({
  label,
  icon,
  tone,
  value,
  max,
  onChange,
  hint,
  trailing,
}: {
  label: string;
  icon: React.ReactNode;
  tone: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
  hint?: string;
  trailing?: React.ReactNode;
}) {
  const set = (n: number) => onChange(Math.max(0, Math.min(max, n)));
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75, color: tone, "& svg": { fontSize: 18 } }}>
        {icon}
        <Typography sx={{ fontWeight: 800, fontSize: "0.8rem", color: "#0f172a" }}>{label}</Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <IconButton
          aria-label={`${label} −1`}
          size="small"
          onClick={() => set(value - 1)}
          disabled={value <= 0}
          sx={{ border: "1px solid #cbd5e1", width: 40, height: 40 }}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <NumberInput
          value={value}
          onChange={(n) => set(n === "" ? 0 : n)}
          min={0}
          max={max}
          emptyAsZeroOnBlur
          size="small"
          aria-label={label}
          slotProps={{ htmlInput: { "aria-label": label, style: { textAlign: "center", fontWeight: 800, fontSize: "1.05rem", fontVariantNumeric: "tabular-nums", padding: "8px 4px" } } }}
          sx={{ width: 76, "& .MuiOutlinedInput-root": { bgcolor: "white" }, "& input": { color: "#0f172a" } }}
        />
        <IconButton
          aria-label={`${label} +1`}
          size="small"
          onClick={() => set(value + 1)}
          disabled={value >= max}
          sx={{ border: "1px solid #cbd5e1", width: 40, height: 40 }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
        {trailing}
      </Box>
      {hint && (
        <Typography sx={{ fontSize: "0.72rem", color: "#475569", mt: 0.5, fontWeight: 600 }}>{hint}</Typography>
      )}
    </Box>
  );
}

export function HandoverLineCard({ line, daysLate, lateFee, onChange }: Props) {
  const { t } = useTranslation();
  const returning = line.good_qty + line.defective_qty;
  const stillOut = Math.max(0, line.remaining_qty - returning);
  const tracked = line.track_overdue !== false;
  const isWaived = line._orig_tracked && !tracked;
  const isLate = daysLate > 0;

  const setReturning = (n: number) => {
    const r = Math.max(0, Math.min(line.remaining_qty, n));
    const d = Math.min(line.defective_qty, r); // damaged can never exceed what is coming back
    onChange({ good_qty: r - d, defective_qty: d });
  };
  const setDamaged = (n: number) => {
    const d = Math.max(0, Math.min(returning, n));
    onChange({ good_qty: returning - d, defective_qty: d });
  };

  return (
    <Box
      sx={{
        bgcolor: "white",
        border: "1px solid",
        borderColor: isLate ? "#fca5a5" : "#e2e8f0",
        borderRadius: 2.5,
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.75,
      }}
    >
      {/* name + how many are out */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{line.equipment_name}</Typography>
        <Chip
          size="small"
          icon={<HourglassTopOutlinedIcon sx={{ fontSize: 15 }} />}
          label={t("invoices.ReturnSettlementDialog.pendingOf", { remaining: line.remaining_qty, total: line.borrow_qty })}
          sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#92400e", fontVariantNumeric: "tabular-nums", "& .MuiChip-icon": { color: "#92400e" } }}
        />
      </Box>

      {/* the two numbers */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 2 }}>
        <QtyField
          label={t("invoices.handover.returning")}
          icon={<AssignmentReturnedOutlinedIcon />}
          tone="#059669"
          value={returning}
          max={line.remaining_qty}
          onChange={setReturning}
          hint={t("invoices.handover.ofStillOut", { count: line.remaining_qty })}
          trailing={
            line.remaining_qty > 1 && returning < line.remaining_qty ? (
              <Button size="small" onClick={() => setReturning(line.remaining_qty)} sx={{ textTransform: "none", fontWeight: 800, minWidth: 0, px: 1 }}>
                {t("invoices.handover.all")}
              </Button>
            ) : undefined
          }
        />
        <QtyField
          label={t("invoices.handover.damaged")}
          icon={<BuildCircleOutlinedIcon />}
          tone="#dc2626"
          value={line.defective_qty}
          max={returning}
          onChange={setDamaged}
          hint={line.defective_qty > 0 ? t("invoices.handover.damagedHint") : undefined}
        />
      </Box>

      {/* live result */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <Chip size="small" icon={<CheckCircleOutlinedIcon sx={{ fontSize: 15 }} />} label={t("invoices.handover.summaryGood", { count: line.good_qty })} sx={{ fontWeight: 800, bgcolor: "#dcfce7", color: "#166534", "& .MuiChip-icon": { color: "#166534" }, fontVariantNumeric: "tabular-nums" }} />
        {line.defective_qty > 0 && (
          <Chip size="small" icon={<BuildCircleOutlinedIcon sx={{ fontSize: 15 }} />} label={t("invoices.handover.summaryDamaged", { count: line.defective_qty })} sx={{ fontWeight: 800, bgcolor: "#fee2e2", color: "#991b1b", "& .MuiChip-icon": { color: "#991b1b" }, fontVariantNumeric: "tabular-nums" }} />
        )}
        {stillOut > 0 && (
          <Chip size="small" icon={<HourglassTopOutlinedIcon sx={{ fontSize: 15 }} />} label={t("invoices.handover.summaryStillOut", { count: stillOut })} sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#92400e", "& .MuiChip-icon": { color: "#92400e" }, fontVariantNumeric: "tabular-nums" }} />
        )}
        {isLate && (
          <Chip size="small" icon={<AccessTimeIcon sx={{ fontSize: 15 }} />} color="error" label={t("invoices.ReturnSettlementDialog.dLateRs", { daysLate, lineLF: lateFee.toLocaleString() })} sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }} />
        )}
        {isWaived && (
          <Chip size="small" icon={<MoneyOffIcon sx={{ fontSize: 15 }} />} variant="outlined" label={t("invoices.ReturnSettlementDialog.lateFeesWaived")} sx={{ fontWeight: 800, color: "#92400e", borderColor: "#fde68a", bgcolor: "#fffbeb" }} />
        )}
        {(isLate || isWaived) && line._orig_tracked && (
          <Button
            size="small"
            variant="text"
            startIcon={isWaived ? <RestoreIcon sx={{ fontSize: 15 }} /> : <MoneyOffIcon sx={{ fontSize: 15 }} />}
            onClick={() => onChange({ track_overdue: isWaived })}
            sx={{ textTransform: "none", fontWeight: 800, fontSize: "0.74rem", color: isWaived ? "primary.main" : "#92400e" }}
          >
            {isWaived ? t("invoices.ReturnSettlementDialog.restoreLateFees") : t("invoices.ReturnSettlementDialog.waiveLateFees")}
          </Button>
        )}
        {tracked && line.expected_return && !isLate && (
          <Typography sx={{ fontSize: "0.74rem", color: "#475569", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {t("orders.ledger.dueOn", { date: formatDisplayDate(line.expected_return) })}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
