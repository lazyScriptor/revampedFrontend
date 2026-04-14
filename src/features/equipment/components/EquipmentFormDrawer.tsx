import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
  initialData?: Equipment | null; // If this exists, we are in "Edit" mode!
}

export function EquipmentFormDrawer({
  open,
  onClose,
  initialData,
}: EquipmentFormDrawerProps) {
  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();

  // Determine if we are editing based on whether initialData was passed in
  const isEditing = !!initialData;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      status: "Available",
      condition: "Excellent",
    },
  });

  // CRITICAL: When the drawer opens, populate the form
  useEffect(() => {
    if (open) {
      if (initialData) {
        // We are editing: Fill the form with the database values
        reset({
          name: initialData.equipment_name, // Map backend keys to form keys
          sku: initialData.serial_number,
          category: initialData.category_id?.toString() || "",
          daily_rate: Number(initialData.base_rental_price),
          status: initialData.available_qty > 0 ? "Available" : "Rented Out", // Or use your actual status logic
          condition: "Excellent", // Update this if your backend tracks condition
          notes: "",
        });
      } else {
        // We are creating: Clear the form completely
        reset({ status: "Available", condition: "Excellent" });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: EquipmentFormData) => {
    if (isEditing && initialData) {
      updateMutation.mutate(
        { id: initialData.equipment_id, data },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => onClose() });
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 480 } } }}
    >
      <Box className="flex items-center justify-between p-6 bg-slate-50 border-b border-slate-200">
        <Typography variant="h6" fontWeight="bold" color="text.primary">
          {isEditing ? "Edit Equipment" : "Add New Equipment"}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col h-full"
      >
        <Box className="flex-grow overflow-y-auto p-6 space-y-5">
          {/* Form fields remain exactly the same as your previous Add Drawer */}
          <TextField
            fullWidth
            label="Equipment Name"
            {...register("name")}
            error={!!errors.name}
            helperText={errors.name?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField
              fullWidth
              label="SKU / Serial"
              {...register("sku")}
              error={!!errors.sku}
              helperText={errors.sku?.message}
            />
            <TextField
              fullWidth
              label="Category"
              {...register("category")}
              error={!!errors.category}
              helperText={errors.category?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextField
              fullWidth
              label="Daily Rate ($)"
              type="number"
              inputProps={{ step: "0.01", min: "0" }}
              {...register("daily_rate")}
              error={!!errors.daily_rate}
              helperText={errors.daily_rate?.message}
            />
            <TextField
              fullWidth
              select
              label="Condition"
              defaultValue="Excellent"
              {...register("condition")}
              error={!!errors.condition}
              helperText={errors.condition?.message}
            >
              <MenuItem value="Excellent">Excellent</MenuItem>
              <MenuItem value="Good">Good</MenuItem>
              <MenuItem value="Fair">Fair</MenuItem>
              <MenuItem value="Poor">Poor</MenuItem>
            </TextField>
          </div>

          <TextField
            fullWidth
            select
            label="Status"
            defaultValue="Available"
            {...register("status")}
            error={!!errors.status}
            helperText={errors.status?.message}
          >
            <MenuItem value="Available">Available</MenuItem>
            <MenuItem value="Rented">Rented</MenuItem>
            <MenuItem value="Maintenance">Maintenance</MenuItem>
            <MenuItem value="Retired">Retired</MenuItem>
          </TextField>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Additional Notes"
            {...register("notes")}
            error={!!errors.notes}
            helperText={errors.notes?.message}
          />
        </Box>

        <Divider />
        <Box className="p-6 bg-slate-50 flex justify-end gap-3">
          <Button variant="outlined" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
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
