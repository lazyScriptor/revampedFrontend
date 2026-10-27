import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/dates";
import type { ReactNode } from "react";
import {
  alpha,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  ListItemIcon,
  Menu,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HistoryIcon from "@mui/icons-material/History";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SecurityIcon from "@mui/icons-material/Security";
import TaskAltIcon from "@mui/icons-material/TaskAlt";

import { Can } from "@/components/auth/Can";
import { tk } from "@/i18n/marker";
import { WhatsAppButton } from "@/features/whatsapp/components/WhatsAppButton";
import { suggestedTemplate } from "@/features/whatsapp/lib/whatsapp";
import {
  useAddPayment,
  useCompleteInvoice,
  useReopenInvoice,
  useToggleVault,
  useUpdateFees,
} from "../hooks/useInvoiceHooks";
import { invoiceStatusColor, invoiceStatusLabel, moneyState, unitsOut } from "../lib/invoiceStatus";
import { DeleteInvoiceDialog } from "./DeleteInvoiceDialog";
import { InvoicePrintHistoryDialog } from "./InvoicePrintHistoryDialog";
import { ReceiptPrintDialog } from "./ReceiptPrintDialog";

const MONO = "'JetBrains Mono', monospace";
const PAYMENT_METHODS = ["Cash", "Card", "Transfer", "Cheque"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];
const METHOD_LABELS: Record<PaymentMethod, string> = {
  Cash: tk("invoices.FinancialPanel.method.Cash"),
  Card: tk("invoices.FinancialPanel.method.Card"),
  Transfer: tk("invoices.FinancialPanel.method.Transfer"),
  Cheque: tk("invoices.FinancialPanel.method.Cheque"),
};
type Mode = "collect" | "refund";

const rs = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;
const num = { fontFamily: MONO, fontVariantNumeric: "tabular-nums" } as const;

// Small presentational pieces live at module level so React keeps their identity between renders.
function Row({ label, value, strong, tone, action }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: string; action?: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 28 }}>
      <Typography variant="body2" sx={{ flexGrow: 1, color: strong ? "text.primary" : "text.secondary", fontWeight: strong ? 800 : 500 }}>
        {label}
      </Typography>
      {action}
      <Typography variant="body2" sx={{ fontWeight: strong ? 900 : 600, color: tone || "text.primary", ...num }}>
        {value}
      </Typography>
    </Box>
  );
}

function Card({ children, sx }: { children: ReactNode; sx?: object }) {
  const theme = useTheme();
  const border = (theme.palette as any).border?.subtle || theme.palette.divider;
  return <Box sx={{ border: "1px solid", borderColor: border, borderRadius: 3, bgcolor: "background.paper", p: 1.75, ...sx }}>{children}</Box>;
}

function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {ok ? <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: "text.disabled" }} />}
      <Typography variant="body2" sx={{ color: ok ? "text.primary" : "text.secondary", fontWeight: ok ? 600 : 500 }}>
        {children}
      </Typography>
    </Box>
  );
}

interface ManageFinancialPanelProps {
  invoice: any;
  showToast: (message: string, severity?: "error" | "success" | "warning") => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onInvoiceDeleted?: () => void;
}

