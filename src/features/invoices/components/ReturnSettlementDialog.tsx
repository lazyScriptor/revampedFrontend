import { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  CircularProgress,
  FormControlLabel,
  Switch,
  Rating,
  Alert,
  Divider,
} from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useProcessReturn } from "../hooks/useInvoiceHooks";

// ─── Live late fee engine (mirrors backend logic exactly) ──────────────────────
const calcLineLF = (line: any): number => {
  if (!line.actual_return_date || !line.expected_return) return 0;
  const expected = new Date(line.expected_return).getTime();
  const actual = new Date(line.actual_return_date).getTime();
  const daysLate = Math.max(0, Math.ceil((actual - expected) / (1000 * 60 * 60 * 24)));
  const totalReturning = (line.good_qty || 0) + (line.defective_qty || 0);
  return daysLate * (line.locked_extra_rate || 0) * totalReturning;
};

const calcDaysLate = (line: any): number => {
  if (!line.actual_return_date || !line.expected_return) return 0;
  const expected = new Date(line.expected_return).getTime();
  const actual = new Date(line.actual_return_date).getTime();
  return Math.max(0, Math.ceil((actual - expected) / (1000 * 60 * 60 * 24)));
};
// ──────────────────────────────────────────────────────────────────────────────

export function ReturnSettlementDialog({ open, onClose, invoice, showToast }: any) {
  const returnMutation = useProcessReturn();
  const [releaseId, setReleaseId] = useState(true);
  const [customerRating, setCustomerRating] = useState<number | null>(5);
  const [returnLines, setReturnLines] = useState<any[]>([]);

  useMemo(() => {
    if (invoice && open) {
      const rawLines =
        invoice.InvoiceLines || invoice.invoice_lines || invoice.lines || [];
      const activeRawLines = rawLines.filter(
        (l: any) =>
          l.line_status === "Active" ||
          l.status === "Active" ||
          (!l.line_status && l.status !== "Returned")
      );

      setReturnLines(
        activeRawLines.map((line: any) => {
          const alreadyReturned =
            (line.good_returned_qty || 0) + (line.defective_returned_qty || 0);
          const remainingToReturn = line.borrow_quantity - alreadyReturned;
          return {
            line_id: line.line_id,
            equipment_name: line.Equipment?.equipment_name || "Unknown Item",
            borrow_qty: line.borrow_quantity,
            remaining_qty: remainingToReturn,
            locked_extra_rate: Number(line.locked_extra_daily_rate),
            expected_return: line.expected_return_date,
            good_qty: remainingToReturn,
            defective_qty: 0,
            actual_return_date: new Date().toISOString().split("T")[0],
          };
        })
      );
    }
  }, [invoice, open]);

  const handleUpdateLine = (id: number, field: string, value: any) => {
    setReturnLines((prev) =>
      prev.map((line) => (line.line_id === id ? { ...line, [field]: value } : line))
    );
  };

  const totalLateFees = returnLines.reduce((sum, line) => sum + calcLineLF(line), 0);
  const hasLateFees = totalLateFees > 0;

  const handleSubmit = () => {
    const payload = {
      invoice_id: invoice.invoice_id,
      final_payment_amount: 0,
      release_id_card: releaseId,
      lines_returned: returnLines,
      customer_rating: customerRating,
    };
    returnMutation.mutate(
      { id: invoice.invoice_id, data: payload },
      {
        onSuccess: () => {
          showToast("Handover processed. Ledger updated.", "success");
          onClose();
        },
        onError: (err: any) =>
          showToast(err.response?.data?.message || "Return failed", "error"),
      }
    );
  };

  if (!invoice) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: "#f8fafc", maxHeight: "92vh" } } }}
    >
      <DialogTitle
        sx={{ bgcolor: "white", borderBottom: "1px solid #e2e8f0", p: 3 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircleOutlineIcon sx={{ color: "primary.main", fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Equipment Handover — INV-{invoice.invoice_id}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Log physical returns. Late fees are calculated automatically. Payments are handled in the Financial Terminal.
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>

          {/* Late fee warning banner */}
          {hasLateFees && (
            <Alert
              severity="warning"
              icon={<WarningAmberIcon />}
              sx={{ borderRadius: 2 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Estimated Late Fees: Rs. {totalLateFees.toLocaleString()}
              </Typography>
              <Typography variant="caption">
                This will be added to the invoice total upon confirmation.
              </Typography>
            </Alert>
          )}

          {/* Return lines */}
          {returnLines.map((line) => {
            const daysLate = calcDaysLate(line);
            const lineLF = calcLineLF(line);
            const isLate = daysLate > 0;
            const totalReturning = (line.good_qty || 0) + (line.defective_qty || 0);
            const overReturn = totalReturning > line.remaining_qty;

            return (
              <Box
                key={line.line_id}
                sx={{
                  bgcolor: "white",
                  border: "1px solid",
                  borderColor: isLate ? "#fde047" : "#e2e8f0",
                  borderRadius: 2.5,
                  overflow: "hidden",
                }}
              >
                {/* Line header */}
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    bgcolor: "#fafafa",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <BuildCircleIcon sx={{ fontSize: 16, color: "primary.main" }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {line.equipment_name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      label={`${line.remaining_qty} / ${line.borrow_qty} pending`}
                      color="warning"
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                    />
                    {isLate && (
                      <Chip
                        size="small"
                        icon={<AccessTimeIcon sx={{ fontSize: 12 }} />}
                        label={`${daysLate}d late · +Rs.${lineLF.toLocaleString()}`}
                        color="error"
                        variant="filled"
                        sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Due date context */}
                <Box sx={{ px: 2.5, pt: 1.5, pb: 0.5 }}>
                  <Typography variant="caption" color={isLate ? "error.main" : "text.secondary"} sx={{ fontWeight: 600 }}>
                    Expected return: {new Date(line.expected_return).toLocaleDateString()}
                    {isLate && ` · ${daysLate} day${daysLate !== 1 ? "s" : ""} overdue`}
                  </Typography>
                </Box>

                {/* Input grid */}
                <Box
                  sx={{
                    p: 2.5,
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    type="date"
                    label="Actual Return Date"
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={line.actual_return_date}
                    onChange={(e) =>
                      handleUpdateLine(line.line_id, "actual_return_date", e.target.value)
                    }
                  />
                  <TextField
                    type="number"
                    label="Good / Safe Qty"
                    size="small"
                    value={line.good_qty}
                    color="success"
                    error={overReturn}
                    onChange={(e) => {
                      let val = parseInt(e.target.value) || 0;
                      if (val < 0) val = 0;
                      if (val + line.defective_qty > line.remaining_qty)
                        val = line.remaining_qty - line.defective_qty;
                      handleUpdateLine(line.line_id, "good_qty", val);
                    }}
                  />
                  <TextField
                    type="number"
                    label="Broken / Defective Qty"
                    size="small"
                    value={line.defective_qty}
                    color="error"
                    error={overReturn}
                    onChange={(e) => {
                      let val = parseInt(e.target.value) || 0;
                      if (val < 0) val = 0;
                      if (val + line.good_qty > line.remaining_qty)
                        val = line.remaining_qty - line.good_qty;
                      handleUpdateLine(line.line_id, "defective_qty", val);
                    }}
                    helperText={line.defective_qty > 0 ? "→ Auto-routed to Defect Desk" : ""}
                  />
                </Box>
              </Box>
            );
          })}

          <Divider />

          {/* Customer rating */}
          <Box
            sx={{
              bgcolor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 2.5,
              p: 2.5,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Client Trust Rating
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              Rate the client's return condition and punctuality for this order.
            </Typography>
            <Rating
              value={customerRating}
              onChange={(_, newValue) => setCustomerRating(newValue)}
              size="large"
            />
          </Box>

          {/* Vault toggle */}
          {invoice.Customer?.is_id_retained_currently && (
            <Box
              sx={{
                bgcolor: "#fffbeb",
                border: "1px solid #fde047",
                borderRadius: 2.5,
                p: 2.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                <VerifiedUserIcon sx={{ color: "#b45309", mt: 0.25 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#b45309" }}>
                    Security Vault Action
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#b45309" }}>
                    Client's ID is currently retained. Release upon return?
                  </Typography>
                </Box>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={releaseId}
                    onChange={(e) => setReleaseId(e.target.checked)}
                    color="warning"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#b45309" }}>
                    {releaseId ? "Release ID" : "Keep in Vault"}
                  </Typography>
                }
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: "white", borderTop: "1px solid #e2e8f0", gap: 1 }}>
        {hasLateFees && (
          <Typography variant="caption" sx={{ color: "warning.dark", fontWeight: 700, mr: "auto" }}>
            +Rs.{totalLateFees.toLocaleString()} in late fees will be applied
          </Typography>
        )}
        <Button onClick={onClose} disabled={returnMutation.isPending} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={returnMutation.isPending}
          disableElevation
          sx={{ fontWeight: 700, px: 3 }}
        >
          {returnMutation.isPending ? <CircularProgress size={20} /> : "Confirm Return"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
