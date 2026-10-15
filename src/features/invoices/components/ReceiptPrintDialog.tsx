// features/invoices/components/ReceiptPrintDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
  TextField,
  Divider,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TuneIcon from "@mui/icons-material/Tune";
import { InvoiceReceipt, InvoiceReceiptProps, ReceiptLanguage } from "./InvoiceReceipt";
import { handlePrintInvoice } from "../hooks/useInvoiceHooks";

export interface ReceiptPrintDialogProps {
  open: boolean;
  onClose: () => void;
  invoice?: any;
  isDraft?: boolean;
  draftData?: InvoiceReceiptProps["draftData"];
  title?: string;
  defaultCustomNotes?: string;
}

export function ReceiptPrintDialog({
  open,
  onClose,
  invoice,
  isDraft = false,
  draftData,
  title,
  defaultCustomNotes = "",
}: ReceiptPrintDialogProps) {
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">("80mm");
  const [density, setDensity] = useState<"standard" | "compact">("standard");
  const [language, setLanguage] = useState<ReceiptLanguage>(() => {
    try {
      return (localStorage.getItem("pos_receipt_language") as ReceiptLanguage) || "en";
    } catch {
      return "en";
    }
  });
  const [showTerms, setShowTerms] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [customNotes, setCustomNotes] = useState(defaultCustomNotes);

  const printDomId = `printable-receipt-${isDraft ? "draft" : invoice?.invoice_id || "active"}`;

  const handlePrint = () => {
    handlePrintInvoice(printDomId, {
      paperWidth,
      title: isDraft
        ? (language === "si" ? "කුලී ඇස්තමේන්තුව" : "Rental Estimate")
        : (language === "si" ? `බිල්පත INV-${invoice?.invoice_id || "POS"}` : `Bill INV-${invoice?.invoice_id || "POS"}`),
    });
  };

  const dialogTitle =
    title ||
    (isDraft
      ? (language === "si" ? "කුලී ඇස්තමේන්තුව / මිල ගණන් පත්‍රිකාව" : "Rental Estimate / Quotation Slip")
      : (language === "si" ? `POS බිල්පත · INV-${invoice?.invoice_id || ""}` : `POS Bill · INV-${invoice?.invoice_id || ""}`));

  return (
    <>
      {/* ── 1. Hidden DOM Element rendered with exact user configurations for printing ── */}
      <InvoiceReceipt
        id={printDomId}
        invoice={invoice}
        isDraft={isDraft}
        draftData={draftData}
        paperWidth={paperWidth}
        density={density}
        language={language}
        showTerms={showTerms}
        showBarcode={showBarcode}
        customNotes={customNotes}
        isPreview={false}
      />

      {/* ── 2. Interactive Dialog with Preview & Customizer ───────────────────────────── */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              bgcolor: "#f8fafc",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 3,
            py: 2,
            bgcolor: "white",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: isDraft ? "#fffbeb" : "#eff6ff",
                color: isDraft ? "#b45309" : "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ReceiptLongIcon />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                {dialogTitle}
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b" }}>
                Thermal Printer Layout Preview & Adjustments
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "#64748b" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        {/* Content: Split into Left Customizer & Right Thermal Preview */}
        <DialogContent
          sx={{
            p: 3,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          {/* Customizer Panel */}
          <Box
            sx={{
              flex: { xs: "1 1 auto", md: "0 0 280px" },
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
              p: 2.5,
              bgcolor: "white",
              borderRadius: 2.5,
              border: "1px solid #e2e8f0",
              height: "fit-content",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TuneIcon sx={{ fontSize: 18, color: "#2563eb" }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                Print Settings
              </Typography>
            </Box>

            {/* Receipt Language / භාෂාව Toggle */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", display: "block", mb: 1 }}>
                RECEIPT LANGUAGE / භාෂාව
              </Typography>
              <ToggleButtonGroup
                value={language}
                exclusive
                onChange={(_, val) => {
                  if (val) {
                    setLanguage(val);
                    try {
                      localStorage.setItem("pos_receipt_language", val);
                    } catch {}
                  }
                }}
                fullWidth
                size="small"
              >
                <ToggleButton
                  value="en"
                  sx={{
                    fontWeight: 700,
                    textTransform: "none",
                    py: 0.75,
                    ...(language === "en" && {
                      bgcolor: "#2563eb !important",
                      color: "white !important",
                    }),
                  }}
                >
                  English
                </ToggleButton>
                <ToggleButton
                  value="si"
                  sx={{
                    fontWeight: 700,
                    textTransform: "none",
                    py: 0.75,
                    fontFamily: "'Noto Sans Sinhala', 'Iskoola Pota', sans-serif",
                    ...(language === "si" && {
                      bgcolor: "#16a34a !important",
                      color: "white !important",
                    }),
                  }}
                >
                  සිංහල (Sinhala)
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Roll Size */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", display: "block", mb: 1 }}>
                THERMAL ROLL WIDTH
              </Typography>
              <ToggleButtonGroup
                value={paperWidth}
                exclusive
                onChange={(_, val) => val && setPaperWidth(val)}
                fullWidth
                size="small"
              >
                <ToggleButton value="80mm" sx={{ fontWeight: 700, textTransform: "none", py: 0.75 }}>
                  80mm Standard
                </ToggleButton>
                <ToggleButton value="58mm" sx={{ fontWeight: 700, textTransform: "none", py: 0.75 }}>
                  58mm Compact
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Layout Density */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", display: "block", mb: 1 }}>
                LAYOUT DENSITY
              </Typography>
              <ToggleButtonGroup
                value={density}
                exclusive
                onChange={(_, val) => val && setDensity(val)}
                fullWidth
                size="small"
              >
                <ToggleButton value="standard" sx={{ fontWeight: 700, textTransform: "none", py: 0.75 }}>
                  Normal (11px)
                </ToggleButton>
                <ToggleButton value="compact" sx={{ fontWeight: 700, textTransform: "none", py: 0.75 }}>
                  Tight (Save Paper)
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider sx={{ borderColor: "#f1f5f9" }} />

            {/* Feature Toggles */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showTerms}
                    onChange={(e) => setShowTerms(e.target.checked)}
                    size="small"
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }}>
                    {language === "si" ? "කුලී කොන්දේසි (Terms & Liability)" : "Rental Terms & Liability"}
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showBarcode}
                    onChange={(e) => setShowBarcode(e.target.checked)}
                    size="small"
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }}>
                    {language === "si" ? "තීරු කේතය (Barcode Code 39)" : "Barcode Code 39"}
                  </Typography>
                }
              />
            </Box>

            <Divider sx={{ borderColor: "#f1f5f9" }} />

            {/* Custom Delivery/Site Note */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", display: "block", mb: 0.75 }}>
                {language === "si" ? "විශේෂ වැඩබිම් සටහන් (විකල්ප)" : "SITE / DELIVERY NOTE (OPTIONAL)"}
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder={language === "si" ? "උදා: වරාය නගරය ගේට්ටුව 3, භාරකරු: කමල්" : "e.g. Site: Port City Gate 3, Attn: Kamal"}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                multiline
                rows={2}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: "0.82rem",
                    bgcolor: "#f8fafc",
                  },
                }}
              />
            </Box>

            {/* Thermal Printer Hardware Tip */}
            <Box
              sx={{
                p: 1.5,
                bgcolor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 2,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              <Typography variant="caption" sx={{ color: "#166534", fontWeight: 800 }}>
                Xprinter XP-80T / Edge-to-Edge Ready
              </Typography>
              <Typography variant="caption" sx={{ color: "#15803d", fontSize: "0.74rem", lineHeight: 1.35 }}>
                • <b>Paper Size:</b> Select <b>72 x 3,274 mm</b> (continuous roll) so it cuts directly after the text without blank paper.<br />
                • <b>Margins:</b> Set to <b>None</b> for full width.<br />
                • <b>Darkness:</b> High-contrast bold thermal density active.
              </Typography>
            </Box>
          </Box>

          {/* Thermal Paper Preview Area */}
          <Box
            sx={{
              flex: "1 1 auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              bgcolor: "#334155",
              borderRadius: 2.5,
              p: 3,
              overflowY: "auto",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.3)",
              minHeight: 400,
            }}
          >
            <Typography variant="caption" sx={{ color: "#94a3b8", mb: 2, fontWeight: 700, letterSpacing: 1 }}>
              PRINT PREVIEW · {paperWidth.toUpperCase()} THERMAL PAPER ROLL ({language === "si" ? "සිංහල" : "ENGLISH"})
            </Typography>

            {/* Simulated thermal receipt paper sheet */}
            <Box
              sx={{
                bgcolor: "white",
                color: "black",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)",
                borderRadius: "2px",
                overflow: "hidden",
                border: "1px solid #cbd5e1",
              }}
            >
              <InvoiceReceipt
                id={`${printDomId}-preview`}
                invoice={invoice}
                isDraft={isDraft}
                draftData={draftData}
                paperWidth={paperWidth}
                density={density}
                language={language}
                showTerms={showTerms}
                showBarcode={showBarcode}
                customNotes={customNotes}
                isPreview={true}
              />
            </Box>
          </Box>
        </DialogContent>

        {/* Footer Actions */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            bgcolor: "white",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
            {language === "si" ? "අවලංගු කරන්න" : "Cancel"}
          </Button>

          <Button
            variant="contained"
            disableElevation
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{
              fontWeight: 800,
              bgcolor: isDraft ? "#d97706" : "#16a34a",
              "&:hover": { bgcolor: isDraft ? "#b45309" : "#15803d" },
              px: 3,
              py: 1,
              borderRadius: 2,
            }}
          >
            {language === "si"
              ? `බිල්පත මුද්‍රණය කරන්න (${paperWidth})`
              : `Print POS Bill (${paperWidth})`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
