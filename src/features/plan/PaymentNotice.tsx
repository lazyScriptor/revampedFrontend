import { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/stores/useAuthStore";
import { isLockedNow, lastSeenNotice, markNoticeSeen, noticeMessage, popupDue, timeLeftText } from "./paymentNoticeText";

/** The shop's reminder to pay: a banner, a pop-up that keeps coming back, and a lock at the end of the timer. */
export function PaymentNotice() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const notice = useAuthStore((s) => s.user?.paymentNotice);
  const logout = useAuthStore((s) => s.logout);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [waitLeft, setWaitLeft] = useState(0);

  useEffect(() => {
    if (!notice) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [notice]);

  const locked = !!notice && isLockedNow(notice, now);

  useEffect(() => {
    if (notice && !locked && !open && popupDue(notice.repeat_minutes, lastSeenNotice(), now)) {
      setWaitLeft(notice.wait_seconds);
      setOpen(true);
    }
  }, [notice, locked, open, now]);

  useEffect(() => {
    if (!open || waitLeft <= 0) return;
    const id = setTimeout(() => setWaitLeft((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [open, waitLeft]);

  // Paid while open: the notice goes away with the next check, and the pop-up with it.
  useEffect(() => {
    if (!notice) setOpen(false);
  }, [notice]);

  if (!notice) return null;
  const message = noticeMessage(notice, i18n.language);
  const countdown = notice.lock_at ? t("plan.notice.locksIn", { time: timeLeftText(notice.lock_at, now) }) : null;

  if (locked) {
    return (
      <Box role="alertdialog" aria-label={t("plan.notice.lockedTitle")} sx={{ position: "fixed", inset: 0, zIndex: 2000, bgcolor: "#0f172a", color: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Box sx={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
          <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "rgba(239,68,68,0.18)", display: "inline-flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
            <LockOutlinedIcon sx={{ color: "#f87171" }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#f8fafc" }}>
            {t("plan.notice.lockedTitle")}
          </Typography>
          <Typography sx={{ mt: 1.5, whiteSpace: "pre-line", color: "#cbd5e1" }}>{message}</Typography>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 3, flexWrap: "wrap" }}>
            <Button variant="contained" disableElevation onClick={() => qc.invalidateQueries({ queryKey: ["my-plan"] })} sx={{ textTransform: "none", fontWeight: 800 }}>
              {t("plan.notice.checkAgain")}
            </Button>
            <Button onClick={logout} sx={{ textTransform: "none", fontWeight: 700, color: "#cbd5e1" }}>
              {t("plan.notice.logOut")}
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Box role="status" sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1, flexWrap: { xs: "wrap", sm: "nowrap" }, px: 1.5, py: 0.75, mb: 1.5, borderRadius: 2, bgcolor: "#fef3c7", color: "#78350f", border: "1px solid #f59e0b" }}>
        <WarningAmberOutlinedIcon sx={{ fontSize: 20, color: "#b45309" }} />
        <Typography sx={{ flex: 1, minWidth: 180, fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={message}>
          {message}
        </Typography>
        {countdown && <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{countdown}</Typography>}
        <Button
          size="small"
          onClick={() => {
            setWaitLeft(0);
            setOpen(true);
          }}
          sx={{ textTransform: "none", fontWeight: 800, color: "#78350f", flexShrink: 0 }}
        >
          {t("plan.notice.details")}
        </Button>
      </Box>

      <Dialog open={open} maxWidth="xs" fullWidth aria-labelledby="payment-notice-title">
        <DialogTitle id="payment-notice-title" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberOutlinedIcon sx={{ color: "warning.main" }} />
          {t("plan.notice.title")}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: "pre-line" }}>{message}</Typography>
          {countdown && (
            <Typography sx={{ mt: 2, fontWeight: 800, color: "error.main", fontVariantNumeric: "tabular-nums" }}>{countdown}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            disableElevation
            disabled={waitLeft > 0}
            onClick={() => {
              markNoticeSeen();
              setOpen(false);
            }}
            sx={{ textTransform: "none", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
          >
            {waitLeft > 0 ? t("plan.notice.okWait", { seconds: waitLeft }) : t("plan.notice.ok")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
