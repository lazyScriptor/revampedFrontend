import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  useTheme,
  useMediaQuery,
  Avatar,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import LockIcon from "@mui/icons-material/Lock";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PaymentIcon from "@mui/icons-material/Payment";
import HistoryIcon from "@mui/icons-material/History";
import { ReceiptPrintDialog } from "./ReceiptPrintDialog";

export interface ReadOnlyInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: any | null;
}

export function ReadOnlyInvoiceModal({
  open,
  onClose,
  invoice,
}: ReadOnlyInvoiceModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  if (!invoice) return null;

  const lines: any[] =
    invoice.InvoiceLines ||
    invoice.invoice_lines ||
    invoice.lines ||
    [];
  const payments: any[] =
    invoice.Payments ||
    invoice.payments ||
    [];
  const traces: any[] =
    invoice.InvoiceTraces ||
    invoice.invoice_traces ||
    invoice.traces ||
    [];

  const customer = invoice.Customer || invoice.customer;
  const onBehalf = invoice.OnBehalfOfCustomer || invoice.on_behalf_of_customer;

  const totalAmount = Number(invoice.total_amount || 0);
  const totalPaid = payments.reduce(
    (sum: number, p: any) => sum + Number(p.payment_amount || 0),
    0
  );
  const balanceDue = Math.max(0, totalAmount - totalPaid);
  const isSettled = balanceDue <= 0;
  const isActive = invoice.status === "Active";

  const customerName =
    customer?.company_name ||
    `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() ||
    "Customer";

  const onBehalfName = onBehalf
    ? onBehalf.company_name ||
      `${onBehalf.first_name || ""} ${onBehalf.last_name || ""}`.trim()
    : null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: isMobile ? 0 : 3,
              bgcolor: "#ffffff",
              boxShadow: "0 20px 40px -10px rgba(15, 23, 42, 0.2)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              maxHeight: isMobile ? "100vh" : "90vh",
            },
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            m: 0,
            p: 2.5,
            bgcolor: "#0f172a",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
              INV-{invoice.invoice_id}
            </Typography>
            <Chip
              size="small"
              label={invoice.status || "Unknown"}
              color={isActive ? "warning" : "success"}
              sx={{
                fontWeight: 700,
                fontSize: "0.72rem",
                height: 22,
                borderRadius: 1,
              }}
            />
            {Boolean(invoice.id_card_status) && (
              <Chip
                size="small"
                icon={<LockIcon sx={{ fontSize: 13, color: "#854d0e !important" }} />}
                label="ID in Vault"
                sx={{
                  bgcolor: "#fef08a",
                  color: "#854d0e",
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  height: 22,
                }}
              />
            )}
            <Typography
              variant="caption"
              sx={{
                color: "#94a3b8",
                fontVariantNumeric: "tabular-nums",
                display: { xs: "none", sm: "inline" },
              }}
            >
              Issued: {invoice.issued_date ? new Date(invoice.issued_date).toLocaleDateString() : "—"}
            </Typography>
          </Box>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: "#94a3b8",
              "&:hover": { color: "#ffffff", bgcolor: "rgba(255, 255, 255, 0.1)" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        {/* Content */}
        <DialogContent
          dividers
          sx={{
            p: { xs: 2, sm: 3 },
            bgcolor: "#f8fafc",
            overflowY: "auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          {/* Customer Context Card */}
          <Box
            sx={{
              p: 2,
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 2.5,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: customer?.customer_type === "Business" ? "#4f46e5" : "#475569",
                  fontWeight: 800,
                }}
              >
                {customer?.first_name?.charAt(0) || customer?.company_name?.charAt(0) || "C"}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, color: "#0f172a" }}>
                  {customerName}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
                  <Chip
                    size="small"
                    icon={customer?.customer_type === "Business" ? <BusinessIcon sx={{ fontSize: 13 }} /> : <PersonIcon sx={{ fontSize: 13 }} />}
                    label={customer?.customer_type || "Individual"}
                    variant="outlined"
                    sx={{ height: 20, fontSize: "0.68rem", fontWeight: 600 }}
                  />
                  {customer?.nic_number && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <BadgeIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                      <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                        {customer.nic_number}
                      </Typography>
                    </Box>
                  )}
                  {customer?.phone_number && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {customer.phone_number}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>

            {onBehalfName && (
              <Box
                sx={{
                  p: 1.25,
                  bgcolor: "#eef2ff",
                  border: "1px solid #c7d2fe",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  alignSelf: { xs: "stretch", sm: "auto" },
                }}
              >
                <AccountTreeIcon sx={{ fontSize: 16, color: "#4f46e5" }} />
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#4f46e5", display: "block", fontSize: "0.68rem" }}>
                    ON BEHALF OF
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#1e1b4b" }}>
                    {onBehalfName}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Equipment Items Table */}
          <Box
            sx={{
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 2.5,
              overflow: "hidden",
            }}
          >
            <Box sx={{ px: 2, py: 1.5, bgcolor: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                Rented Assets ({lines.length})
              </Typography>
            </Box>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem" }}>Asset</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem", textAlign: "center" }}>Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem" }}>Rental Period</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem", textAlign: "right" }}>Base Rate</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem", textAlign: "center" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem", textAlign: "right" }}>Line Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((line: any, idx: number) => {
                    const equipName = line.Equipment?.equipment_name || `Asset #${line.equipment_id || idx + 1}`;
                    const qty = Number(line.borrow_quantity || 1);
                    const returnedQty = (Number(line.good_returned_qty) || 0) + (Number(line.defective_returned_qty) || 0);
                    const isFullyReturned = returnedQty >= qty;
                    const lineTotal = Number(line.line_total_amount || 0);

                    return (
                      <TableRow key={line.line_id || idx} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                            {equipName}
                          </Typography>
                          {line.Equipment?.is_bulk_item && (
                            <Chip size="small" label="Bulk Asset" sx={{ height: 16, fontSize: "0.6rem", mt: 0.25 }} />
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                          {qty}
                        </TableCell>
                        <TableCell sx={{ fontVariantNumeric: "tabular-nums", fontSize: "0.78rem" }}>
                          <Typography variant="caption" sx={{ display: "block", color: "#0f172a", fontWeight: 600 }}>
                            {line.borrow_date ? new Date(line.borrow_date).toLocaleDateString() : "—"}
                            {" → "}
                            {line.expected_return_date ? new Date(line.expected_return_date).toLocaleDateString() : "—"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Min {line.locked_minimum_days || 1} day(s) · Extra Rs. {Number(line.locked_extra_daily_rate || 0).toLocaleString()}/day
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                          Rs. {Number(line.locked_base_price || 0).toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Chip
                            size="small"
                            label={isFullyReturned ? "Returned" : `${returnedQty}/${qty} Ret.`}
                            color={isFullyReturned ? "success" : "warning"}
                            sx={{ fontWeight: 700, fontSize: "0.65rem", height: 20 }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 800, color: "#0f172a" }}>
                          Rs. {lineTotal.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Box>

          {/* Financial Breakdown Card */}
          <Box
            sx={{
              p: 2.5,
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 2.5,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            {/* Left: Costs breakdown */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Order Summary
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  Rs. {Number(invoice.sub_total || 0).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Transport Fee</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  + Rs. {Number(invoice.transport_fee || 0).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Discount</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#10b981" }}>
                  - Rs. {Number(invoice.discount_amount || 0).toLocaleString()}
                </Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>Grand Total</Typography>
                <Typography variant="subtitle1" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 900, color: "#0f172a" }}>
                  Rs. {totalAmount.toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {/* Middle: Payments collected */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Payments Collected
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Total Paid</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "#059669" }}>
                  Rs. {totalPaid.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Transactions</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {payments.length} record(s)
                </Typography>
              </Box>
              {payments.length > 0 && (
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  {payments.slice(0, 3).map((p: any, i: number) => (
                    <Box key={p.payment_id || i} sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <Typography variant="caption" color="text.secondary">
                        {p.method || "Cash"} ({p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"})
                      </Typography>
                      <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                        Rs. {Number(p.payment_amount).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                  {payments.length > 3 && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>
                      +{payments.length - 3} more payments
                    </Typography>
                  )}
                </Stack>
              )}
            </Box>

            {/* Right: Net Balance Status */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: isSettled ? "#f0fdf4" : "#fef2f2",
                border: "1px solid",
                borderColor: isSettled ? "#bbf7d0" : "#fca5a5",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              {isSettled ? (
                <>
                  <CheckCircleOutlineIcon sx={{ fontSize: 32, color: "#16a34a", mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#16a34a", textTransform: "uppercase" }}>
                    Fully Settled
                  </Typography>
                  <Typography variant="h6" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 900, color: "#15803d" }}>
                    Rs. 0
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    No outstanding balance
                  </Typography>
                </>
              ) : (
                <>
                  <ErrorOutlineIcon sx={{ fontSize: 32, color: "#dc2626", mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#dc2626", textTransform: "uppercase" }}>
                    Balance Outstanding
                  </Typography>
                  <Typography variant="h6" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 900, color: "#b91c1c" }}>
                    Rs. {balanceDue.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 600 }}>
                    Payment pending
                  </Typography>
                </>
              )}
            </Box>
          </Box>

          {/* Activity / Trace Highlights (if available) */}
          {traces.length > 0 && (
            <Box sx={{ bgcolor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 2.5, p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <HistoryIcon sx={{ fontSize: 16, color: "#64748b" }} />
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Audit Activity ({traces.length})
                </Typography>
              </Box>
              <Stack spacing={0.75}>
                {traces.slice(0, 4).map((t: any, i: number) => (
                  <Box key={t.trace_id || i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        size="small"
                        label={t.event_action || t.event_category || "EVENT"}
                        sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700 }}
                      />
                      <Typography variant="caption" sx={{ color: "#334155" }}>
                        {t.comments || "Activity logged"}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "text.disabled", fontVariantNumeric: "tabular-nums" }}>
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>

        {/* Actions */}
        <DialogActions sx={{ px: 3, py: 2, bgcolor: "#ffffff", borderTop: "1px solid #e2e8f0", justifyContent: "space-between" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon />}
            onClick={() => setIsPrintOpen(true)}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              textTransform: "none",
              borderColor: "#cbd5e1",
              color: "#334155",
            }}
          >
            Print Receipt
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={onClose}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              textTransform: "none",
              bgcolor: "#0f172a",
              "&:hover": { bgcolor: "#1e293b" },
              px: 3,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Embedded thermal print dialog if requested */}
      {isPrintOpen && (
        <ReceiptPrintDialog
          open={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          invoice={invoice}
        />
      )}
    </>
  );
}
