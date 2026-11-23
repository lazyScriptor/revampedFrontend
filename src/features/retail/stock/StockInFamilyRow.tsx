import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Box, Button, Chip, IconButton, InputBase, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/AppToast";
import { errorMessage } from "../api/http";
import type { CatalogProduct, RetailFamily } from "../api/catalog.types";
import { formatVariant } from "../catalog/names";
import { formatQty, formatRs } from "../format";
import { useAddFamilyVariants } from "./stockMutations";
import type { ComputedReceiveLine, ReceiveDraftLine } from "./stockInModel";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

interface Props {
  family: RetailFamily | null;
  title: string;
  variants: CatalogProduct[];
  lineMap: Map<number, ReceiveDraftLine>;
  computedMap: Map<number, ComputedReceiveLine>;
  canCost: boolean;
  canManage: boolean;
  focusedProductId: number | null;
  onSetLine: (productId: number, patch: Partial<ReceiveDraftLine>) => void;
  onSwitchPackUnit: (variantIds: number[], unitName: string | null) => void;
  onOpenSerials: (product: CatalogProduct) => void;
  onRemoveGroup: (variantIds: number[]) => void;
}

/**
 * One family as a single horizontally-scrollable size matrix (plan §7.3):
 *   SALI Steel Drill Bit   3mm  4mm  5mm  6mm  8mm
 *   Qty                    [ ]  [3]  [5]  [4]  [3]   = 15 pcs
 *   Cost / pc (Rs)         [ ]  [65] [70] [80] [95]
 */
