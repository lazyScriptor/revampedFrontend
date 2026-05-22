import { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  MenuItem,
  TextField,
} from "@mui/material";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  FieldGrid,
  FormDialogShell,
  FormFooterMeta,
  FormSection,
} from "@/components/forms/FormDialogShell";
import { useRecordPayment } from "../hooks/useSuperAdminHooks";

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
  onSuccess: () => void;
}

const INITIAL = {
  plan_name: "Monthly",
  amount: "",
  currency: "LKR",
  status: "Paid",
  billing_period_start: "",
  billing_period_end: "",
  method: "Bank Transfer",
  reference_number: "",
  notes: "",
};

export default function RecordPaymentDialog({
  open,
  onClose,
  tenantId,
  tenantName,
  onSuccess,
}: Props) {
  const [form, setForm] = useState(INITIAL);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useRecordPayment();

  useEffect(() => {
    if (open) {
      setForm(INITIAL);
      setDirty(false);
      setError(null);
    }
  }, [open]);

  const set = (key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setDirty(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    mutation.mutate(
      { tenantId, data: { ...form, amount: parseFloat(form.amount) || 0 } },
      {
        onSuccess: () => {
          setForm(INITIAL);
          onSuccess();
          onClose();
        },
        onError: (err: any) => setError(err?.message || "Failed to record payment."),
      },
    );
  };

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      maxWidth="md"
      eyebrow="Subscription Payment"
      title={`Record payment for ${tenantName}`}
      subtitle="Log an offline payment received from the tenant."
      avatarIcon={<PaymentsOutlinedIcon sx={{ fontSize: 22 }} />}
      footer={
        <>
          <FormFooterMeta>
            {error
              ? error
              : dirty && !mutation.isPending
                ? "Unsaved changes"
                : ""}
          </FormFooterMeta>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={onClose} disabled={mutation.isPending} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              form="record-payment-form"
              variant="contained"
              disabled={mutation.isPending || !form.amount}
              startIcon={
                mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined
              }
            >
              {mutation.isPending ? "Saving…" : "Record payment"}
            </Button>
          </Box>
        </>
      }
    >
      <Box
        component="form"
        id="record-payment-form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {error && (
          <Alert severity="error" variant="outlined" icon={<WarningAmberIcon />}>
            {error}
          </Alert>
        )}

        <FormSection
          icon={<PaymentsOutlinedIcon />}
          title="Payment details"
          hint="Amount, currency, and the subscription plan being billed."
        >
          <FieldGrid>
            <TextField
              size="small"
              label="Plan name"
              value={form.plan_name}
              onChange={(e) => set("plan_name", e.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              label="Amount"
              type="number"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              required
              fullWidth
            />
          </FieldGrid>
          <FieldGrid>
            <TextField
              select
              size="small"
              label="Currency"
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              fullWidth
            >
              {["LKR", "USD", "EUR"].map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              fullWidth
            >
              {["Paid", "Pending", "Overdue", "Refunded"].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </FieldGrid>
        </FormSection>

        <FormSection
          icon={<EventNoteOutlinedIcon />}
          title="Billing period"
          hint="What stretch of time does this payment cover?"
        >
          <FieldGrid>
            <TextField
              size="small"
              label="Period start"
              type="date"
              value={form.billing_period_start}
              onChange={(e) => set("billing_period_start", e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              size="small"
              label="Period end"
              type="date"
              value={form.billing_period_end}
              onChange={(e) => set("billing_period_end", e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </FieldGrid>
        </FormSection>

        <FormSection
          icon={<ReceiptLongOutlinedIcon />}
          title="Method & reference"
          hint="Where the money came from, and any reference id for reconciliation."
        >
          <FieldGrid>
            <TextField
              select
              size="small"
              label="Method"
              value={form.method}
              onChange={(e) => set("method", e.target.value)}
              fullWidth
            >
              {["Bank Transfer", "Cash", "Card", "Cheque", "Online"].map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Reference number"
              value={form.reference_number}
              onChange={(e) => set("reference_number", e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <ReceiptLongOutlinedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </FieldGrid>
        </FormSection>

        <FormSection
          icon={<NotesOutlinedIcon />}
          title="Notes"
          hint="Optional context for future reviewers."
        >
          <TextField
            size="small"
            label="Notes"
            multiline
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            fullWidth
          />
        </FormSection>
      </Box>
    </FormDialogShell>
  );
}
