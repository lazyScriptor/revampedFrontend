import { useEffect, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, Switch, TextField, Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { useMarkTenantOverdue, useNoticeDefaults } from "../hooks/useSuperAdminHooks";

export const DARK_FIELD = {
  "& .MuiOutlinedInput-root": { color: "#f1f5f9", bgcolor: "#0b1220", fontSize: "0.85rem", "& fieldset": { borderColor: "#334155" }, "&:hover fieldset": { borderColor: "#475569" }, "&.Mui-focused fieldset": { borderColor: "#f59e0b" } },
  // The app theme is light: its dark input text has to be overridden on this dark console.
  "& .MuiOutlinedInput-input": { color: "#f1f5f9", WebkitTextFillColor: "#f1f5f9", fontVariantNumeric: "tabular-nums" },
  "& .MuiOutlinedInput-input.Mui-disabled": { WebkitTextFillColor: "#64748b" },
  "& .MuiOutlinedInput-input::placeholder": { color: "#64748b", WebkitTextFillColor: "#64748b", opacity: 1 },
  "& .MuiInputLabel-root": { color: "#94a3b8" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#f59e0b" },
  "& .MuiFormHelperText-root": { color: "#64748b" },
};
export const DARK_PAPER = { paper: { sx: { bgcolor: "#0f172a", color: "#f1f5f9", backgroundImage: "none", border: "1px solid #334155" } } };

type LockChoice = "days" | "now" | "never" | "keep";

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  shopName: string;
  /** The shop's notice when it is already overdue. */
  current?: { overdue_since?: string; lock_at?: string | null; message_en?: string | null; message_si?: string | null; repeat_minutes?: number | null; wait_seconds?: number | null } | null;
}

/** Mark a shop overdue, or change its timer and wording while it is. */
export function OverdueDialog({ open, onClose, tenantId, shopName, current }: Props) {
  const { t } = useTranslation();
  const { data: defaults } = useNoticeDefaults();
  const mark = useMarkTenantOverdue();
  const editing = !!current?.overdue_since;
  const [lock, setLock] = useState<LockChoice>("days");
  const [days, setDays] = useState("7");
  const [custom, setCustom] = useState(false);
  const [en, setEn] = useState("");
  const [si, setSi] = useState("");
  const [repeat, setRepeat] = useState("60");
  const [wait, setWait] = useState("10");

  useEffect(() => {
    if (!open) return;
    mark.reset();
    const own = !!(current?.message_en || current?.message_si || current?.repeat_minutes != null || current?.wait_seconds != null);
    setLock(editing ? "keep" : defaults?.grace_days === null ? "never" : defaults?.grace_days === 0 ? "now" : "days");
    setDays(String(defaults?.grace_days || 7));
    setCustom(own);
    setEn(current?.message_en || defaults?.message_en || "");
    setSi(current?.message_si || defaults?.message_si || "");
    setRepeat(String(current?.repeat_minutes ?? defaults?.repeat_minutes ?? 60));
    setWait(String(current?.wait_seconds ?? defaults?.wait_seconds ?? 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaults]);

  const daysOk = /^\d+$/.test(days) && Number(days) >= 1 && Number(days) <= 365;
  const repeatOk = /^\d+$/.test(repeat) && Number(repeat) <= 1440;
  const waitOk = /^\d+$/.test(wait) && Number(wait) <= 120;
  const valid = (lock !== "days" || daysOk) && (!custom || (repeatOk && waitOk && (en.trim() || si.trim())));

  const save = () => {
    const body: Record<string, unknown> = {};
    if (lock === "days") body.lock_at = new Date(Date.now() + Number(days) * 86400000).toISOString();
    else if (lock === "now") body.lock_at = new Date().toISOString();
    else if (lock === "never") body.lock_at = null;
    if (custom) Object.assign(body, { message_en: en, message_si: si, repeat_minutes: Number(repeat), wait_seconds: Number(wait) });
    mark.mutate({ tenantId, body }, { onSuccess: onClose });
  };

  const radio = { color: "#475569", "&.Mui-checked": { color: "#f59e0b" } };
  const label = { "& .MuiFormControlLabel-label": { fontSize: "0.85rem", color: "#e2e8f0" } };

  return (
    <Dialog open={open} onClose={() => !mark.isPending && onClose()} maxWidth="sm" fullWidth slotProps={DARK_PAPER}>
      <DialogTitle sx={{ fontWeight: 800 }}>{t(editing ? "superAdmin.overdue.editTitle" : "superAdmin.overdue.markTitle", { shop: shopName })}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 800, mb: 0.5 }}>{t("superAdmin.overdue.whenLock")}</Typography>
          <RadioGroup value={lock} onChange={(e) => setLock(e.target.value as LockChoice)} aria-label={t("superAdmin.overdue.whenLock")}>
            {editing && <FormControlLabel value="keep" control={<Radio size="small" sx={radio} />} label={t("superAdmin.overdue.lockKeep")} sx={label} />}
            <FormControlLabel value="days" control={<Radio size="small" sx={radio} />} label={t("superAdmin.overdue.lockDays")} sx={label} />
            {lock === "days" && (
              <TextField size="small" value={days} onChange={(e) => setDays(e.target.value)} error={!daysOk} helperText={t("superAdmin.overdue.daysHelp")} sx={{ ...DARK_FIELD, maxWidth: 220, ml: 3.5, mb: 0.5 }} slotProps={{ htmlInput: { "aria-label": t("superAdmin.overdue.lockDays"), inputMode: "numeric" } }} />
            )}
            <FormControlLabel value="now" control={<Radio size="small" sx={radio} />} label={t("superAdmin.overdue.lockNow")} sx={label} />
            <FormControlLabel value="never" control={<Radio size="small" sx={radio} />} label={t("superAdmin.overdue.lockNever")} sx={label} />
          </RadioGroup>
        </Box>

        <FormControlLabel control={<Switch size="small" checked={custom} onChange={(e) => setCustom(e.target.checked)} />} label={t("superAdmin.overdue.customMessage")} sx={label} />
        {custom ? (
          <>
            <TextField multiline minRows={3} label={t("superAdmin.overdue.messageEn")} value={en} onChange={(e) => setEn(e.target.value)} sx={DARK_FIELD} slotProps={{ htmlInput: { maxLength: 1000, "data-no-sinhala": "" } }} />
            <TextField multiline minRows={3} label={t("superAdmin.overdue.messageSi")} value={si} onChange={(e) => setSi(e.target.value)} sx={DARK_FIELD} slotProps={{ htmlInput: { maxLength: 1000 } }} />
            <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>{t("superAdmin.overdue.placeholders")}</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <TextField size="small" label={t("superAdmin.overdue.repeat")} value={repeat} onChange={(e) => setRepeat(e.target.value)} error={!repeatOk} helperText={t("superAdmin.overdue.repeatHelp")} sx={DARK_FIELD} />
              <TextField size="small" label={t("superAdmin.overdue.wait")} value={wait} onChange={(e) => setWait(e.target.value)} error={!waitOk} helperText={t("superAdmin.overdue.waitHelp")} sx={DARK_FIELD} />
            </Box>
          </>
        ) : (
          <Typography sx={{ fontSize: "0.76rem", color: "#94a3b8" }}>{t("superAdmin.overdue.usesDefault")}</Typography>
        )}
        {mark.isError && <Alert severity="error">{(mark.error as any)?.message || t("superAdmin.overdue.saveFailed")}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button disabled={mark.isPending} onClick={onClose} sx={{ color: "#94a3b8", textTransform: "none", fontWeight: 700 }}>{t("common.cancel")}</Button>
        <Button variant="contained" color="warning" disableElevation disabled={!valid || mark.isPending} startIcon={mark.isPending ? <CircularProgress size={14} color="inherit" /> : undefined} onClick={save} sx={{ textTransform: "none", fontWeight: 800 }}>
          {t(editing ? "superAdmin.overdue.saveChanges" : "superAdmin.overdue.markButton")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
