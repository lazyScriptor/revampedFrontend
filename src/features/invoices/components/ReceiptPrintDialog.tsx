// features/invoices/components/ReceiptPrintDialog.tsx
import { useState, useEffect } from "react";
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
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TuneIcon from "@mui/icons-material/Tune";
import DrawIcon from "@mui/icons-material/Draw";
import { InvoiceReceipt, InvoiceReceiptProps, ReceiptLanguage } from "./InvoiceReceipt";
import { calculateLineMath } from "./PosLedgerPanel";
import { handlePrintInvoice, checkPrintAgent } from "../hooks/useInvoiceHooks";
import type { PrintAgentHealth } from "../utils/thermalPrint";
import { SignatureCaptureDialog } from "@/features/signatures/components/SignatureCaptureDialog";
import { useInvoiceSignatures } from "@/features/signatures/hooks/useSignatures";
import { useQueryClient } from "@tanstack/react-query";

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

  const [agent, setAgent] = useState<PrintAgentHealth | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Signature capture integration (phone QR → sign → appears on receipt) ──
  const [sigDialogOpen, setSigDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const invoiceIdForSigs = !isDraft && invoice?.invoice_id ? Number(invoice.invoice_id) : null;
  const sigsQuery = useInvoiceSignatures(invoiceIdForSigs);
  const hasCustomerSig = (sigsQuery.data?.signatures || []).some((s) => s.role === "CUSTOMER");
  const hasOperatorSig = (sigsQuery.data?.signatures || []).some((s) => s.role === "OPERATOR");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setAgent(null);
    setPrintStatus(null);
    checkPrintAgent().then((h) => alive && setAgent(h));
    return () => {
      alive = false;
    };
  }, [open]);

  const handlePrint = async () => {
    setPrinting(true);
    setPrintStatus(null);
    try {
      const cust = isDraft ? draftData?.customer : invoice?.Customer || invoice?.customer;
      const custName = cust?.company_name || `${cust?.first_name || ""} ${cust?.last_name || ""}`.trim() || "Walk-in Customer";
      const custPhone = cust?.phone_number || "";
      const docNum = isDraft ? (draftData?.draftId || "DRAFT-QUOTE") : `INV-${invoice?.invoice_id || "POS"}`;
      const docType = isDraft
        ? "DRAFT"
        : (invoice?.status || "").toLowerCase() === "completed" || invoice?.status === "Returned"
        ? "COMPLETED"
        : "DISPATCH";
      const subtotal = isDraft
        ? (draftData?.items || []).reduce((acc: number, it: any) => acc + (calculateLineMath(it).lineCost || Number(it.line_total || it.base_price || 0)), 0)
        : Number(invoice?.sub_total || 0);
      const transportFee = Number(isDraft ? draftData?.fees?.transport || 0 : invoice?.transport_fee || 0);
      const discountAmount = Number(isDraft ? draftData?.fees?.discount || 0 : invoice?.discount_amount || 0);
      const grandTotal = Number(isDraft ? Math.max(0, subtotal + transportFee - discountAmount) : invoice?.total_amount || 0);
      const totalPaid = Number(invoice?.Payments?.reduce((s: number, p: any) => s + Number(p.payment_amount || 0), 0) || (isDraft ? draftData?.fees?.advance || 0 : 0));
      const balanceDue = Math.max(0, grandTotal - totalPaid);
      const lines = isDraft ? (draftData?.items || []) : (invoice?.InvoiceLines || []);
      const totalItems = lines.length;
      const totalMachines = lines.reduce(
        (acc: number, it: any) => acc + Number(it.borrow_quantity || it.quantity || 1),
        0
      );

      const result = await handlePrintInvoice(printDomId, {
        paperWidth,
        title: isDraft
          ? (language === "si" ? "කුලී ඇස්තමේන්තුව" : "Rental Estimate")
          : (language === "si" ? `බිල්පත INV-${invoice?.invoice_id || "POS"}` : `Bill INV-${invoice?.invoice_id || "POS"}`),
        invoiceId: invoice?.invoice_id || null,
        docNumber: docNum,
        docType: docType as any,
        customerName: custName,
        customerPhone: custPhone,
        totalItems,
        totalMachines,
        subtotal,
        transportFee,
        discountAmount,
        grandTotal,
        totalPaid,
        balanceDue,
        language,
        customNotes,
        billSnapshot: {
          ...(isDraft ? draftData : invoice),
          invoice_id: invoice?.invoice_id || null,
          doc_number: docNum,
          status: invoice?.status || (docType === "COMPLETED" ? "Completed" : "Active"),
          issued_date: invoice?.issued_date || new Date().toISOString(),
          Customer: cust,
          customer: cust,
          OnBehalfOfCustomer: isDraft ? draftData?.onBehalfOfCustomer : invoice?.OnBehalfOfCustomer,
          onBehalfOfCustomer: isDraft ? draftData?.onBehalfOfCustomer : invoice?.OnBehalfOfCustomer,
          InvoiceLines: lines,
          items: lines,
          Payments: invoice?.Payments || [],
          sub_total: subtotal,
          transport_fee: transportFee,
          discount_amount: discountAmount,
          total_amount: grandTotal,
          fees: {
            subtotal,
            transportFee,
            discountAmount,
            grandTotal,
            totalPaid,
            balanceDue,
            transport: transportFee,
            discount: discountAmount,
            advance: totalPaid,
          },
          paperWidth,
          density,
          showTerms,
          showBarcode,
          customNotes,
          language,
        },
      });
      if (result?.method === "direct") {
        setPrintStatus({ ok: true, text: `Sent to ${result.printer} · ${result.heightMm}mm` });
      } else if (result?.method === "dialog") {
        setPrintStatus({ ok: false, text: "Printed via browser dialog (agent offline)" });
      }
    } finally {
      setPrinting(false);
    }
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
              <Typography variant="caption" sx={{ color: agent?.ok ? "#166534" : "#92400e", fontWeight: 800 }}>
                {agent === null
                  ? "Checking direct printer connection…"
                  : agent.ok
                    ? `● Direct printing ready · ${agent.defaultPrinter || "default printer"}`
                    : "○ Direct printing offline — browser dialog will be used"}
              </Typography>
              <Typography variant="caption" sx={{ color: agent?.ok ? "#15803d" : "#92400e", fontSize: "0.74rem", lineHeight: 1.35 }}>
                {agent?.ok ? (
                  <>Prints instantly with no dialog. Paper feeds exactly to the end of the bill, then cuts.</>
                ) : (
                  <>
                    Start the GearGrid Print Agent on this computer for exact-length, dialog-free printing.<br />
                    Fallback: choose <b>Margins: None</b> in the print dialog.
                  </>
                )}
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

          {/* Capture signatures via phone before printing (hidden for drafts). */}
          {!isDraft && invoiceIdForSigs && (
            <Button
              variant="outlined"
              startIcon={<DrawIcon />}
              onClick={() => setSigDialogOpen(true)}
              sx={{
                fontWeight: 700,
                borderColor: hasCustomerSig && hasOperatorSig ? "#16a34a" : "#1d4ed8",
                color: hasCustomerSig && hasOperatorSig ? "#16a34a" : "#1d4ed8",
                textTransform: "none",
                ml: 1,
              }}
            >
              {hasCustomerSig && hasOperatorSig
                ? (language === "si" ? "අත්සන් කර ඇත ✓" : "Signatures captured ✓")
                : (language === "si" ? "ජංගම දුරකථනයෙන් අත්සන් කරන්න" : "Capture signatures (phone)")}
            </Button>
          )}

          {printStatus && (
            <Typography
              variant="caption"
              sx={{ flex: 1, mx: 2, fontWeight: 600, color: printStatus.ok ? "#15803d" : "#b45309" }}
            >
              {printStatus.text}
            </Typography>
          )}

          <Button
            variant="contained"
            disableElevation
            startIcon={printing ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />}
            onClick={handlePrint}
            disabled={printing}
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

      {/* Signature capture — only mounts when the operator triggers it. */}
      {invoiceIdForSigs && (
        <SignatureCaptureDialog
          open={sigDialogOpen}
          onClose={() => {
            setSigDialogOpen(false);
            // Refresh signatures so the receipt preview below re-renders with them.
            queryClient.invalidateQueries({ queryKey: ["signatures", "byInvoice", invoiceIdForSigs] });
          }}
          invoiceId={invoiceIdForSigs}
          checkpoint="EQUIPMENT_DISPATCHED"
          required_roles={["CUSTOMER", "OPERATOR"]}
          onCompleted={() => {
            queryClient.invalidateQueries({ queryKey: ["signatures", "byInvoice", invoiceIdForSigs] });
          }}
        />
      )}
    </>
  );
}
