import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import TextSnippetOutlinedIcon from "@mui/icons-material/TextSnippetOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import {
  categorySchema,
  CategoryFormData,
  Category,
} from "../schemas/category.schema";
import {
  useCreateCategory,
  useUpdateCategory,
} from "../hooks/useCategoryHooks";
import {
  FormDialogShell,
  FormSection,
} from "@/components/forms/FormDialogShell";

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
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
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
      setError(null);
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: CategoryFormData) => {
    const payload: any = {
      ...data,
      description: data.description === "" ? null : data.description,
    };

    const onErr = (err: any) => setError(err?.message || "Save failed.");

    if (isEditing && initialData) {
      updateMutation.mutate(
        { id: initialData.category_id, data: payload },
        { onSuccess: () => onClose(), onError: onErr },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onClose(),
        onError: onErr,
      });
    }
  };

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      maxWidth="sm"
      eyebrow={isEditing ? "Edit Category" : "New Category"}
      title={isEditing ? initialData?.category_name || "Category" : "Create a category"}
      subtitle="Categories group similar equipment so they can be assigned and reported together."
      avatarText={(initialData?.category_name || "C")[0].toUpperCase()}
      footer={
        <>
          <Box sx={{ minWidth: 0, color: "text.secondary", fontSize: "0.78rem" }}>
            {isDirty && !isPending && !error ? "Unsaved changes" : ""}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={onClose} disabled={isPending} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              form="category-form"
              variant="contained"
              disabled={isPending}
              startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {isPending ? "Saving…" : isEditing ? "Save changes" : "Create category"}
            </Button>
          </Box>
        </>
      }
    >
      <Box
        component="form"
        id="category-form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {error && (
          <Alert severity="error" variant="outlined" icon={<WarningAmberIcon />}>
            {error}
          </Alert>
        )}

        <FormSection
          icon={<CategoryOutlinedIcon />}
          title="Category"
          hint="Use a short, recognisable name — it shows in dropdowns everywhere."
        >
          <TextField
            label="Category name"
            required
            fullWidth
            placeholder="e.g. Power Tools"
            {...register("category_name")}
            error={!!errors.category_name}
            helperText={errors.category_name?.message || " "}
            size="small"
          />
        </FormSection>

        <FormSection
          icon={<TextSnippetOutlinedIcon />}
          title="Description"
          hint="Optional. Useful for onboarding new staff."
        >
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={4}
            {...register("description")}
            error={!!errors.description}
            helperText={errors.description?.message}
            size="small"
          />
        </FormSection>
      </Box>
    </FormDialogShell>
  );
}
