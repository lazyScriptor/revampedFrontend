import { useState } from "react";
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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SecurityIcon from "@mui/icons-material/Security";
import PaymentIcon from "@mui/icons-material/Payment";
import AssignmentReturnedIcon from "@mui/icons-material/AssignmentReturned";

import {
  useInvoiceSearch,
  useAddPayment,
  useToggleVault,
} from "../hooks/useInvoiceHooks";

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
          `INV-${option.invoice_id} • ${option.Customer?.first_name}`
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
                {option.Customer?.first_name} {option.Customer?.last_name} •{" "}
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

// --- PANE 2: ACTIVE LEDGER (X-Ray Version) ---
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

  // 1. The Ultimate Catcher
  const rawLines =
    invoice.InvoiceLines ||
    invoice.invoice_lines ||
    invoice.InvoiceLine ||
    invoice.lines ||
    [];

  // 2. Case-Insensitive Filtering
  const activeLines = rawLines.filter(
    (l: any) =>
      l.line_status?.toLowerCase() === "active" ||
      l.status?.toLowerCase() === "active" ||
      (!l.line_status && !l.status),
  );

  const returnedLines = rawLines.filter(
    (l: any) =>
      l.line_status?.toLowerCase() === "returned" ||
      l.status?.toLowerCase() === "returned",
  );

  // 3. Catch lines that have weird statuses
  const uncategorizedLines = rawLines.filter(
    (l: any) => !activeLines.includes(l) && !returnedLines.includes(l),
  );

  return (
    <Box sx={{ p: 3, height: "100%", overflowY: "auto" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Current Ledger
        </Typography>
        {activeLines.length > 0 && (
          <Button
            variant="contained"
            color="warning"
            startIcon={<AssignmentReturnedIcon />}
            disableElevation
            onClick={onOpenReturn}
          >
            Process Return
          </Button>
        )}
      </Box>

      {/* --- X-RAY DIAGNOSTICS BAR --- */}
      <Box
        sx={{
          p: 1.5,
          mb: 3,
          bgcolor: "#f1f5f9",
          borderRadius: 2,
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.85rem",
          color: "#64748b",
        }}
      >
        <span>
          <strong>X-Ray:</strong> Total Lines Found in JSON: {rawLines.length}
        </span>
        <span>
          (Active: {activeLines.length} | Returned: {returnedLines.length} |
          Unknown: {uncategorizedLines.length})
        </span>
      </Box>

      {/* Active Items */}
      <Typography
        variant="subtitle2"
        color="warning.dark"
        mb={1}
        fontWeight="bold"
      >
        Currently Out on Rent ({activeLines.length})
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 4 }}>
        {activeLines.map((line: any) => {
          const equipName =
            line.Equipment?.equipment_name ||
            line.equipment?.equipment_name ||
            `Unknown Item (ID: ${line.equipment_id})`;
          return (
            <Paper
              key={line.line_id || Math.random()}
              sx={{
                p: 2,
                border: "1px solid #fde047",
                borderRadius: 2,
                bgcolor: "#fefce8",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography fontWeight="bold">{equipName}</Typography>
                <Typography fontWeight="bold">
                  Qty: {line.borrow_quantity}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Expected Return:{" "}
                {line.expected_return_date
                  ? new Date(line.expected_return_date).toLocaleDateString()
                  : "N/A"}
              </Typography>
            </Paper>
          );
        })}
        {activeLines.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No active items.
          </Typography>
        )}
      </Box>

      {/* Uncategorized Items (If status is weird) */}
      {uncategorizedLines.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="subtitle2"
            color="error.main"
            mb={1}
            fontWeight="bold"
          >
            Status Unknown ({uncategorizedLines.length})
          </Typography>
          {uncategorizedLines.map((line: any, i: number) => (
            <Paper
              key={i}
              sx={{
                p: 2,
                border: "1px solid #fca5a5",
                borderRadius: 2,
                bgcolor: "#fef2f2",
              }}
            >
              <Typography fontWeight="bold">
                Item ID: {line.equipment_id}
              </Typography>
              <Typography color="error.main">
                Raw Status: "{line.line_status || line.status || "NULL"}"
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      {/* Returned Items */}
      <Typography
        variant="subtitle2"
        color="success.dark"
        mb={1}
        fontWeight="bold"
      >
        Already Returned ({returnedLines.length})
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {returnedLines.map((line: any) => {
          const equipName =
            line.Equipment?.equipment_name ||
            line.equipment?.equipment_name ||
            "Unknown Item";
          return (
            <Paper
              key={line.line_id || Math.random()}
              sx={{
                p: 2,
                border: "1px solid #bbf7d0",
                borderRadius: 2,
                bgcolor: "#f0fdf4",
                opacity: 0.8,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography fontWeight="bold" color="success.dark">
                  {equipName}
                </Typography>
                <Typography>
                  Safe: {line.good_returned_qty || 0} | Defective:{" "}
                  {line.defective_returned_qty || 0}
                </Typography>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
// --- PANE 3: FINANCIAL & VAULT TERMINAL ---
export function ManageFinancialPanel({
  invoice,
  showToast,
}: {
  invoice: any;
  showToast: any;
}) {
  const paymentMutation = useAddPayment();
  const vaultMutation = useToggleVault();
  const [paymentAmount, setPaymentAmount] = useState("");

  if (!invoice)
    return <EmptyState text="Financial controls will appear here." />;

  const totalPaid =
    invoice.Payments?.reduce(
      (sum: number, p: any) => sum + Number(p.payment_amount),
      0,
    ) || 0;
  const balance = Math.max(0, Number(invoice.total_amount) - totalPaid);

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
      {/* Financial Summary */}
      <Paper
        elevation={0}
        sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}
      >
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          Financial Overview
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography>Grand Total (incl. late fees)</Typography>
          <Typography fontWeight="bold">
            Rs. {Number(invoice.total_amount).toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography color="success.main">Total Paid</Typography>
          <Typography color="success.main">
            - Rs. {totalPaid.toLocaleString()}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            p: 1.5,
            bgcolor: balance > 0 ? "#fef2f2" : "#f0fdf4",
            borderRadius: 1,
          }}
        >
          <Typography fontWeight="bold">Remaining Balance</Typography>
          <Typography
            fontWeight="bold"
            color={balance > 0 ? "error.main" : "success.dark"}
          >
            Rs. {balance.toLocaleString()}
          </Typography>
        </Box>
      </Paper>

      {/* Terminal Actions */}
      <Box>
        <TextField
          fullWidth
          size="small"
          label="Amount (Rs.)"
          type="number"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          sx={{ mb: 1.5 }}
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            fullWidth
            variant="contained"
            disableElevation
            color="success"
            onClick={() => handlePayment(false)}
            disabled={paymentMutation.isPending}
          >
            Add Payment
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            onClick={() => handlePayment(true)}
            disabled={paymentMutation.isPending}
          >
            Issue Refund
          </Button>
        </Box>
      </Box>

      <Divider sx={{ borderStyle: "dashed" }} />

      {/* Vault Status */}
      <Box
        sx={{
          p: 2,
          border: "1px solid #e2e8f0",
          borderRadius: 2,
          bgcolor: invoice.id_card_status ? "#fffbeb" : "#f8fafc",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <SecurityIcon
            color={invoice.id_card_status ? "warning" : "disabled"}
          />
          <Typography fontWeight="bold">Physical ID Vault</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {invoice.id_card_status
            ? "ID Card is currently securely held in the vault."
            : "ID Card has been released to the customer."}
        </Typography>
        <Button
          fullWidth
          variant={invoice.id_card_status ? "outlined" : "contained"}
          color={invoice.id_card_status ? "warning" : "primary"}
          disableElevation
          onClick={() => vaultMutation.mutate(invoice.invoice_id)}
          disabled={vaultMutation.isPending}
        >
          {invoice.id_card_status
            ? "Release ID to Customer"
            : "Retain ID in Vault"}
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
