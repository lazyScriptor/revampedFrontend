import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  CircularProgress,
  Paper,
  Divider,
  Chip,
  Button,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SecurityIcon from "@mui/icons-material/Security";
import AssignmentReturnedIcon from "@mui/icons-material/AssignmentReturned";
import HistoryIcon from "@mui/icons-material/History";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import {
  useInvoiceSearch,
  useAddPayment,
  useToggleVault,
  useUpdateFees,
} from "../hooks/useInvoiceHooks";

// --- GLOWING DOT CSS COMPONENT ---
const StatusDot = ({ color }: { color: string }) => (
  <Box
    sx={{
      width: 10,
      height: 10,
      borderRadius: "50%",
      backgroundColor: color,
      boxShadow: `0 0 8px 2px ${color}80`, // The Glow
      mr: 1.5,
    }}
  />
);

// --- PANE 1: INVOICE SEARCH ---
export function ManageSearchPanel({
  onSelectInvoice,
}: {
  onSelectInvoice: (id: number) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const { data: searchResults = [], isLoading } = useInvoiceSearch(inputValue);

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 3, height: "100%" }}
    >
      <Autocomplete
        options={searchResults}
        getOptionLabel={(option: any) =>
          `INV-${option.invoice_id}   ${option.Customer?.first_name}`
        }
        filterOptions={(x) => x}
        onChange={(event, newValue: any) => {
          if (newValue) onSelectInvoice(newValue.invoice_id);
        }}
        onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search INV #, Name, or Phone..."
            variant="outlined"
            fullWidth
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <SearchIcon color="action" sx={{ ml: 1, mr: -0.5 }} />
              ),
              endAdornment: (
                <>
                  {isLoading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps?.endAdornment}
                </>
              ),
              sx: { borderRadius: 2, bgcolor: "white" },
            }}
          />
        )}
        renderOption={(props, option: any) => (
          <li
            {...props}
            key={option.invoice_id}
            className="flex items-center gap-3 p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50"
          >
            <div className="flex-grow">
              <Typography variant="body1" fontWeight="600" color="primary.main">
                INV-{option.invoice_id}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {option.Customer?.first_name} {option.Customer?.last_name}{" "}
                {option.Customer?.phone_number}
              </Typography>
            </div>
            <Chip
              size="small"
              label={option.status}
              color={option.status === "Active" ? "warning" : "success"}
            />
          </li>
        )}
      />
    </Box>
  );
}

