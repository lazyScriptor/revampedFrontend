import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DiscountIcon from "@mui/icons-material/Discount";
import PaymentsIcon from "@mui/icons-material/Payments";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useTranslation } from "react-i18next";
import { formatCombo, useShortcut } from "@/components/command/shortcuts";
import { usePosCartStore, selectSaleLines, selectSaleSubtotal } from "@/features/invoices/store/posCartStore";
import { PaymentMethodChips } from "@/features/invoices/components/PaymentMethodChips";
import type { PaymentMethod } from "@/features/invoices/lib/paymentMethods";
import { BillDateControl } from "@/features/invoices/components/BillDateControl";
import { useApproval } from "../approval/useApproval";
import { useRetailPermissions } from "../catalog/useRetailCatalog";
import { useRetailSettings } from "../hooks/useRetailSettings";
import { computeDiscountPct, round2 } from "./posPricing";

export interface SaleSubmitParams {
  paymentAmount: number;
  paymentMethod: PaymentMethod;
  isCredit: boolean;
}

interface Props {
  isSubmitting: boolean;
  billDate?: string | null;
  onBillDateChange?: (value: string | null) => void;
  onSellAndPrint: (params: SaleSubmitParams) => void;
}

const DARK_FIELD_SX = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "#1e293b",
    color: "#f8fafc",
    "& fieldset": { borderColor: "#334155" },
    "&:hover fieldset": { borderColor: "#475569" },
    "&.Mui-focused fieldset": { borderColor: "#f59e0b" },
  },
  "& .MuiInputBase-input": {
    color: "#f8fafc !important",
    fontWeight: 700,
    WebkitTextFillColor: "#f8fafc !important",
  },
} as const;

