import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type { SaleCartLine } from "@/features/invoices/store/posCartStore";
import { useApproval } from "../approval/useApproval";
import { useRetailPermissions } from "../catalog/useRetailCatalog";
import { useRetailSettings } from "../hooks/useRetailSettings";
import {
  computeDiscountPct,
  computeSaleLineTotal,
  formatPriceChangeSummary,
  round2,
} from "./posPricing";
import { TouchNumberPad } from "./TouchNumberPad";

interface Props {
  open: boolean;
  line: SaleCartLine | null;
  onClose: () => void;
  onApply: (patch: Partial<SaleCartLine>) => void;
}

/** Opens when tapping a cart line's price; handles number pad, discounts, below-cost warnings, and manager approval. */
export function PriceDiscountDialog({ open, line, onClose, onApply }: Props) {
  const { t } = useTranslation();
  const { canPriceOverride, canDiscount, canCost } = useRetailPermissions();
  const { settings } = useRetailSettings();
  const { request } = useApproval();

  const [focusField, setFocusField] = useState<"price" | "discount">("price");
  const [priceStr, setPriceStr] = useState("");
  const [discMode, setDiscMode] = useState<"rs" | "pct">("rs");
  const [discStr, setDiscStr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !line) return;
    setFocusField("price");
    setPriceStr(String(line.unit_price ?? 0));
    setDiscMode("rs");
    setDiscStr(line.line_discount ? String(line.line_discount) : "");
  }, [open, line]);

  if (!line) return null;

  const catalogPrice = line.catalog_unit_price ?? line.unit_price;
  const parsedPrice = priceStr.trim() === "" ? 0 : Number(priceStr);
  const parsedDiscInput = discStr.trim() === "" ? 0 : Number(discStr);
  const gross = round2((line.qty || 0) * (Number.isFinite(parsedPrice) ? parsedPrice : 0));
  const discountRs =
    !Number.isFinite(parsedDiscInput) || parsedDiscInput <= 0
      ? 0
      : discMode === "pct"
        ? round2((gross * parsedDiscInput) / 100)
        : round2(parsedDiscInput);
  const discountPct = computeDiscountPct(line.qty, parsedPrice, discountRs);
  const effectiveUnit = line.qty > 0 ? round2((gross - discountRs) / line.qty) : parsedPrice;
  const packCost = line.avg_cost != null ? round2(Number(line.avg_cost) * (line.unit_factor || 1)) : null;
  const belowCost =
    Boolean(settings.belowCostWarning) &&
    canCost &&
    packCost != null &&
    packCost > 0 &&
    effectiveUnit < packCost;

  const valid =
    Number.isFinite(parsedPrice) &&
    parsedPrice >= 0 &&
    Number.isFinite(parsedDiscInput) &&
    parsedDiscInput >= 0 &&
    discountRs <= gross;

  const handleApply = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      let priceToken: string | null = line.price_approval_token ?? null;
      let priceSource = line.price_source;

      const priceChangedFromCatalog =
        line.line_kind === "item" && Math.abs(round2(parsedPrice) - round2(catalogPrice)) > 0.005;

      if (priceChangedFromCatalog) {
        const pricePolicy = settings.exceptions?.price_change ?? "approve";
        const needsPriceApproval =
          pricePolicy === "approve" || (!canPriceOverride && pricePolicy !== "off");
        if (needsPriceApproval) {
          const grant = await request({
            type: "price_change",
            summary: formatPriceChangeSummary(catalogPrice, parsedPrice),
            context: {
              product_id: line.product_id,
              unit_id: line.unit_id ?? null,
              from: round2(catalogPrice),
              to: round2(parsedPrice),
            },
            amount_impact: round2((parsedPrice - catalogPrice) * line.qty),
          });
          if (!grant) return;
          priceToken = grant.approval_token;
        }
        priceSource = "manual";
      } else {
        priceToken = null;
        if (priceSource === "manual") priceSource = "retail";
      }

      let discToken: string | null = line.discount_approval_token ?? null;
      if (discountRs > 0) {
        const overLimit = discountPct > (settings.discountLimitPct ?? 10);
        const discPolicy = settings.exceptions?.discount_over_limit ?? "approve";
        const needsDiscApproval =
          (!canDiscount && discPolicy !== "off") || (overLimit && discPolicy === "approve");
        if (needsDiscApproval) {
          const grant = await request({
            type: "discount_over_limit",
            summary: `${line.description} · -Rs ${discountRs.toLocaleString()} (${discountPct}%)`,
            context: {
              product_id: line.product_id,
              unit_id: line.unit_id ?? null,
              discount: discountRs,
              discount_pct: discountPct,
              limit_pct: settings.discountLimitPct ?? 10,
            },
            amount_impact: -discountRs,
          });
          if (!grant) return;
          discToken = grant.approval_token;
        }
      } else {
        discToken = null;
      }

      onApply({
        unit_price: round2(parsedPrice),
        price_source: priceSource,
        line_discount: discountRs,
        price_approval_token: priceToken,
        discount_approval_token: discToken,
        line_total: computeSaleLineTotal(line.qty, parsedPrice, discountRs),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {line.description}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontVariantNumeric: "tabular-nums" }}>
          {t("retail.pos.catalogPriceHint", { price: catalogPrice.toLocaleString(), unit: line.unit_label })}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "8px !important" }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label={t("retail.pos.unitPrice")}
          value={priceStr}
          onFocus={() => setFocusField("price")}
          onChange={(e) => setPriceStr(e.target.value.replace(/[^0-9.]/g, ""))}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start">Rs.</InputAdornment> },
            htmlInput: {
              inputMode: "decimal",
              "aria-label": t("retail.pos.unitPrice"),
              style: { fontWeight: 800, fontVariantNumeric: "tabular-nums" },
            },
          }}
        />

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            fullWidth
            size="small"
            label={t("retail.pos.lineDiscount")}
            value={discStr}
            onFocus={() => setFocusField("discount")}
            onChange={(e) => setDiscStr(e.target.value.replace(/[^0-9.]/g, ""))}
            slotProps={{
              htmlInput: {
                inputMode: "decimal",
                "aria-label": t("retail.pos.lineDiscount"),
                style: { fontWeight: 700, fontVariantNumeric: "tabular-nums" },
              },
            }}
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={discMode}
            onChange={(_, v) => {
              if (v) setDiscMode(v);
            }}
          >
            <ToggleButton value="rs" sx={{ fontWeight: 700 }}>
              Rs
            </ToggleButton>
            <ToggleButton value="pct" sx={{ fontWeight: 700 }}>
              %
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <TouchNumberPad
          value={focusField === "price" ? priceStr : discStr}
          onChange={(v) => (focusField === "price" ? setPriceStr(v) : setDiscStr(v))}
        />

        {belowCost && (
          <Alert severity="warning" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {t("retail.pos.belowCostWarn", { cost: packCost?.toLocaleString() })}
          </Alert>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t("orders.ledger.colTotal")}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
            Rs. {computeSaleLineTotal(line.qty, parsedPrice || 0, discountRs).toLocaleString()}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={submitting}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" disableElevation disabled={!valid || submitting} onClick={() => void handleApply()} sx={{ fontWeight: 800 }}>
          {t("common.apply")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
