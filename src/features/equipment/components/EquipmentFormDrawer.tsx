import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  MenuItem,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import {
  equipmentSchema,
  EquipmentFormData,
  Equipment,
} from "../schemas/equipment.schema";
import {
  useCreateEquipment,
  useUpdateEquipment,
} from "../hooks/useEquipmentHooks";

interface EquipmentFormDrawerProps {
  open: boolean;
  onClose: () => void;
  initialData?: Equipment | null;
}

// Helper component to render Tab panels
function CustomTabPanel(props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
      className="h-full flex flex-col"
    >
      {value === index && <Box sx={{ pt: 3, flexGrow: 1 }}>{children}</Box>}
    </div>
  );
}

export function EquipmentFormDrawer({
  open,
  onClose,
  initialData,
}: EquipmentFormDrawerProps) {
  const [tabIndex, setTabIndex] = useState(0);

  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();

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

  // Watch the bulk toggle to conditionally format other fields
  const isBulkItem = watch("is_bulk_item");

  useEffect(() => {
    if (open) {
      setTabIndex(0); // Reset to first tab on open
      if (initialData) {
        // Map database record directly to form inputs
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
            : "", // Format for date picker
          image_url: initialData.image_url || "",
        });
      } else {
        // Clear form for new item
        reset({
          minimum_rental_days: 1,
          total_owned_qty: 1,
          is_bulk_item: false,
        });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: EquipmentFormData) => {
    // 1. Create a flexible payload object we can safely modify
    const payload: any = { ...data };

    // 2. If it's NOT a bulk item, force total quantity to 1 for safety
    if (!payload.is_bulk_item) {
      payload.total_owned_qty = 1;
    }

    // 3. CRITICAL FIX: Convert empty strings to null so MySQL accepts them safely!
    if (payload.end_of_warranty_date === "") {
      payload.end_of_warranty_date = null;
    }
    if (payload.image_url === "") {
      payload.image_url = null;
    }

    // 4. Send the cleaned payload to the database
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
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      // Wider drawer (600px) to comfortably fit the two-column grid layout
      PaperProps={{ sx: { width: { xs: "100%", sm: 600 } } }}
    >
      <Box className="flex flex-col h-full bg-slate-50">
        {/* Sticky Header */}
        <Box className="px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
          <Box className="flex items-center justify-between mb-2">
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              {isEditing ? "Edit Asset Profile" : "Register New Equipment"}
            </Typography>
            <IconButton onClick={onClose} size="small" edge="end">
              <CloseIcon />
            </IconButton>
          </Box>
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            aria-label="equipment form tabs"
          >
            <Tab label="General Details" />
            <Tab label="Rental & Pricing" />
            <Tab label="Inventory Tracking" />
          </Tabs>
        </Box>

        {/* Scrollable Form Body */}
        <Box
          component="form"
          id="equipment-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-grow overflow-y-auto px-6 pb-6"
        >
          {/* TAB 1: General Details */}
          <CustomTabPanel value={tabIndex} index={0}>
            <Box className="space-y-5">
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

              <div className="grid grid-cols-2 gap-4">
                {/* Note: Hardcoded options for UI display. Later, fetch these from /categories and /warehouses APIs! */}
                <TextField
                  select
                  fullWidth
                  label="Category"
                  defaultValue=""
                  {...register("category_id")}
                  error={!!errors.category_id}
                  helperText={errors.category_id?.message}
                >
                  <MenuItem value={1}>Power Tools</MenuItem>
                  <MenuItem value={2}>Heavy Machinery</MenuItem>
                  <MenuItem value={3}>Generators</MenuItem>
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Warehouse Location"
                  defaultValue=""
                  {...register("warehouse_id")}
                  error={!!errors.warehouse_id}
                  helperText={errors.warehouse_id?.message}
                >
                  <MenuItem value={1}>Colombo Main Hub</MenuItem>
                  <MenuItem value={2}>Kandy Branch</MenuItem>
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
          </CustomTabPanel>

          {/* TAB 2: Rental & Pricing */}
          <CustomTabPanel value={tabIndex} index={1}>
            <Box className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
          </CustomTabPanel>

          {/* TAB 3: Inventory & Warranty */}
          <CustomTabPanel value={tabIndex} index={2}>
            <Box className="space-y-5">
              {/* Bulk Toggle Scenario */}
              <Box className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 flex justify-between items-center">
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    color="primary.dark"
                  >
                    Bulk Item Tracking
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Is this a serialized asset (e.g., 1 Tractor) or a bulk asset
                    (e.g., 500 Folding Chairs)?
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

              {/* Only show Total Quantity if it is a bulk item! */}
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

              <Typography
                variant="subtitle2"
                fontWeight="600"
                color="text.primary"
                sx={{ mt: 4, mb: -1 }}
              >
                Warranty Information
              </Typography>
              <Divider />

              <div className="grid grid-cols-2 gap-4">
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
          </CustomTabPanel>
        </Box>

        {/* Sticky Footer */}
        <Box className="p-6 bg-white border-t border-slate-200 flex justify-between items-center sticky bottom-0 z-10">
          <Typography variant="caption" color="error">
            {/* Show a global warning if they try to save while hidden tabs have errors */}
            {Object.keys(errors).length > 0 &&
              "Please fix errors before saving."}
          </Typography>
          <Box className="flex gap-3">
            <Button variant="outlined" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            {/* The 'form' attribute links this button to the form above, even though it's outside the <form> tag! */}
            <Button
              type="submit"
              form="equipment-form"
              variant="contained"
              disableElevation
              disabled={isPending}
              startIcon={
                isPending && <CircularProgress size={20} color="inherit" />
              }
            >
              {isPending
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Save Equipment"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
