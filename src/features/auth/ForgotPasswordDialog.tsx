import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { requestPasswordCode, resetPasswordWithCode } from "./api/auth.api";

type Step = "ask" | "code" | "done";

/** Forgot password: ask for a code, then enter it with a new password. */
export function ForgotPasswordDialog({ open, onClose, initialIdentifier = "" }: { open: boolean; onClose: () => void; initialIdentifier?: string }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("ask");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("ask");
    setIdentifier(initialIdentifier);
    setCode("");
    setPassword("");
    setConfirm("");
    setError(null);
    setResent(false);
  }, [open, initialIdentifier]);

  const ask = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestPasswordCode(identifier.trim());
      setStep("code");
    } catch (err: any) {
      setError(err?.message || t("auth.forgot.failed"));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setError(null);
    try {
      await resetPasswordWithCode({ identifier: identifier.trim(), code: code.trim(), new_password: password });
      setStep("done");
    } catch (err: any) {
      setError(err?.message || t("auth.forgot.failed"));
    } finally {
      setBusy(false);
    }
  };

  const mismatch = !!confirm && confirm !== password;
  const canReset = /^\d{6}$/.test(code.trim()) && password.length >= 8 && password === confirm;

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{t(step === "done" ? "auth.forgot.doneTitle" : "auth.forgot.title")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {step === "ask" && (
          <>
            <Typography variant="body2" color="text.secondary">{t("auth.forgot.askHint")}</Typography>
            <TextField size="small" autoFocus fullWidth label={t("auth.forgot.identifier")} value={identifier} autoComplete="username" onChange={(e) => setIdentifier(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && identifier.trim() && !busy) ask(); }} slotProps={{ inputLabel: { shrink: true }, htmlInput: { "data-no-sinhala": "" } }} sx={{ mt: 0.5 }} />
            <Typography variant="caption" color="text.secondary">{t("auth.forgot.noEmailHint")}</Typography>
          </>
        )}
        {step === "code" && (
          <>
            <Alert severity="info">{t("auth.forgot.codeSent")}</Alert>
            <TextField size="small" autoFocus fullWidth label={t("auth.forgot.code")} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" slotProps={{ htmlInput: { inputMode: "numeric", "data-no-sinhala": "", style: { fontVariantNumeric: "tabular-nums", letterSpacing: 6, fontWeight: 800 } } }} />
            <TextField size="small" fullWidth type="password" label={t("auth.forgot.newPassword")} value={password} autoComplete="new-password" helperText={t("auth.password.min")} onChange={(e) => setPassword(e.target.value)} />
            <TextField size="small" fullWidth type="password" label={t("auth.password.confirm")} value={confirm} autoComplete="new-password" error={mismatch} helperText={mismatch ? t("auth.password.mismatch") : undefined} onChange={(e) => setConfirm(e.target.value)} />
            <Box>
              <Button size="small" disabled={busy || resent} onClick={async () => { await ask(); setResent(true); }} sx={{ textTransform: "none", fontWeight: 700, px: 0 }}>
                {t(resent ? "auth.forgot.resent" : "auth.forgot.resend")}
              </Button>
            </Box>
          </>
        )}
        {step === "done" && <Alert severity="success">{t("auth.forgot.done")}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step === "done" ? (
          <Button variant="contained" disableElevation onClick={onClose} sx={{ textTransform: "none", fontWeight: 800 }}>{t("auth.forgot.backToLogin")}</Button>
        ) : (
          <>
            <Button color="inherit" disabled={busy} onClick={onClose} sx={{ textTransform: "none" }}>{t("common.cancel")}</Button>
            <Button variant="contained" disableElevation disabled={busy || (step === "ask" ? !identifier.trim() : !canReset)} startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined} onClick={step === "ask" ? ask : reset} sx={{ textTransform: "none", fontWeight: 800 }}>
              {t(step === "ask" ? "auth.forgot.sendCode" : "auth.forgot.setPassword")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
