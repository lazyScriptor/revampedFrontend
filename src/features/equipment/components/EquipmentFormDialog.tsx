import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import {
  equipmentSchema,
  EquipmentFormData,
  Equipment,
} from "../schemas/equipment.schema";
import {
  useCreateEquipment,
  useUpdateEquipment,
} from "../hooks/useEquipmentHooks";
import { useCategoryOptions } from "@/features/equipment/hooks/useCategoryHooks";
import { useWarehouseOptions } from "@/features/warehouses/hooks/useWarehouseOptions";
import {
  FieldGrid,
  FormDialogShell,
  FormFooterMeta,
  FormSection,
  ToggleRow,
} from "@/components/forms/FormDialogShell";

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
  const theme = useTheme();
  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();
  const { data: categories = [], isLoading: isLoadingCategories } = useCategoryOptions();
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useWarehouseOptions();

  const isEditing = !!initialData;
  const isPending = createMutation.isPending || updateMutation.isPending;
  const [mutationError, setMutationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
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
      setMutationError(null);
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
    setMutationError(null);
    const payload: any = { ...data };
    if (!payload.is_bulk_item) payload.total_owned_qty = 1;
    if (payload.end_of_warranty_date === "") payload.end_of_warranty_date = null;
    if (payload.image_url === "") payload.image_url = null;

    const onErr = (err: any) => setMutationError(err?.message || "Save failed.");
    if (isEditing && initialData) {
      updateMutation.mutate(
        { id: initialData.equipment_id, data: payload },
        { onSuccess: () => onClose(), onError: onErr },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => onClose(), onError: onErr });
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      maxWidth="md"
      eyebrow={isEditing ? "Edit Equipment" : "New Equipment"}
      title={
        isEditing
          ? initialData?.equipment_name || "Equipment"
          : "Register equipment"
      }
      subtitle="Specifications, pricing, and live stock equation."
      avatarText={(initialData?.equipment_name || "+")[0].toUpperCase()}
      footer={
        <>
          <FormFooterMeta>
            {errorCount > 0
              ? `Fix ${errorCount} issue${errorCount > 1 ? "s" : ""} before saving`
              : mutationError
                ? mutationError
                : isDirty && !isPending
                  ? "Unsaved changes"
                  : ""}
          </FormFooterMeta>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={onClose} disabled={isPending} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              form="equipment-form"
              variant="contained"
              disabled={isPending}
              startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {isPending ? "Saving…" : isEditing ? "Save changes" : "Create equipment"}
            </Button>
          </Box>
        </>
      }
    >
      <Box
        component="form"
        id="equipment-form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {mutationError && (
          <Alert severity="error" variant="outlined" icon={<WarningAmberIcon />}>
            {mutationError}
          </Alert>
        )}

        <FormSection
          icon={<InfoOutlinedIcon />}
          title="General information"
          hint="What the asset is, where it lives, and its identifier."
        >
          <TextField
            fullWidth
            size="small"
            label="Equipment name"
            placeholder="e.g. Bosch Hammer Drill 800W"
            {...register("equipment_name")}
            error={!!errors.equipment_name}
            helperText={errors.equipment_name?.message}
          />
          <FieldGrid>
            <TextField
              fullWidth
              size="small"
              label="SKU / Serial number"
              {...register("serial_number")}
              error={!!errors.serial_number}
              helperText={errors.serial_number?.message}
            />
            <TextField
              fullWidth
              size="small"
              label="Image URL (optional)"
              placeholder="https://…"
              {...register("image_url")}
              error={!!errors.image_url}
              helperText={errors.image_url?.message}
            />
          </FieldGrid>
          <FieldGrid>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Category"
                  {...field}
                  value={field.value ?? ""}
                  disabled={isLoadingCategories}
                  error={!!errors.category_id}
                  helperText={errors.category_id?.message}
                >
                  {isLoadingCategories ? (
                    <MenuItem value="" disabled>
                      Loading…
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
                  size="small"
                  label="Warehouse"
                  {...field}
                  value={field.value ?? ""}
                  disabled={isLoadingWarehouses}
                  error={!!errors.warehouse_id}
                  helperText={errors.warehouse_id?.message}
                >
                  {isLoadingWarehouses ? (
                    <MenuItem value="" disabled>
                      Loading…
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
          </FieldGrid>
        </FormSection>

        <FormSection
          icon={<AttachMoneyIcon />}
          title="Rental & pricing"
          hint="Daily rates, minimum duration, and the original purchase cost for ROI tracking."
        >
          <FieldGrid>
            <TextField
              fullWidth
              size="small"
              label="Base daily rate"
              type="number"
              slotProps={{
                htmlInput: { step: "0.01", min: "0" },
                input: { startAdornment: <InputAdornment position="start">Rs.</InputAdornment> },
              }}
              {...register("base_rental_price", { valueAsNumber: true })}
              error={!!errors.base_rental_price}
              helperText={errors.base_rental_price?.message}
            />
            <TextField
              fullWidth
              size="small"
              label="Overdue / extra daily rate"
              type="number"
              slotProps={{
                htmlInput: { step: "0.01", min: "0" },
                input: { startAdornment: <InputAdornment position="start">Rs.</InputAdornment> },
              }}
              {...register("extra_daily_rate", { valueAsNumber: true })}
              error={!!errors.extra_daily_rate}
              helperText={errors.extra_daily_rate?.message || "Applied if returned late"}
            />
          </FieldGrid>
          <FieldGrid>
            <TextField
              fullWidth
              size="small"
              label="Minimum rental days"
              type="number"
              slotProps={{ htmlInput: { min: "1" } }}
              {...register("minimum_rental_days", { valueAsNumber: true })}
              error={!!errors.minimum_rental_days}
              helperText={errors.minimum_rental_days?.message}
            />
            <TextField
              fullWidth
              size="small"
              label="Original purchase cost"
              type="number"
              slotProps={{
                htmlInput: { step: "0.01", min: "0" },
                input: { startAdornment: <InputAdornment position="start">Rs.</InputAdornment> },
              }}
              {...register("purchase_cost", { valueAsNumber: true })}
              error={!!errors.purchase_cost}
              helperText={errors.purchase_cost?.message || "For internal ROI tracking"}
            />
          </FieldGrid>
        </FormSection>

        <FormSection
          icon={<Inventory2OutlinedIcon />}
          title="Inventory management"
          hint="Bulk asset toggle and the live availability equation."
        >
          <Controller
            name="is_bulk_item"
            control={control}
            render={({ field: { onChange, value } }) => (
              <ToggleRow
                icon={<LayersOutlinedIcon />}
                title="Bulk asset"
                hint={
                  value
                    ? "Multiple identical units share one record."
                    : "One serialised unit — total owned locked at 1."
                }
                checked={!!value}
                onChange={onChange}
              />
            )}
          />

          {/* Live stock equation — same idea as before, cleaner layout */}
          <Box
            sx={{
              p: 2,
              border: `1px solid ${theme.palette.border.subtle}`,
              borderRadius: 2,
              bgcolor: theme.palette.background.paper,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(7, 1fr)" },
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <Box sx={{ gridColumn: { md: "span 2" } }}>
              <TextField
                fullWidth
                size="small"
                label="Total owned"
                type="number"
                {...register("total_owned_qty", { valueAsNumber: true })}
                disabled={!isBulkItem}
                slotProps={{
                  htmlInput: { min: isEditing ? rentedQty + defectiveQty : 1 },
                }}
                error={!!errors.total_owned_qty}
                helperText={!isBulkItem ? "Locked at 1 — serialised" : " "}
              />
            </Box>
            <Equation sign="−" />
            <Box sx={{ gridColumn: { md: "span 1" } }}>
              <TextField
                fullWidth
                size="small"
                label="On rent"
                type="number"
                {...register("rented_qty")}
                slotProps={{ input: { readOnly: true } }}
                helperText="by POS"
              />
            </Box>
            <Equation sign="−" />
            <Box sx={{ gridColumn: { md: "span 1" } }}>
              <TextField
                fullWidth
                size="small"
                label="Workshop"
                type="number"
                {...register("defective_qty")}
                slotProps={{ input: { readOnly: true } }}
                helperText="by logs"
              />
            </Box>
            <Box
              sx={{
                gridColumn: { md: "span 1" },
                px: 1.25,
                py: 1,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                border: `1.5px solid ${theme.palette.primary.main}`,
                textAlign: "center",
              }}
            >
              <Typography variant="caption" sx={{ color: theme.palette.primary.dark, fontWeight: 800, letterSpacing: 0.5, display: "block" }}>
                AVAILABLE
              </Typography>
              <Typography variant="h5" sx={{ color: theme.palette.primary.main, fontWeight: 900, lineHeight: 1.1 }}>
                {calculatedAvailable}
              </Typography>
            </Box>
          </Box>
        </FormSection>

        <FormSection
          icon={<VerifiedOutlinedIcon />}
          title="Warranty"
          hint="Optional. Helps the maintenance team plan replacements."
        >
          <FieldGrid>
            <TextField
              fullWidth
              size="small"
              label="Warranty period (months)"
              type="number"
              slotProps={{ htmlInput: { min: "0" } }}
              {...register("warranty_period_months", { valueAsNumber: true })}
              error={!!errors.warranty_period_months}
              helperText={errors.warranty_period_months?.message}
            />
            <TextField
              fullWidth
              size="small"
              label="Warranty expiry date"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              {...register("end_of_warranty_date")}
              error={!!errors.end_of_warranty_date}
              helperText={errors.end_of_warranty_date?.message}
            />
          </FieldGrid>
        </FormSection>
      </Box>
    </FormDialogShell>
  );
}

function Equation({ sign }: { sign: string }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography
        variant="h5"
        sx={{ fontWeight: 800, color: theme.palette.text.disabled, lineHeight: 1 }}
      >
        {sign}
      </Typography>
    </Box>
  );
}
