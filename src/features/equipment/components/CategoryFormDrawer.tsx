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
  Divider,
  CircularProgress,
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

interface CategoryFormDrawerProps {
  open: boolean;
  onClose: () => void;
  initialData?: Category | null;
}

export function CategoryFormDrawer({
  open,
  onClose,
  initialData,
}: CategoryFormDrawerProps) {
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
    // Clean empty strings to null for the database
    const payload = {
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
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 400 } } }}
    >
      <Box className="flex flex-col h-full bg-slate-50">
        <Box className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            {isEditing ? "Edit Category" : "New Category"}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          component="form"
          id="category-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-grow overflow-y-auto p-6 space-y-5"
        >
          <TextField
            fullWidth
            label="Category Name"
            {...register("category_name")}
            error={!!errors.category_name}
            helperText={errors.category_name?.message}
            placeholder="e.g. Power Tools"
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description (Optional)"
            {...register("description")}
            error={!!errors.description}
            helperText={errors.description?.message}
          />
        </Box>

        <Box className="p-6 bg-white border-t border-slate-200 flex justify-end gap-3">
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
              isPending && <CircularProgress size={20} color="inherit" />
            }
          >
            {isPending ? "Saving..." : "Save Category"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
