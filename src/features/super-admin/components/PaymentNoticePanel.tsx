import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, FormControlLabel, Paper, Switch, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { isLockedNow, noticeMessage, timeLeftText, type PaymentNoticeData } from "@/features/plan/paymentNoticeText";
import { useNoticeDefaults, useSaveNoticeDefaults, useTenants } from "../hooks/useSuperAdminHooks";
import { DARK_FIELD } from "./OverdueDialog";

const card = { p: 2, bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 2, color: "#f1f5f9" };

/** Default wording and timers for overdue shops, and who is overdue right now. */
export function PaymentNoticePanel() {
  const { t, i18n } = useTranslation();
  const { data: defaults, isLoading, isError, error } = useNoticeDefaults();
  const { data: tenants = [] } = useTenants();
  const save = useSaveNoticeDefaults();
  const [en, setEn] = useState("");
  const [si, setSi] = useState("");
  const [locks, setLocks] = useState(true);
  const [days, setDays] = useState("7");
  const [repeat, setRepeat] = useState("60");
  const [wait, setWait] = useState("10");
  const [saved, setSaved] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!defaults) return;
    setEn(defaults.message_en);
    setSi(defaults.message_si);
    setLocks(defaults.grace_days !== null);
    setDays(String(defaults.grace_days ?? 7));
    setRepeat(String(defaults.repeat_minutes));
    setWait(String(defaults.wait_seconds));
  }, [defaults]);

  const daysOk = /^\d+$/.test(days) && Number(days) <= 365;
  const repeatOk = /^\d+$/.test(repeat) && Number(repeat) <= 1440;
  const waitOk = /^\d+$/.test(wait) && Number(wait) <= 120;
  const valid = (!locks || daysOk) && repeatOk && waitOk && !!en.trim() && !!si.trim();

  const overdue = useMemo(() => (tenants as any[]).filter((s) => s.subscription_status === "Overdue"), [tenants]);
  const sample: PaymentNoticeData = {
    overdue_since: null, lock_at: new Date(now + 7 * 86400000).toISOString(), locked: false, days_overdue: 3, shop: "Sample Rentals", amount: 5900,
    due_date: new Date(now - 3 * 86400000).toISOString(), message_en: en, message_si: si, repeat_minutes: 60, wait_seconds: 10,
  };

  if (isLoading) return <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}><CircularProgress size={28} /></Box>;
  if (isError) return <Alert severity="error">{(error as any)?.message || t("superAdmin.overdue.loadFailed")}</Alert>;

  const statusOf = (s: any) => {
    const n = s.feature_flags?.payment_notice;
    if (!n?.overdue_since) return { text: t("superAdmin.overdue.statusLockedNoTimer"), locked: true };
    if (isLockedNow({ ...n, locked: false }, now)) return { text: t("superAdmin.overdue.statusLocked"), locked: true };
    return { text: n.lock_at ? t("superAdmin.overdue.statusLocksIn", { time: timeLeftText(n.lock_at, now) }) : t("superAdmin.overdue.statusNever"), locked: false };
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 860 }}>
      <Box>
        <Typography variant="h6" sx={{ color: "#f1f5f9", fontWeight: 700 }}>{t("superAdmin.overdue.title")}</Typography>
        <Typography variant="caption" sx={{ color: "#94a3b8" }}>{t("superAdmin.overdue.subtitle")}</Typography>
      </Box>

      <Paper elevation={0} sx={card}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", mb: 1 }}>{t("superAdmin.overdue.overdueNow", { count: overdue.length })}</Typography>
        {overdue.length === 0 ? (
          <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{t("superAdmin.overdue.noneOverdue")}</Typography>
        ) : (
          overdue.map((s) => {
            const st = statusOf(s);
            return (
              <Box key={s.tenant_id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, py: 0.5, borderTop: "1px solid #1e293b" }}>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{s.display_name}</Typography>
                <Chip size="small" label={st.text} sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", bgcolor: st.locked ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.16)", color: st.locked ? "#f87171" : "#fbbf24" }} />
              </Box>
            );
          })
        )}
      </Paper>

      <Paper elevation={0} sx={{ ...card, display: "flex", flexDirection: "column", gap: 1.75 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>{t("superAdmin.overdue.defaultsTitle")}</Typography>
        <TextField multiline minRows={3} label={t("superAdmin.overdue.messageEn")} value={en} onChange={(e) => { setEn(e.target.value); setSaved(false); }} error={!en.trim()} sx={DARK_FIELD} slotProps={{ htmlInput: { maxLength: 1000, "data-no-sinhala": "" } }} />
        <TextField multiline minRows={3} label={t("superAdmin.overdue.messageSi")} value={si} onChange={(e) => { setSi(e.target.value); setSaved(false); }} error={!si.trim()} sx={DARK_FIELD} slotProps={{ htmlInput: { maxLength: 1000 } }} />
        <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>{t("superAdmin.overdue.placeholders")}</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1.5, alignItems: "start" }}>
          <Box>
            <FormControlLabel control={<Switch size="small" checked={locks} onChange={(e) => { setLocks(e.target.checked); setSaved(false); }} />} label={t("superAdmin.overdue.autoLock")} sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.82rem", color: "#e2e8f0" }, mb: 0.75 }} />
            <TextField size="small" fullWidth disabled={!locks} label={t("superAdmin.overdue.graceDays")} value={locks ? days : ""} onChange={(e) => { setDays(e.target.value); setSaved(false); }} error={locks && !daysOk} helperText={t("superAdmin.overdue.graceHelp")} sx={DARK_FIELD} />
          </Box>
          <TextField size="small" label={t("superAdmin.overdue.repeat")} value={repeat} onChange={(e) => { setRepeat(e.target.value); setSaved(false); }} error={!repeatOk} helperText={t("superAdmin.overdue.repeatHelp")} sx={{ ...DARK_FIELD, mt: { sm: 4.25 } }} />
          <TextField size="small" label={t("superAdmin.overdue.wait")} value={wait} onChange={(e) => { setWait(e.target.value); setSaved(false); }} error={!waitOk} helperText={t("superAdmin.overdue.waitHelp")} sx={{ ...DARK_FIELD, mt: { sm: 4.25 } }} />
        </Box>

        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "#fef3c7", color: "#78350f", border: "1px solid #f59e0b" }}>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, mb: 0.25 }}>{t("superAdmin.overdue.preview")}</Typography>
          <Typography sx={{ fontSize: "0.85rem", whiteSpace: "pre-line" }}>{noticeMessage(sample, i18n.language)}</Typography>
        </Box>

        {save.isError && <Alert severity="error">{(save.error as any)?.message || t("superAdmin.overdue.saveFailed")}</Alert>}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
          {saved && <Chip size="small" label={t("superAdmin.plans.savedChip")} sx={{ bgcolor: "rgba(16,185,129,0.15)", color: "#34d399", fontWeight: 700 }} />}
          <Button
            variant="contained"
            disableElevation
            disabled={!valid || save.isPending}
            onClick={() =>
              save.mutate(
                { message_en: en, message_si: si, grace_days: locks ? Number(days) : null, repeat_minutes: Number(repeat), wait_seconds: Number(wait) },
                { onSuccess: () => setSaved(true) },
              )
            }
            sx={{ textTransform: "none", fontWeight: 800, "&.Mui-disabled": { bgcolor: "#1e293b", color: "#475569" } }}
          >
            {t("superAdmin.overdue.saveDefaults")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
