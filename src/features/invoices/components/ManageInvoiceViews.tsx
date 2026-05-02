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
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SecurityIcon from "@mui/icons-material/Security";
import AssignmentReturnedIcon from "@mui/icons-material/AssignmentReturned";
import HistoryIcon from "@mui/icons-material/History";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentIcon from "@mui/icons-material/Payment";
import EditIcon from "@mui/icons-material/Edit";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
      boxShadow: `0 0 8px 2px ${color}80`,
      mr: 1.5,
    }}
  />
);

const customScrollbar = {
  "&::-webkit-scrollbar": { width: "6px" },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" },
  "&::-webkit-scrollbar-thumb:hover": { background: "#94a3b8" },
};

// ============================================================================
// PANE 1: INVOICE SEARCH
// ============================================================================
export function ManageSearchPanel({
  onSelectInvoice,
}: {
  onSelectInvoice: (id: number) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const { data: searchResults = [], isLoading } = useInvoiceSearch(inputValue);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 1, ...customScrollbar }}>
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
          ListboxProps={{ sx: { p: 1, bgcolor: "#f8fafc" } }}
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
          renderOption={(props, option: any) => {
            const { key, ...otherProps } = props as any;
            return (
              <Box
                component="li"
                key={key}
                {...otherProps}
                sx={{
                  p: 2,
                  mb: 1,
                  borderRadius: 2,
                  bgcolor: "white",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  },
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="body1"
                    fontWeight="600"
                    color="primary.main"
                  >
                    INV-{option.invoice_id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.Customer?.first_name} {option.Customer?.last_name}{" "}
                    {option.Customer?.phone_number}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={option.status}
                  color={option.status === "Active" ? "warning" : "success"}
                />
              </Box>
            );
          }}
        />
      </Box>
    </Box>
  );
}

