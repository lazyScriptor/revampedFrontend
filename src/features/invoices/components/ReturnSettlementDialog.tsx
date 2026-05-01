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
} from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { useProcessReturn } from "../hooks/useInvoiceHooks";

export function ReturnSettlementDialog({
  open,
  onClose,
  invoice,
  showToast,
}: any) {
  const returnMutation = useProcessReturn();
  const [releaseId, setReleaseId] = useState(true);
  const [returnLines, setReturnLines] = useState<any[]>([]);

  useMemo(() => {
    if (invoice && open) {
      const rawLines =
        invoice.InvoiceLines || invoice.invoice_lines || invoice.lines || [];
      const activeRawLines = rawLines.filter(
        (l: any) =>
          l.line_status === "Active" ||
          l.status === "Active" ||
          (!l.line_status && l.status !== "Returned"),
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
            good_qty: remainingToReturn, // Default to returning what's left
            defective_qty: 0,
            actual_return_date: new Date().toISOString().split("T")[0],
          };
        }),
      );
    }
  }, [invoice, open]);

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
      final_payment_amount: 0, // Stripped out of UI, handled purely in the Financial Pane now
      release_id_card: releaseId,
      lines_returned: returnLines,
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
          Equipment Handover Checklist
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Log the physical return of assets for Invoice #{invoice.invoice_id}.
          Financials are handled separately.
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography fontWeight="bold" color="primary.dark">
                  {line.equipment_name}
                </Typography>
                <Chip
                  size="small"
                  label={`Pending Return: ${line.remaining_qty} / ${line.borrow_qty}`}
                  color="warning"
                  sx={{ fontWeight: "bold" }}
                />
              </Box>

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
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 0;
                    if (val < 0) val = 0;
                    if (val + line.defective_qty > line.remaining_qty)
                      val = line.remaining_qty - line.defective_qty;
                    handleUpdateLine(line.line_id, "good_qty", val);
                  }}
                  color="success"
                />
                <TextField
                  type="number"
                  label="Broken Qty"
                  size="small"
                  value={line.defective_qty}
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 0;
                    if (val < 0) val = 0;
                    if (val + line.good_qty > line.remaining_qty)
                      val = line.remaining_qty - line.good_qty;
                    handleUpdateLine(line.line_id, "defective_qty", val);
                  }}
                  color="error"
                  helperText={
                    line.defective_qty > 0 ? "Logs to Defect Desk" : ""
                  }
                />
              </div>
            </Box>
          ))}
        </Box>

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
          color="primary"
          onClick={handleSubmit}
          disabled={returnMutation.isPending}
          disableElevation
        >
          {returnMutation.isPending ? (
            <CircularProgress size={24} />
          ) : (
            "Confirm Physical Return"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
