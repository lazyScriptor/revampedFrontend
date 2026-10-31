// Optional bill date/time for entering a bill after the fact (a paper bill
// written while the system was down, a late entry). Hidden behind a link so
// the everyday flow stays "bill = now".
import { useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/lib/dates";

/** "YYYY-MM-DDTHH:mm" in the browser's local time, for <input type="datetime-local">. */
export const toLocalInputValue = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface BillDateControlProps {
  /** Local "YYYY-MM-DDTHH:mm", or null for "now". */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Sets every cart line's out date to the bill's day. */
  onApplyToLines?: (day: string) => void;
  hasLines: boolean;
}

export function BillDateControl({ value, onChange, onApplyToLines, hasLines }: BillDateControlProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(value !== null);
  const nowValue = toLocalInputValue(new Date());
  const isFuture = value !== null && value > nowValue;
  const dayWords = { today: t("time.today"), yesterday: t("time.yesterday") };

  if (!open) {
    return (
      <Button
        size="small"
        startIcon={<EventIcon fontSize="small" />}
        onClick={() => {
          setOpen(true);
          onChange(nowValue);
        }}
        sx={{ alignSelf: "flex-start", color: "#94a3b8", textTransform: "none", fontWeight: 600, px: 0.5 }}
      >
        {t("invoices.BillDateControl.billDateNow")}
      </Button>
    );
  }

  return (
    <Box sx={{ p: 1.5, borderRadius: 2, border: "1px solid #334155", bgcolor: "#0f172a" }}>
      <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, letterSpacing: 1, mb: 1, display: "block" }}>
        {t("invoices.BillDateControl.title")}
      </Typography>
      <TextField
        type="datetime-local"
        size="small"
        fullWidth
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        error={isFuture}
        helperText={isFuture ? t("invoices.BillDateControl.noFuture") : t("invoices.BillDateControl.hint")}
        slotProps={{ htmlInput: { max: nowValue, "aria-label": t("invoices.BillDateControl.title") } }}
        sx={{
          "& .MuiOutlinedInput-root": {
            bgcolor: "#1e293b",
            color: "#f8fafc",
            "& fieldset": { borderColor: "#334155" },
            "&:hover fieldset": { borderColor: "#475569" },
          },
          "& .MuiInputBase-input": {
            color: "#f8fafc !important",
            fontVariantNumeric: "tabular-nums",
            colorScheme: "dark",
          },
          "& .MuiFormHelperText-root": { color: isFuture ? undefined : "#94a3b8", mx: 0 },
        }}
      />
      {value && !isFuture && (
        <Typography variant="caption" sx={{ display: "block", mt: 0.75, color: "#fbbf24", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {t("invoices.BillDateControl.willShow", { when: formatDateTime(new Date(value).toISOString(), dayWords) })}
        </Typography>
      )}
      <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
        {hasLines && onApplyToLines && value && !isFuture && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => onApplyToLines(value.slice(0, 10))}
            sx={{ textTransform: "none", borderColor: "#475569", color: "#e2e8f0" }}
          >
            {t("invoices.BillDateControl.applyToLines")}
          </Button>
        )}
        <Button
          size="small"
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
          sx={{ textTransform: "none", color: "#94a3b8" }}
        >
          {t("invoices.BillDateControl.useNow")}
        </Button>
      </Box>
    </Box>
  );
}
