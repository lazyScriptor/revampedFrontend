import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { useTranslation } from "react-i18next";

import { buildWaLink, openWhatsApp } from "@/features/whatsapp/lib/whatsapp";

export interface ResetCode {
  code: string;
  minutes: number;
  name: string;
  username: string;
  whatsapp_digits: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  name: string;
  /** Makes the code: only called when the person presses the button. */
  createCode: () => Promise<ResetCode>;
}

/** A password code an admin hands over themselves. WhatsApp opens with the message ready to send. */
export function ResetCodeDialog({ open, onClose, name, createCode }: Props) {
  const { t } = useTranslation();
  const [result, setResult] = useState<ResetCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError(null);
    setCopied(false);
  }, [open]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await createCode());
    } catch (err: any) {
      setError(err?.message || t("auth.adminReset.failed"));
    } finally {
      setBusy(false);
    }
  };

  const message = result
    ? t("auth.adminReset.message", { name: result.name, code: result.code, minutes: result.minutes, username: result.username, url: `${window.location.origin}/login` })
    : "";

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="xs" fullWidth sx={{ zIndex: 1400 }}>
      <DialogTitle sx={{ fontWeight: 800 }}>{t("auth.adminReset.title", { name })}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {!result ? (
          <Typography variant="body2" color="text.secondary">{t("auth.adminReset.hint")}</Typography>
        ) : (
          <>
            <Box sx={{ textAlign: "center", py: 1, borderRadius: 2, bgcolor: "action.hover" }}>
              <Typography aria-label={t("auth.forgot.code")} sx={{ fontSize: "2rem", fontWeight: 900, letterSpacing: 8, fontVariantNumeric: "tabular-nums", color: "text.primary" }}>{result.code}</Typography>
              <Typography variant="caption" color="text.secondary">{t("auth.adminReset.expires", { minutes: result.minutes })}</Typography>
            </Box>
            {!result.whatsapp_digits && <Alert severity="info">{t("auth.adminReset.noNumber")}</Alert>}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button variant="contained" disableElevation color="success" startIcon={<WhatsAppIcon />} onClick={() => openWhatsApp(buildWaLink(result.whatsapp_digits, message))} sx={{ textTransform: "none", fontWeight: 800, flex: 1 }}>
                {t("auth.adminReset.sendWhatsApp")}
              </Button>
              <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={async () => { await navigator.clipboard?.writeText(message).catch(() => {}); setCopied(true); }} sx={{ textTransform: "none", fontWeight: 700 }}>
                {t(copied ? "auth.adminReset.copied" : "auth.adminReset.copy")}
              </Button>
            </Box>
          </>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" disabled={busy} onClick={onClose} sx={{ textTransform: "none" }}>{t(result ? "auth.adminReset.close" : "common.cancel")}</Button>
        {!result && (
          <Button variant="contained" disableElevation disabled={busy} startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined} onClick={create} sx={{ textTransform: "none", fontWeight: 800 }}>
            {t("auth.adminReset.create")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
