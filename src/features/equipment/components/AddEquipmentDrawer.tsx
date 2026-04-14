import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  MenuItem,
  Divider,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { equipmentSchema, EquipmentFormData } from '../schemas/equipment.schema';
import { useCreateEquipment } from '../hooks/useEquipmentHooks';

interface AddEquipmentDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AddEquipmentDrawer({ open, onClose }: AddEquipmentDrawerProps) {
  const createMutation = useCreateEquipment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      status: 'Available',
      condition: 'Excellent',
    }
  });

  // Reset the form whenever the drawer is opened
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const onSubmit = (data: EquipmentFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        onClose(); // Close drawer on success
      },
    });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
    >
      <Box className="flex items-center justify-between p-6 bg-slate-50 border-b border-slate-200">
        <Typography variant="h6" fontWeight="bold" color="text.primary">
          Add New Equipment
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        <Box className="flex-grow overflow-y-auto p-6 space-y-5">
          <TextField
            fullWidth
            label="Equipment Name"
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
            placeholder="e.g. Caterpillar Excavator 320"
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField
              fullWidth
              label="SKU / Serial Number"
              {...register('sku')}
              error={!!errors.sku}
              helperText={errors.sku?.message}
            />
            <TextField
              fullWidth
              label="Category"
              {...register('category')}
              error={!!errors.category}
              helperText={errors.category?.message}
              placeholder="Heavy Machinery"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextField
              fullWidth
              label="Daily Rate ($)"
              type="number"
              inputProps={{ step: "0.01", min: "0" }}
              {...register('daily_rate')}
              error={!!errors.daily_rate}
              helperText={errors.daily_rate?.message}
            />
            <TextField
              fullWidth
              select
              label="Condition"
              defaultValue="Excellent"
              {...register('condition')}
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
            label="Initial Status"
            defaultValue="Available"
            {...register('status')}
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
            label="Additional Notes (Optional)"
            {...register('notes')}
            error={!!errors.notes}
            helperText={errors.notes?.message}
          />
        </Box>

        <Divider />
        
        <Box className="p-6 bg-slate-50 flex justify-end gap-3">
          <Button variant="outlined" onClick={onClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disableElevation
            disabled={createMutation.isPending}
            startIcon={createMutation.isPending && <CircularProgress size={20} color="inherit" />}
          >
            {createMutation.isPending ? 'Saving...' : 'Save Equipment'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

export default AddEquipmentDrawer;