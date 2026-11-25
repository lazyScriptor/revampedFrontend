import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useTranslation } from "react-i18next";
import { formatDisplayDate } from "@/lib/dates";
import type { SettlementCommitResponse } from "../types";

interface SettlementReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  settlement: SettlementCommitResponse | null;
  customerPhone?: string | null;
}

const fmtLkr = (n: number) =>
  `Rs ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function buildSettlementWhatsAppText(
  settlement: SettlementCommitResponse,
  lang: "en" | "si" = "en",
): string {
  const lines: string[] = [];
  lines.push(
    lang === "si"
      ? `*GearGrid ගෙවීම් සහ ආපසු භාරදීම් රිසිට්පත #S-${settlement.settlement_id}*`
      : `*GearGrid Settlement Receipt #S-${settlement.settlement_id}*`,
  );
  lines.push(`${settlement.customer_name} · ${formatDisplayDate(settlement.settled_at)}`);
  lines.push("");
  lines.push(
    lang === "si"
      ? `හිඟ මුදල: ~${fmtLkr(settlement.totals.owed_before)}~ → *${fmtLkr(settlement.totals.owed_after)}*`
      : `Owed: ~${fmtLkr(settlement.totals.owed_before)}~ → *${fmtLkr(settlement.totals.owed_after)}*`,
  );
  lines.push(
    lang === "si"
      ? `පිටත ඇති යන්ත්‍ර: ~${settlement.totals.machines_out_before}~ → *${settlement.totals.machines_out_after}*`
      : `Machines out: ~${settlement.totals.machines_out_before}~ → *${settlement.totals.machines_out_after}*`,
  );
  lines.push("");

  for (const bill of settlement.bills.filter((b) => b.changed)) {
    lines.push(`• *INV-${bill.invoice_id}*: ~${fmtLkr(bill.before.balance)}~ → *${fmtLkr(bill.after.balance)}*`);
    for (const ch of bill.changes || []) {
      const lbl = lang === "si" && ch.label_si ? ch.label_si : ch.label_en;
      if (lbl) lines.push(`   - ${lbl}`);
    }
    for (const ml of bill.lines || []) {
      if (ml.returned_qty > 0) {
        const mName = lang === "si" && ml.equipment_name_si ? ml.equipment_name_si : ml.equipment_name;
        lines.push(`   - ${mName}: ~${ml.out_before}~ → *${ml.out_after} out* (${ml.returned_qty} back)`);
      }
    }
  }

  const summary = lang === "si" ? settlement.summary?.si : settlement.summary?.en;
  if (summary) {
    lines.push("");
    lines.push(summary);
  }
  return lines.join("\n");
}