export function SaleCheckoutSection({ isSubmitting, billDate = null, onBillDateChange, onSellAndPrint }: Props) {
  const { t } = useTranslation();
  const { settings } = useRetailSettings();
  const { canDiscount } = useRetailPermissions();
  const { request } = useApproval();

  const selectedCustomer = usePosCartStore((s) => s.selectedCustomer);
  const lines = usePosCartStore((s) => s.lines);
  const fees = usePosCartStore((s) => s.fees);
  const setFees = usePosCartStore((s) => s.setFees);
  const jobSite = usePosCartStore((s) => s.jobSite);
  const setJobSite = usePosCartStore((s) => s.setJobSite);
  const customerPo = usePosCartStore((s) => s.customerPo);
  const setCustomerPo = usePosCartStore((s) => s.setCustomerPo);
  const billDiscountApprovalToken = usePosCartStore((s) => s.billDiscountApprovalToken);
  const setBillDiscountApprovalToken = usePosCartStore((s) => s.setBillDiscountApprovalToken);

  const saleLines = selectSaleLines(lines);
  const subTotal = selectSaleSubtotal(lines);
  const transport = Number(fees.transport) || 0;
  const discount = Number(fees.discount) || 0;
  const grandTotal = Math.max(0, round2(subTotal + transport - discount));

  const isWalkIn = Boolean(selectedCustomer?.is_walk_in);
  const [payMode, setPayMode] = useState<"pay_now" | "credit">("pay_now");
  const [paymentStr, setPaymentStr] = useState(() => String(grandTotal));
  const [paymentDirty, setPaymentDirty] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("Cash");

  // Walk-in customers can never leave an unpaid credit balance.
  useEffect(() => {
    if (isWalkIn && payMode === "credit") {
      setPayMode("pay_now");
      setPaymentDirty(false);
    }
  }, [isWalkIn, payMode]);

  // Payment starts at total (D13) and tracks changes until cashier switches to Credit and edits manually.
  useEffect(() => {
    if (payMode === "pay_now" && !paymentDirty) {
      setPaymentStr(String(grandTotal));
    }
  }, [grandTotal, payMode, paymentDirty]);

  const enteredPayment = Number(paymentStr);
  const cleanPayment = Number.isFinite(enteredPayment) && enteredPayment >= 0 ? enteredPayment : 0;
  const changeDue = payMode === "pay_now" && cleanPayment > grandTotal ? round2(cleanPayment - grandTotal) : 0;
  const effectivePayment = payMode === "pay_now" ? Math.min(cleanPayment, grandTotal) : Math.min(cleanPayment, grandTotal);
  const remaining = Math.max(0, round2(grandTotal - effectivePayment));

  const hasOutOfStock = saleLines.some((l) => l.out_of_stock);
  const missingSerials = saleLines.some((l) => l.tracking === "serial" && (l.serials?.length ?? 0) !== Math.max(1, Math.round(l.base_qty)));
  const walkInShort = isWalkIn && cleanPayment + 0.005 < grandTotal;
  const canSell =
    Boolean(selectedCustomer) &&
    saleLines.length > 0 &&
    !isSubmitting &&
    !hasOutOfStock &&
    !missingSerials &&
    !walkInShort;

  const billDiscPct = computeDiscountPct(1, Math.max(0, subTotal + transport), discount);
  const needsBillDiscountApproval =
    discount > 0 &&
    !billDiscountApprovalToken &&
    ((!canDiscount && (settings.exceptions?.discount_over_limit ?? "approve") !== "off") ||
      (billDiscPct > (settings.discountLimitPct ?? 10) && (settings.exceptions?.discount_over_limit ?? "approve") === "approve"));

  const triggerSell = async () => {
    if (!canSell) return;
    if (needsBillDiscountApproval) {
      const grant = await request({
        type: "discount_over_limit",
        summary: `Bill discount −Rs ${discount.toLocaleString()} (${billDiscPct}%)`,
        context: {
          discount,
          discount_pct: billDiscPct,
          limit_pct: settings.discountLimitPct ?? 10,
        },
        amount_impact: -discount,
      });
      if (!grant) return;
      setBillDiscountApprovalToken(grant.approval_token);
    }

    onSellAndPrint({
      paymentAmount: payMode === "pay_now" ? grandTotal : effectivePayment,
      paymentMethod: method,
      isCredit: !isWalkIn && payMode === "credit" && effectivePayment + 0.005 < grandTotal,
    });
  };

  useShortcut("sell-print", () => void triggerSell(), canSell);

  return (
    <>
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          "& > *": { flexShrink: 0 },
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-thumb": { background: "#334155", borderRadius: "4px" },
        }}
      >
        {onBillDateChange && (
          <BillDateControl value={billDate} onChange={onBillDateChange} hasLines={saleLines.length > 0} />
        )}

        {/* Job / site & PO no. (D20) */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          <TextField
            size="small"
            label={t("retail.pos.jobSite")}
            value={jobSite}
            onChange={(e) => setJobSite(e.target.value)}
            sx={DARK_FIELD_SX}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <WorkOutlineOutlinedIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              },
              inputLabel: { sx: { color: "#94a3b8" } },
            }}
          />
          <TextField
            size="small"
            label={t("retail.pos.poNo")}
            value={customerPo}
            onChange={(e) => setCustomerPo(e.target.value)}
            sx={DARK_FIELD_SX}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <ReceiptOutlinedIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              },
              inputLabel: { sx: { color: "#94a3b8" } },
            }}
          />
        </Box>

        {/* Transport & bill discount */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          <TextField
            label={t("invoices.transport")}
            type="number"
            size="small"
            value={fees.transport || ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setFees((prev: any) => ({ ...prev, transport: Number.isFinite(v) && v >= 0 ? v : 0 }));
            }}
            sx={DARK_FIELD_SX}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LocalShippingIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              },
              htmlInput: { min: 0, style: { fontVariantNumeric: "tabular-nums" } },
              inputLabel: { sx: { color: "#94a3b8" } },
            }}
          />
          <TextField
            label={t("common.discount")}
            type="number"
            size="small"
            value={fees.discount || ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setBillDiscountApprovalToken(null);
              setFees((prev: any) => ({ ...prev, discount: Number.isFinite(v) && v >= 0 ? v : 0 }));
            }}
            sx={DARK_FIELD_SX}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <DiscountIcon sx={{ fontSize: 15, color: "#94a3b8" }} />
                  </InputAdornment>
                ),
                endAdornment: billDiscountApprovalToken ? (
                  <InputAdornment position="end">
                    <LockOutlinedIcon sx={{ fontSize: 14, color: "#fbbf24" }} />
                  </InputAdornment>
                ) : undefined,
              },
              htmlInput: { min: 0, style: { fontVariantNumeric: "tabular-nums" } },
              inputLabel: { sx: { color: "#94a3b8" } },
            }}
          />
        </Box>

        {/* Breakdown card */}
        <Box
          sx={{
            bgcolor: "#1e293b",
            borderRadius: 2,
            p: 1.75,
            border: "1px solid #334155",
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              {t("retail.pos.itemsSubtotal")}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "#f8fafc", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}
            >
              Rs. {subTotal.toLocaleString()}
            </Typography>
          </Box>
          {transport > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                {t("invoices.transport")}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#cbd5e1", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}
              >
                + Rs. {transport.toLocaleString()}
              </Typography>
            </Box>
          )}
          {discount > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                {t("common.discount")}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#f87171", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}
              >
                − Rs. {discount.toLocaleString()}
              </Typography>
            </Box>
          )}
          <Divider sx={{ borderColor: "#334155", my: 0.25 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Typography variant="body2" sx={{ color: "#94a3b8", fontWeight: 800 }}>
              {t("common.total")}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: "white",
                fontWeight: 900,
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Rs. {grandTotal.toLocaleString()}
            </Typography>
          </Box>
        </Box>

        {/* Pay now vs Credit (hidden for Walk-in customers) */}
        {selectedCustomer && !isWalkIn && (
          <ToggleButtonGroup
            size="small"
            fullWidth
            exclusive
            value={payMode}
            onChange={(_, v) => {
              if (!v) return;
              setPayMode(v);
              setPaymentDirty(false);
              setPaymentStr(v === "pay_now" ? String(grandTotal) : "0");
            }}
            sx={{
              bgcolor: "#1e293b",
              "& .MuiToggleButton-root": {
                color: "#94a3b8",
                borderColor: "#334155",
                fontWeight: 700,
                textTransform: "none",
                "&.Mui-selected": { bgcolor: "primary.main", color: "primary.contrastText" },
              },
            }}
          >
            <ToggleButton value="pay_now">{t("retail.pos.payNow")}</ToggleButton>
            <ToggleButton value="credit">{t("retail.pos.creditBtn")}</ToggleButton>
          </ToggleButtonGroup>
        )}

        <TextField
          label={t("retail.pos.paymentAmount")}
          type="number"
          size="small"
          fullWidth
          value={paymentStr}
          onChange={(e) => {
            setPaymentDirty(true);
            setPaymentStr(e.target.value);
          }}
          error={walkInShort}
          helperText={walkInShort ? t("retail.pos.walkInMustPayFull") : undefined}
          sx={DARK_FIELD_SX}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <PaymentsIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                </InputAdornment>
              ),
            },
            htmlInput: { min: 0, "aria-label": t("retail.pos.paymentAmount"), style: { fontVariantNumeric: "tabular-nums" } },
            inputLabel: { sx: { color: "#94a3b8" } },
          }}
        />

        <PaymentMethodChips
          tone="dark"
          label={t("invoices.PosCheckoutPanel.advancePaidBy")}
          value={method}
          onChange={setMethod}
        />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700 }}>
            {changeDue > 0 ? t("retail.pos.changeDue") : t("invoices.PosCheckoutPanel.remainingBalance")}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 900,
              color: changeDue > 0 ? "#fbbf24" : remaining > 0 ? "#f87171" : "#4ade80",
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Rs. {(changeDue > 0 ? changeDue : remaining).toLocaleString()}
          </Typography>
        </Box>
      </Box>

      {/* Sell & print footer */}
      <Box sx={{ flexShrink: 0, p: 2.5, borderTop: "1px solid #1e293b" }}>
        {!selectedCustomer && (
          <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", textAlign: "center", mb: 1 }}>
            {t("retail.pos.pickCustomerOrWalkIn")}
          </Typography>
        )}
        {hasOutOfStock && (
          <Typography variant="caption" sx={{ color: "#f87171", display: "block", textAlign: "center", mb: 1, fontWeight: 700 }}>
            {t("retail.pos.resolveStockFirst")}
          </Typography>
        )}
        {missingSerials && (
          <Typography variant="caption" sx={{ color: "#fbbf24", display: "block", textAlign: "center", mb: 1, fontWeight: 700 }}>
            {t("retail.pos.selectSerialsFirst")}
          </Typography>
        )}
        <Tooltip title={`${t("retail.pos.sellAndPrint")} (${formatCombo("F9")})`}>
          <span>
            <Button
              variant="contained"
              fullWidth
              size="large"
              disableElevation
              disabled={!canSell}
              onClick={() => void triggerSell()}
              startIcon={<PrintOutlinedIcon />}
              endIcon={<Chip size="small" label={formatCombo("F9")} sx={{ height: 20, fontSize: "0.68rem", fontWeight: 800, bgcolor: "rgba(0,0,0,0.2)", color: "inherit" }} />}
              sx={{
                py: 1.5,
                borderRadius: 2.5,
                fontSize: "0.95rem",
                fontWeight: 800,
                textTransform: "none",
                bgcolor: canSell ? "primary.main" : "#1e293b",
                color: canSell ? "primary.contrastText" : "#475569",
                "&.Mui-disabled": { bgcolor: "#1e293b", color: "#475569" },
              }}
            >
              {isSubmitting ? t("invoices.PosCheckoutPanel.processing") : t("retail.pos.sellAndPrint")}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </>
  );
}
