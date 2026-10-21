import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputAdornment,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import PercentIcon from "@mui/icons-material/Percent";

import { useBulkUpdateEquipment } from "../hooks/useEquipmentHooks";
import { useCategoryOptions } from "@/features/equipment/hooks/useCategoryHooks";
import { useWarehouseOptions } from "@/features/warehouses/hooks/useWarehouseOptions";
import {
  FieldGrid,
  FormDialogShell,
  FormSection,
} from "@/components/forms/FormDialogShell";
import { useToast } from "@/components/ui/AppToast";
import { useTranslation } from "react-i18next";

interface EquipmentBulkEditDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIds: number[];
  onSuccess?: () => void;
}

export function EquipmentBulkEditDialog({
  open,
  onClose,
  selectedIds,
  onSuccess,
}: EquipmentBulkEditDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { showSuccess, showError } = useToast();
  const bulkUpdateMutation = useBulkUpdateEquipment();

  const { data: categories = [], isLoading: isLoadingCategories } = useCategoryOptions();
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useWarehouseOptions();

  // Field activation flags (Industry standard: Only explicitly enabled fields are updated)
  const [enableCategory, setEnableCategory] = useState(false);
  const [categoryId, setCategoryId] = useState<number | "">("");

  const [enableWarehouse, setEnableWarehouse] = useState(false);
  const [warehouseId, setWarehouseId] = useState<number | "">("");

  const [enableBulkItem, setEnableBulkItem] = useState(false);
  const [isBulkItem, setIsBulkItem] = useState(false);

  const [enableMinRentalDays, setEnableMinRentalDays] = useState(false);
  const [minRentalDays, setMinRentalDays] = useState<number | "">("");

  const [enablePricing, setEnablePricing] = useState(false);
  const [pricingMode, setPricingMode] = useState<"direct" | "adjustment">("direct");
  const [basePrice, setBasePrice] = useState<number | "">("");
  const [extraDailyRate, setExtraDailyRate] = useState<number | "">("");

  // Delta adjustment fields
  const [adjustmentType, setAdjustmentType] = useState<"percentage" | "fixed">("percentage");
  const [adjustmentField, setAdjustmentField] = useState<"both" | "base" | "extra">("both");
  const [adjustmentValue, setAdjustmentValue] = useState<number | "">("");

  const [localError, setLocalError] = useState<string | null>(null);

  const resetForm = () => {
    setEnableCategory(false);
    setCategoryId("");
    setEnableWarehouse(false);
    setWarehouseId("");
    setEnableBulkItem(false);
    setIsBulkItem(false);
    setEnableMinRentalDays(false);
    setMinRentalDays("");
    setEnablePricing(false);
    setPricingMode("direct");
    setBasePrice("");
    setExtraDailyRate("");
    setAdjustmentType("percentage");
    setAdjustmentField("both");
    setAdjustmentValue("");
    setLocalError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const hasAnyFieldSelected =
    enableCategory ||
    enableWarehouse ||
    enableBulkItem ||
    enableMinRentalDays ||
    enablePricing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (selectedIds.length === 0) {
      setLocalError(t("equipment.EquipmentBulkEditDialog.noEquipmentItemsSelected"));
      return;
    }

    if (!hasAnyFieldSelected) {
      setLocalError(t("customers.CustomerBulkEditDialog.pleaseEnableAndConfigureAt"));
      return;
    }

    const updates: Record<string, any> = {};

    if (enableCategory) {
      if (categoryId === "") {
        setLocalError(t("equipment.EquipmentBulkEditDialog.pleaseSelectAValidCategory"));
        return;
      }
      updates.category_id = Number(categoryId);
    }

    if (enableWarehouse) {
      if (warehouseId === "") {
        setLocalError(t("equipment.EquipmentBulkEditDialog.pleaseSelectAValidWarehouse"));
        return;
      }
      updates.warehouse_id = Number(warehouseId);
    }

    if (enableBulkItem) {
      updates.is_bulk_item = Boolean(isBulkItem);
    }

    if (enableMinRentalDays) {
      const minDays = Number(minRentalDays);
      if (isNaN(minDays) || minDays < 1) {
        setLocalError(t("equipment.EquipmentBulkEditDialog.minimumRentalDaysMustBe"));
        return;
      }
      updates.minimum_rental_days = minDays;
    }

    if (enablePricing) {
      if (pricingMode === "direct") {
        if (basePrice === "" && extraDailyRate === "") {
          setLocalError(t("equipment.EquipmentBulkEditDialog.pleaseSpecifyAtLeastOne"));
          return;
        }
        if (basePrice !== "") {
          const bp = Number(basePrice);
          if (isNaN(bp) || bp < 0) {
            setLocalError(t("equipment.EquipmentBulkEditDialog.baseRentalPriceMustBe"));
            return;
          }
          updates.base_rental_price = bp;
        }
        if (extraDailyRate !== "") {
          const ep = Number(extraDailyRate);
          if (isNaN(ep) || ep < 0) {
            setLocalError(t("equipment.EquipmentBulkEditDialog.extraDailyRateMustBe"));
            return;
          }
          updates.extra_daily_rate = ep;
        }
      } else {
        // Adjustment mode
        const val = Number(adjustmentValue);
        if (adjustmentValue === "" || isNaN(val)) {
          setLocalError(t("equipment.EquipmentBulkEditDialog.pleaseSpecifyAValidPrice"));
          return;
        }
        updates.price_adjustment = {
          type: adjustmentType,
          field: adjustmentField,
          value: val,
        };
      }
    }

    try {
      const result = await bulkUpdateMutation.mutateAsync({
        ids: selectedIds,
        updates,
      });

      showSuccess(
        t("equipment.EquipmentBulkEditDialog.successfullyUpdatedEquipmentItems", { value: result.data?.updatedCount || selectedIds.length }),
        t("customers.CustomerBulkEditDialog.bulkUpdateComplete")
      );
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || t("equipment.EquipmentBulkEditDialog.failedToBulkUpdateEquipment");
      setLocalError(msg);
      showError(msg, t("customers.CustomerBulkEditDialog.bulkUpdateFailed"));
    }
  };

  const selectedCount = selectedIds.length;

  return (
    <FormDialogShell
      open={open}
      onClose={handleClose}
      maxWidth="md"
      eyebrow={t("equipment.EquipmentBulkEditDialog.batchFleetOperations")}
      title={t("equipment.EquipmentBulkEditDialog.bulkEditTitle", { count: selectedCount })}
      subtitle={t("equipment.EquipmentBulkEditDialog.onlyExplicitlyCheckedFieldsWill")}
      avatarIcon={<EditNoteIcon sx={{ fontSize: 28 }} />}
      headerChips={
        <>
          <Chip
            size="small"
            label={t("customers.CustomerBulkEditDialog.selected", { selectedCount })}
            color="primary"
            variant="filled"
            sx={{ fontWeight: 700, bgcolor: "rgba(255, 255, 255, 0.2)", color: "#fff" }}
          />
          <Chip
            size="small"
            icon={<CheckCircleOutlinedIcon sx={{ color: "#fff !important", fontSize: "14px !important" }} />}
            label={t("customers.CustomerBulkEditDialog.safeTransactionalUpdate")}
            sx={{ fontWeight: 600, bgcolor: "rgba(255, 255, 255, 0.12)", color: "#fff" }}
          />
        </>
      }
      footer={
        <>
          <Button onClick={handleClose} color="inherit" disabled={bulkUpdateMutation.isPending}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!hasAnyFieldSelected || bulkUpdateMutation.isPending}
            startIcon={
              bulkUpdateMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
            sx={{ fontWeight: 700, px: 3 }}
          >
            {bulkUpdateMutation.isPending
              ? t("customers.CustomerBulkEditDialog.applyingUpdates")
              : t("equipment.EquipmentBulkEditDialog.applyToItems", { count: selectedCount })}
          </Button>
        </>
      }
    >
      {localError && (
        <Alert severity="error" onClose={() => setLocalError(null)} sx={{ borderRadius: 2 }}>
          {localError}
        </Alert>
      )}

      {/* ── 1. Category & Location ── */}
      <FormSection
        icon={<LayersOutlinedIcon />}
        title={t("equipment.EquipmentBulkEditDialog.categoryWarehouseAssignment")}
        hint={t("equipment.EquipmentBulkEditDialog.transferOrReclassifyTheSelected")}
      >
        {/* Category Row */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${enableCategory ? theme.palette.primary.main : theme.palette.border.subtle}`,
            bgcolor: enableCategory ? alpha(theme.palette.primary.main, 0.02) : "transparent",
            transition: "all 0.15s ease",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={enableCategory}
                onChange={(e) => setEnableCategory(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("equipment.EquipmentBulkEditDialog.updateCategory")}
              </Typography>
            }
          />
          {enableCategory && (
            <Box sx={{ mt: 1.5, pl: { sm: 4 } }}>
              <TextField
                select
                fullWidth
                size="small"
                label={t("equipment.EquipmentBulkEditDialog.selectTargetCategory")}
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                disabled={isLoadingCategories}
              >
                {categories.map((cat: any) => (
                  <MenuItem key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}
        </Box>

        {/* Warehouse Row */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${enableWarehouse ? theme.palette.primary.main : theme.palette.border.subtle}`,
            bgcolor: enableWarehouse ? alpha(theme.palette.primary.main, 0.02) : "transparent",
            transition: "all 0.15s ease",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={enableWarehouse}
                onChange={(e) => setEnableWarehouse(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("equipment.EquipmentBulkEditDialog.updateWarehouseLocation")}
              </Typography>
            }
          />
          {enableWarehouse && (
            <Box sx={{ mt: 1.5, pl: { sm: 4 } }}>
              <TextField
                select
                fullWidth
                size="small"
                label={t("equipment.EquipmentBulkEditDialog.selectTargetWarehouseDepot")}
                value={warehouseId}
                onChange={(e) => setWarehouseId(Number(e.target.value))}
                disabled={isLoadingWarehouses}
              >
                {warehouses.map((wh: any) => (
                  <MenuItem key={wh.warehouse_id} value={wh.warehouse_id}>
                    {wh.location_name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}
        </Box>
      </FormSection>

      {/* ── 2. Inventory & Classification ── */}
      <FormSection
        icon={<Inventory2OutlinedIcon />}
        title={t("equipment.EquipmentBulkEditDialog.inventoryTrackingPolicy")}
        hint={t("equipment.EquipmentBulkEditDialog.modifyStockTrackingModeOr")}
      >
        {/* Bulk vs Serialized tracking */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${enableBulkItem ? theme.palette.primary.main : theme.palette.border.subtle}`,
            bgcolor: enableBulkItem ? alpha(theme.palette.primary.main, 0.02) : "transparent",
            transition: "all 0.15s ease",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={enableBulkItem}
                onChange={(e) => setEnableBulkItem(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("equipment.EquipmentBulkEditDialog.updateInventoryTrackingMode")}
              </Typography>
            }
          />
          {enableBulkItem && (
            <Box sx={{ mt: 1.5, pl: { sm: 4 }, display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {t("equipment.EquipmentBulkEditDialog.individualSerialized")}
              </Typography>
              <Switch
                checked={isBulkItem}
                onChange={(e) => setIsBulkItem(e.target.checked)}
                color="primary"
              />
              <Typography variant="body2" sx={{ fontWeight: isBulkItem ? 700 : 500, color: theme.palette.text.primary }}>
                {t("equipment.EquipmentBulkEditDialog.bulkStockQuantityTracked")}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Min rental days */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${enableMinRentalDays ? theme.palette.primary.main : theme.palette.border.subtle}`,
            bgcolor: enableMinRentalDays ? alpha(theme.palette.primary.main, 0.02) : "transparent",
            transition: "all 0.15s ease",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={enableMinRentalDays}
                onChange={(e) => setEnableMinRentalDays(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("equipment.EquipmentBulkEditDialog.updateMinimumRentalDays")}
              </Typography>
            }
          />
          {enableMinRentalDays && (
            <Box sx={{ mt: 1.5, pl: { sm: 4 } }}>
              <TextField
                type="number"
                size="small"
                label={t("equipment.EquipmentBulkEditDialog.minimumRentalDays")}
                value={minRentalDays}
                onChange={(e) => setMinRentalDays(e.target.value === "" ? "" : Number(e.target.value))}
                inputProps={{ min: 1 }}
                sx={{ maxWidth: 260 }}
              />
            </Box>
          )}
        </Box>
      </FormSection>

      {/* ── 3. Pricing Strategy ── */}
      <FormSection
        icon={<AttachMoneyIcon />}
        title={t("equipment.EquipmentBulkEditDialog.rentalRatesPricingAdjustment")}
        hint={t("equipment.EquipmentBulkEditDialog.directlyAssignNewPriceRates")}
      >
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${enablePricing ? theme.palette.primary.main : theme.palette.border.subtle}`,
            bgcolor: enablePricing ? alpha(theme.palette.primary.main, 0.02) : "transparent",
            transition: "all 0.15s ease",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={enablePricing}
                onChange={(e) => setEnablePricing(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("equipment.EquipmentBulkEditDialog.updatePricingStrategy")}
              </Typography>
            }
          />

          {enablePricing && (
            <Box sx={{ mt: 2, pl: { sm: 4 }, display: "flex", flexDirection: "column", gap: 2 }}>
              <RadioGroup
                row
                value={pricingMode}
                onChange={(e) => setPricingMode(e.target.value as "direct" | "adjustment")}
              >
                <FormControlLabel
                  value="direct"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{t("equipment.EquipmentBulkEditDialog.setFixedRateValues")}</Typography>}
                />
                <FormControlLabel
                  value="adjustment"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{t("equipment.EquipmentBulkEditDialog.applyDeltaAdjustmentOr")}</Typography>}
                />
              </RadioGroup>

              {pricingMode === "direct" ? (
                <FieldGrid columns={2}>
                  <TextField
                    type="number"
                    size="small"
                    label={t("equipment.EquipmentBulkEditDialog.newBaseRentalDailyPrice")}
                    placeholder={t("equipment.EquipmentBulkEditDialog.leaveBlankToKeepUnchanged")}
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                      htmlInput: { min: 0, step: "0.01" },
                    }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    label={t("equipment.EquipmentBulkEditDialog.newExtraDailyRate")}
                    placeholder={t("equipment.EquipmentBulkEditDialog.leaveBlankToKeepUnchanged")}
                    value={extraDailyRate}
                    onChange={(e) => setExtraDailyRate(e.target.value === "" ? "" : Number(e.target.value))}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                      htmlInput: { min: 0, step: "0.01" },
                    }}
                  />
                </FieldGrid>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <FieldGrid columns={3}>
                    <TextField
                      select
                      size="small"
                      label={t("equipment.EquipmentBulkEditDialog.adjustmentType")}
                      value={adjustmentType}
                      onChange={(e) => setAdjustmentType(e.target.value as "percentage" | "fixed")}
                    >
                      <MenuItem value="percentage">{t("equipment.EquipmentBulkEditDialog.percentage")}</MenuItem>
                      <MenuItem value="fixed">{t("equipment.EquipmentBulkEditDialog.fixedAmount")}</MenuItem>
                    </TextField>

                    <TextField
                      select
                      size="small"
                      label={t("equipment.EquipmentBulkEditDialog.applyTo")}
                      value={adjustmentField}
                      onChange={(e) => setAdjustmentField(e.target.value as "both" | "base" | "extra")}
                    >
                      <MenuItem value="both">{t("equipment.EquipmentBulkEditDialog.bothBaseExtraRates")}</MenuItem>
                      <MenuItem value="base">{t("equipment.EquipmentBulkEditDialog.baseRentalPriceOnly")}</MenuItem>
                      <MenuItem value="extra">{t("equipment.EquipmentBulkEditDialog.extraDailyRateOnly")}</MenuItem>
                    </TextField>

                    <TextField
                      type="number"
                      size="small"
                      label={adjustmentType === "percentage" ? t("equipment.EquipmentBulkEditDialog.deltaPercentage") : t("equipment.EquipmentBulkEditDialog.deltaAmount")}
                      placeholder={adjustmentType === "percentage" ? "e.g. 10 or -5" : "e.g. 15 or -10"}
                      value={adjustmentValue}
                      onChange={(e) => setAdjustmentValue(e.target.value === "" ? "" : Number(e.target.value))}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              {adjustmentType === "percentage" ? <PercentIcon sx={{ fontSize: 16 }} /> : "$"}
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  </FieldGrid>
                  {adjustmentValue !== "" && (
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {t("equipment.EquipmentBulkEditDialog.adjustSummary", {
                          direction: Number(adjustmentValue) >= 0 ? t("equipment.EquipmentBulkEditDialog.increasing") : t("equipment.EquipmentBulkEditDialog.decreasing"),
                          target:
                            adjustmentField === "both"
                              ? t("equipment.EquipmentBulkEditDialog.bothRates")
                              : adjustmentField === "base"
                                ? t("equipment.EquipmentBulkEditDialog.baseRate")
                                : t("equipment.EquipmentBulkEditDialog.extraRate"),
                          amount: Math.abs(Number(adjustmentValue)),
                          unit: adjustmentType === "percentage" ? "%" : "$",
                          items: selectedCount,
                        })}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </FormSection>
    </FormDialogShell>
  );
}
