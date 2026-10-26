import { useEffect, useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import CloseIcon from "@mui/icons-material/Close";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

import type { WorklistItem } from "../api/whatsapp.api";
import { useLogWhatsAppMessage } from "../hooks/useWhatsApp";
import { openWhatsApp } from "../lib/whatsapp";
import { WA_GREEN, WA_GREEN_TEXT } from "./WhatsAppSendDialog";

interface WhatsAppQueueDialogProps {
  open: boolean;
  onClose: () => void;
  /** Rows already filtered down to ones that can actually be messaged. */
  items: WorklistItem[];
}

// "Message everyone on this list": one customer at a time, message already written.
// Each tap opens that customer's WhatsApp chat and moves on, so a whole list of reminders
// is a few taps — and the staff member still presses Send in WhatsApp themselves.
export function WhatsAppQueueDialog({ open, onClose, items }: WhatsAppQueueDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const logMutation = useLogWhatsAppMessage();
  const [index, setIndex] = useState(0);
  const [opened, setOpened] = useState(0);
  const [skipped, setSkipped] = useState(0);

  useEffect(() => {
    if (open) {
      setIndex(0);
      setOpened(0);
      setSkipped(0);
    }
  }, [open]);

  const done = index >= items.length;
  const item = done ? null : items[index];

  const handleOpen = () => {
    if (!item) return;
    openWhatsApp(item.link); // straight from the click, before anything async
    logMutation.mutate({
      customer_id: item.customer.customer_id,
      invoice_id: item.invoice_id,
      template_key: item.template_key,
      language: item.language,
      to_phone: item.customer.phone.digits,
      body: item.body,
    });
    setOpened((n) => n + 1);
    setIndex((i) => i + 1);
  };

  const handleSkip = () => {
    setSkipped((n) => n + 1);
    setIndex((i) => i + 1);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen} aria-labelledby="wa-queue-title">
      <DialogTitle id="wa-queue-title" sx={{ display: "flex", alignItems: "center", gap: 1, pr: 6 }}>
        <WhatsAppIcon sx={{ color: "#1fa855" }} />
        <Typography component="span" sx={{ fontWeight: 800 }}>
          {t("whatsapp.queue.title")}
        </Typography>
        <IconButton aria-label={t("common.close")} onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <LinearProgress variant="determinate" value={items.length ? Math.min(100, (index / items.length) * 100) : 100} sx={{ height: 3 }} />

      <DialogContent dividers sx={{ minHeight: 280 }}>
        {done ? (
          <Box sx={{ minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.25, textAlign: "center" }}>
            <DoneAllIcon sx={{ fontSize: 52, color: "success.main" }} />
            <Typography sx={{ fontWeight: 800, fontSize: "1.05rem" }}>{t("whatsapp.queue.allDone")}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {t("whatsapp.queue.summary", { opened, skipped })}
            </Typography>
          </Box>
        ) : (
          item && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  {t("whatsapp.queue.progress", { current: index + 1, total: items.length })}
                </Typography>
                <Chip size="small" label={item.invoice_number} sx={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem" }}>{item.customer.name}</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                  <SmartphoneIcon sx={{ fontSize: 15 }} />
                  <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                    {item.customer.phone.display}
                  </Typography>
                </Box>
              </Box>
              {/* a chat-bubble preview of exactly what will be pre-filled */}
              <Box
                data-testid="queue-preview"
                sx={{
                  bgcolor: "#dcf8c6",
                  color: "#0f172a",
                  borderRadius: 3,
                  borderTopLeftRadius: 4,
                  p: 1.75,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: "0.9rem",
                  lineHeight: 1.5,
                  maxHeight: 260,
                  overflowY: "auto",
                }}
              >
                {item.body}
              </Box>
            </Box>
          )
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
        {done ? (
          <Button onClick={onClose} variant="contained" disableElevation sx={{ fontWeight: 800, borderRadius: 3 }}>
            {t("whatsapp.queue.finish")}
          </Button>
        ) : (
          <>
            <Button onClick={handleSkip} color="inherit" startIcon={<SkipNextIcon />} sx={{ fontWeight: 700 }}>
              {t("whatsapp.queue.skip")}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              onClick={handleOpen}
              variant="contained"
              disableElevation
              startIcon={<WhatsAppIcon />}
              sx={{ bgcolor: WA_GREEN, color: WA_GREEN_TEXT, fontWeight: 800, borderRadius: 3, textTransform: "none", "&:hover": { bgcolor: "#1fbd5b" } }}
            >
              {t("whatsapp.queue.openNext")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
