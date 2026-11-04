import { useState } from "react";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { changeMyPassword } from "@/features/profile/api/me.api";
import { useAuthStore } from "@/stores/useAuthStore";

/** Someone else set this person's password, so they choose their own before going further. */
export function ForcePasswordChange() {
  const { t } = useTranslation();
  const required = useAuthStore((s) => !!s.user?.must_change_password);
  const updateUserPartial = useAuthStore((s) => s.updateUserPartial);
  const logout = useAuthStore((s) => s.logout);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!required) return null;
  const mismatch = !!confirm && confirm !== next;
  const same = !!next && next === current;
  const ready = !!current && next.length >= 8 && next === confirm && !same;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await changeMyPassword({ currentPassword: current, newPassword: next });
      updateUserPartial({ must_change_password: false });
    } catch (err: any) {
      setError(err?.message || t("auth.password.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open maxWidth="xs" fullWidth sx={{ zIndex: 1900 }}>
      <DialogTitle sx={{ fontWeight: 800 }}>{t("auth.password.forceTitle")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">{t("auth.password.forceHint")}</Typography>
        <TextField size="small" autoFocus fullWidth type="password" label={t("auth.password.temporary")} value={current} autoComplete="current-password" onChange={(e) => setCurrent(e.target.value)} sx={{ mt: 0.5 }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" fullWidth type="password" label={t("auth.forgot.newPassword")} value={next} autoComplete="new-password" error={same} helperText={same ? t("auth.password.mustDiffer") : t("auth.password.min")} onChange={(e) => setNext(e.target.value)} />
        <TextField size="small" fullWidth type="password" label={t("auth.password.confirm")} value={confirm} autoComplete="new-password" error={mismatch} helperText={mismatch ? t("auth.password.mismatch") : undefined} onChange={(e) => setConfirm(e.target.value)} />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" disabled={busy} onClick={logout} sx={{ textTransform: "none" }}>{t("plan.notice.logOut")}</Button>
        <Button variant="contained" disableElevation disabled={!ready || busy} startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined} onClick={save} sx={{ textTransform: "none", fontWeight: 800 }}>
          {t("auth.forgot.setPassword")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
