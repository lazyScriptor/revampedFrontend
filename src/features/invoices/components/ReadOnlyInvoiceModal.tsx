import { useState } from "react";
import { formatDateTime } from "@/lib/dates";
import { invoiceStatusLabel } from "@/features/invoices/lib/invoiceStatus";
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
import HistoryIcon from "@mui/icons-material/History";
import { ReceiptPrintDialog } from "./ReceiptPrintDialog";
import { WhatsAppButton } from "@/features/whatsapp/components/WhatsAppButton";
import { suggestedTemplate } from "@/features/whatsapp/lib/whatsapp";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const dayWords = { today: t("time.today"), yesterday: t("time.yesterday") };
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
    t("invoices.ReadOnlyInvoiceModal.customer");

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
              label={invoice.status ? t(invoiceStatusLabel(invoice.status)) : t("invoices.ReadOnlyInvoiceModal.unknown")}
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
                label={t("customers.CustomerFormDialog.idInVault")}
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
              {t("invoices.ReadOnlyInvoiceModal.issued")} {formatDateTime(invoice.issued_date || invoice.createdAt, dayWords)}
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
                    label={customer?.customer_type || t("customers.individual")}
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
                    {t("invoices.ReadOnlyInvoiceModal.onBehalfOf")}
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
                {t("invoices.ReadOnlyInvoiceModal.rentedAssets", { linesCount: lines.length })}
              </Typography>
            </Box>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem" }}>{t("accounting.asset")}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem", textAlign: "center" }}>{t("common.qty")}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem" }}>{t("invoices.ReadOnlyInvoiceModal.rentalPeriod")}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem", textAlign: "right" }}>{t("invoices.ReadOnlyInvoiceModal.baseRate")}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem", textAlign: "center" }}>{t("common.status")}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem", textAlign: "right" }}>{t("invoices.ReadOnlyInvoiceModal.lineTotal")}</TableCell>
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
                            <Chip size="small" label={t("invoices.ReadOnlyInvoiceModal.bulkAsset")} sx={{ height: 16, fontSize: "0.6rem", mt: 0.25 }} />
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                          {qty}
                        </TableCell>
                        <TableCell sx={{ fontVariantNumeric: "tabular-nums", fontSize: "0.78rem" }}>
                          <Typography variant="caption" sx={{ display: "block", color: "#0f172a", fontWeight: 600 }}>
                            {line.borrow_date ? new Date(line.borrow_date).toLocaleDateString() : "—"}
                            {line.track_overdue !== false && line.track_overdue !== 0 && line.expected_return_date
                              ? ` → ${new Date(line.expected_return_date).toLocaleDateString()}`
                              : ""}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t("invoices.ReadOnlyInvoiceModal.minDaySExtraRs", { value: line.locked_minimum_days || 1, value2: Number(line.locked_extra_daily_rate || 0).toLocaleString() })}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                          Rs. {Number(line.locked_base_price || 0).toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Chip
                            size="small"
                            label={isFullyReturned ? t("invoices.returned") : `${returnedQty}/${qty} Ret.`}
                            color={isFullyReturned ? "success" : "warning"}
                            sx={{ fontWeight: 700, fontSize: "0.65rem", height: 20, fontVariantNumeric: "tabular-nums" }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 800, color: "#0f172a", fontFamily: "'JetBrains Mono', monospace" }}>
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
                {t("invoices.ReadOnlyInvoiceModal.orderSummary")}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">{t("common.subtotal")}</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                  Rs. {Number(invoice.sub_total || 0).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">{t("invoices.ManageInvoiceViews.transportFee")}</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                  + Rs. {Number(invoice.transport_fee || 0).toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">{t("common.discount")}</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#10b981", fontFamily: "'JetBrains Mono', monospace" }}>
                  - Rs. {Number(invoice.discount_amount || 0).toLocaleString()}
                </Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>{t("invoices.grandTotal")}</Typography>
                <Typography variant="subtitle1" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 900, color: "#0f172a", fontFamily: "'JetBrains Mono', monospace" }}>
                  Rs. {totalAmount.toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {/* Middle: Payments collected */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("invoices.ReadOnlyInvoiceModal.paymentsCollected")}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">{t("orders.totalPaid")}</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "#059669", fontFamily: "'JetBrains Mono', monospace" }}>
                  Rs. {totalPaid.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">{t("accounting.CashFlowSummary.transactions")}</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {t("invoices.ReadOnlyInvoiceModal.recordS", { paymentsCount: payments.length })}
                </Typography>
              </Box>
              {payments.length > 0 && (
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  {payments.slice(0, 3).map((p: any, i: number) => (
                    <Box key={p.payment_id || i} sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <Typography variant="caption" color="text.secondary">
                        {p.method || t("orders.methodCash")} ({formatDateTime(p.payment_date || p.createdAt, dayWords)})
                      </Typography>
                      <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                        Rs. {Number(p.payment_amount).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                  {payments.length > 3 && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>
                      {t("invoices.ReadOnlyInvoiceModal.morePayments", { value: payments.length - 3 })}
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
                    {t("invoices.ReadOnlyInvoiceModal.fullySettled")}
                  </Typography>
                  <Typography variant="h6" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 900, color: "#15803d" }}>
                    {t("invoices.ReadOnlyInvoiceModal.rs0")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("invoices.ReadOnlyInvoiceModal.noOutstandingBalance")}
                  </Typography>
                </>
              ) : (
                <>
                  <ErrorOutlineIcon sx={{ fontSize: 32, color: "#dc2626", mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#dc2626", textTransform: "uppercase" }}>
                    {t("invoices.ReadOnlyInvoiceModal.balanceOutstanding")}
                  </Typography>
                  <Typography variant="h6" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 900, color: "#b91c1c" }}>
                    Rs. {balanceDue.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 600 }}>
                    {t("invoices.ReadOnlyInvoiceModal.paymentPending")}
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
                  {t("invoices.ReadOnlyInvoiceModal.auditActivity", { tracesCount: traces.length })}
                </Typography>
              </Box>
              <Stack spacing={0.75}>
                {traces.slice(0, 4).map((trace: any, i: number) => (
                  <Box key={trace.trace_id || i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        size="small"
                        label={trace.event_action || trace.event_category || "EVENT"}
                        sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700 }}
                      />
                      <Typography variant="caption" sx={{ color: "#334155" }}>
                        {trace.comments || t("invoices.ReadOnlyInvoiceModal.activityLogged")}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "text.disabled", fontVariantNumeric: "tabular-nums" }}>
                      {trace.createdAt ? formatDateTime(trace.createdAt, dayWords) : ""}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>

        {/* Actions */}
        <DialogActions sx={{ px: 3, py: 2, bgcolor: "#ffffff", borderTop: "1px solid #e2e8f0", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
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
              {t("invoices.ReadOnlyInvoiceModal.printReceipt")}
            </Button>
            {invoice?.invoice_id && (
              <WhatsAppButton variant="button" size="small" invoiceId={Number(invoice.invoice_id)} templateKey={suggestedTemplate(invoice.status)} />
            )}
          </Box>

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
            {t("common.close")}
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
