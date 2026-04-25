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
  Divider,
  Chip,
  CircularProgress,
  FormControlLabel,
  Switch,
} from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useProcessReturn } from "../hooks/useInvoiceHooks";

export function ReturnSettlementDialog({
  open,
  onClose,
  invoice,
  showToast,
}: any) {
  const returnMutation = useProcessReturn();
  const [releaseId, setReleaseId] = useState(true);
  const [finalPayment, setFinalPayment] = useState<string>("");

  // Create a local state array to hold the return inputs for each line item
  const [returnLines, setReturnLines] = useState<any[]>([]);

  // Initialize the form when the dialog opens
  useMemo(() => {
    if (invoice && open) {
      setReturnLines(
        invoice.InvoiceLines.map((line: any) => ({
          line_id: line.line_id,
          equipment_name: line.Equipment.equipment_name,
          borrow_qty: line.borrow_quantity,
          locked_extra_rate: Number(line.locked_extra_daily_rate),
          expected_return: line.expected_return_date,
          good_qty: line.borrow_quantity, // Default to assuming they brought everything back safe
          defective_qty: 0,
          actual_return_date: new Date().toISOString().split("T")[0],
        })),
      );
    }
  }, [invoice, open]);

  // --- LIVE MATH: Calculate Dynamic Late Fees & Remaining Balance ---
  const { totalLateFees, remainingBalance, totalPaid } = useMemo(() => {
    if (!invoice)
      return { totalLateFees: 0, remainingBalance: 0, totalPaid: 0 };

    let lateFees = 0;
    returnLines.forEach((line) => {
      const expected = new Date(line.expected_return).getTime();
      const actual = new Date(line.actual_return_date).getTime();
      const daysLate = Math.max(
        0,
        Math.ceil((actual - expected) / (1000 * 60 * 60 * 24)),
      );
      lateFees +=
        daysLate *
        line.locked_extra_rate *
        (line.good_qty + line.defective_qty);
    });

    const paid =
      invoice.Payments?.reduce(
        (sum: number, p: any) => sum + Number(p.payment_amount),
        0,
      ) || 0;
    const newGrandTotal = Number(invoice.total_amount) + lateFees;
    const balance = Math.max(0, newGrandTotal - paid);

    return {
      totalLateFees: lateFees,
      remainingBalance: balance,
      totalPaid: paid,
    };
  }, [invoice, returnLines]);

  const handleUpdateLine = (id: number, field: string, value: any) => {
    setReturnLines((prev) =>
      prev.map((line) =>
        line.line_id === id ? { ...line, [field]: value } : line,
      ),
    );
  };

  const handleSubmit = () => {
    const payload = {
      invoice_id: invoice.invoice_id,
      final_payment_amount: Number(finalPayment) || 0,
      release_id_card: releaseId,
      lines_returned: returnLines,
    };

    returnMutation.mutate(
      { id: invoice.invoice_id, data: payload },
      {
        onSuccess: () => {
          showToast(
            "Return processed successfully. Inventory updated.",
            "success",
          );
          onClose();
        },
        onError: (err: any) =>
          showToast(err.response?.data?.message || "Return failed", "error"),
      },
    );
  };

  if (!invoice) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{ sx: { borderRadius: 3, bgcolor: "#f8fafc" } }}
    >
      <DialogTitle
        sx={{ bgcolor: "white", borderBottom: "1px solid #e2e8f0", p: 3 }}
      >
        <Typography variant="h5" fontWeight="bold">
          Process Equipment Return
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Invoice #{invoice.invoice_id} • {invoice.Customer.first_name}{" "}
          {invoice.Customer.last_name}
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* SECTION 1: Item Condition Check-In */}
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Verify Returned Items
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
          {returnLines.map((line) => (
            <Box
              key={line.line_id}
              sx={{
                p: 2,
                bgcolor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 2,
              }}
            >
              <Typography fontWeight="bold" mb={1}>
                {line.equipment_name} (Rented: {line.borrow_qty})
              </Typography>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TextField
                  type="date"
                  label="Actual Return Date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={line.actual_return_date}
                  onChange={(e) =>
                    handleUpdateLine(
                      line.line_id,
                      "actual_return_date",
                      e.target.value,
                    )
                  }
                />
                <TextField
                  type="number"
                  label="Safe / Good Qty"
                  size="small"
                  value={line.good_qty}
                  onChange={(e) =>
                    handleUpdateLine(
                      line.line_id,
                      "good_qty",
                      Number(e.target.value),
                    )
                  }
                  color="success"
                />
                <TextField
                  type="number"
                  label="Broken / Defective Qty"
                  size="small"
                  value={line.defective_qty}
                  onChange={(e) =>
                    handleUpdateLine(
                      line.line_id,
                      "defective_qty",
                      Number(e.target.value),
                    )
                  }
                  color="error"
                  helperText={
                    line.defective_qty > 0 ? "Will log to Defect DB" : ""
                  }
                />
              </div>
            </Box>
          ))}
        </Box>

        {/* SECTION 2: Final Settlement Math */}
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Final Settlement
        </Typography>
        <Box
          sx={{
            p: 3,
            bgcolor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography>Original Invoice Total</Typography>
            <Typography>
              Rs. {Number(invoice.total_amount).toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography
              color={totalLateFees > 0 ? "error.main" : "text.secondary"}
            >
              Added Late Fees
            </Typography>
            <Typography
              color={totalLateFees > 0 ? "error.main" : "text.secondary"}
            >
              + Rs. {totalLateFees.toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography color="success.main">
              Already Paid (Advances)
            </Typography>
            <Typography color="success.main">
              - Rs. {totalPaid.toLocaleString()}
            </Typography>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2,
              bgcolor: remainingBalance > 0 ? "#fef2f2" : "#f0fdf4",
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              Remaining Balance Due
            </Typography>
            <Typography
              variant="h6"
              fontWeight="bold"
              color={remainingBalance > 0 ? "error.main" : "success.dark"}
            >
              Rs. {remainingBalance.toLocaleString()}
            </Typography>
          </Box>

          {remainingBalance > 0 && (
            <TextField
              fullWidth
              label="Collect Final Payment Now (Rs.)"
              type="number"
              value={finalPayment}
              onChange={(e) => setFinalPayment(e.target.value)}
              sx={{ mt: 3 }}
            />
          )}
        </Box>

        {/* SECTION 3: ID Card Release */}
        {invoice.Customer.is_id_retained_currently && (
          <Box
            sx={{
              mt: 4,
              p: 2,
              bgcolor: "#fffbeb",
              border: "1px solid #fde047",
              borderRadius: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography
                fontWeight="bold"
                color="#b45309"
                display="flex"
                alignItems="center"
                gap={1}
              >
                <VerifiedUserIcon /> Vault Action
              </Typography>
              <Typography variant="body2" color="#b45309">
                Customer's ID is currently in the vault. Release it?
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={releaseId}
                  onChange={(e) => setReleaseId(e.target.checked)}
                  color="warning"
                />
              }
              label={releaseId ? "Release ID" : "Keep in Vault"}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: "white" }}>
        <Button onClick={onClose} disabled={returnMutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={returnMutation.isPending}
          disableElevation
        >
          {returnMutation.isPending ? (
            <CircularProgress size={24} />
          ) : (
            "Finalize Return & Settle"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
