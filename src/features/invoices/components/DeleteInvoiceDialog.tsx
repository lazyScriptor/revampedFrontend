import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { useTranslation } from "react-i18next";
import { tk } from "@/i18n/marker";
import { useAuthStore } from "@/stores/useAuthStore";
import { useToast } from "@/components/ui/AppToast";
import { INVOICE_DELETE_REASONS, InvoiceDeleteReason, useDeleteInvoice } from "../hooks/useInvoiceDeletionHooks";

const REASON_LABEL: Record<InvoiceDeleteReason, string> = {
  "Created by mistake": tk("invoices.delete.reasonMistake"),
  "Customer cancelled": tk("invoices.delete.reasonCancelled"),
  "Duplicate invoice": tk("invoices.delete.reasonDuplicate"),
  "Wrong customer or items": tk("invoices.delete.reasonWrong"),
  "Test entry": tk("invoices.delete.reasonTest"),
  Other: tk("invoices.delete.reasonOther"),
};

interface Props {
  open: boolean;
  onClose: () => void;
  invoice: any | null;
  onDeleted?: () => void;
}

export function DeleteInvoiceDialog({ open, onClose, invoice, onDeleted }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const canDeleteAny = useAuthStore((s) => s.hasPermission)("invoice:delete:any");
  const mutation = useDeleteInvoice();
  const [reason, setReason] = useState<InvoiceDeleteReason | "">("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setNote("");
    }
  }, [open]);

  const payments: any[] = invoice?.Payments || [];
  const paidTotal = payments.reduce((s, p) => s + Number(p.payment_amount || 0), 0);
  const hasMoney = payments.length > 0 || Number(invoice?.advance_paid || 0) > 0;
  const blocked = hasMoney && !canDeleteAny;
  const needsNote = reason === "Other";
  const canSubmit = !!reason && (!needsNote || note.trim().length >= 3) && !blocked && !mutation.isPending;

  const submit = () => {
    if (!invoice || !reason) return;
    mutation.mutate(
      { id: invoice.invoice_id, reason, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.showSuccess(t("invoices.delete.done", { id: invoice.invoice_id }));
          onClose();
          onDeleted?.();
        },
        onError: (e: any) => toast.showError(e?.message || t("invoices.delete.failed")),
      },
    );
  };

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
        <DeleteOutlinedIcon color="error" />
        {t("invoices.delete.title", { id: invoice?.invoice_id })}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {blocked ? (
            <Alert severity="warning">{t("invoices.delete.blockedHasMoney")}</Alert>
          ) : (
            <Alert severity="info" sx={{ "& li": { mb: 0.25 } }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {t("invoices.delete.whatHappens")}
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>{t("invoices.delete.effectStock")}</li>
                {hasMoney && (
                  <li>{t("invoices.delete.effectMoney", { amount: paidTotal.toLocaleString() })}</li>
                )}
                <li>{t("invoices.delete.effectRestore")}</li>
                {!canDeleteAny && <li>{t("invoices.delete.effectFlag")}</li>}
              </ul>
            </Alert>
          )}

          <TextField
            select
            required
            fullWidth
            size="small"
            label={t("invoices.delete.reason")}
            value={reason}
            onChange={(e) => setReason(e.target.value as InvoiceDeleteReason)}
            disabled={blocked}
          >
            {INVOICE_DELETE_REASONS.map((r) => (
              <MenuItem key={r} value={r}>
                {t(REASON_LABEL[r])}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            label={needsNote ? t("invoices.delete.noteRequired") : t("invoices.delete.noteOptional")}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            disabled={blocked}
            error={needsNote && note.trim().length > 0 && note.trim().length < 3}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={mutation.isPending} sx={{ textTransform: "none", fontWeight: 700 }}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={submit}
          variant="contained"
          color="error"
          disableElevation
          disabled={!canSubmit}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          {mutation.isPending ? t("invoices.delete.deleting") : t("invoices.delete.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
