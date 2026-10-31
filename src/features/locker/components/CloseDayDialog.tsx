import { useEffect, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, TextField, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useTranslation } from "react-i18next";

import { NumberInput } from "@/components/ui/NumberInput";
import { useToast } from "@/components/ui/AppToast";
import { useRecordClosing } from "../hooks/useLocker";
import type { LockerStatus } from "../api/locker.api";
import { isZero, money } from "../lib/locker";

const num = { fontVariantNumeric: "tabular-nums", fontFamily: "'JetBrains Mono', monospace" } as const;

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: strong ? 800 : 600 }}>
        {label}
      </Typography>
      <Typography sx={{ ...num, fontWeight: strong ? 900 : 700, color: tone, fontSize: strong ? "1.1rem" : undefined }}>{value}</Typography>
    </Box>
  );
}

/** Evening: count the drawer once; the system says what stays and what goes home. */
export function CloseDayDialog({ open, status, onClose }: { open: boolean; status: LockerStatus; onClose: () => void }) {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const closing = useRecordClosing();
  const [counted, setCounted] = useState<number | "">("");
  const [sentHome, setSentHome] = useState<number | "" | null>(null); // null = use the suggestion
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setCounted("");
    setSentHome(null);
    setReason("");
    closing.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const expected = status.expected_now ?? 0;
  const keep = status.keep;
  const diff = counted === "" ? 0 : counted - expected;
  const mismatch = counted !== "" && !isZero(diff);
  const suggested = counted === "" ? 0 : Math.max(0, counted - keep);
  const send = sentHome === null ? suggested : sentHome === "" ? 0 : sentHome;
  const shortOfKeep = counted !== "" && counted < keep;
  const canSave = counted !== "" && (!mismatch || reason.trim().length > 0) && send <= counted && !closing.isPending;

  const save = () => {
    if (counted === "") return;
    closing.mutate(
      { counted, sent_home: send, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          showSuccess(t("locker.close.saved", { amount: money(send) }));
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800 }}>
        <LockOutlinedIcon color="primary" />
        {t("locker.close.title")}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "8px !important" }}>
        <Row label={t("locker.drawerShouldHave")} value={`Rs. ${money(expected)}`} />
        <NumberInput
          autoFocus
          value={counted}
          onChange={setCounted}
          decimals
          label={t("locker.close.countedLabel")}
          slotProps={{ htmlInput: { "aria-label": t("locker.close.countedLabel"), inputMode: "decimal", style: { ...num, fontWeight: 800, fontSize: "1.3rem" } } }}
        />

        {counted !== "" &&
          (mismatch ? (
            <Alert severity="warning" sx={num}>
              <Typography sx={{ fontWeight: 800, ...num }}>{t(diff < 0 ? "locker.diff.short" : "locker.diff.over", { amount: money(Math.abs(diff)) })}</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {t("locker.close.checkFirst")}
              </Typography>
            </Alert>
          ) : (
            <Alert severity="success">{t("locker.close.matches")}</Alert>
          ))}
        {mismatch && (
          <TextField
            size="small"
            required
            label={t("locker.close.reasonLabel")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={2}
          />
        )}

        <Divider />
        <Row label={t("locker.keepInDrawer")} value={`Rs. ${money(keep)}`} />
        <Typography variant="caption" color="text.secondary" sx={{ mt: -1, ...num }}>
          {t("locker.keepBreakdown", { float: money(status.float), advances: money(status.held_total), count: status.held.length })}
        </Typography>
        {shortOfKeep ? (
          <Alert severity="info" sx={num}>
            {t("locker.close.topUp", { amount: money(keep - (counted as number)) })}
          </Alert>
        ) : (
          <NumberInput
            value={sentHome === null ? Number(suggested.toFixed(2)) : sentHome}
            onChange={setSentHome}
            decimals
            label={t("locker.close.sendHomeLabel")}
            disabled={counted === ""}
            helperText={sentHome !== null && !isZero((sentHome || 0) - suggested) ? t("locker.close.suggested", { amount: money(suggested) }) : undefined}
            slotProps={{ htmlInput: { "aria-label": t("locker.close.sendHomeLabel"), inputMode: "decimal", style: { ...num, fontWeight: 800 } } }}
          />
        )}
        {counted !== "" && <Row strong label={t("locker.close.leftInDrawer")} value={`Rs. ${money((counted as number) - send)}`} />}
        {closing.isError && <Alert severity="error">{(closing.error as any)?.message || t("locker.errors.saveFailed")}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" disableElevation onClick={save} disabled={!canSave} sx={{ fontWeight: 800 }}>
          {t("locker.close.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
