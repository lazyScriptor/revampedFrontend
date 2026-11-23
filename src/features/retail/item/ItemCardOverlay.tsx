import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CheckIcon from "@mui/icons-material/Check";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import HistoryIcon from "@mui/icons-material/History";
import { useTranslation } from "react-i18next";
import { Overlay, type OverlayComponentProps } from "@/components/overlay";
import { useToast } from "@/components/ui/AppToast";
import { errorMessage } from "../api/http";
import type { CatalogProduct } from "../api/catalog.types";
import { CatIcon } from "../components/CategoryIcon";
import { formatRs } from "../format";
import { categoryPath } from "../catalog/catalogModel";
import { diffProduct, fieldValue, type EditableField, type FieldEdits } from "../catalog/diff";
import { formatVariant } from "../catalog/names";
import { useArchiveProduct, useLearnBarcode, useProductDetail, useUpdateProduct } from "../catalog/mutations";
import { useScanDetector } from "../catalog/scanDetector";
import { useRetailCatalog, useRetailPermissions } from "../catalog/useRetailCatalog";

interface Props extends OverlayComponentProps {
  productId: number;
}

const NUM_SX = { fontVariantNumeric: "tabular-nums" } as const;

/** Item card (plan §7.2): picture, name, size chips, prices, barcodes, tracking. Stock comes with R2. */
function ItemCardOverlay({ productId }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const { canManage, canCost, canLearnBarcode } = useRetailPermissions();
  const { catalog, index } = useRetailCatalog();
  const [currentId, setCurrentId] = useState(productId);
  const detail = useProductDetail(currentId);
  const local = index.byId.get(currentId);
  const product: CatalogProduct | undefined = detail.data ?? local;

  const update = useUpdateProduct();
  const archive = useArchiveProduct();
  const learn = useLearnBarcode();

  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<FieldEdits>({});
  const [errors, setErrors] = useState<Partial<Record<EditableField, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");

  useEffect(() => {
    setEditing(false);
    setEdits({});
    setErrors({});
    setMessage(null);
  }, [currentId]);

  const addBarcode = async (raw: string) => {
    const code = raw.trim();
    if (!code || !canLearnBarcode) return;
    setMessage(null);
    try {
      await learn.mutateAsync({ barcode: code, product_id: currentId });
      setBarcode("");
      toast.showSuccess(t("retail.finder.barcodeSaved", { name: product?.name ?? "" }));
    } catch (err: any) {
      const other = err?.response?.data?.product_name ?? err?.response?.data?.data?.name;
      setMessage(err?.response?.status === 409 && other ? t("retail.finder.barcodeTaken", { name: other }) : errorMessage(err, t("retail.finder.barcodeFailed")));
    }
  };

  // The scanner works here too: a scan adds the barcode to this item.
  useScanDetector((code) => void addBarcode(code));

  const siblings = useMemo(() => {
    if (!product || product.family_id == null) return [];
    return catalog.products.filter((p) => p.family_id === product.family_id).sort((a, b) => (parseFloat(a.variant_label ?? "") || 0) - (parseFloat(b.variant_label ?? "") || 0) || a.product_id - b.product_id);
  }, [catalog.products, product]);

  if (!product) {
    return (
      <Overlay title={t("retail.item.title")} width={520}>
        {detail.isError ? <Alert severity="error">{t("retail.item.loadFailed")}</Alert> : <CircularProgress size={24} />}
      </Overlay>
    );
  }

  const family = product.family_id != null ? index.ctx.families.get(product.family_id) : undefined;
  const brand = product.brand_id != null ? index.ctx.brands.get(product.brand_id) : undefined;
  const path = categoryPath(index.ctx, product.category_id);
  const category = product.category_id != null ? index.ctx.categories.get(product.category_id) : undefined;
  const topCategory = category?.parent_id != null ? index.ctx.categories.get(category.parent_id) : category;
  const archived = product.is_active === false;

  const startEdit = () => {
    setEdits({
      name: fieldValue(product, "name"),
      sell_price: fieldValue(product, "sell_price"),
      contractor_price: fieldValue(product, "contractor_price"),
      reorder_level: fieldValue(product, "reorder_level"),
      warranty_months: fieldValue(product, "warranty_months"),
    });
    setErrors({});
    setEditing(true);
  };

  const saveEdit = async () => {
    const { input, errors: errs, changed } = diffProduct(product, edits);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (changed.length === 0) {
      setEditing(false);
      return;
    }
    try {
      await update.mutateAsync({ id: currentId, input });
      toast.showSuccess(t("retail.item.saved"));
      setEditing(false);
    } catch (err) {
      setMessage(errorMessage(err, t("retail.item.saveFailed")));
    }
  };

  const toggleArchive = async () => {
    try {
      if (archived) await update.mutateAsync({ id: currentId, input: { is_active: true } });
      else await archive.mutateAsync(currentId);
      toast.showSuccess(archived ? t("retail.item.restored") : t("retail.item.archived"));
    } catch (err) {
      setMessage(errorMessage(err, t("retail.item.saveFailed")));
    }
  };

  const field = (f: EditableField, label: string, numeric = true) => (
    <TextField
      size="small"
      label={label}
      value={edits[f] ?? ""}
      onChange={(e) => setEdits((cur) => ({ ...cur, [f]: e.target.value }))}
      error={!!errors[f]}
      helperText={errors[f] ? t(errors[f]!) : undefined}
      slotProps={{ htmlInput: numeric ? { inputMode: "decimal", style: NUM_SX } : {} }}
      sx={{ flex: 1, minWidth: 120 }}
    />
  );

  const value = (label: string, content: React.ReactNode) => (
    <Box sx={{ minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 800, ...NUM_SX }}>
        {content}
      </Typography>
    </Box>
  );

  const units = product.units ?? [];
  const barcodes = product.barcodes ?? [];

  const footer =
    canManage || editing ? (
      <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
        <Button color="inherit" startIcon={archived ? <UnarchiveOutlinedIcon /> : <ArchiveOutlinedIcon />} onClick={() => void toggleArchive()} disabled={editing} sx={{ minHeight: 44 }}>
          {archived ? t("retail.item.restore") : t("retail.item.archive")}
        </Button>
        {editing ? (
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setEditing(false)} sx={{ minHeight: 44 }}>
              {t("common.cancel")}
            </Button>
            <Button variant="contained" startIcon={<CheckIcon />} onClick={() => void saveEdit()} disabled={update.isPending} sx={{ minHeight: 44 }}>
              {t("common.save")}
            </Button>
          </Stack>
        ) : (
          <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={startEdit} sx={{ minHeight: 44 }}>
            {t("common.edit")}
          </Button>
        )}
      </Stack>
    ) : undefined;

  return (
    <Overlay title={t("retail.item.title")} width={520} onConfirm={editing ? () => void saveEdit() : undefined} footer={footer}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 64, height: 64, borderRadius: 2, border: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.secondary", overflow: "hidden", flexShrink: 0 }}>
            {product.image_url ? <Box component="img" src={product.image_url ?? undefined} alt="" loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <CatIcon name={category?.icon || topCategory?.icon} fontSize="large" />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            {editing ? (
              <TextField size="small" fullWidth value={edits.name ?? ""} onChange={(e) => setEdits((c) => ({ ...c, name: e.target.value }))} error={!!errors.name} helperText={errors.name ? t(errors.name) : undefined} slotProps={{ htmlInput: { "aria-label": t("common.name") } }} />
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {product.name}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={NUM_SX}>
              {[product.code, brand?.name, path].filter(Boolean).join(" · ")}
            </Typography>
            {archived && <Chip size="small" label={t("retail.item.archivedChip")} sx={{ ml: 1 }} />}
          </Box>
        </Stack>

        {message && (
          <Alert severity="error" onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}

        {siblings.length > 1 && (
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }} data-testid="variant-chips">
            {siblings.map((s) => (
              <Chip
                key={s.product_id}
                clickable
                disabled={editing}
                label={formatVariant(s.variant_label, family?.option_unit) || s.name}
                color={s.product_id === currentId ? "primary" : "default"}
                variant={s.product_id === currentId ? "filled" : "outlined"}
                onClick={() => setCurrentId(s.product_id)}
                sx={{ minHeight: 32, fontWeight: 700, ...NUM_SX }}
              />
            ))}
          </Stack>
        )}

        {/* Prices */}
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, lineHeight: 1.5 }}>
            {t("retail.item.prices")}
          </Typography>
          {editing ? (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              {field("sell_price", t("retail.item.sell"))}
              {field("contractor_price", t("retail.item.contractor"))}
            </Stack>
          ) : (
            <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
              {value(`${t("retail.item.sell")} / ${product.base_unit ?? "pcs"}`, formatRs(product.sell_price))}
              {product.contractor_price != null && value(t("retail.item.contractor"), formatRs(product.contractor_price))}
              {product.trade_price != null && value(t("retail.item.trade"), formatRs(product.trade_price))}
              {canCost && product.avg_cost != null && value(t("retail.item.avgCost"), formatRs(product.avg_cost))}
              {canCost && product.last_cost != null && value(t("retail.item.lastCost"), formatRs(product.last_cost))}
            </Stack>
          )}
          {units.length > 0 && (
            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>
              {units.map((u) => (
                <Tooltip key={u.unit_name} title={t("retail.item.packTip", { factor: u.factor, unit: product.base_unit ?? "pcs" })}>
                  <Chip size="small" variant="outlined" label={`${u.unit_name} · ${u.factor} · ${formatRs(u.sell_price ?? u.factor * product.sell_price)}`} sx={NUM_SX} />
                </Tooltip>
              ))}
            </Stack>
          )}
        </Box>

        {/* Barcodes */}
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, lineHeight: 1.5 }}>
            {t("retail.item.barcodes")}
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mb: barcodes.length ? 1 : 0 }}>
            {barcodes.map((b) => (
              <Chip key={b.barcode} size="small" label={b.unit_id ? `${b.barcode} · ${units.find((u) => u.unit_id === b.unit_id)?.unit_name ?? ""}` : b.barcode} sx={NUM_SX} />
            ))}
            {barcodes.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {t("retail.item.noBarcodes")}
              </Typography>
            )}
          </Stack>
          {canLearnBarcode && (
            <TextField
              size="small"
              fullWidth
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder={t("retail.item.scanToAdd")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && barcode.trim()) {
                  e.preventDefault();
                  e.stopPropagation();
                  void addBarcode(barcode);
                }
              }}
              slotProps={{
                htmlInput: { "data-scan": "true", "aria-label": t("retail.item.scanToAdd"), style: NUM_SX },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeScannerIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: barcode.trim() ? (
                    <IconButton size="small" onClick={() => void addBarcode(barcode)} aria-label={t("common.add")}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                  ) : undefined,
                },
              }}
            />
          )}
        </Box>

        {/* Settings */}
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
          {value(t("retail.item.tracking"), t(`retail.item.tracking_${product.tracking ?? "counted"}`))}
          {editing ? field("reorder_level", t("retail.item.reorder")) : value(t("retail.item.reorder"), product.reorder_level ?? "—")}
          {(product.tracking === "serial" || editing) && (editing ? field("warranty_months", t("retail.item.warrantyMonths")) : value(t("retail.item.warranty"), product.warranty_months != null ? t("retail.item.months", { count: product.warranty_months }) : "—"))}
        </Stack>

        {/* Stock and history arrive with the next step. */}
        {["stock", "history"].map((k) => (
          <Stack key={k} direction="row" spacing={1} sx={{ alignItems: "center", p: 1.25, borderRadius: 2, border: 1, borderColor: "divider", borderStyle: "dashed", color: "text.secondary" }}>
            {k === "stock" ? <Inventory2OutlinedIcon fontSize="small" /> : <HistoryIcon fontSize="small" />}
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {k === "stock" ? t("retail.item.stock") : t("retail.item.history")}
            </Typography>
            <Typography variant="caption" sx={{ flex: 1, textAlign: "right" }}>
              {t("retail.stock.comesNext")}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Overlay>
  );
}

export default ItemCardOverlay;