export function SettlementReceiptDialog({
  open,
  onClose,
  settlement,
  customerPhone,
}: SettlementReceiptDialogProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [format, setFormat] = useState<"thermal" | "a4">("thermal");
  const [lang, setLang] = useState<"en" | "si">(
    i18n.language?.startsWith("si") ? "si" : "en",
  );
  const [copied, setCopied] = useState(false);

  const changedBills = useMemo(
    () => (settlement?.bills ?? []).filter((b) => b.changed),
    [settlement],
  );

  const whatsappText = useMemo(
    () => (settlement ? buildSettlementWhatsAppText(settlement, lang) : ""),
    [settlement, lang],
  );

  if (!settlement) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleOpenWhatsApp = () => {
    const digits = String(customerPhone || "").replace(/\D/g, "");
    const normalized = digits.startsWith("0") ? `94${digits.slice(1)}` : digits;
    const url = normalized
      ? `https://wa.me/${normalized}?text=${encodeURIComponent(whatsappText)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={format === "a4" ? "md" : "sm"}
      fullWidth
      fullScreen={isMobile}
      slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : 3 } } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography component="span" variant="subtitle1" sx={{ fontWeight: 900 }}>
          {t("settlement.receipt.title", {
            id: settlement.settlement_id,
            defaultValue: `Settlement Receipt #S-${settlement.settlement_id}`,
          })}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label={t("common.close", "Close")}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Format & Language controls */}
        <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={format}
            onChange={(_, v) => v && setFormat(v)}
          >
            <ToggleButton value="thermal">{t("settlement.receipt.thermal", "Thermal (80mm)")}</ToggleButton>
            <ToggleButton value="a4">{t("settlement.receipt.a4", "A4")}</ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={lang}
            onChange={(_, v) => v && setLang(v)}
          >
            <ToggleButton value="en">English</ToggleButton>
            <ToggleButton value="si">සිංහල</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Printable Before -> After Receipt */}
        <Paper
          id="printable-settlement-receipt"
          data-testid="settlement-receipt-preview"
          variant="outlined"
          sx={{
            p: format === "thermal" ? 2 : 3,
            mx: "auto",
            width: format === "thermal" ? 320 : "100%",
            bgcolor: "#ffffff",
            color: "#0f172a",
            fontFamily: format === "thermal" ? "'JetBrains Mono', monospace" : "inherit",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 900, textAlign: "center" }}>
            {t("settlement.receipt.header", { lng: lang, defaultValue: "CUSTOMER SETTLEMENT" })} #S-{settlement.settlement_id}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", textAlign: "center", color: "#475569", fontVariantNumeric: "tabular-nums" }}>
            {settlement.customer_name} · {formatDisplayDate(settlement.settled_at)}
          </Typography>

          <Divider sx={{ my: 1.25 }} />

          {/* Totals strip before -> after */}
          <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1, fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
            <Box>
              <span>{lang === "si" ? "හිඟ මුදල:" : "Owed:"} </span>
              <span style={{ textDecoration: "line-through", color: "#64748b" }}>
                {fmtLkr(settlement.totals.owed_before)}
              </span>{" "}
              <strong>→ {fmtLkr(settlement.totals.owed_after)}</strong>
            </Box>
            <Box>
              <span>{lang === "si" ? "යන්ත්‍ර:" : "Machines:"} </span>
              <span style={{ textDecoration: "line-through", color: "#64748b" }}>
                {settlement.totals.machines_out_before}
              </span>{" "}
              <strong>→ {settlement.totals.machines_out_after}</strong>
            </Box>
          </Box>

          <Divider sx={{ my: 1.25 }} />

          {/* Changed bills in same before -> after layout */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {changedBills.map((bill) => (
              <Box key={bill.invoice_id} sx={{ pb: 1, borderBottom: "1px dashed #cbd5e1" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", fontVariantNumeric: "tabular-nums" }}>
                  <strong style={{ fontSize: "0.82rem" }}>INV-{bill.invoice_id}</strong>
                  <span style={{ fontSize: "0.82rem" }}>
                    <span style={{ textDecoration: "line-through", color: "#64748b" }}>
                      {fmtLkr(bill.before.balance)}
                    </span>{" "}
                    → <strong>{fmtLkr(bill.after.balance)}</strong>
                  </span>
                </Box>
                {(bill.changes || []).map((ch, idx) => (
                  <Typography key={idx} variant="caption" sx={{ display: "block", color: "#334155" }}>
                    • {lang === "si" && ch.label_si ? ch.label_si : ch.label_en}
                  </Typography>
                ))}
                {(bill.lines || [])
                  .filter((l) => l.returned_qty > 0)
                  .map((l) => (
                    <Typography key={l.invoice_line_id} variant="caption" sx={{ display: "block", color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                      {lang === "si" && l.equipment_name_si ? l.equipment_name_si : l.equipment_name}:{" "}
                      <span style={{ textDecoration: "line-through" }}>{l.out_before} out</span> →{" "}
                      <strong>{l.out_after} out</strong>
                    </Typography>
                  ))}
              </Box>
            ))}
          </Box>

          <Typography variant="caption" sx={{ display: "block", mt: 1.25, color: "#334155" }}>
            {lang === "si" ? settlement.summary?.si : settlement.summary?.en}
          </Typography>
        </Paper>

        {/* WhatsApp preview */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
            {t("settlement.receipt.whatsappPreview", "WhatsApp message (same before → after layout)")}
          </Typography>
          <Paper
            variant="outlined"
            sx={{ p: 1.25, borderRadius: 2, fontSize: "0.78rem", whiteSpace: "pre-wrap", fontFamily: "monospace" }}
          >
            {whatsappText}
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, flexWrap: "wrap", gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ContentCopyIcon fontSize="small" />}
          onClick={handleCopyWhatsApp}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {copied ? t("common.copied", "Copied") : t("settlement.receipt.copyWhatsApp", "Copy WhatsApp")}
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="success"
          startIcon={<WhatsAppIcon fontSize="small" />}
          onClick={handleOpenWhatsApp}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {t("settlement.receipt.sendWhatsApp", "Send WhatsApp")}
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<PrintIcon fontSize="small" />}
          onClick={handlePrint}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          {t("settlement.receipt.print", "Print")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
