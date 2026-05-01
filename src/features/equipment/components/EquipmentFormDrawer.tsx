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
  Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CalculateIcon from "@mui/icons-material/Calculate";

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
      style={{
        height: "100%",
        display: value === index ? "flex" : "none",
        flexDirection: "column",
      }}
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
    setValue,
    formState: { errors },
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    mode: "onChange", // Instantly show validation errors
    defaultValues: {
      minimum_rental_days: 1,
      total_owned_qty: 1,
      rented_qty: 0,
      defective_qty: 0,
      available_qty: 1,
      is_bulk_item: false,
    },
  });

  // --- REAL-TIME INVENTORY MATH WATCHERS ---
  const isBulkItem = watch("is_bulk_item");
  const totalOwned = watch("total_owned_qty") || 1;
  const rentedQty = watch("rented_qty") || 0;
  const defectiveQty = watch("defective_qty") || 0;

  // Calculate Available Qty safely
  const calculatedAvailable = Math.max(
    0,
    Number(totalOwned) - Number(rentedQty) - Number(defectiveQty),
  );

  // Keep the hidden available_qty field synced so Zod validation passes
  useEffect(() => {
    setValue("available_qty", calculatedAvailable, { shouldValidate: true });
  }, [calculatedAvailable, setValue]);

  // If Bulk is turned off, strictly lock Total Owned back to 1
  useEffect(() => {
    if (!isBulkItem) {
      setValue("total_owned_qty", 1, { shouldValidate: true });
    }
  }, [isBulkItem, setValue]);

  useEffect(() => {
    if (open) {
      setTabIndex(0);
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
          total_owned_qty: initialData.total_owned_qty || 1,
          rented_qty: initialData.rented_qty || 0,
          defective_qty: initialData.defective_qty || 0,
          available_qty: initialData.available_qty || 1,
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
          equipment_name: "",
          serial_number: "",
          minimum_rental_days: 1,
          total_owned_qty: 1,
          rented_qty: 0,
          defective_qty: 0,
          available_qty: 1,
          is_bulk_item: false,
          image_url: "",
          end_of_warranty_date: "",
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
    console.error("Validation Failed:", errors);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 600 },
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* 1. Sticky Header */}
      <Box
        sx={{
          px: 3,
          pt: 3,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
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
          variant="fullWidth" // Helps tabs stretch nicely in the Drawer
        >
          <Tab label="General Details" />
          <Tab label="Rental & Pricing" />
          <Tab label="Inventory Tracking" />
        </Tabs>
      </Box>

      {/* 2. Scrollable Form Body */}
      <Box
        component="form"
        id="equipment-form"
        onSubmit={handleSubmit(onSubmit, onValidationError)}
        sx={{ flexGrow: 1, overflowY: "auto", p: 3, bgcolor: "#f8fafc" }}
      >
        {/* --- TAB 1: GENERAL DETAILS --- */}
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
              <TextField
                select
                fullWidth
                label="Category"
                defaultValue=""
                {...register("category_id", { valueAsNumber: true })}
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
                {...register("warehouse_id", { valueAsNumber: true })}
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

        {/* --- TAB 2: RENTAL & PRICING --- */}
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
                {...register("base_rental_price", { valueAsNumber: true })}
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
                {...register("extra_daily_rate", { valueAsNumber: true })}
                error={!!errors.extra_daily_rate}
                helperText={
                  errors.extra_daily_rate?.message || "Applied if returned late"
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextField
                fullWidth
                label="Minimum Rental Days"
                type="number"
                inputProps={{ min: "1" }}
                {...register("minimum_rental_days", { valueAsNumber: true })}
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
                {...register("purchase_cost", { valueAsNumber: true })}
                error={!!errors.purchase_cost}
                helperText={
                  errors.purchase_cost?.message || "For internal ROI tracking"
                }
              />
            </div>
          </Box>
        </CustomTabPanel>

        {/* --- TAB 3: INVENTORY TRACKING --- */}
        <CustomTabPanel value={tabIndex} index={2}>
          <Box className="space-y-5">
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

            {/* --- VISUAL MATH BOX (Adapted for the Drawer) --- */}
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
                <Typography variant="subtitle1" fontWeight="bold">
                  Live Stock Equation
                </Typography>
              </Box>

              <Grid container spacing={2} alignItems="center">
                {/* TOTAL OWNED */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Total Owned"
                    type="number"
                    {...register("total_owned_qty", { valueAsNumber: true })}
                    disabled={!isBulkItem}
                    inputProps={{
                      min: isEditing ? rentedQty + defectiveQty : 1,
                    }}
                    error={!!errors.total_owned_qty}
                    helperText={!isBulkItem ? "Locked at 1" : "Total stock"}
                    InputProps={{ sx: { fontWeight: "bold" } }}
                  />
                </Grid>

                {/* RENTED */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Out on Rent"
                    type="number"
                    {...register("rented_qty")}
                    InputProps={{
                      readOnly: true,
                      sx: { bgcolor: "#f1f5f9", color: "text.secondary" },
                    }}
                    helperText="- Managed by POS"
                  />
                </Grid>

                {/* DEFECTIVE */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="In Workshop"
                    type="number"
                    {...register("defective_qty")}
                    InputProps={{
                      readOnly: true,
                      sx: { bgcolor: "#fef2f2", color: "error.main" },
                    }}
                    helperText="- Managed by Logs"
                  />
                </Grid>

                {/* AVAILABLE (Full Width row inside the drawer) */}
                <Grid item xs={12}>
                  <Box
                    sx={{
                      bgcolor: "#eff6ff",
                      border: "2px dashed #3b82f6",
                      borderRadius: 1,
                      p: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mt: 1,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      color="primary.dark"
                      fontWeight="bold"
                      textTransform="uppercase"
                    >
                      = Currently Available to Rent
                    </Typography>
                    <Typography
                      variant="h4"
                      color="primary.main"
                      fontWeight="900"
                    >
                      {calculatedAvailable}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

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
                {...register("warranty_period_months", { valueAsNumber: true })}
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

      {/* 3. Sticky Footer */}
      <Box
        sx={{
          p: 3,
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          bottom: 0,
          zIndex: 10,
        }}
      >
        <Typography variant="caption" color="error">
          {Object.keys(errors).length > 0 && "Please fix errors before saving."}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" onClick={onClose} disabled={isPending}>
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
          >
            {isPending
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Save Equipment"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
