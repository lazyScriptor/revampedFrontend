import { useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography } from "@mui/material";
import PinOutlinedIcon from "@mui/icons-material/PinOutlined";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { setApprovalPin } from "../api/retail.api";
import { errorMessage } from "../api/http";
import { useCanUseDesk } from "../desk/useDesk";

/** Profile > Security: a manager sets or changes their approval PIN (needs the current password). */
export function ApprovalPinSection() {
  const { t } = useTranslation();
  const allowed = useCanUseDesk();
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => setApprovalPin({ current_password: password, pin }),
    onSuccess: () => {
      setSaved(true);
      setPassword("");
      setPin("");
      setConfirm("");
    },
    onError: (err) => setError(errorMessage(err, t("approvalPin.failed"))),
  });

  if (!allowed) return null;

  const submit = () => {
    setError(null);
    setSaved(false);
    if (!/^\d{4,6}$/.test(pin)) return setError(t("approvalPin.digitsOnly"));
    if (pin !== confirm) return setError(t("approvalPin.mismatch"));
    save.mutate();
  };

  return (
    <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: "divider", borderRadius: 2.5, bgcolor: "background.paper", color: "text.primary" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <PinOutlinedIcon color="primary" />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t("approvalPin.title")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("approvalPin.hint")}
          </Typography>
        </Box>
      </Box>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 420 }}
      >
        <TextField size="small" type="password" label={t("profile.currentPassword")} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <TextField
          size="small"
          type="password"
          label={t("approvalPin.newPin")}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          autoComplete="off"
          slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 } }}
        />
        <TextField
          size="small"
          type="password"
          label={t("approvalPin.confirmPin")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
          autoComplete="off"
          slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 } }}
        />
        {error && <Alert severity="error">{error}</Alert>}
        {saved && <Alert severity="success">{t("approvalPin.saved")}</Alert>}
        <Button
          type="submit"
          variant="contained"
          disableElevation
          disabled={save.isPending || !password || pin.length < 4 || confirm.length < 4}
          startIcon={save.isPending ? <CircularProgress size={14} color="inherit" /> : <PinOutlinedIcon />}
          sx={{ alignSelf: "flex-end", fontWeight: 800, textTransform: "none" }}
        >
          {t("approvalPin.save")}
        </Button>
      </Box>
    </Paper>
  );
}
