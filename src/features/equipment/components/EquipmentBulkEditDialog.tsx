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
      setLocalError("No equipment items selected.");
      return;
    }

    if (!hasAnyFieldSelected) {
      setLocalError("Please enable and configure at least one field to bulk update.");
      return;
    }

    const updates: Record<string, any> = {};

    if (enableCategory) {
      if (categoryId === "") {
        setLocalError("Please select a valid category or uncheck the Category field.");
        return;
      }
      updates.category_id = Number(categoryId);
    }

    if (enableWarehouse) {
      if (warehouseId === "") {
        setLocalError("Please select a valid warehouse or uncheck the Warehouse field.");
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
        setLocalError("Minimum rental days must be at least 1.");
        return;
      }
      updates.minimum_rental_days = minDays;
    }

    if (enablePricing) {
      if (pricingMode === "direct") {
        if (basePrice === "" && extraDailyRate === "") {
          setLocalError("Please specify at least one price rate (Base or Extra rate).");
          return;
        }
        if (basePrice !== "") {
          const bp = Number(basePrice);
          if (isNaN(bp) || bp < 0) {
            setLocalError("Base rental price must be 0 or greater.");
            return;
          }
          updates.base_rental_price = bp;
        }
        if (extraDailyRate !== "") {
          const ep = Number(extraDailyRate);
          if (isNaN(ep) || ep < 0) {
            setLocalError("Extra daily rate must be 0 or greater.");
            return;
          }
          updates.extra_daily_rate = ep;
        }
      } else {
        // Adjustment mode
        const val = Number(adjustmentValue);
        if (adjustmentValue === "" || isNaN(val)) {
          setLocalError("Please specify a valid price adjustment delta value.");
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
        `Successfully updated ${result.data?.updatedCount || selectedIds.length} equipment items.`,
        "Bulk Update Complete"
      );
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to bulk update equipment.";
      setLocalError(msg);
      showError(msg, "Bulk Update Failed");
    }
  };

  const selectedCount = selectedIds.length;

  return (
    <FormDialogShell
      open={open}
      onClose={handleClose}
      maxWidth="md"
      eyebrow="BATCH FLEET OPERATIONS"
      title={`Bulk Edit Equipment (${selectedCount} Item${selectedCount === 1 ? "" : "s"})`}
      subtitle="Only explicitly checked fields will be modified across the selected fleet inventory. Untouched properties remain intact."
      avatarIcon={<EditNoteIcon sx={{ fontSize: 28 }} />}
      headerChips={
        <>
          <Chip
            size="small"
            label={`${selectedCount} Selected`}
            color="primary"
            variant="filled"
            sx={{ fontWeight: 700, bgcolor: "rgba(255, 255, 255, 0.2)", color: "#fff" }}
          />
          <Chip
            size="small"
            icon={<CheckCircleOutlinedIcon sx={{ color: "#fff !important", fontSize: "14px !important" }} />}
            label="Safe Transactional Update"
            sx={{ fontWeight: 600, bgcolor: "rgba(255, 255, 255, 0.12)", color: "#fff" }}
          />
        </>
      }
      footer={
        <>
          <Button onClick={handleClose} color="inherit" disabled={bulkUpdateMutation.isPending}>
            Cancel
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
              ? "Applying Updates..."
              : `Apply to ${selectedCount} Item${selectedCount === 1 ? "" : "s"}`}
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
        title="Category & Warehouse Assignment"
        hint="Transfer or reclassify the selected equipment to specific categories or storage depots."
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
                Update Category
              </Typography>
            }
          />
          {enableCategory && (
            <Box sx={{ mt: 1.5, pl: { sm: 4 } }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Select Target Category"
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
                Update Warehouse Location
              </Typography>
            }
          />
          {enableWarehouse && (
            <Box sx={{ mt: 1.5, pl: { sm: 4 } }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Select Target Warehouse / Depot"
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
        title="Inventory Tracking & Policy"
        hint="Modify stock tracking mode or minimum rental duration across all chosen items."
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
                Update Inventory Tracking Mode
              </Typography>
            }
          />
          {enableBulkItem && (
            <Box sx={{ mt: 1.5, pl: { sm: 4 }, display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                Individual / Serialized
              </Typography>
              <Switch
                checked={isBulkItem}
                onChange={(e) => setIsBulkItem(e.target.checked)}
                color="primary"
              />
              <Typography variant="body2" sx={{ fontWeight: isBulkItem ? 700 : 500, color: theme.palette.text.primary }}>
                Bulk Stock (Quantity Tracked)
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
                Update Minimum Rental Days
              </Typography>
            }
          />
          {enableMinRentalDays && (
            <Box sx={{ mt: 1.5, pl: { sm: 4 } }}>
              <TextField
                type="number"
                size="small"
                label="Minimum Rental Days"
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
        title="Rental Rates & Pricing Adjustment"
        hint="Directly assign new price rates or apply a delta adjustment (percentage or fixed amount)."
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
                Update Pricing Strategy
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
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Set Fixed Rate Values</Typography>}
                />
                <FormControlLabel
                  value="adjustment"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Apply Delta Adjustment (± % or $)</Typography>}
                />
              </RadioGroup>

              {pricingMode === "direct" ? (
                <FieldGrid columns={2}>
                  <TextField
                    type="number"
                    size="small"
                    label="New Base Rental Daily Price"
                    placeholder="Leave blank to keep unchanged"
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
                    label="New Extra Daily Rate"
                    placeholder="Leave blank to keep unchanged"
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
                      label="Adjustment Type"
                      value={adjustmentType}
                      onChange={(e) => setAdjustmentType(e.target.value as "percentage" | "fixed")}
                    >
                      <MenuItem value="percentage">Percentage (%)</MenuItem>
                      <MenuItem value="fixed">Fixed Amount ($)</MenuItem>
                    </TextField>

                    <TextField
                      select
                      size="small"
                      label="Apply To"
                      value={adjustmentField}
                      onChange={(e) => setAdjustmentField(e.target.value as "both" | "base" | "extra")}
                    >
                      <MenuItem value="both">Both Base & Extra Rates</MenuItem>
                      <MenuItem value="base">Base Rental Price Only</MenuItem>
                      <MenuItem value="extra">Extra Daily Rate Only</MenuItem>
                    </TextField>

                    <TextField
                      type="number"
                      size="small"
                      label={adjustmentType === "percentage" ? "Delta Percentage" : "Delta Amount ($)"}
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
                      {Number(adjustmentValue) >= 0 ? "Increasing" : "Decreasing"}{" "}
                      {adjustmentField === "both" ? "both base and extra rates" : `${adjustmentField} rate`}{" "}
                      by {Math.abs(Number(adjustmentValue))}{adjustmentType === "percentage" ? "%" : "$"} across {selectedCount} items.
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
