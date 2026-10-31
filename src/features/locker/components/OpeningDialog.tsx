import { useEffect, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, TextField, Typography } from "@mui/material";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import { useTranslation } from "react-i18next";

import { NumberInput } from "@/components/ui/NumberInput";
import { formatDateTime } from "@/lib/dates";
import { useAuthStore } from "@/stores/useAuthStore";
import { buildWaLink, openWhatsApp } from "@/features/whatsapp/lib/whatsapp";
import { useRecordOpening } from "../hooks/useLocker";
import type { LockerCount, LockerStatus } from "../api/locker.api";
import { isZero, money, toNum } from "../lib/locker";

const num = { fontVariantNumeric: "tabular-nums", fontFamily: "'JetBrains Mono', monospace" } as const;

interface Props {
  open: boolean;
  status: LockerStatus;
  onClose: () => void;
  /** Shown by the hourly reminder: closes and asks again in an hour. */
  onLater?: () => void;
}

/** Morning count: how much cash is in the locker. Then one tap tells the owner on WhatsApp. */
export function OpeningDialog({ open, status, onClose, onLater }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const opening = useRecordOpening();
  const [amount, setAmount] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<{ count: LockerCount; owner_whatsapp: string | null } | null>(null);
  const [blockedLink, setBlockedLink] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setNote("");
    setSaved(null);
    setBlockedLink(null);
    opening.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const expected = status.expected_now;
  const diff = amount === "" || expected === null ? 0 : amount - expected;
  const dayWords = { today: t("time.today"), yesterday: t("time.yesterday") };

  const save = () => {
    if (amount === "") return;
    opening.mutate({ amount, reason: note.trim() || undefined }, { onSuccess: (res) => setSaved(res) });
  };

  const whatsappText = (count: LockerCount) => {
    const d = toNum(count.difference);
    const name = [user?.first_name, (user as any)?.last_name].filter(Boolean).join(" ") || user?.username || "";
    return [
      t("locker.whatsapp.opened", { amount: money(count.counted_amount), time: formatDateTime(count.counted_at, dayWords) }),
      count.expected_amount === null
        ? ""
        : isZero(d)
          ? t("locker.whatsapp.matches", { expected: money(count.expected_amount) })
          : t(d < 0 ? "locker.whatsapp.short" : "locker.whatsapp.over", { expected: money(count.expected_amount), diff: money(Math.abs(d)) }),
      count.reason ? t("locker.whatsapp.note", { note: count.reason }) : "",
      name ? `— ${name}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const sendToOwner = () => {
    if (!saved) return;
    const link = buildWaLink(saved.owner_whatsapp || "", whatsappText(saved.count));
    if (!openWhatsApp(link)) setBlockedLink(link);
  };

  return (
    <Dialog open={open} onClose={saved ? onClose : undefined} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800 }}>
        <LockOpenOutlinedIcon color="primary" />
        {t("locker.opening.title")}
      </DialogTitle>

      {!saved ? (
        <>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
            <Typography variant="body2" color="text.secondary">
              {t("locker.opening.prompt")}
            </Typography>
            {expected !== null && (
              <Typography variant="body2" sx={num}>
                {t("locker.opening.lastNight", { amount: money(expected) })}
              </Typography>
            )}
            <NumberInput
              autoFocus
              value={amount}
              onChange={setAmount}
              decimals
              label={t("locker.opening.amountLabel")}
              slotProps={{ htmlInput: { "aria-label": t("locker.opening.amountLabel"), inputMode: "decimal", style: { ...num, fontWeight: 800, fontSize: "1.3rem" } } }}
            />
            {amount !== "" && expected !== null && !isZero(diff) && (
              <>
                <Alert severity="warning" sx={num}>
                  {t(diff < 0 ? "locker.diff.short" : "locker.diff.over", { amount: money(Math.abs(diff)) })}
                </Alert>
                <TextField size="small" label={t("locker.opening.noteLabel")} value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
              </>
            )}
            {opening.isError && <Alert severity="error">{(opening.error as any)?.message || t("locker.errors.saveFailed")}</Alert>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            {onLater ? (
              <Button color="inherit" onClick={onLater}>
                {t("locker.opening.later")}
              </Button>
            ) : (
              <Button color="inherit" onClick={onClose}>
                {t("common.cancel")}
              </Button>
            )}
            <Button variant="contained" disableElevation onClick={save} disabled={amount === "" || opening.isPending} sx={{ fontWeight: 800 }}>
              {t("common.save")}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "8px !important" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CheckCircleOutlinedIcon color="success" />
              <Typography sx={{ fontWeight: 800, ...num }}>{t("locker.opening.saved", { amount: money(saved.count.counted_amount) })}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {t("locker.opening.ownerNotified")}
            </Typography>
            {blockedLink && (
              <Alert severity="info">
                <Link href={blockedLink} target="_blank" rel="noopener noreferrer">
                  {t("locker.opening.openWhatsAppLink")}
                </Link>
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={onClose}>
              {t("common.close")}
            </Button>
            <Button variant="contained" disableElevation startIcon={<WhatsAppIcon />} onClick={sendToOwner} sx={{ fontWeight: 800, bgcolor: "#25D366", color: "#062b12", "&:hover": { bgcolor: "#1fb457" } }}>
              {t("locker.opening.sendToOwner")}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