export function StockInFamilyRow({
  family,
  title,
  variants,
  lineMap,
  computedMap,
  canCost,
  canManage,
  focusedProductId,
  onSetLine,
  onSwitchPackUnit,
  onOpenSerials,
  onRemoveGroup,
}: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const addVariant = useAddFamilyVariants();

  const [addingSize, setAddingSize] = useState(false);
  const [newSize, setNewSize] = useState("");
  const [newSellPrice, setNewSellPrice] = useState(String(variants[0]?.sell_price ?? ""));

  const baseUnit = variants[0]?.base_unit ?? "pcs";
  const packUnitNames = [...new Set(variants.flatMap((v) => (v.units ?? []).map((u) => u.unit_name)))];

  // Detect active pack unit if any line in this family currently uses one
  const activeUnitName = (() => {
    for (const v of variants) {
      const uid = lineMap.get(v.product_id)?.unit_id;
      if (uid != null) {
        const u = (v.units ?? []).find((x) => x.unit_id === uid);
        if (u) return u.unit_name;
      }
    }
    return null;
  })();

  const activeFactor = (() => {
    if (!activeUnitName) return 1;
    for (const v of variants) {
      const u = (v.units ?? []).find((x) => x.unit_name === activeUnitName);
      if (u) return u.factor;
    }
    return 1;
  })();

  const cyclePackUnit = () => {
    if (packUnitNames.length === 0) return;
    const idx = activeUnitName ? packUnitNames.indexOf(activeUnitName) : -1;
    const next = idx + 1 < packUnitNames.length ? packUnitNames[idx + 1] : null;
    onSwitchPackUnit(
      variants.map((v) => v.product_id),
      next,
    );
  };

  let totalEnteredQty = 0;
  let totalBaseQty = 0;
  for (const v of variants) {
    const l = lineMap.get(v.product_id);
    const q = Number(l?.qty);
    if (l && Number.isFinite(q) && q > 0) {
      totalEnteredQty += q;
      const u = l.unit_id != null ? (v.units ?? []).find((x) => x.unit_id === l.unit_id) : null;
      totalBaseQty += q * (u?.factor ?? 1);
    }
  }

  const handleKeyNav = (e: KeyboardEvent<HTMLInputElement>, colIdx: number, rowKind: "qty" | "cost") => {
    const table = (e.currentTarget as HTMLElement).closest("table");
    if (!table) return;
    let targetCol = colIdx;
    let targetRow = rowKind;
    if (e.key === "ArrowRight") targetCol = colIdx + 1;
    else if (e.key === "ArrowLeft") targetCol = colIdx - 1;
    else if (e.key === "ArrowDown" && rowKind === "qty" && canCost) targetRow = "cost";
    else if (e.key === "ArrowUp" && rowKind === "cost") targetRow = "qty";
    else return;

    const target = table.querySelector<HTMLInputElement>(`[data-matrix-cell="${targetRow}:${targetCol}"]`);
    if (target) {
      e.preventDefault();
      target.focus();
      target.select();
    }
  };

  const handleAddSize = async () => {
    const label = newSize.trim();
    const sell = Number(newSellPrice);
    if (!label || !family || !Number.isFinite(sell) || sell < 0) return;
    try {
      const res = await addVariant.mutateAsync({
        familyId: family.family_id,
        variants: [{ variant_label: label, sell_price: sell }],
      });
      const created = res.products[0];
      if (created) {
        onSetLine(created.product_id, { qty: "1" });
      }
      setNewSize("");
      setAddingSize(false);
      toast.showSuccess(t("retail.stockIn.sizeAdded", { name: created?.name ?? label }));
    } catch (err) {
      toast.showError(errorMessage(err, t("retail.item.saveFailed")));
    }
  };

  const serialVariants = variants.filter((v) => {
    const q = Number(lineMap.get(v.product_id)?.qty);
    return v.tracking === "serial" && v.serial_capture === "receive" && Number.isFinite(q) && q > 0;
  });

  return (
    <Box
      data-testid={`family-row-${family?.family_id ?? variants[0]?.product_id}`}
      sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", overflow: "hidden" }}
    >
      <Stack direction="row" spacing={1} sx={{ px: 1.5, py: 0.75, alignItems: "center", borderBottom: 1, borderColor: "divider", bgcolor: "action.hover", flexWrap: "wrap", rowGap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 800, flex: 1, minWidth: 140 }} noWrap>
          {title}
        </Typography>
        {packUnitNames.length > 0 && (
          <Tooltip title={t("retail.stockIn.packSwitchTip")}>
            <Chip
              size="small"
              clickable
              icon={<SwapHorizIcon fontSize="small" />}
              color={activeUnitName ? "primary" : "default"}
              variant={activeUnitName ? "filled" : "outlined"}
              onClick={cyclePackUnit}
              label={activeUnitName ? `${activeUnitName} (×${formatQty(activeFactor)})` : baseUnit}
              data-testid="pack-switch"
              sx={{ fontWeight: 700, ...NUM }}
            />
          </Tooltip>
        )}
        {family && canManage && (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setNewSellPrice(String(variants[0]?.sell_price ?? ""));
              setAddingSize((s) => !s);
            }}
            sx={{ minHeight: 30, textTransform: "none", fontWeight: 700 }}
          >
            {t("retail.stockIn.addSize")}
          </Button>
        )}
        <Typography variant="body2" sx={{ fontWeight: 800, ...NUM }}>
          {activeUnitName
            ? `= ${formatQty(totalEnteredQty)} ${activeUnitName} (${formatQty(totalBaseQty)} ${baseUnit})`
            : `= ${formatQty(totalBaseQty)} ${baseUnit}`}
        </Typography>
        <IconButton
          size="small"
          aria-label={t("common.remove")}
          onClick={() => onRemoveGroup(variants.map((v) => v.product_id))}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      {addingSize && (
        <Stack direction="row" spacing={1} sx={{ p: 1, borderBottom: 1, borderColor: "divider", alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small"
            label={t("retail.stockIn.newSize")}
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            sx={{ width: 120 }}
            slotProps={{ htmlInput: { "aria-label": t("retail.stockIn.newSize") } }}
          />
          <TextField
            size="small"
            label={t("retail.item.sell")}
            value={newSellPrice}
            onChange={(e) => setNewSellPrice(e.target.value)}
            sx={{ width: 110 }}
            slotProps={{ htmlInput: { inputMode: "decimal", style: NUM, "aria-label": t("retail.item.sell") } }}
          />
          <Button size="small" variant="contained" disabled={addVariant.isPending || !newSize.trim()} onClick={() => void handleAddSize()}>
            {t("common.add")}
          </Button>
          <Button size="small" onClick={() => setAddingSize(false)}>
            {t("common.cancel")}
          </Button>
        </Stack>
      )}

      {/* Horizontal scroll inside the row box only — never widens the page on phones */}
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ width: "auto", minWidth: "100%" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, py: 0.5, width: 120, whiteSpace: "nowrap" }} />
              {variants.map((v) => (
                <TableCell key={v.product_id} align="center" sx={{ fontWeight: 800, py: 0.5, px: 0.75, minWidth: 74, whiteSpace: "nowrap", ...NUM }}>
                  {formatVariant(v.variant_label, family?.option_unit) || v.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, py: 0.5, whiteSpace: "nowrap", color: "text.secondary" }}>
                {t("retail.stockIn.qtyRow")}
              </TableCell>
              {variants.map((v, colIdx) => {
                const line = lineMap.get(v.product_id);
                const val = line?.qty ?? "";
                const active = Number(val) > 0;
                return (
                  <TableCell key={v.product_id} sx={{ p: 0.5 }}>
                    <InputBase
                      fullWidth
                      autoFocus={focusedProductId === v.product_id}
                      value={val}
                      placeholder="0"
                      onChange={(e) => onSetLine(v.product_id, { qty: e.target.value })}
                      onKeyDown={(e) => handleKeyNav(e as KeyboardEvent<HTMLInputElement>, colIdx, "qty")}
                      slotProps={{
                        input: {
                          inputMode: v.allow_decimal ? "decimal" : "numeric",
                          "aria-label": `${t("retail.stockIn.qtyRow")} ${formatVariant(v.variant_label, family?.option_unit) || v.name}`,
                          style: { textAlign: "center", fontWeight: active ? 800 : 500, fontSize: 13, ...NUM },
                          ...({ "data-matrix-cell": `qty:${colIdx}` } as Record<string, unknown>),
                        },
                      }}
                      sx={(theme) => ({
                        border: 1,
                        borderColor: active ? "primary.main" : "divider",
                        borderRadius: 1,
                        px: 0.5,
                        py: 0.25,
                        bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : "background.default",
                      })}
                    />
                  </TableCell>
                );
              })}
            </TableRow>

            {canCost && (
              <TableRow>
                <TableCell sx={{ fontWeight: 700, py: 0.5, whiteSpace: "nowrap", color: "text.secondary" }}>
                  {t("retail.stockIn.costPer", { unit: activeUnitName ?? baseUnit })}
                </TableCell>
                {variants.map((v, colIdx) => {
                  const line = lineMap.get(v.product_id);
                  const comp = computedMap.get(v.product_id);
                  const val = line?.cost ?? "";
                  const hasQty = Number(line?.qty) > 0;
                  const missing = hasQty && !!comp?.missingCost;
                  const drift = hasQty && !!comp?.costDrift30;
                  const tip = missing
                    ? t("retail.stockIn.missingCost")
                    : drift
                      ? t("retail.stockIn.costDriftWarn", { last: formatRs(v.last_cost) })
                      : comp?.newAvgCost != null
                        ? `${t("retail.stockIn.newAvg")}: ${formatRs(comp.newAvgCost)}`
                        : "";
                  return (
                    <TableCell key={v.product_id} sx={{ p: 0.5 }}>
                      <Tooltip title={tip} disableHoverListener={!tip}>
                        <Box>
                          <InputBase
                            fullWidth
                            value={val}
                            placeholder={v.last_cost != null ? String(v.last_cost) : "0"}
                            onChange={(e) => onSetLine(v.product_id, { cost: e.target.value })}
                            onKeyDown={(e) => handleKeyNav(e as KeyboardEvent<HTMLInputElement>, colIdx, "cost")}
                            slotProps={{
                              input: {
                                inputMode: "decimal",
                                "aria-label": `${t("retail.stockIn.costLabel")} ${formatVariant(v.variant_label, family?.option_unit) || v.name}`,
                                style: { textAlign: "center", fontSize: 12, ...NUM },
                                ...({ "data-matrix-cell": `cost:${colIdx}` } as Record<string, unknown>),
                              },
                            }}
                            sx={(theme) => ({
                              border: 1,
                              borderColor: missing ? "error.main" : drift ? "warning.main" : "divider",
                              borderRadius: 1,
                              px: 0.5,
                              py: 0.25,
                              bgcolor: missing
                                ? alpha(theme.palette.error.main, 0.1)
                                : drift
                                  ? alpha(theme.palette.warning.main, 0.12)
                                  : "background.default",
                            })}
                          />
                          {hasQty && comp?.newAvgCost != null && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", fontSize: "0.65rem", ...NUM }}>
                              → {formatRs(comp.newAvgCost)}
                            </Typography>
                          )}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  );
                })}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      {serialVariants.length > 0 && (
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ px: 1.5, py: 0.75, borderTop: 1, borderColor: "divider", flexWrap: "wrap" }}>
          {serialVariants.map((v) => {
            const l = lineMap.get(v.product_id);
            const comp = computedMap.get(v.product_id);
            const count = l?.serials.length ?? 0;
            const target = comp?.baseQty ?? 0;
            return (
              <Chip
                key={v.product_id}
                size="small"
                clickable
                icon={<QrCodeScannerIcon fontSize="small" />}
                color={comp?.serialsOk ? "success" : "warning"}
                variant="outlined"
                label={`${formatVariant(v.variant_label, family?.option_unit) || v.name}: ${count}/${target}`}
                onClick={() => onOpenSerials(v)}
                sx={{ fontWeight: 700, ...NUM }}
              />
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
