import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
  CircularProgress,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import {
  categorySchema,
  CategoryFormData,
  Category,
} from "../schemas/category.schema";
import {
  useCreateCategory,
  useUpdateCategory,
} from "../hooks/useCategoryHooks";

interface CategoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: Category | null;
}

export function CategoryFormDrawer({
  open,
  onClose,
  initialData,
}: CategoryFormDialogProps) {
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const isEditing = !!initialData;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          category_name: initialData.category_name,
          description: initialData.description || "",
        });
      } else {
        reset({ category_name: "", description: "" });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: CategoryFormData) => {
    const payload: any = {
      ...data,
      description: data.description === "" ? null : data.description,
    };

    if (isEditing && initialData) {
      updateMutation.mutate(
        { id: initialData.category_id, data: payload },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => onClose() });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {isEditing ? "Edit Category" : "New Category"}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box
          component="form"
          id="category-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Category Name"
              {...register("category_name")}
              error={!!errors.category_name}
              helperText={errors.category_name?.message}
              placeholder="e.g. Power Tools"
              size="small"
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description (Optional)"
              {...register("description")}
              error={!!errors.description}
              helperText={errors.description?.message}
              size="small"
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="category-form"
          variant="contained"
          disableElevation
          disabled={isPending}
          startIcon={
            isPending && <CircularProgress size={18} color="inherit" />
          }
        >
          {isPending ? "Saving..." : isEditing ? "Save Changes" : "Save Category"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
