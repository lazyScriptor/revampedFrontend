import { useState } from "react";
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import { useTranslation } from "react-i18next";
import { InvoiceReceipt, type ReceiptLanguage } from "@/features/invoices/components/InvoiceReceipt";
import { handlePrintInvoice } from "@/features/invoices/hooks/useInvoiceHooks";
import type { SaleReturnRow } from "./receiptModel";

interface Props {
  open: boolean;
  onClose: () => void;
  invoice: any;
  ret: SaleReturnRow;
}

/** Preview and print the slip of one return of sold items (80 mm, 58 mm or a simple A4 sheet). */
export function ReturnSlipDialog({ open, onClose, invoice, ret }: Props) {
  const { t } = useTranslation();
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm" | "a4">("80mm");
  const [language, setLanguage] = useState<ReceiptLanguage>(() => {
    try {
      return (localStorage.getItem("pos_receipt_language") as ReceiptLanguage) || "en";
    } catch {
      return "en";
    }
  });
  const [printing, setPrinting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const invoiceId = Number(invoice?.invoice_id) || null;
  const docNumber = invoice?.doc_number || (invoiceId ? `INV-${invoiceId}` : "POS");
  const domId = `printable-return-slip-${ret.return_id}`;
  const cust = invoice?.Customer || invoice?.customer;
  const custName = cust?.company_name || `${cust?.first_name || ""} ${cust?.last_name || ""}`.trim() || undefined;

  const doPrint = async () => {
    setPrinting(true);
    setStatus(null);
    try {
      const result = await handlePrintInvoice(domId, {
        paperWidth,
        title: t("retail.receipts.slipDialogTitle", { lng: language, bill: docNumber }),
        invoiceId,
        docNumber,
        docType: "RETURN_SLIP",
        returnId: ret.return_id,
        customerName: custName,
        customerPhone: cust?.phone_number || undefined,
        grandTotal: Number(invoice?.total_amount) || 0,
        totalPaid: Number(invoice?.total_paid) || 0,
        language,
        // The slip is reprinted from this snapshot: the bill as it is now plus this return.
        billSnapshot: { ...invoice, invoice_id: invoiceId, doc_number: docNumber, return_id: ret.return_id, return: ret },
      });
      if (result?.method === "direct") setStatus({ ok: true, text: t("retail.receipts.slipSent", { printer: result.printer }) });
    } finally {
      setPrinting(false);
    }
  };

  const slip = (id: string, preview: boolean) => (
    <InvoiceReceipt id={id} invoice={invoice} returnSlip={ret} paperWidth={paperWidth} language={language} isPreview={preview} showBarcode={false} />
  );

  return (
    <>
      {slip(domId, false)}
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: "#f8fafc", color: "#0f172a" } } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#ffffff", color: "#0f172a", borderBottom: "1px solid #e2e8f0" }}>
          <Typography component="span" sx={{ fontWeight: 800 }}>
            {t("retail.receipts.slipDialogTitle", { bill: docNumber })}
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label={t("common.close")}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", pt: 2 }}>
            <ToggleButtonGroup exclusive size="small" value={paperWidth} onChange={(_, v) => v && setPaperWidth(v)} aria-label={t("retail.receipts.slipPaper")}>
              <ToggleButton value="80mm" sx={{ textTransform: "none", fontWeight: 700 }}>{t("retail.receipts.paper80")}</ToggleButton>
              <ToggleButton value="58mm" sx={{ textTransform: "none", fontWeight: 700 }}>{t("retail.receipts.paper58")}</ToggleButton>
              <ToggleButton value="a4" sx={{ textTransform: "none", fontWeight: 700 }}>{t("retail.receipts.paperA4")}</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={language}
              onChange={(_, v) => {
                if (!v) return;
                setLanguage(v);
                try {
                  localStorage.setItem("pos_receipt_language", v);
                } catch {
                  /* private mode */
                }
              }}
              aria-label={t("invoices.ReceiptPrintDialog.receiptLanguage")}
            >
              <ToggleButton value="en" sx={{ fontWeight: 800 }}>EN</ToggleButton>
              <ToggleButton value="si" sx={{ fontWeight: 800 }}>සිං</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ bgcolor: "#334155", borderRadius: 2, p: 2, display: "flex", justifyContent: "center", overflow: "auto", maxHeight: "60vh" }}>
            <Box sx={{ bgcolor: "#ffffff", color: "#000000" }}>{slip(`${domId}-preview`, true)}</Box>
          </Box>
          {status && (
            <Typography variant="caption" sx={{ fontWeight: 600, color: status.ok ? "#15803d" : "#b45309" }}>
              {status.text}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, bgcolor: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
            {t("common.close")}
          </Button>
          <Button variant="contained" disableElevation startIcon={printing ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />} onClick={() => void doPrint()} disabled={printing} sx={{ fontWeight: 800, minHeight: 44 }}>
            {t("retail.receipts.print")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