// ============================================================================
// PANE 2: EQUIPMENT TRACKING BOARD (Upgraded UX with Pricing Breakdown)
// ============================================================================
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "#f8fafc",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          p: 3,
          bgcolor: "white",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
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

      <Box
        sx={{
          p: 3,
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 3,
          ...customScrollbar,
        }}
      >
        {rawLines.map((line: any) => {
          const isActive =
            line.line_status === "Active" || line.status === "Active";
          const equipName = line.Equipment?.equipment_name || "Unknown Asset";

          const alreadyReturned =
            (line.good_returned_qty || 0) + (line.defective_returned_qty || 0);
          const pending = line.borrow_quantity - alreadyReturned;

          const start = new Date(line.borrow_date).getTime();
          const today = new Date().getTime();
          let daysOut = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
          if (daysOut < 1) daysOut = 1;

          // --- 1. THE CORE MATH ENGINE ---
          let accruedCost = 0;
          const lockedBase = Number(line.locked_base_price) || 0;
          const lockedExtra = Number(line.locked_extra_daily_rate) || 0;
          const lockedMinDays = Number(line.locked_minimum_days) || 1;
          const borrowQty = Number(line.borrow_quantity) || 1;

          if (!isActive) {
            accruedCost = Number(line.line_total_amount) || 0;
          } else if (daysOut <= lockedMinDays) {
            accruedCost = lockedBase * borrowQty;
          } else {
            accruedCost =
              (lockedBase + (daysOut - lockedMinDays) * lockedExtra) *
              borrowQty;
          }

          // --- 2. UX INTELLIGENCE: Pricing Mode & Breakdown Formula ---
          const isDailyMode = lockedMinDays <= 1 && lockedBase === lockedExtra;

          let breakdownBadge = "";
          let breakdownFormula = "";

          if (!isActive) {
            breakdownBadge = "Settled";
            breakdownFormula = "Final computed cost locked at return.";
          } else if (isDailyMode) {
            breakdownBadge = "Flat Daily Rate";
            breakdownFormula = `Rs. ${lockedBase.toLocaleString()} × ${daysOut} Day(s) × ${borrowQty} Qty`;
          } else {
            breakdownBadge = `Tiered (${lockedMinDays} Day Base)`;
            if (daysOut <= lockedMinDays) {
              breakdownFormula = `Base Rs. ${lockedBase.toLocaleString()} × ${borrowQty} Qty (Covers ${lockedMinDays} Days)`;
            } else {
              const extraDays = daysOut - lockedMinDays;
              breakdownFormula = `[Base Rs. ${lockedBase.toLocaleString()} + (${extraDays} Extra Days × Rs. ${lockedExtra.toLocaleString()})] × ${borrowQty} Qty`;
            }
          }

          // Calculate formatting safely to prevent floating point artifacts (e.g. 3500.001)
          const formattedCost = Number(accruedCost.toFixed(2)).toLocaleString(
            undefined,
            { minimumFractionDigits: 0, maximumFractionDigits: 2 },
          );

          const lineIterations = returnTraces
            .map((trace: any) => {
              let payload = trace.state_payload || {};
              if (typeof payload === "string") {
                try {
                  payload = JSON.parse(payload);
                } catch (e) {
                  payload = {};
                }
              }
              const returnedLine = (payload.lines_returned || []).find(
                (l: any) => l.line_id === line.line_id,
              );

              if (
                returnedLine &&
                (Number(returnedLine.good_qty) > 0 ||
                  Number(returnedLine.defective_qty) > 0)
              ) {
                return {
                  date: trace.occurred_at || trace.createdAt,
                  good: Number(returnedLine.good_qty) || 0,
                  defective: Number(returnedLine.defective_qty) || 0,
                };
              }
              return null;
            })
            .filter(Boolean);

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
                flexShrink: 0,
              }}
            >
              <Box sx={{ p: 2.5 }}>
                {/* Header Area */}
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
                    <Typography variant="subtitle1" fontWeight="bold">
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

                {/* Data Grid Area */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Timeline (3 columns) */}
                  <Box className="md:col-span-3">
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
                        isActive && daysOut > lockedMinDays
                          ? "error.main"
                          : "text.primary"
                      }
                    >
                      Due:{" "}
                      {new Date(line.expected_return_date).toLocaleDateString()}
                    </Typography>
                  </Box>

                  {/* Stats (3 columns) */}
                  <Box className="md:col-span-3">
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textTransform="uppercase"
                      fontWeight="bold"
                    >
                      Total Stats
                    </Typography>
                    <Typography variant="body2" fontWeight="500" mt={0.5}>
                      Borrowed: {borrowQty}
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

                  {/* Financial Breakdown (6 columns - Takes up half the row) */}
                  <Box
                    className="md:col-span-6"
                    sx={{
                      bgcolor: "#f8fafc",
                      p: 1.5,
                      borderRadius: 2,
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        textTransform="uppercase"
                        fontWeight="bold"
                      >
                        Cost Till Today
                      </Typography>
                      <Chip
                        size="small"
                        label={breakdownBadge}
                        color={isActive ? "primary" : "default"}
                        variant={isActive ? "outlined" : "filled"}
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          fontWeight: "bold",
                        }}
                      />
                    </Box>

                    <Typography
                      variant="h6"
                      fontWeight="900"
                      color={isActive ? "primary.main" : "text.primary"}
                    >
                      Rs. {formattedCost}
                    </Typography>

                    {/* The Explainer Math Formula */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        display: "block",
                        borderTop: "1px dashed #cbd5e1",
                        pt: 0.5,
                        lineHeight: 1.2,
                      }}
                    >
                      {breakdownFormula}
                    </Typography>
                  </Box>
                </div>
              </Box>

              {/* Event Iteration Log */}
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
                          })}
                        </Typography>
                        {iteration.good > 0 && (
                          <Chip
                            size="small"
                            label={`${iteration.good} Safe`}
                            color="success"
                            variant="outlined"
                            sx={{
                              height: 22,
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                            }}
                          />
                        )}
                        {iteration.defective > 0 && (
                          <Chip
                            size="small"
                            label={`${iteration.defective} Broken`}
                            color="error"
                            variant="filled"
                            sx={{
                              height: 22,
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                            }}
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

// ============================================================================
// PANE 3: REDESIGNED POS TERMINAL & UNIFIED FINANCIAL LEDGER (Collapsible)
// ============================================================================
export function ManageFinancialPanel({
  invoice,
  showToast,
  isCollapsed,
  onToggleCollapse,
}: {
  invoice: any;
  showToast: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const paymentMutation = useAddPayment();
  const vaultMutation = useToggleVault();
  const updateFeesMutation = useUpdateFees();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isEditingFees, setIsEditingFees] = useState(false);

  // Accordion Expand States (Open by default)
  const [receiptExpanded, setReceiptExpanded] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);

  const initialTransport = Number(invoice?.transport_fee) || 0;
  const initialDiscount = Number(invoice?.discount_amount) || 0;
  const [fees, setFees] = useState({
    transport: initialTransport,
    discount: initialDiscount,
  });

  useEffect(() => {
    setFees({ transport: initialTransport, discount: initialDiscount });
    setIsEditingFees(false);
  }, [invoice?.invoice_id, initialTransport, initialDiscount]);

  if (!invoice)
    return <EmptyState text="Select an invoice to launch the Terminal." />;

  const payments = invoice.Payments || [];
  const totalPaid =
    payments.reduce(
      (sum: number, p: any) => sum + Number(p.payment_amount),
      0,
    ) || 0;
  const subTotal = Number(invoice.sub_total) || 0;
  const grandTotal = Number(invoice.total_amount) || 0;
  const lateFees = Math.max(
    0,
    grandTotal - (subTotal + initialTransport - initialDiscount),
  );
  const balance = Math.max(0, grandTotal - totalPaid);
  const isCompleted = invoice.status === "Completed";

  // --- COLLAPSED VERTICAL BAR ---
  if (isCollapsed) {
    return (
      <Box
        onClick={onToggleCollapse}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          alignItems: "center",
          py: 3,
          cursor: "pointer",
          color: "white",
          "&:hover": { bgcolor: "#1e293b" },
        }}
      >
        <Tooltip title="Expand Terminal" placement="left">
          <IconButton color="inherit" sx={{ mb: 4 }}>
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
        <Typography
          sx={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontWeight: "bold",
            letterSpacing: 2,
            fontSize: "1.2rem",
            whiteSpace: "nowrap",
          }}
        >
          BALANCE DUE: Rs. {balance.toLocaleString()}
        </Typography>
      </Box>
    );
  }

  // --- EXPANDED TERMINAL VIEW ---
  const paymentEvents = payments.map((p: any) => ({
    id: `pay-${p.payment_id}`,
    type: Number(p.payment_amount) < 0 ? "REFUND" : "PAYMENT",
    amount: Math.abs(Number(p.payment_amount)),
    method: p.method,
    date: p.payment_date || p.createdAt,
  }));

  const rawTraces =
    invoice.InvoiceTraces ||
    invoice.InvoiceTrace ||
    invoice.invoice_traces ||
    invoice.traces ||
    [];
  const feeEvents = rawTraces
    .filter((t: any) => t.event_action === "FEES_UPDATED")
    .map((t: any) => {
      let payload = t.state_payload || {};
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          payload = {};
        }
      }
      return {
        id: `fee-${t.trace_id}`,
        type: "FEE_ADJUSTMENT",
        transport: payload.transport_fee,
        discount: payload.discount_amount,
        date: t.occurred_at || t.createdAt,
      };
    });

  const unifiedLedger = [...paymentEvents, ...feeEvents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const handleUpdateFees = () => {
    updateFeesMutation.mutate(
      {
        id: invoice.invoice_id,
        data: { transport_fee: fees.transport, discount_amount: fees.discount },
      },
      {
        onSuccess: () => {
          showToast("Fees updated successfully.", "success");
          setIsEditingFees(false);
        },
      },
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

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "#f1f5f9",
        overflow: "hidden",
      }}
    >
      {/* 1. LOCKED HEADER */}
      <Box
        sx={{
          flexShrink: 0,
          p: 3,
          bgcolor: "white",
          borderBottom: "1px solid #e2e8f0",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Financial Terminal
        </Typography>
        <IconButton onClick={onToggleCollapse} size="small" color="primary">
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* SCROLLABLE CONTENT BODY */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          p: 3,
          ...customScrollbar,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            bgcolor: "#0f172a",
            color: "white",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <Typography
            variant="overline"
            color="#94a3b8"
            fontWeight="bold"
            letterSpacing={1}
          >
            Total Balance Due
          </Typography>
          <Typography
            variant="h3"
            fontWeight="900"
            color={balance > 0 ? "#f87171" : "#4ade80"}
            sx={{ mt: 0.5, mb: 3 }}
          >
            Rs. {balance.toLocaleString()}
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              width: "100%",
              bgcolor: "#1e293b",
              p: 1,
              borderRadius: 2,
              border: "1px solid #334155",
            }}
          >
            <TextField
              placeholder="0.00"
              size="small"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              disabled={isCompleted && balance === 0}
              sx={{
                flexGrow: 1,
                input: { color: "white", fontWeight: "bold" },
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              }}
              InputProps={{
                startAdornment: (
                  <Typography color="#94a3b8" mr={1} fontWeight="bold">
                    Rs.
                  </Typography>
                ),
              }}
            />
            <Button
              variant="contained"
              color="success"
              onClick={() => handlePayment(false)}
              disableElevation
              disabled={paymentMutation.isPending || balance === 0}
              sx={{ fontWeight: "bold", borderRadius: 1.5 }}
            >
              Pay
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handlePayment(true)}
              disableElevation
              disabled={paymentMutation.isPending || totalPaid === 0}
              sx={{ fontWeight: "bold", borderRadius: 1.5 }}
            >
              Refund
            </Button>
          </Box>
        </Paper>

        {/* --- ACCORDION 1: RECEIPT BREAKDOWN --- */}
        <Accordion
          expanded={receiptExpanded}
          onChange={() => setReceiptExpanded(!receiptExpanded)}
          disableGutters
          elevation={0}
          sx={{
            border: "1px solid #e2e8f0",
            borderRadius: "12px !important",
            overflow: "hidden",
            "&:before": { display: "none" },
            flexShrink: 0,
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              bgcolor: "#f8fafc",
              borderBottom: receiptExpanded ? "1px solid #e2e8f0" : "none",
            }}
          >
            <Typography
              fontWeight="bold"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <ReceiptLongIcon fontSize="small" /> Receipt Breakdown
            </Typography>
          </AccordionSummary>
          <AccordionDetails
            sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            {/* INLINE EDIT BUTTON */}
            {!isEditingFees && !isCompleted && (
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: -1 }}>
                <Button
                  size="small"
                  onClick={() => setIsEditingFees(true)}
                  sx={{ fontWeight: "bold" }}
                >
                  Edit Fees
                </Button>
              </Box>
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography color="text.secondary">Base Subtotal</Typography>
              <Typography fontWeight="500">
                Rs. {subTotal.toLocaleString()}
              </Typography>
            </Box>
            {isEditingFees ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  my: 1,
                  p: 2,
                  bgcolor: "#fffbeb",
                  borderRadius: 2,
                  border: "1px dashed #fde047",
                }}
              >
                <TextField
                  label="Transport Fee"
                  size="small"
                  type="number"
                  value={fees.transport}
                  onChange={(e) =>
                    setFees({ ...fees, transport: Number(e.target.value) || 0 })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">Rs.</InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Discount Applied"
                  size="small"
                  type="number"
                  value={fees.discount}
                  onChange={(e) =>
                    setFees({ ...fees, discount: Number(e.target.value) || 0 })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">Rs.</InputAdornment>
                    ),
                  }}
                />
                <Box
                  sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
                >
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => {
                      setFees({
                        transport: initialTransport,
                        discount: initialDiscount,
                      });
                      setIsEditingFees(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    onClick={handleUpdateFees}
                    disableElevation
                    disabled={updateFeesMutation.isPending}
                  >
                    Save
                  </Button>
                </Box>
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography
                    color="text.secondary"
                    display="flex"
                    alignItems="center"
                    gap={0.5}
                  >
                    <LocalShippingIcon fontSize="inherit" /> Transport
                  </Typography>
                  <Typography fontWeight="500">
                    + Rs. {initialTransport.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography color="text.secondary">
                    Discount Applied
                  </Typography>
                  <Typography fontWeight="500" color="error.main">
                    - Rs. {initialDiscount.toLocaleString()}
                  </Typography>
                </Box>
              </>
            )}

            {lateFees > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="error.main" fontWeight="bold">
                  Accrued Late Fees
                </Typography>
                <Typography fontWeight="bold" color="error.main">
                  + Rs. {lateFees.toLocaleString()}
                </Typography>
              </Box>
            )}

            <Divider sx={{ borderStyle: "dashed", my: 1 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography fontWeight="bold" variant="subtitle1">
                Grand Total
              </Typography>
              <Typography fontWeight="900" variant="subtitle1">
                Rs. {grandTotal.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography color="success.main" fontWeight="bold">
                Total Paid
              </Typography>
              <Typography color="success.main" fontWeight="bold">
                - Rs. {totalPaid.toLocaleString()}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* --- ACCORDION 2: FINANCIAL TIMELINE --- */}
        <Accordion
          expanded={timelineExpanded}
          onChange={() => setTimelineExpanded(!timelineExpanded)}
          disableGutters
          elevation={0}
          sx={{
            border: "1px solid #e2e8f0",
            borderRadius: "12px !important",
            overflow: "hidden",
            "&:before": { display: "none" },
            flexShrink: 0,
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              bgcolor: "#f8fafc",
              borderBottom: timelineExpanded ? "1px solid #e2e8f0" : "none",
            }}
          >
            <Typography
              fontWeight="bold"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <HistoryIcon fontSize="small" /> Financial Timeline
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {unifiedLedger.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  No transactions yet.
                </Typography>
              </Box>
            ) : (
              unifiedLedger.map((item, index) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 2,
                    borderBottom:
                      index < unifiedLedger.length - 1
                        ? "1px solid #f1f5f9"
                        : "none",
                    display: "flex",
                    gap: 2,
                    alignItems: "flex-start",
                  }}
                >
                  <Box sx={{ mt: 0.5 }}>
                    {item.type === "PAYMENT" && (
                      <PaymentIcon color="success" fontSize="small" />
                    )}
                    {item.type === "REFUND" && (
                      <PaymentIcon color="error" fontSize="small" />
                    )}
                    {item.type === "FEE_ADJUSTMENT" && (
                      <EditIcon color="warning" fontSize="small" />
                    )}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    {item.type === "FEE_ADJUSTMENT" ? (
                      <>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="warning.dark"
                        >
                          Fees Adjusted by User
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Transport: Rs. {item.transport} | Discount: Rs.{" "}
                          {item.discount}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={
                            item.type === "REFUND"
                              ? "error.main"
                              : "success.main"
                          }
                        >
                          {item.type === "REFUND"
                            ? "Refund Issued"
                            : "Payment Collected"}{" "}
                          ({item.method})
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Amount: Rs. {item.amount.toLocaleString()}
                        </Typography>
                      </>
                    )}
                    <Typography
                      variant="caption"
                      color="#cbd5e1"
                      fontWeight="bold"
                    >
                      {new Date(item.date).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </AccordionDetails>
        </Accordion>

        {/* VAULT STATUS */}
        <Box
          sx={{
            p: 2,
            border: "1px solid",
            borderColor: invoice.id_card_status ? "#fde047" : "#e2e8f0",
            borderRadius: 2,
            bgcolor: invoice.id_card_status ? "#fffbeb" : "white",
            flexShrink: 0,
            mt: "auto",
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
