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
  Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CalculateIcon from "@mui/icons-material/Calculate";
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
    setValue,
    formState: { errors },
  } = useForm<EquipmentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(equipmentSchema) as any,
    mode: "onChange",
    defaultValues: {
      minimum_rental_days: 1,
      total_owned_qty: 1,
      rented_qty: 0,
      defective_qty: 0,
      available_qty: 1,
      is_bulk_item: false,
    },
  });

  const isBulkItem = watch("is_bulk_item");
  const totalOwned = watch("total_owned_qty") || 1;
  const rentedQty = watch("rented_qty") || 0;
  const defectiveQty = watch("defective_qty") || 0;

  const calculatedAvailable = Math.max(
    0,
    Number(totalOwned) - Number(rentedQty) - Number(defectiveQty),
  );

  useEffect(() => {
    setValue("available_qty", calculatedAvailable, { shouldValidate: true });
  }, [calculatedAvailable, setValue]);

  useEffect(() => {
    if (!isBulkItem) {
      setValue("total_owned_qty", 1, { shouldValidate: true });
    }
  }, [isBulkItem, setValue]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          ...initialData,
          base_rental_price: Number(initialData.base_rental_price),
          extra_daily_rate: initialData.extra_daily_rate
            ? Number(initialData.extra_daily_rate)
            : undefined,
          purchase_cost: initialData.purchase_cost
            ? Number(initialData.purchase_cost)
            : undefined,
          end_of_warranty_date: initialData.end_of_warranty_date
            ? initialData.end_of_warranty_date.split("T")[0]
            : "",
          image_url: initialData.image_url || "",
          total_owned_qty: initialData.total_owned_qty || 1,
          rented_qty: initialData.rented_qty || 0,
          defective_qty: initialData.defective_qty || 0,
          available_qty: initialData.available_qty || 1,
        });
      } else {
        reset({
          equipment_name: "",
          serial_number: "",
          minimum_rental_days: 1,
          total_owned_qty: 1,
          rented_qty: 0,
          defective_qty: 0,
          available_qty: 1,
          is_bulk_item: false,
        });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: EquipmentFormData) => {
    const payload: any = { ...data };

    if (!payload.is_bulk_item) payload.total_owned_qty = 1;
    if (payload.end_of_warranty_date === "")
      payload.end_of_warranty_date = null;
    if (payload.image_url === "") payload.image_url = null;

    if (isEditing && initialData) {
      updateMutation.mutate(
        { id: initialData.equipment_id, data: payload },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => onClose() });
    }
  };

  const onValidationError = (errors: any) => {
    console.error("Validation Failed. Check fields:", errors);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      slotProps={{
        paper: {
          sx: { borderRadius: 3, bgcolor: "#f8fafc", maxHeight: "85vh" },
        },
      }}
    >
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
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold" }}
              color="text.primary"
            >
              {isEditing ? "Edit Asset Profile" : "Register New Equipment"}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
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

      <DialogContent dividers sx={{ p: 0, borderTop: "none" }}>
        <Box
          component="form"
          id="equipment-form"
          onSubmit={handleSubmit(onSubmit, onValidationError)}
          sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}
        >
          {/* SECTION 1: General Details */}
          <Paper
            elevation={0}
            sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
              <InfoOutlinedIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
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
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      fullWidth
                      label="Category"
                      {...field}
                      value={field.value ?? ""}
                      disabled={isLoadingCategories}
                      error={!!errors.category_id}
                      helperText={errors.category_id?.message}
                    >
                      {isLoadingCategories ? (
                        <MenuItem value="" disabled>
                          Loading...
                        </MenuItem>
                      ) : (
                        categories.map((c) => (
                          <MenuItem key={c.category_id} value={c.category_id}>
                            {c.category_name}
                          </MenuItem>
                        ))
                      )}
                    </TextField>
                  )}
                />

                <Controller
                  name="warehouse_id"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      fullWidth
                      label="Warehouse Location"
                      {...field}
                      value={field.value ?? ""}
                      disabled={isLoadingWarehouses}
                      error={!!errors.warehouse_id}
                      helperText={errors.warehouse_id?.message}
                    >
                      {isLoadingWarehouses ? (
                        <MenuItem value="" disabled>
                          Loading...
                        </MenuItem>
                      ) : (
                        warehouses.map((w) => (
                          <MenuItem key={w.warehouse_id} value={w.warehouse_id}>
                            {w.location_name}
                          </MenuItem>
                        ))
                      )}
                    </TextField>
                  )}
                />
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
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Rental & Pricing
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  label="Base Daily Rate"
                  type="number"
                  slotProps={{
                    htmlInput: { step: "0.01", min: "0" },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">Rs.</InputAdornment>
                      ),
                    },
                  }}
                  {...register("base_rental_price", { valueAsNumber: true })}
                  error={!!errors.base_rental_price}
                  helperText={errors.base_rental_price?.message}
                />
                <TextField
                  fullWidth
                  label="Overdue / Extra Daily Rate"
                  type="number"
                  slotProps={{
                    htmlInput: { step: "0.01", min: "0" },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">Rs.</InputAdornment>
                      ),
                    },
                  }}
                  {...register("extra_daily_rate", { valueAsNumber: true })}
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
                  slotProps={{ htmlInput: { min: "1" } }}
                  {...register("minimum_rental_days", { valueAsNumber: true })}
                  error={!!errors.minimum_rental_days}
                  helperText={errors.minimum_rental_days?.message}
                />
                <TextField
                  fullWidth
                  label="Original Purchase Cost"
                  type="number"
                  slotProps={{
                    htmlInput: { step: "0.01", min: "0" },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">Rs.</InputAdornment>
                      ),
                    },
                  }}
                  {...register("purchase_cost", { valueAsNumber: true })}
                  error={!!errors.purchase_cost}
                  helperText={
                    errors.purchase_cost?.message || "For internal ROI tracking"
                  }
                />
              </div>
            </Box>
          </Paper>

          {/* SECTION 3: Inventory Tracking & Math Box */}
          <Paper
            elevation={0}
            sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
              <Inventory2OutlinedIcon color="secondary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Inventory Management
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Toggle Bulk/Serialized */}
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
                    sx={{ fontWeight: "bold" }}
                    color="primary.dark"
                  >
                    Bulk Asset Status
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Is this a unique serialized item, or do you own many
                    identical units?
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
                      label={value ? "Bulk (Multiple)" : "Serialized (One)"}
                      labelPlacement="start"
                      sx={{ m: 0 }}
                    />
                  )}
                />
              </Box>

              {/* VISUAL MATH BOX */}
              <Box
                sx={{
                  p: 3,
                  border: "2px solid #e2e8f0",
                  borderRadius: 2,
                  bgcolor: "white",
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}
                >
                  <CalculateIcon color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Live Stock Equation
                  </Typography>
                </Box>

                <Grid container spacing={2} sx={{ alignItems: "center" }}>
                  {/* TOTAL OWNED */}
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      fullWidth
                      label="Total Owned"
                      type="number"
                      {...register("total_owned_qty", { valueAsNumber: true })}
                      disabled={!isBulkItem}
                      slotProps={{
                        htmlInput: {
                          min: isEditing ? rentedQty + defectiveQty : 1,
                        },
                        input: { sx: { fontWeight: "bold" } },
                      }}
                      error={!!errors.total_owned_qty}
                      helperText={
                        !isBulkItem
                          ? "Locked at 1 for serialized"
                          : "Total stock"
                      }
                    />
                  </Grid>

                  <Grid
                    size={{ xs: 12, sm: 1 }}
                    sx={{ display: "flex", justifyContent: "center" }}
                  >
                    <Typography
                      variant="h5"
                      color="text.secondary"
                      sx={{ fontWeight: "bold" }}
                    >
                      -
                    </Typography>
                  </Grid>

                  {/* RENTED */}
                  <Grid size={{ xs: 12, sm: 2.5 }}>
                    <TextField
                      fullWidth
                      label="Out on Rent"
                      type="number"
                      {...register("rented_qty")}
                      slotProps={{
                        input: {
                          readOnly: true,
                          sx: { bgcolor: "#f1f5f9", color: "text.secondary" },
                        },
                      }}
                      helperText="By POS"
                    />
                  </Grid>

                  <Grid
                    size={{ xs: 12, sm: 1 }}
                    sx={{ display: "flex", justifyContent: "center" }}
                  >
                    <Typography
                      variant="h5"
                      color="text.secondary"
                      sx={{ fontWeight: "bold" }}
                    >
                      -
                    </Typography>
                  </Grid>

                  {/* DEFECTIVE */}
                  <Grid size={{ xs: 12, sm: 2.5 }}>
                    <TextField
                      fullWidth
                      label="In Workshop"
                      type="number"
                      {...register("defective_qty")}
                      slotProps={{
                        input: {
                          readOnly: true,
                          sx: { bgcolor: "#fef2f2", color: "error.main" },
                        },
                      }}
                      helperText="By Logs"
                    />
                  </Grid>

                  <Grid
                    size={{ xs: 12, sm: 0.5 }}
                    sx={{ display: "flex", justifyContent: "center" }}
                  >
                    <Typography
                      variant="h5"
                      color="primary.main"
                      sx={{ fontWeight: "bold" }}
                    >
                      =
                    </Typography>
                  </Grid>

                  {/* AVAILABLE */}
                  <Grid size={{ xs: 12, sm: 1.5 }}>
                    <Box
                      sx={{
                        bgcolor: "#eff6ff",
                        border: "2px solid #3b82f6",
                        borderRadius: 1,
                        p: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="primary.dark"
                        sx={{
                          fontWeight: "bold",
                          textTransform: "uppercase",
                        }}
                      >
                        Available
                      </Typography>
                      <Typography
                        variant="h5"
                        color="primary.main"
                        sx={{ fontWeight: 900 }}
                      >
                        {calculatedAvailable}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  label="Warranty Period (Months)"
                  type="number"
                  slotProps={{ htmlInput: { min: "0" } }}
                  {...register("warranty_period_months", {
                    valueAsNumber: true,
                  })}
                  error={!!errors.warranty_period_months}
                  helperText={errors.warranty_period_months?.message}
                />
                <TextField
                  fullWidth
                  label="Warranty Expiry Date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
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