// --- PANE 2: PRO-LEVEL EQUIPMENT LEDGER (With Iteration Child Rows) ---
export function ManageLedgerPanel({
  invoice,
  onOpenReturn,
}: {
  invoice: any;
  onOpenReturn: () => void;
}) {
  if (!invoice)
    return (
      <EmptyState text="Search and select an invoice to view its ledger." />
    );

  const rawLines =
    invoice.InvoiceLines || invoice.invoice_lines || invoice.lines || [];

  // BULLETPROOF TRACE EXTRACTOR: Catch all possible names Sequelize might use
  const rawTraces =
    invoice.InvoiceTraces ||
    invoice.InvoiceTrace ||
    invoice.invoice_traces ||
    invoice.traces ||
    [];
  const returnTraces = rawTraces.filter(
    (t: any) => t.event_action === "RETURN_PROCESSED",
  );

  return (
    <Box sx={{ p: 3, height: "100%", overflowY: "auto", bgcolor: "#f8fafc" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Asset Tracking Board
        </Typography>
        {invoice.status === "Active" && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AssignmentReturnedIcon />}
            disableElevation
            onClick={onOpenReturn}
          >
            Process Handover
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {rawLines.map((line: any) => {
          const isActive =
            line.line_status === "Active" || line.status === "Active";
          const equipName = line.Equipment?.equipment_name || "Unknown Asset";

          const alreadyReturned =
            (line.good_returned_qty || 0) + (line.defective_returned_qty || 0);
          const pending = line.borrow_quantity - alreadyReturned;

          // LIVE MATH: Accrued Cost Till Today
          const start = new Date(line.borrow_date).getTime();
          const today = new Date().getTime();
          let daysOut = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
          if (daysOut < 1) daysOut = 1;

          let accruedCost = 0;
          if (!isActive) {
            accruedCost = Number(line.line_total_amount);
          } else if (daysOut <= line.locked_minimum_days) {
            accruedCost = line.locked_base_price * line.borrow_quantity;
          } else {
            const extraDays = daysOut - line.locked_minimum_days;
            accruedCost =
              (line.locked_base_price +
                extraDays * line.locked_extra_daily_rate) *
              line.borrow_quantity;
          }

          // EXTRACT SPECIFIC ITERATIONS: Safely parse JSON payload
          const lineIterations = returnTraces
            .map((trace: any) => {
              let payload = trace.state_payload || {};

              // Safely parse if backend sent it as a stringified JSON
              if (typeof payload === "string") {
                try {
                  payload = JSON.parse(payload);
                } catch (e) {
                  payload = {};
                }
              }

              const returnedLinesArray = payload.lines_returned || [];
              const returnedLine = returnedLinesArray.find(
                (l: any) => l.line_id === line.line_id,
              );

              if (
                returnedLine &&
                (Number(returnedLine.good_qty) > 0 ||
                  Number(returnedLine.defective_qty) > 0)
              ) {
                return {
                  date: trace.occurred_at || trace.createdAt, // Fallback if occurred_at is missing
                  good: Number(returnedLine.good_qty) || 0,
                  defective: Number(returnedLine.defective_qty) || 0,
                };
              }
              return null;
            })
            .filter(Boolean); // Removes nulls

          return (
            <Paper
              key={line.line_id}
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: isActive ? "#fbbf24" : "#e2e8f0",
                borderRadius: 3,
                bgcolor: "white",
                overflow: "hidden",
              }}
            >
              {/* MASTER CARD (Top Level) */}
              <Box sx={{ p: 2.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <StatusDot color={isActive ? "#f59e0b" : "#10b981"} />
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      color="text.primary"
                    >
                      {equipName}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    variant={isActive ? "filled" : "outlined"}
                    color={isActive ? "warning" : "default"}
                    label={isActive ? "Out on Rent" : "Fully Returned"}
                    sx={{ fontWeight: "bold" }}
                  />
                </Box>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textTransform="uppercase"
                      fontWeight="bold"
                    >
                      Timeline
                    </Typography>
                    <Typography variant="body2" fontWeight="500" mt={0.5}>
                      Out: {new Date(line.borrow_date).toLocaleDateString()}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="500"
                      color={
                        isActive && daysOut > line.locked_minimum_days
                          ? "error.main"
                          : "text.primary"
                      }
                    >
                      Due:{" "}
                      {new Date(line.expected_return_date).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textTransform="uppercase"
                      fontWeight="bold"
                    >
                      Total Stats
                    </Typography>
                    <Typography variant="body2" fontWeight="500" mt={0.5}>
                      Borrowed: {line.borrow_quantity}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={
                        alreadyReturned > 0 ? "success.main" : "text.secondary"
                      }
                    >
                      Returned: {alreadyReturned}
                    </Typography>
                    {isActive && (
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="warning.dark"
                      >
                        Pending: {pending}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ bgcolor: "#f8fafc", p: 1.5, borderRadius: 2 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textTransform="uppercase"
                      fontWeight="bold"
                    >
                      Cost Till Today
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight="900"
                      color="primary.main"
                      mt={0.5}
                    >
                      Rs. {accruedCost.toLocaleString()}
                    </Typography>
                  </Box>
                </div>
              </Box>

              {/* CHILD ROWS (Handover Iterations) */}
              {lineIterations.length > 0 && (
                <Box
                  sx={{
                    bgcolor: "#f8fafc",
                    borderTop: "1px dashed #cbd5e1",
                    p: 2,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight="bold"
                    textTransform="uppercase"
                    mb={1}
                    display="block"
                  >
                    Handover Iterations
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {lineIterations.map((iteration: any, i: number) => (
                      <Box
                        key={i}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          p: 1,
                          bgcolor: "white",
                          borderRadius: 1,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <SubdirectoryArrowRightIcon
                          sx={{ color: "#94a3b8", fontSize: 18 }}
                        />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ width: 140 }}
                        >
                          {new Date(iteration.date).toLocaleString([], {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}{" "}
                        </Typography>

                        {iteration.good > 0 && (
                          <Chip
                            size="small"
                            label={`${iteration.good} Safe`}
                            color="success"
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        )}
                        {iteration.defective > 0 && (
                          <Chip
                            size="small"
                            label={`${iteration.defective} Broken`}
                            color="error"
                            variant="filled"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}

// --- PANE 3: FINANCIAL SETTLEMENT & TRANSACTION LEDGER ---
export function ManageFinancialPanel({
  invoice,
  showToast,
}: {
  invoice: any;
  showToast: any;
}) {
  // 1. ALL HOOKS MUST GO HERE AT THE VERY TOP
  const paymentMutation = useAddPayment();
  const vaultMutation = useToggleVault();
  const updateFeesMutation = useUpdateFees();

  const [paymentAmount, setPaymentAmount] = useState("");

  // Safely grab initial values (fallback to 0 if invoice is null)
  const initialTransport = Number(invoice?.transport_fee) || 0;
  const initialDiscount = Number(invoice?.discount_amount) || 0;

  const [fees, setFees] = useState({
    transport: initialTransport,
    discount: initialDiscount,
  });

  // Keep local state in sync if a user clicks a different invoice on the left
  useEffect(() => {
    setFees({ transport: initialTransport, discount: initialDiscount });
  }, [invoice?.invoice_id, initialTransport, initialDiscount]);

  // ---------------------------------------------------------
  // 2. NOW IT IS SAFE TO DO THE EARLY RETURN
  // ---------------------------------------------------------
  if (!invoice)
    return <EmptyState text="Financial controls will appear here." />;

  const payments = invoice.Payments || [];
  const totalPaid =
    payments.reduce(
      (sum: number, p: any) => sum + Number(p.payment_amount),
      0,
    ) || 0;

  // Safely parse financial breakdown
  const subTotal = Number(invoice.sub_total) || 0;
  const grandTotal = Number(invoice.total_amount) || 0;

  // Math: Grand Total = SubTotal + Transport - Discount + Late Fees
  const lateFees = Math.max(
    0,
    grandTotal - (subTotal + initialTransport - initialDiscount),
  );
  const balance = Math.max(0, grandTotal - totalPaid);

  const handleUpdateFees = () => {
    updateFeesMutation.mutate(
      {
        id: invoice.invoice_id,
        data: {
          transport_fee: fees.transport,
          discount_amount: fees.discount,
        },
      },
      { onSuccess: () => showToast("Fees updated successfully.", "success") },
    );
  };

  const handlePayment = (isRefund: boolean) => {
    const amt = Number(paymentAmount);
    if (amt <= 0) return showToast("Enter a valid amount", "error");
    if (isRefund && amt > totalPaid)
      return showToast("Cannot refund more than what was paid", "error");

    paymentMutation.mutate(
      {
        id: invoice.invoice_id,
        data: { amount: amt, method: "Cash", is_refund: isRefund },
      },
      {
        onSuccess: () => {
          showToast(
            isRefund ? "Refund issued." : "Payment recorded.",
            "success",
          );
          setPaymentAmount("");
        },
      },
    );
  };

  const hasFeeChanges =
    fees.transport !== initialTransport || fees.discount !== initialDiscount;
  const isCompleted = invoice.status === "Completed";

  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* 1. Overall Balance Box */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          border: "1px solid #e2e8f0",
          borderRadius: 3,
          bgcolor: "#1e293b",
          color: "white",
        }}
      >
        <Typography
          variant="subtitle2"
          color="#94a3b8"
          textTransform="uppercase"
          fontWeight="bold"
          mb={1}
        >
          Total Balance Due
        </Typography>
        <Typography
          variant="h3"
          fontWeight="bold"
          color={balance > 0 ? "#f87171" : "#4ade80"}
        >
          Rs. {balance.toLocaleString()}
        </Typography>
      </Paper>

      {/* 2. Editable Financial Breakdown */}
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            px: 1,
          }}
        >
          <Typography color="text.secondary">Base Subtotal</Typography>
          <Typography fontWeight="500">
            Rs. {subTotal.toLocaleString()}
          </Typography>
        </Box>

        <TextField
          label="Transport / Delivery Fee"
          type="number"
          size="small"
          fullWidth
          value={fees.transport}
          onChange={(e) =>
            setFees({ ...fees, transport: Number(e.target.value) || 0 })
          }
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">Rs.</InputAdornment>
            ),
          }}
          disabled={isCompleted}
        />

        <TextField
          label="Discount Applied"
          type="number"
          size="small"
          fullWidth
          value={fees.discount}
          onChange={(e) =>
            setFees({ ...fees, discount: Number(e.target.value) || 0 })
          }
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">Rs.</InputAdornment>
            ),
          }}
          disabled={isCompleted}
        />

        {hasFeeChanges && (
          <Button
            size="small"
            variant="contained"
            color="warning"
            fullWidth
            sx={{ mb: 2 }}
            onClick={handleUpdateFees}
            disabled={updateFeesMutation.isPending}
            disableElevation
          >
            {updateFeesMutation.isPending
              ? "Saving..."
              : "Save Fee Adjustments"}
          </Button>
        )}

        {lateFees > 0 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 1,
              px: 1,
            }}
          >
            <Typography color="error.main" fontWeight="bold">
              Accrued Late Fees
            </Typography>
            <Typography fontWeight="bold" color="error.main">
              + Rs. {lateFees.toLocaleString()}
            </Typography>
          </Box>
        )}
        <Divider sx={{ my: 1.5, borderStyle: "dashed" }} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 1,
            px: 1,
          }}
        >
          <Typography fontWeight="bold">Grand Total</Typography>
          <Typography fontWeight="bold">
            Rs. {grandTotal.toLocaleString()}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 1,
            px: 1,
          }}
        >
          <Typography color="success.main" fontWeight="bold">
            Total Paid
          </Typography>
          <Typography color="success.main" fontWeight="bold">
            - Rs. {totalPaid.toLocaleString()}
          </Typography>
        </Box>
      </Box>

      {/* 3. Transaction Action Area */}
      <Box>
        <TextField
          fullWidth
          label="Amount (Rs.)"
          type="number"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          sx={{ mb: 2 }}
          disabled={isCompleted && balance === 0}
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            fullWidth
            variant="contained"
            color="success"
            onClick={() => handlePayment(false)}
            disabled={paymentMutation.isPending || balance === 0}
            disableElevation
          >
            Collect Payment
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            onClick={() => handlePayment(true)}
            disabled={paymentMutation.isPending || totalPaid === 0}
          >
            Issue Refund
          </Button>
        </Box>
      </Box>

      <Divider sx={{ borderStyle: "dashed" }} />

      {/* 4. Timestamped Payment Ledger */}
      <Box>
        <Typography
          variant="subtitle2"
          fontWeight="bold"
          color="text.secondary"
          display="flex"
          alignItems="center"
          gap={1}
          mb={2}
        >
          <HistoryIcon fontSize="small" /> Transaction Ledger
        </Typography>
        {payments.length === 0 ? (
          <Typography variant="body2" color="text.disabled" fontStyle="italic">
            No payments recorded yet.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {payments.map((p: any) => {
              const isRefund = Number(p.payment_amount) < 0;
              return (
                <Box
                  key={p.payment_id}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 1.5,
                    border: "1px solid #e2e8f0",
                    borderRadius: 2,
                    bgcolor: "white",
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={isRefund ? "error.main" : "success.main"}
                    >
                      {isRefund ? "Refund" : "Payment"} ({p.method})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(p.payment_date).toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography
                    fontWeight="bold"
                    color={isRefund ? "error.main" : "text.primary"}
                  >
                    {isRefund ? "" : "+"} Rs.{" "}
                    {Math.abs(Number(p.payment_amount)).toLocaleString()}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* 5. Vault Action Area */}
      <Box
        sx={{
          mt: "auto",
          p: 2,
          border: "1px solid",
          borderColor: invoice.id_card_status ? "#fde047" : "#e2e8f0",
          borderRadius: 2,
          bgcolor: invoice.id_card_status ? "#fffbeb" : "#f8fafc",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <SecurityIcon
            color={invoice.id_card_status ? "warning" : "disabled"}
          />
          <Typography fontWeight="bold">Security Vault</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {invoice.id_card_status
            ? "Client's ID is locked in the vault."
            : "ID has been returned to client."}
        </Typography>
        <Button
          fullWidth
          variant={invoice.id_card_status ? "outlined" : "contained"}
          color={invoice.id_card_status ? "warning" : "inherit"}
          onClick={() => vaultMutation.mutate(invoice.invoice_id)}
          disabled={vaultMutation.isPending}
          disableElevation
        >
          {invoice.id_card_status ? "Release ID" : "Retain ID in Vault"}
        </Button>
      </Box>
    </Box>
  );
}

const EmptyState = ({ text }: { text: string }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      color: "#94a3b8",
      p: 3,
      textAlign: "center",
    }}
  >
    <Typography fontWeight="500">{text}</Typography>
  </Box>
);
