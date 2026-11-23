import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "@/lib/assetUrl";
import type { SaleCartLine } from "@/features/invoices/store/posCartStore";
import { useApproval } from "../approval/useApproval";
import { useRetailSettings } from "../hooks/useRetailSettings";
import { useStockLevels } from "../stock/useStockLevels";
import { StockDot } from "../components/StockDot";
import type { StockStatus } from "../api/stock.types";
import type { CatalogUnit } from "../api/catalog.types";
import { useRetailCatalog } from "../catalog/useRetailCatalog";
import { customerPriceLevel, resolveCatalogPrice, round3 } from "./posPricing";
import { PriceDiscountDialog } from "./PriceDiscountDialog";
import { SerialPickerDialog } from "./SerialPickerDialog";

interface Props {
  line: SaleCartLine;
  selectedCustomer: any | null;
  onUpdate: (patch: Partial<SaleCartLine>) => void;
  onRemove: () => void;
}

export function SaleCartLineRow({ line, selectedCustomer, onUpdate, onRemove }: Props) {
  const { t } = useTranslation();
  const { index } = useRetailCatalog();
  const { settings } = useRetailSettings();
  const { levelFor, statusFor, qtyFor } = useStockLevels(line.warehouse_id);
  const { request } = useApproval();

  const [unitMenuEl, setUnitMenuEl] = useState<HTMLElement | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const [serialOpen, setSerialOpen] = useState(false);

  const product = line.product_id != null ? index.byId.get(line.product_id) : undefined;
  const stockLevel = line.product_id != null ? levelFor(line.product_id, line.warehouse_id) : undefined;
  const dotStatus: StockStatus =
    line.line_kind !== "item" || line.product_id == null
      ? "untracked"
      : statusFor(
          {
            product_id: line.product_id,
            tracking: line.tracking ?? product?.tracking ?? "counted",
            reorder_level: product?.reorder_level ?? null,
          },
          line.warehouse_id,
        );
  const availableOnHand = line.product_id != null ? qtyFor(line.product_id, line.warehouse_id) : 0;
  const counted = stockLevel?.counted_at != null;
  const warnNegative =
    settings.negativeStock === "warn" &&
    line.line_kind === "item" &&
    (line.tracking ?? "counted") === "counted" &&
    counted &&
    line.base_qty > availableOnHand;

  const units = (product?.units?.length ? product.units : line.units) ?? [];
  const allowDecimal = Boolean(line.allow_decimal ?? product?.allow_decimal);
  const stepAmt = 1;

  const handleQtyChange = (nextQty: number) => {
    if (nextQty <= 0) {
      onRemove();
      return;
    }
    const clean = allowDecimal ? round3(nextQty) : Math.max(1, Math.round(nextQty));
    onUpdate({ qty: clean, out_of_stock: false, available_qty: undefined, stock_approval_token: null });
  };

  const handleUnitPick = (unit: CatalogUnit | null) => {
    setUnitMenuEl(null);
    const priceLevel = customerPriceLevel(selectedCustomer);
    const showContractor = settings.showContractorPrice ?? true;
    const baseProd = product ?? {
      sell_price: line.catalog_unit_price ?? line.unit_price,
      contractor_price: null,
      trade_price: null,
    };
    const { unit_price, price_source } = resolveCatalogPrice(baseProd, unit, priceLevel, showContractor);
    onUpdate({
      unit_id: unit?.unit_id ?? null,
      unit_label: unit?.unit_name ?? line.base_unit ?? product?.base_unit ?? "pcs",
      unit_factor: unit ? Number(unit.factor) || 1 : 1,
      unit_price,
      catalog_unit_price: unit_price,
      price_source,
      price_approval_token: null,
      out_of_stock: false,
    });
  };

  const handleSellAnyway = async () => {
    if (line.product_id == null) return;
    const grant = await request({
      type: "negative_stock",
      summary: `${line.description} · ${line.base_qty} needed, ${line.available_qty ?? 0} on hand`,
      context: {
        product_id: line.product_id,
        warehouse_id: line.warehouse_id,
        requested_qty: line.base_qty,
        available_qty: line.available_qty ?? 0,
      },
    });
    if (!grant) return;
    onUpdate({ stock_approval_token: grant.approval_token, out_of_stock: false });
  };

  const needsSerials = line.line_kind === "item" && (line.tracking === "serial" || product?.tracking === "serial");
  const serialCountNeeded = Math.max(1, Math.round(line.base_qty));
  const serialCountHave = line.serials?.length ?? 0;

  return (
    <>
      <Paper
        variant="outlined"
        data-testid={`sale-cart-line-${line.cart_id}`}
        sx={{
          p: 1.25,
          borderRadius: 2.5,
          bgcolor: line.out_of_stock ? "rgba(239, 68, 68, 0.06)" : "background.paper",
          borderColor: line.out_of_stock ? "error.main" : "divider",
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: { xs: "wrap", sm: "nowrap" } }}>
          {/* Picture + stock dot */}
          <Box sx={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", gap: 0.75 }}>
            {line.image_url ? (
              <Box
                component="img"
                src={resolveAssetUrl(line.image_url) || undefined}
                alt=""
                sx={{ width: 32, height: 32, objectFit: "contain", borderRadius: 1 }}
              />
            ) : (
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: "action.selected",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: "primary.main",
                }}
              >
                {line.description.charAt(0).toUpperCase()}
              </Box>
            )}
            <StockDot status={dotStatus} size={8} />
          </Box>

          {/* Name + badges */}
          <Box sx={{ flex: 1, minWidth: 110 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
              {line.line_kind === "unlisted" && (
                <Tooltip title={t("retail.pos.unlistedHint")}>
                  <Chip
                    size="small"
                    color="warning"
                    label="?"
                    data-testid="unlisted-badge"
                    sx={{ height: 18, fontWeight: 900, fontSize: "0.7rem", "& .MuiChip-label": { px: 0.75 } }}
                  />
                </Tooltip>
              )}
              {line.line_kind === "sundry" && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={t("retail.pos.sundryBtn")}
                  sx={{ height: 18, fontWeight: 700, fontSize: "0.65rem" }}
                />
              )}
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                {line.description}
              </Typography>
              {line.variant_label && (
                <Chip
                  size="small"
                  label={line.variant_label}
                  sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                />
              )}
            </Box>
          </Box>

          {/* Stepper [- qty +] */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              border: 1,
              borderColor: "divider",
              borderRadius: 1.5,
              flexShrink: 0,
            }}
          >
            <IconButton
              size="small"
              aria-label={t("retail.pos.decreaseQty")}
              onClick={() => handleQtyChange(line.qty - stepAmt)}
              sx={{ width: 32, height: 32 }}
            >
              <RemoveOutlinedIcon fontSize="small" />
            </IconButton>
            {allowDecimal ? (
              <TextField
                size="small"
                variant="standard"
                value={line.qty}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 0) onUpdate({ qty: round3(v), out_of_stock: false });
                }}
                slotProps={{
                  input: { disableUnderline: true },
                  htmlInput: {
                    inputMode: "decimal",
                    "aria-label": t("common.qty"),
                    style: {
                      width: 44,
                      textAlign: "center",
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                      padding: 0,
                    },
                  },
                }}
              />
            ) : (
              <Typography
                data-testid="sale-line-qty"
                sx={{ px: 0.75, minWidth: 26, textAlign: "center", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
              >
                {line.qty}
              </Typography>
            )}
            <IconButton
              size="small"
              aria-label={t("retail.pos.increaseQty")}
              onClick={() => handleQtyChange(line.qty + stepAmt)}
              sx={{ width: 32, height: 32 }}
            >
              <AddOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Unit / pack chip */}
          {units.length > 0 ? (
            <>
              <Chip
                size="small"
                clickable
                variant="outlined"
                label={line.unit_label}
                aria-label={t("retail.pos.switchUnit")}
                onClick={(e) => setUnitMenuEl(e.currentTarget)}
                sx={{ height: 26, fontWeight: 700, flexShrink: 0 }}
              />
              <Menu anchorEl={unitMenuEl} open={Boolean(unitMenuEl)} onClose={() => setUnitMenuEl(null)}>
                <MenuItem selected={line.unit_id == null} onClick={() => handleUnitPick(null)}>
                  {line.base_unit || product?.base_unit || "pcs"} (×1)
                </MenuItem>
                {units.map((u) => (
                  <MenuItem key={u.unit_id ?? u.unit_name} selected={line.unit_id === u.unit_id} onClick={() => handleUnitPick(u)}>
                    {u.unit_name} (×{u.factor})
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flexShrink: 0 }}>
              {line.unit_label}
            </Typography>
          )}

          {/* Tappable price */}
          <Button
            size="small"
            variant="text"
            onClick={() => setPriceOpen(true)}
            aria-label={t("retail.pos.editPriceAria", { name: line.description })}
            data-testid={`edit-price-${line.cart_id}`}
            startIcon={line.price_approval_token || line.discount_approval_token ? <LockOutlinedIcon sx={{ fontSize: 13 }} /> : undefined}
            sx={{
              minWidth: 0,
              px: 1,
              py: 0.4,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: "tabular-nums",
              textTransform: "none",
              color: line.price_source === "manual" ? "warning.dark" : "text.primary",
              bgcolor: "action.hover",
              borderRadius: 1.5,
              flexShrink: 0,
            }}
          >
            Rs {line.unit_price.toLocaleString()}
          </Button>

          {/* Line total */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 900,
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: "tabular-nums",
              minWidth: 72,
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            Rs {line.line_total.toLocaleString()}
          </Typography>

          <IconButton size="small" aria-label={t("common.remove")} onClick={onRemove} sx={{ color: "text.secondary" }}>
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Secondary badges row (discount, serials, warnings, out-of-stock block recovery) */}
        {(line.line_discount > 0 || needsSerials || warnNegative || line.out_of_stock || line.stock_approval_token) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", pl: 5 }}>
            {line.line_discount > 0 && (
              <Chip
                size="small"
                color="info"
                variant="outlined"
                label={`−Rs ${line.line_discount.toLocaleString()}`}
                sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
              />
            )}
            {needsSerials && (
              <Chip
                size="small"
                clickable
                icon={<QrCode2OutlinedIcon sx={{ fontSize: 14 }} />}
                color={serialCountHave === serialCountNeeded ? "success" : "warning"}
                variant={serialCountHave === serialCountNeeded ? "outlined" : "filled"}
                label={
                  serialCountHave === serialCountNeeded
                    ? (line.serials ?? []).join(", ")
                    : t("retail.pos.pickSerialCount", { have: serialCountHave, need: serialCountNeeded })
                }
                onClick={() => setSerialOpen(true)}
                sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
              />
            )}
            {warnNegative && !line.out_of_stock && (
              <Typography variant="caption" color="warning.main" sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                <WarningAmberOutlinedIcon sx={{ fontSize: 14 }} />
                {t("retail.pos.onlyAvailable", { count: availableOnHand })}
              </Typography>
            )}
            {line.stock_approval_token && !line.out_of_stock && (
              <Chip size="small" color="warning" variant="outlined" label={t("retail.pos.negativeApproved")} sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
            )}
            {line.out_of_stock && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                <Typography variant="caption" color="error.main" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  {t("retail.pos.onlyAvailable", { count: line.available_qty ?? 0 })}
                </Typography>
                {settings.negativeStock === "block" && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => void handleSellAnyway()}
                    sx={{ ml: "auto", textTransform: "none", fontWeight: 800, py: 0.25 }}
                  >
                    {t("retail.pos.sellAnyway")}
                  </Button>
                )}
              </Box>
            )}
          </Box>
        )}
      </Paper>

      <PriceDiscountDialog
        open={priceOpen}
        line={line}
        onClose={() => setPriceOpen(false)}
        onApply={(patch) => onUpdate(patch)}
      />

      {needsSerials && (
        <SerialPickerDialog
          open={serialOpen}
          productId={line.product_id}
          productName={line.description}
          neededCount={line.base_qty}
          selected={line.serials ?? []}
          onClose={() => setSerialOpen(false)}
          onSave={(serials) => onUpdate({ serials })}
        />
      )}
    </>
  );
}
