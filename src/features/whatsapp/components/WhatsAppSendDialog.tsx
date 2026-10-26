import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PhoneDisabledIcon from "@mui/icons-material/PhoneDisabled";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

import { useToast } from "@/components/ui/AppToast";
import type { Language, TemplateKey } from "../api/whatsapp.api";
import {
  useConfirmWhatsAppSent,
  useLogWhatsAppMessage,
  useSetWhatsAppOptOut,
  useWhatsAppCompose,
} from "../hooks/useWhatsApp";
import {
  CUSTOMER_TEMPLATES,
  INVOICE_TEMPLATES,
  TEMPLATE_I18N,
  WARNING_I18N,
  buildWaLink,
  isBlocked,
  lacksNumber,
  openWhatsApp,
  timeAgo,
} from "../lib/whatsapp";

// WhatsApp's own green. The dark text keeps it readable (white on #25D366 is too faint).
export const WA_GREEN = "#25D366";
export const WA_GREEN_TEXT = "#062b12";

interface WhatsAppSendDialogProps {
  open: boolean;
  onClose: () => void;
  invoiceId?: number;
  customerId?: number;
  /** Which message to start on. Defaults to the first one that fits. */
  templateKey?: TemplateKey;
}

export function WhatsAppSendDialog({ open, onClose, invoiceId, customerId, templateKey }: WhatsAppSendDialogProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const toast = useToast();

  const keys = invoiceId ? INVOICE_TEMPLATES : CUSTOMER_TEMPLATES;
  const [key, setKey] = useState<TemplateKey>(templateKey && keys.includes(templateKey) ? templateKey : keys[0]);
  const [language, setLanguage] = useState<Language | undefined>(undefined); // undefined = let the server pick
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [logId, setLogId] = useState<number | null>(null);
  const [opened, setOpened] = useState(false);
  const [sentConfirmed, setSentConfirmed] = useState(false);
  const [blockedTab, setBlockedTab] = useState(false);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  // reopening the dialog for another invoice/customer starts clean
  useEffect(() => {
    if (!open) return;
    setKey(templateKey && keys.includes(templateKey) ? templateKey : keys[0]);
    setLanguage(undefined);
    setText("");
    setEdited(false);
    setLogId(null);
    setOpened(false);
    setSentConfirmed(false);
    setBlockedTab(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoiceId, customerId, templateKey]);

  const compose = useWhatsAppCompose({ template_key: key, invoice_id: invoiceId, customer_id: customerId, language }, open);
  const data = compose.data;
  const logMutation = useLogWhatsAppMessage();
  const confirmMutation = useConfirmWhatsAppSent();
  const optOutMutation = useSetWhatsAppOptOut();

  // New composed text replaces the box unless staff have started typing their own.
  useEffect(() => {
    if (data && !edited) setText(data.body);
  }, [data, edited]);

  const activeLanguage: Language = language ?? data?.language ?? "en";
  const warnings = data?.warnings ?? [];
  const blocked = isBlocked(warnings);
  const noNumber = lacksNumber(warnings);
  const link = useMemo(() => (data ? buildWaLink(data.to.valid ? data.to.digits : "", text) : ""), [data, text]);

  const pickKey = (next: TemplateKey) => {
    if (next === key) return;
    setKey(next);
    setEdited(false); // a different message type starts from its own wording
    setLogId(null);
    setOpened(false);
    setSentConfirmed(false);
  };
  const pickLanguage = (next: Language | null) => {
    if (!next || next === activeLanguage) return;
    setLanguage(next);
    setEdited(false);
  };

  const handleOpen = () => {
    if (!data || blocked || !text.trim()) return;
    // open first, straight from the click, so the browser does not treat it as a pop-up
    const tabOpened = openWhatsApp(link);
    setBlockedTab(!tabOpened);
    setOpened(true);
    logMutation.mutate(
      {
        customer_id: data.customer.customer_id,
        invoice_id: data.invoice?.invoice_id ?? null,
        template_key: key,
        language: activeLanguage,
        to_phone: data.to.digits,
        body: text,
      },
      { onSuccess: (r) => setLogId(r.log_id) },
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.showSuccess(t("whatsapp.dialog.copied"));
    } catch {
      toast.showError(t("whatsapp.dialog.copyFailed"));
    }
  };

  const handleConfirm = () => {
    if (logId === null) return;
    confirmMutation.mutate(logId, { onSuccess: () => setSentConfirmed(true) });
  };

  const handleAllowAgain = () => {
    if (!data) return;
    optOutMutation.mutate({ customerId: data.customer.customer_id, optOut: false });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen} aria-labelledby="wa-dialog-title">
      <DialogTitle id="wa-dialog-title" sx={{ display: "flex", alignItems: "center", gap: 1.25, pr: 6 }}>
        <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: WA_GREEN, color: WA_GREEN_TEXT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <WhatsAppIcon sx={{ fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>
            {data ? data.customer.name : t("whatsapp.dialog.title")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25, minHeight: 20 }}>
            {data ? (
              <>
                {data.to.valid ? <SmartphoneIcon sx={{ fontSize: 15, color: "success.main" }} /> : <PhoneDisabledIcon sx={{ fontSize: 15, color: "warning.main" }} />}
                <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "text.secondary" }}>
                  {data.to.display || t("whatsapp.dialog.noNumber")}
                </Typography>
                {data.invoice && (
                  <Chip size="small" label={data.invoice.number} sx={{ height: 18, fontSize: "0.65rem", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }} />
                )}
              </>
            ) : (
              <Skeleton width={140} />
            )}
          </Box>
        </Box>
        <IconButton aria-label={t("common.close")} onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {/* message type */}
        {keys.length > 1 && (
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }} role="group" aria-label={t("whatsapp.dialog.messageType")}>
            {keys.map((k) => (
              <Chip
                key={k}
                clickable
                size="small"
                label={t(TEMPLATE_I18N[k])}
                onClick={() => pickKey(k)}
                color={k === key ? "primary" : "default"}
                variant={k === key ? "filled" : "outlined"}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Box>
        )}

        {/* language */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
            {t("whatsapp.dialog.language")}
          </Typography>
          <ToggleButtonGroup exclusive size="small" value={activeLanguage} onChange={(_, v) => pickLanguage(v)} aria-label={t("whatsapp.dialog.language")}>
            <ToggleButton value="en" sx={{ px: 1.5, fontWeight: 800 }}>
              EN
            </ToggleButton>
            <ToggleButton value="si" sx={{ px: 1.5, fontWeight: 800 }}>
              සිං
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* problems */}
        {compose.isError && <Alert severity="error">{t("whatsapp.dialog.couldNotCompose")}</Alert>}
        {warnings.map((w) => (
          <Alert
            key={w}
            severity={w === "opted_out" ? "error" : w === "messaged_recently" || w === "no_balance" || w === "nothing_to_return" ? "info" : "warning"}
            action={
              w === "opted_out" ? (
                <Button color="inherit" size="small" onClick={handleAllowAgain} disabled={optOutMutation.isPending} sx={{ fontWeight: 700 }}>
                  {t("whatsapp.dialog.allowAgain")}
                </Button>
              ) : undefined
            }
            sx={{ py: 0.25, alignItems: "center" }}
          >
            {t(WARNING_I18N[w])}
            {w === "messaged_recently" && data?.last_message ? ` · ${timeAgo(data.last_message.created_at, i18n.language)}` : ""}
          </Alert>
        ))}

        {/* the message */}
        {compose.isLoading ? (
          <Skeleton variant="rounded" height={200} />
        ) : (
          <TextField
            multiline
            minRows={7}
            maxRows={14}
            fullWidth
            value={text}
            disabled={!data}
            onChange={(e) => {
              setText(e.target.value);
              setEdited(true);
            }}
            inputRef={textRef}
            slotProps={{ htmlInput: { "aria-label": t("whatsapp.dialog.message"), style: { fontSize: "0.9rem", lineHeight: 1.5 } } }}
            helperText={
              <Box component="span" sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <span>{edited ? t("whatsapp.dialog.editedHint") : t("whatsapp.dialog.editHint")}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{text.length}</span>
              </Box>
            }
          />
        )}

        {/* after opening */}
        {opened && (
          <Alert
            severity={sentConfirmed ? "success" : "info"}
            icon={sentConfirmed ? <CheckRoundedIcon /> : <WhatsAppIcon />}
            action={
              !sentConfirmed ? (
                <Button color="inherit" size="small" onClick={handleConfirm} disabled={logId === null || confirmMutation.isPending} sx={{ fontWeight: 700 }}>
                  {t("whatsapp.dialog.yesSent")}
                </Button>
              ) : undefined
            }
          >
            {sentConfirmed ? t("whatsapp.dialog.markedSent") : t("whatsapp.dialog.didYouSend")}
            {blockedTab && !sentConfirmed && (
              <Box component="span" sx={{ display: "block" }}>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  {t("whatsapp.dialog.popupBlocked")}
                </a>
              </Box>
            )}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, gap: 1, flexWrap: "wrap" }}>
        <Tooltip title={t("whatsapp.dialog.copy")}>
          <span>
            <IconButton onClick={handleCopy} disabled={!text.trim()} aria-label={t("whatsapp.dialog.copy")}>
              <ContentCopyIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700 }}>
          {t("common.close")}
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={handleOpen}
          disabled={!data || blocked || !text.trim() || compose.isFetching}
          startIcon={compose.isFetching ? <CircularProgress size={16} color="inherit" /> : noNumber ? <OpenInNewIcon /> : <WhatsAppIcon />}
          sx={{
            bgcolor: WA_GREEN,
            color: WA_GREEN_TEXT,
            fontWeight: 800,
            borderRadius: 3,
            textTransform: "none",
            "&:hover": { bgcolor: "#1fbd5b" },
            "&.Mui-disabled": { bgcolor: "action.disabledBackground", color: "action.disabled" },
          }}
        >
          {noNumber ? t("whatsapp.dialog.openPickContact") : t("whatsapp.dialog.openWhatsApp")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