// Right pane of Manage Orders: where the money is settled and the invoice is closed.
// One calm surface, one primary action at a time. Returning the last item never closes the
// invoice — staff press "Complete invoice" once refunds / discounts / balances are settled.
export function ManageFinancialPanel({ invoice, showToast, isCollapsed, onToggleCollapse, onInvoiceDeleted }: ManageFinancialPanelProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const paymentMutation = useAddPayment();
  const vaultMutation = useToggleVault();
  const feesMutation = useUpdateFees();
  const completeMutation = useCompleteInvoice();
  const reopenMutation = useReopenInvoice();

  const [mode, setMode] = useState<Mode>("collect");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [editing, setEditing] = useState<null | "discount" | "transport">(null);
  const [feeDraft, setFeeDraft] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [releaseId, setReleaseId] = useState(true);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const invoiceId = invoice?.invoice_id;
  // open on the action that is actually due: Refund when money is owed back to the customer
  const refundDueNow = invoice
    ? moneyState(Number(invoice.total_amount) || 0, (invoice.Payments || []).filter((p: any) => !p.is_voided).reduce((s: number, p: any) => s + Number(p.payment_amount || 0), 0)).state === "refund"
    : false;
  useEffect(() => {
    setAmount("");
    setEditing(null);
    setMode(refundDueNow ? "refund" : "collect");
    setConfirmOpen(false);
  }, [invoiceId, refundDueNow]);

  const border = (theme.palette as any).border?.subtle || theme.palette.divider;

  // ── nothing selected ──
  if (!invoice) {
    return (
      <Box
        onClick={isCollapsed ? onToggleCollapse : undefined}
        sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.paper", color: "text.disabled", cursor: isCollapsed ? "pointer" : "default" }}
      >
        {isCollapsed ? (
          <ChevronLeftIcon />
        ) : (
          <Box sx={{ textAlign: "center", p: 3 }}>
            <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t("invoices.ManageInvoiceViews.selectAnInvoiceToOpen")}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // ── figures ──
  const payments: any[] = (invoice.Payments || []).filter((p: any) => !p.is_voided);
  const paid = payments.reduce((s, p) => s + Number(p.payment_amount || 0), 0);
  const subTotal = Number(invoice.sub_total) || 0;
  const transport = Number(invoice.transport_fee) || 0;
  const discount = Number(invoice.discount_amount) || 0;
  const total = Number(invoice.total_amount) || 0;
  const lateFees = Math.max(0, total - (subTotal + transport - discount));
  const money = moneyState(total, paid);
  const out = unitsOut(invoice.InvoiceLines || []);
  const isCompleted = invoice.status === "Completed";
  const canComplete = !isCompleted && out === 0 && money.state === "settled";
  const idHeld = !!invoice.id_card_status;

  const hero = {
    owes: { label: t("invoices.FinancialPanel.customerOwes"), color: theme.palette.error.main },
    refund: { label: t("invoices.FinancialPanel.refundDue"), color: theme.palette.warning.dark },
    settled: { label: isCompleted ? t("invoices.FinancialPanel.closed") : t("invoices.FinancialPanel.settled"), color: theme.palette.success.main },
  }[money.state];

  // ── collapsed rail ──
  if (isCollapsed) {
    return (
      <Box
        onClick={onToggleCollapse}
        sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", py: 3, gap: 3, cursor: "pointer", bgcolor: "background.paper", "&:hover": { bgcolor: "action.hover" } }}
      >
        <Tooltip title={t("invoices.ManageInvoiceViews.expandTerminal")} placement="left">
          <IconButton size="small">
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
        <Typography sx={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontWeight: 800, letterSpacing: 1, color: hero.color, whiteSpace: "nowrap", ...num }}>
          {hero.label} · {rs(money.amount)}
        </Typography>
      </Box>
    );
  }

  // ── actions ──
  const submitPayment = () => {
    const value = Number(amount);
    if (!(value > 0)) return showToast(t("invoices.ManageInvoiceViews.enterAValidAmount"), "error");
    if (mode === "refund" && value > paid + 0.005) return showToast(t("invoices.ManageInvoiceViews.cannotRefundMoreThanPaid"), "error");
    paymentMutation.mutate(
      { id: invoiceId, data: { amount: value, method, is_refund: mode === "refund" } },
      {
        onSuccess: () => {
          showToast(mode === "refund" ? t("invoices.ManageInvoiceViews.refundIssued") : t("invoices.ManageInvoiceViews.paymentRecorded"), "success");
          setAmount("");
        },
        onError: (e: any) => showToast(e?.message || t("errors.unexpected"), "error"),
      },
    );
  };

  const startEdit = (field: "discount" | "transport") => {
    setEditing(field);
    setFeeDraft(String(field === "discount" ? discount : transport));
  };
  const saveFee = () => {
    const value = Number(feeDraft);
    if (!(value >= 0)) return showToast(t("invoices.ManageInvoiceViews.enterAValidAmount"), "error");
    feesMutation.mutate(
      { id: invoiceId, data: { transport_fee: editing === "transport" ? value : transport, discount_amount: editing === "discount" ? value : discount } },
      {
        onSuccess: () => {
          showToast(t("invoices.ManageInvoiceViews.feesUpdated"), "success");
          setEditing(null);
        },
        onError: (e: any) => showToast(e?.message || t("errors.unexpected"), "error"),
      },
    );
  };

  const complete = () =>
    completeMutation.mutate(
      { id: invoiceId, release_id_card: idHeld && releaseId },
      {
        onSuccess: () => {
          showToast(t("invoices.FinancialPanel.completedToast"), "success");
          setConfirmOpen(false);
        },
        onError: (e: any) => {
          showToast(e?.message || t("errors.unexpected"), "error");
          setConfirmOpen(false);
        },
      },
    );

  const reopen = () =>
    reopenMutation.mutate(invoiceId, {
      onSuccess: () => showToast(t("invoices.FinancialPanel.reopenedToast"), "success"),
      onError: (e: any) => showToast(e?.message || t("errors.unexpected"), "error"),
    });

  // money still to move, used to pre-fill the amount box
  const suggested = money.state === "owes" && mode === "collect" ? money.amount : money.state === "refund" && mode === "refund" ? money.amount : 0;

  // ── small pieces ──
  // a plain function (not a component) so the edit box keeps focus while typing
  const feeRow = (field: "discount" | "transport", label: string, value: number, sign: "+" | "−") =>
    editing === field ? (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
        <TextField
          autoFocus
          size="small"
          label={label}
          value={feeDraft}
          onChange={(e) => setFeeDraft(e.target.value.replace(/[^0-9.]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveFee();
            if (e.key === "Escape") setEditing(null);
          }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">Rs.</InputAdornment> }, htmlInput: { inputMode: "decimal", style: num } }}
          sx={{ flexGrow: 1 }}
        />
        <Button size="small" onClick={() => setEditing(null)} color="inherit" sx={{ textTransform: "none" }}>
          {t("common.cancel")}
        </Button>
        <Button size="small" variant="contained" disableElevation onClick={saveFee} disabled={feesMutation.isPending} sx={{ textTransform: "none", fontWeight: 700 }}>
          {t("common.save")}
        </Button>
      </Box>
    ) : (
      <Row
        label={label}
        value={`${sign} ${rs(value)}`}
        tone={sign === "−" && value > 0 ? theme.palette.success.dark : undefined}
        action={
          !isCompleted && (
            <Tooltip title={t("common.edit")}>
              <IconButton size="small" onClick={() => startEdit(field)} aria-label={`${t("common.edit")} ${label}`} sx={{ color: "text.secondary" }}>
                <EditOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )
        }
      />
    );

  // ── ledger events (newest first) ──
  const events = [...payments]
    .sort((a, b) => new Date(b.payment_date || b.createdAt).getTime() - new Date(a.payment_date || a.createdAt).getTime())
    .map((p) => ({ id: p.payment_id, refund: Number(p.payment_amount) < 0, amount: Math.abs(Number(p.payment_amount)), method: p.method, date: p.payment_date || p.createdAt }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, bgcolor: alpha(theme.palette.text.primary, 0.025) }}>
      {/* header */}
      <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.25, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: border }}>
        <Typography sx={{ fontWeight: 800, ...num }}>INV-{invoiceId}</Typography>
        <Chip size="small" color={invoiceStatusColor(invoice.status)} label={t(invoiceStatusLabel(invoice.status))} sx={{ fontWeight: 700 }} />
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={onToggleCollapse} aria-label={t("invoices.FinancialPanel.collapse")}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* body */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 1.5, display: "flex", flexDirection: "column", gap: 1.5, "& > *": { flexShrink: 0 } }}>
        {/* 1. where the money stands */}
        <Card sx={{ textAlign: "center", py: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "text.secondary" }}>
            {hero.label}
          </Typography>
          <Typography data-testid="money-hero" sx={{ fontSize: { xs: "1.7rem", md: "2rem" }, fontWeight: 900, color: hero.color, lineHeight: 1.2, ...num }}>
            {rs(money.amount)}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", ...num }}>
            {t("invoices.FinancialPanel.totalPaidLine", { total: rs(total), paid: rs(paid) })}
          </Typography>
          <Divider sx={{ my: 1.25 }} />
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
            <SecurityIcon sx={{ fontSize: 16, color: idHeld ? "warning.main" : "text.disabled" }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: idHeld ? "warning.dark" : "text.secondary" }}>
              {idHeld ? t("invoices.ManageInvoiceViews.idCurrentlyHeldInVault") : t("invoices.ManageInvoiceViews.idReleasedToClient")}
            </Typography>
            <Button size="small" onClick={() => vaultMutation.mutate(invoiceId)} disabled={vaultMutation.isPending} sx={{ textTransform: "none", fontWeight: 700, minWidth: 0, py: 0 }}>
              {idHeld ? t("orders.releaseId") : t("invoices.ManageInvoiceViews.retainId")}
            </Button>
          </Box>
        </Card>

        {/* 2. the bill */}
        <Card>
          <Row label={t("orders.baseSubtotal")} value={rs(subTotal)} />
          {lateFees > 0 && <Row label={t("invoices.ManageInvoiceViews.lateFees")} value={`+ ${rs(lateFees)}`} tone={theme.palette.error.main} />}
          {feeRow("transport", t("invoices.transport"), transport, "+")}
          {feeRow("discount", t("common.discount"), discount, "−")}
          {!isCompleted && discount === 0 && editing !== "discount" && (
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: -0.25, mb: 0.5 }}>
              {t("invoices.FinancialPanel.discountHint")}
            </Typography>
          )}
          <Divider sx={{ my: 0.75, borderStyle: "dashed" }} />
          <Row label={t("invoices.grandTotal")} value={rs(total)} strong />
          <Row label={t("orders.totalPaid")} value={`− ${rs(paid)}`} />
          <Row label={hero.label} value={rs(money.amount)} strong tone={hero.color} />
        </Card>

        {/* 3. take or give money */}
        {!isCompleted && (
          <Card>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={mode}
              onChange={(_, v: Mode | null) => {
                if (v) {
                  setMode(v);
                  setAmount("");
                }
              }}
              sx={{ mb: 1.25 }}
            >
              <ToggleButton value="collect" sx={{ textTransform: "none", fontWeight: 700 }}>
                {t("orders.collect")}
              </ToggleButton>
              <ToggleButton value="refund" disabled={paid <= 0} sx={{ textTransform: "none", fontWeight: 700 }}>
                {t("invoices.ManageInvoiceViews.refund")}
              </ToggleButton>
            </ToggleButtonGroup>
            <TextField
              fullWidth
              size="small"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && submitPayment()}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                  endAdornment:
                    suggested > 0 ? (
                      <InputAdornment position="end">
                        <Chip size="small" clickable label={t("invoices.FinancialPanel.fill", { amount: rs(suggested) })} onClick={() => setAmount(String(suggested))} sx={{ fontWeight: 700, ...num }} />
                      </InputAdornment>
                    ) : undefined,
                },
                htmlInput: { inputMode: "decimal", "aria-label": t("invoices.FinancialPanel.amount"), style: { ...num, fontWeight: 700 } },
              }}
            />
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", my: 1.25 }}>
              {PAYMENT_METHODS.map((m) => (
                <Chip
                  key={m}
                  size="small"
                  clickable
                  label={t(METHOD_LABELS[m])}
                  onClick={() => setMethod(m)}
                  color={method === m ? "primary" : "default"}
                  variant={method === m ? "filled" : "outlined"}
                  sx={{ fontWeight: 700 }}
                />
              ))}
            </Box>
            <Button
              fullWidth
              variant="contained"
              disableElevation
              onClick={submitPayment}
              disabled={paymentMutation.isPending || !(Number(amount) > 0)}
              color={mode === "refund" ? "warning" : "primary"}
              sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2.5, py: 1 }}
            >
              {paymentMutation.isPending ? <CircularProgress size={18} color="inherit" /> : mode === "refund" ? t("invoices.FinancialPanel.refundAmount", { amount: rs(Number(amount) || 0) }) : t("invoices.FinancialPanel.collectAmount", { amount: rs(Number(amount) || 0) })}
            </Button>
          </Card>
        )}

        {/* 4. close the invoice */}
        <Card sx={{ borderColor: canComplete ? "success.main" : border }}>
          {isCompleted ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TaskAltIcon sx={{ color: "success.main" }} />
              <Typography sx={{ fontWeight: 800, flexGrow: 1 }}>{t("invoices.FinancialPanel.invoiceClosed")}</Typography>
              <Can perform="invoice:edit">
                <Button size="small" startIcon={<LockOpenOutlinedIcon />} onClick={reopen} disabled={reopenMutation.isPending} sx={{ textTransform: "none", fontWeight: 700 }}>
                  {t("invoices.FinancialPanel.reopen")}
                </Button>
              </Can>
            </Box>
          ) : (
            <>
              <Typography sx={{ fontWeight: 800, mb: 1 }}>{t("invoices.FinancialPanel.closeTitle")}</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 1.25 }}>
                <Check ok={out === 0}>{out === 0 ? t("invoices.FinancialPanel.allReturned") : t("invoices.FinancialPanel.itemsOut", { count: out })}</Check>
                <Check ok={money.state === "settled"}>
                  {money.state === "settled"
                    ? t("invoices.FinancialPanel.moneySettled")
                    : money.state === "owes"
                      ? t("invoices.FinancialPanel.collectFirst", { amount: rs(money.amount) })
                      : t("invoices.FinancialPanel.refundFirst", { amount: rs(money.amount) })}
                </Check>
              </Box>
              <Can perform="invoice:action:process_return">
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  disableElevation
                  startIcon={<TaskAltIcon />}
                  disabled={!canComplete}
                  onClick={() => {
                    setReleaseId(true);
                    setConfirmOpen(true);
                  }}
                  sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2.5, py: 1 }}
                >
                  {t("invoices.FinancialPanel.complete")}
                </Button>
              </Can>
            </>
          )}
        </Card>

        {/* 5. documents and less frequent actions */}
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => setPrintOpen(true)} sx={{ flexGrow: 1, textTransform: "none", fontWeight: 700, borderRadius: 2.5 }}>
            {t("invoices.FinancialPanel.printBill")}
          </Button>
          <WhatsAppButton invoiceId={invoiceId} templateKey={suggestedTemplate(invoice.status)} size="medium" />
          <Tooltip title={t("invoices.FinancialPanel.more")}>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label={t("invoices.FinancialPanel.more")} sx={{ border: "1px solid", borderColor: border }}>
              <MoreHorizIcon />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
            <Can perform="invoice:print_log:view">
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setHistoryOpen(true);
                }}
              >
                <ListItemIcon>
                  <HistoryIcon fontSize="small" />
                </ListItemIcon>
                {t("invoices.ManageInvoiceViews.viewBillPrintHistory")}
              </MenuItem>
            </Can>
            <Can perform={["invoice:delete", "invoice:delete:any"]}>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setDeleteOpen(true);
                }}
                sx={{ color: "error.main" }}
              >
                <ListItemIcon>
                  <DeleteOutlinedIcon fontSize="small" color="error" />
                </ListItemIcon>
                {t("invoices.delete.button")}
              </MenuItem>
            </Can>
          </Menu>
        </Box>

        {/* 6. payment history */}
        <Card sx={{ p: 0 }}>
          <Button
            fullWidth
            onClick={() => setLedgerOpen((o) => !o)}
            endIcon={<ExpandMoreIcon sx={{ transform: ledgerOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />}
            sx={{ justifyContent: "space-between", textTransform: "none", fontWeight: 700, color: "text.primary", px: 1.75, py: 1.1 }}
          >
            {t("orders.transactionLedger")} ({events.length})
          </Button>
          <Collapse in={ledgerOpen}>
            {events.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1.75, pb: 1.5 }}>
                {t("orders.noTransactions")}
              </Typography>
            ) : (
              events.map((e) => (
                <Box key={e.id} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.75, py: 1, borderTop: "1px solid", borderColor: border }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" component="div" sx={{ fontWeight: 700 }}>
                      {e.refund ? t("invoices.ManageInvoiceViews.refund") : t("invoices.ManageInvoiceViews.payment")}
                      <Chip size="small" label={e.method} sx={{ ml: 1, height: 18, fontSize: "0.65rem" }} />
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                      {e.date ? formatDateTime(e.date, { today: t("time.today"), yesterday: t("time.yesterday") }) : ""}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: e.refund ? "warning.dark" : "success.dark", ...num }}>
                    {e.refund ? "−" : "+"} {rs(e.amount)}
                  </Typography>
                </Box>
              ))
            )}
          </Collapse>
        </Card>
      </Box>

      {/* confirm close */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{t("invoices.FinancialPanel.confirmTitle", { id: invoiceId })}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t("invoices.FinancialPanel.confirmBody")}
          </Typography>
          {idHeld && (
            <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={releaseId} onChange={(e) => setReleaseId(e.target.checked)} />} label={t("invoices.FinancialPanel.releaseIdToo")} />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} color="inherit" sx={{ textTransform: "none" }}>
            {t("common.cancel")}
          </Button>
          <Button onClick={complete} variant="contained" color="success" disableElevation disabled={completeMutation.isPending} sx={{ textTransform: "none", fontWeight: 800 }}>
            {t("invoices.FinancialPanel.complete")}
          </Button>
        </DialogActions>
      </Dialog>

      <ReceiptPrintDialog open={printOpen} onClose={() => setPrintOpen(false)} invoice={invoice} />
      <InvoicePrintHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} invoiceId={invoiceId} invoiceNumber={invoice.invoice_number || `INV-${invoiceId}`} />
      <DeleteInvoiceDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} invoice={invoice} onDeleted={onInvoiceDeleted} />
    </Box>
  );
}
