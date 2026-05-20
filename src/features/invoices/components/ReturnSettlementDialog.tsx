import { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Switch,
  Rating,
  Alert,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import RestoreIcon from "@mui/icons-material/Restore";
import { useProcessReturn } from "../hooks/useInvoiceHooks";
import { QuantityReturnSplitter } from "./QuantityReturnSplitter";

// ─── Live late fee engine (mirrors backend logic exactly) ──────────────────────
// `track_overdue === false` is the explicit opt-out: skip late fees entirely.
// Using `=== false` (not falsy) so legacy lines without the field — `undefined`
// — still flow through the date-based check.
const calcLineLF = (line: any): number => {
  if (line.track_overdue === false) return 0;
  if (!line.actual_return_date || !line.expected_return) return 0;
  const expected = new Date(line.expected_return).getTime();
  const actual = new Date(line.actual_return_date).getTime();
  const daysLate = Math.max(0, Math.ceil((actual - expected) / (1000 * 60 * 60 * 24)));
  const totalReturning = (line.good_qty || 0) + (line.defective_qty || 0);
  return daysLate * (line.locked_extra_rate || 0) * totalReturning;
};

const calcDaysLate = (line: any): number => {
  if (line.track_overdue === false) return 0;
  if (!line.actual_return_date || !line.expected_return) return 0;
  const expected = new Date(line.expected_return).getTime();
  const actual = new Date(line.actual_return_date).getTime();
  return Math.max(0, Math.ceil((actual - expected) / (1000 * 60 * 60 * 24)));
};
// ──────────────────────────────────────────────────────────────────────────────

export function ReturnSettlementDialog({ open, onClose, invoice, showToast }: any) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
          // Legacy lines without the field default to tracked — preserves
          // pre-existing behavior. Explicit `false` from a new line opts out.
          const wasTracked = line.track_overdue !== false;
          // Local-time today so users east of UTC don't get yesterday's date
          // pre-filled in the actual-return field.
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          return {
            line_id: line.line_id,
            equipment_name: line.Equipment?.equipment_name || "Unknown Item",
            borrow_qty: line.borrow_quantity,
            remaining_qty: remainingToReturn,
            locked_extra_rate: Number(line.locked_extra_daily_rate),
            expected_return: line.expected_return_date,
            track_overdue: wasTracked,
            // Frozen flag: was this line tracked when the return started? Used
            // to decide whether to show the "Waive late fees" affordance —
            // never gate on the live track_overdue value, otherwise once you
            // waive you'd lose the way to un-waive.
            _orig_tracked: wasTracked,
            good_qty: remainingToReturn,
            defective_qty: 0,
            actual_return_date: todayStr,
          };
        })
      );
    }
  }, [invoice, open]);

  const handleUpdateLineBatch = (id: number, updates: Record<string, any>) => {
    setReturnLines((prev) =>
      prev.map((line) => (line.line_id === id ? { ...line, ...updates } : line))
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
      fullScreen={isMobile}
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 0, sm: 3 },
            bgcolor: "#f8fafc",
            maxHeight: { xs: "100vh", sm: "92dvh" },
          },
        },
      }}
    >
      <DialogTitle
        sx={{ bgcolor: "white", borderBottom: "1px solid #e2e8f0", p: { xs: 2, sm: 3 } }}
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

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
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
            const overdueTracked = line.track_overdue !== false;
            const canWaive = line._orig_tracked === true;
            const isWaived = canWaive && !overdueTracked;

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
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
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
                    {isWaived && (
                      <Chip
                        size="small"
                        icon={<MoneyOffIcon sx={{ fontSize: 12 }} />}
                        label="Late fees waived"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: "0.68rem", color: "warning.dark", borderColor: "#fde68a", bgcolor: "#fffbeb" }}
                      />
                    )}
                    {!overdueTracked && !isWaived && (
                      <Chip
                        size="small"
                        label="No overdue tracking"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: "0.68rem", color: "text.secondary", borderColor: "#cbd5e1" }}
                      />
                    )}
                    {canWaive && (
                      <Button
                        size="small"
                        variant="text"
                        startIcon={
                          isWaived ? (
                            <RestoreIcon sx={{ fontSize: 14 }} />
                          ) : (
                            <MoneyOffIcon sx={{ fontSize: 14 }} />
                          )
                        }
                        onClick={() =>
                          handleUpdateLineBatch(line.line_id, { track_overdue: isWaived })
                        }
                        sx={{
                          textTransform: "none",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: isWaived ? "primary.main" : "warning.dark",
                          minWidth: 0,
                          px: 1,
                        }}
                      >
                        {isWaived ? "Restore late fees" : "Waive late fees"}
                      </Button>
                    )}
                  </Box>
                </Box>

                {/* Due date context */}
                {overdueTracked && line.expected_return && (
                  <Box sx={{ px: 2.5, pt: 1.5, pb: 0.5 }}>
                    <Typography variant="caption" color={isLate ? "error.main" : "text.secondary"} sx={{ fontWeight: 600 }}>
                      Expected return: {new Date(line.expected_return).toLocaleDateString()}
                      {isLate && ` · ${daysLate} day${daysLate !== 1 ? "s" : ""} overdue`}
                    </Typography>
                  </Box>
                )}

                {/* Splitter handles returning qty (primary), plus a collapsible
                    section for actual return date + defective qty. */}
                <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                  <QuantityReturnSplitter
                    remaining={line.remaining_qty}
                    returningQty={(line.good_qty || 0) + (line.defective_qty || 0)}
                    defectiveQty={line.defective_qty || 0}
                    actualReturnDate={line.actual_return_date}
                    onChange={({ returningQty, defectiveQty, actualReturnDate }) => {
                      handleUpdateLineBatch(line.line_id, {
                        good_qty: Math.max(0, returningQty - defectiveQty),
                        defective_qty: defectiveQty,
                        actual_return_date: actualReturnDate,
                      });
                    }}
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

      <DialogActions
        sx={{
          p: { xs: 1.5, sm: 3 },
          bgcolor: "white",
          borderTop: "1px solid #e2e8f0",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
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
