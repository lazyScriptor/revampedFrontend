import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  MenuItem,
  Divider,
  CircularProgress,
  FormControlLabel,
  Switch,
  InputAdornment,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { useCategoryOptions } from "@/features/equipment/hooks/useCategoryHooks";
import { useWarehouseOptions } from "@/features/warehouses/hooks/useWarehouseOptions";

import {
  equipmentSchema,
  EquipmentFormData,
  Equipment,
} from "../schemas/equipment.schema";
import {
  useCreateEquipment,
  useUpdateEquipment,
} from "../hooks/useEquipmentHooks";

interface EquipmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: Equipment | null;
}

export function EquipmentFormDialog({
  open,
  onClose,
  initialData,
}: EquipmentFormDialogProps) {
  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();

  const { data: categories = [], isLoading: isLoadingCategories } =
    useCategoryOptions();
  const { data: warehouses = [], isLoading: isLoadingWarehouses } =
    useWarehouseOptions();

  const isEditing = !!initialData;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      minimum_rental_days: 1,
      total_owned_qty: 1,
      is_bulk_item: false,
    },
  });

  const isBulkItem = watch("is_bulk_item");

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          equipment_name: initialData.equipment_name,
          serial_number: initialData.serial_number,
          category_id: initialData.category_id,
          warehouse_id: initialData.warehouse_id,
          base_rental_price: Number(initialData.base_rental_price),
          extra_daily_rate: initialData.extra_daily_rate
            ? Number(initialData.extra_daily_rate)
            : undefined,
          minimum_rental_days: initialData.minimum_rental_days,
          purchase_cost: initialData.purchase_cost
            ? Number(initialData.purchase_cost)
            : undefined,
          total_owned_qty: initialData.total_owned_qty,
          is_bulk_item: initialData.is_bulk_item,
          warranty_period_months:
            initialData.warranty_period_months || undefined,
          end_of_warranty_date: initialData.end_of_warranty_date
            ? initialData.end_of_warranty_date.split("T")[0]
            : "",
          image_url: initialData.image_url || "",
        });
      } else {
        reset({
          minimum_rental_days: 1,
          total_owned_qty: 1,
          is_bulk_item: false,
        });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: EquipmentFormData) => {
    const payload: any = { ...data };

    if (!payload.is_bulk_item) {
      payload.total_owned_qty = 1;
    }
    if (payload.end_of_warranty_date === "") {
      payload.end_of_warranty_date = null;
    }
    if (payload.image_url === "") {
      payload.image_url = null;
    }

    if (isEditing && initialData) {
      updateMutation.mutate(
        { id: initialData.equipment_id, data: payload },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => onClose() });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 3, // Classy rounded corners
          bgcolor: "#f8fafc", // Subtle slate background so the white cards pop
          maxHeight: "85vh",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{ p: 3, bgcolor: "white", borderBottom: "1px solid #e2e8f0" }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight="bold" color="text.primary">
              {isEditing ? "Edit Asset Profile" : "Register New Equipment"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Fill in the specifications, pricing, and tracking details below.
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ bgcolor: "grey.100" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Body: Form containing visually distinct cards */}
      <DialogContent dividers sx={{ p: 0, borderTop: "none" }}>
        <Box
          component="form"
          id="equipment-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}
        >
          {/* SECTION 1: General Details */}
          <Paper
            elevation={0}
            sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
              <InfoOutlinedIcon color="primary" />
              <Typography variant="h6" fontWeight="600">
                General Information
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <TextField
                fullWidth
                label="Equipment Name"
                {...register("equipment_name")}
                error={!!errors.equipment_name}
                helperText={errors.equipment_name?.message}
                placeholder="e.g. Bosch Hammer Drill 800W"
              />
              <TextField
                fullWidth
                label="SKU / Serial Number"
                {...register("serial_number")}
                error={!!errors.serial_number}
                helperText={errors.serial_number?.message}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dynamic Category Dropdown */}
                <TextField
                  select
                  fullWidth
                  label="Category"
                  defaultValue=""
                  disabled={isLoadingCategories}
                  {...register("category_id")}
                  error={!!errors.category_id}
                  helperText={errors.category_id?.message}
                >
                  {isLoadingCategories ? (
                    <MenuItem value="" disabled>
                      Loading categories...
                    </MenuItem>
                  ) : categories.length === 0 ? (
                    <MenuItem value="" disabled>
                      No categories found
                    </MenuItem>
                  ) : (
                    categories.map((category) => (
                      <MenuItem
                        key={category.category_id}
                        value={category.category_id}
                      >
                        {category.category_name}
                      </MenuItem>
                    ))
                  )}
                </TextField>

                {/* Dynamic Warehouse Dropdown */}
                <TextField
                  select
                  fullWidth
                  label="Warehouse Location"
                  defaultValue=""
                  disabled={isLoadingWarehouses}
                  {...register("warehouse_id")}
                  error={!!errors.warehouse_id}
                  helperText={errors.warehouse_id?.message}
                >
                  {isLoadingWarehouses ? (
                    <MenuItem value="" disabled>
                      Loading locations...
                    </MenuItem>
                  ) : warehouses.length === 0 ? (
                    <MenuItem value="" disabled>
                      No locations found
                    </MenuItem>
                  ) : (
                    warehouses.map((warehouse) => (
                      <MenuItem
                        key={warehouse.warehouse_id}
                        value={warehouse.warehouse_id}
                      >
                        {warehouse.location_name}
                      </MenuItem>
                    ))
                  )}
                </TextField>
              </div>
              <TextField
                fullWidth
                label="Image URL (Optional)"
                {...register("image_url")}
                error={!!errors.image_url}
                helperText={errors.image_url?.message}
                placeholder="https://..."
              />
            </Box>
          </Paper>

          {/* SECTION 2: Rental & Pricing */}
          <Paper
            elevation={0}
            sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
              <AttachMoneyIcon color="success" />
              <Typography variant="h6" fontWeight="600">
                Rental & Pricing
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  label="Base Daily Rate"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                  {...register("base_rental_price")}
                  error={!!errors.base_rental_price}
                  helperText={errors.base_rental_price?.message}
                />
                <TextField
                  fullWidth
                  label="Overdue / Extra Daily Rate"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                  {...register("extra_daily_rate")}
                  error={!!errors.extra_daily_rate}
                  helperText={
                    errors.extra_daily_rate?.message ||
                    "Applied if returned late"
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  label="Minimum Rental Days"
                  type="number"
                  inputProps={{ min: "1" }}
                  {...register("minimum_rental_days")}
                  error={!!errors.minimum_rental_days}
                  helperText={errors.minimum_rental_days?.message}
                />
                <TextField
                  fullWidth
                  label="Original Purchase Cost"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                  {...register("purchase_cost")}
                  error={!!errors.purchase_cost}
                  helperText={
                    errors.purchase_cost?.message || "For internal ROI tracking"
                  }
                />
              </div>
            </Box>
          </Paper>

          {/* SECTION 3: Inventory Tracking */}
          <Paper
            elevation={0}
            sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
              <Inventory2OutlinedIcon color="secondary" />
              <Typography variant="h6" fontWeight="600">
                Inventory & Warranty
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "#eff6ff",
                  borderRadius: 2,
                  border: "1px solid #dbeafe",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    color="primary.dark"
                  >
                    Bulk Item Tracking
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Is this a serialized asset or a bulk asset?
                  </Typography>
                </Box>
                <Controller
                  name="is_bulk_item"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={value}
                          onChange={onChange}
                          color="primary"
                        />
                      }
                      label={value ? "Bulk" : "Serialized"}
                      labelPlacement="start"
                      sx={{ m: 0 }}
                    />
                  )}
                />
              </Box>

              {isBulkItem && (
                <TextField
                  fullWidth
                  label="Total Owned Quantity"
                  type="number"
                  inputProps={{ min: "1" }}
                  {...register("total_owned_qty")}
                  error={!!errors.total_owned_qty}
                  helperText={errors.total_owned_qty?.message}
                />
              )}

              <Divider />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  label="Warranty Period (Months)"
                  type="number"
                  inputProps={{ min: "0" }}
                  {...register("warranty_period_months")}
                  error={!!errors.warranty_period_months}
                  helperText={errors.warranty_period_months?.message}
                />
                <TextField
                  fullWidth
                  label="Warranty Expiry Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  {...register("end_of_warranty_date")}
                  error={!!errors.end_of_warranty_date}
                  helperText={errors.end_of_warranty_date?.message}
                />
              </div>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      {/* Footer */}
      <DialogActions
        sx={{ px: 3, py: 2, bgcolor: "white", borderTop: "1px solid #e2e8f0" }}
      >
        <Typography
          variant="caption"
          color="error"
          sx={{ flexGrow: 1, fontWeight: 500 }}
        >
          {Object.keys(errors).length > 0 &&
            "Please fix highlighted errors before saving."}
        </Typography>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={isPending}
          sx={{ borderRadius: 2, textTransform: "none", px: 3 }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="equipment-form"
          variant="contained"
          disableElevation
          disabled={isPending}
          startIcon={
            isPending && <CircularProgress size={20} color="inherit" />
          }
          sx={{ borderRadius: 2, textTransform: "none", px: 4 }}
        >
          {isPending
            ? "Saving..."
            : isEditing
              ? "Save Changes"
              : "Save Equipment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
