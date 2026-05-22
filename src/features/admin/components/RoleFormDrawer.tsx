import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import TextSnippetOutlinedIcon from "@mui/icons-material/TextSnippetOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  FormDialogShell,
  FormSection,
} from "@/components/forms/FormDialogShell";
import { roleApi } from "../api/admin.api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roleToEdit?: any;
}

const blankForm = { roleName: "", description: "", hierarchyLevel: 10 };

export default function RoleFormDialog({
  open,
  onClose,
  onSuccess,
  roleToEdit = null,
}: Props) {
  const isEditMode = Boolean(roleToEdit);

  const [formData, setFormData] = useState(blankForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (roleToEdit) {
      setFormData({
        roleName: roleToEdit.role_name || "",
        description: roleToEdit.description || "",
        hierarchyLevel: roleToEdit.hierarchy_level ?? 10,
      });
    } else {
      setFormData(blankForm);
    }
    setError(null);
    setDirty(false);
  }, [roleToEdit, open]);

  const handleChange =
    (field: keyof typeof blankForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]:
          field === "hierarchyLevel"
            ? parseInt(e.target.value) || 0
            : e.target.value,
      }));
      setDirty(true);
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isEditMode) {
        await roleApi.updateRole(roleToEdit.role_id, {
          role_name: formData.roleName,
          description: formData.description,
          hierarchy_level: formData.hierarchyLevel,
        });
      } else {
        await roleApi.createRole(formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const lockedSystemName = isEditMode && roleToEdit?.is_system_default;

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      maxWidth="sm"
      eyebrow={isEditMode ? "Edit Role" : "New Role"}
      title={isEditMode ? roleToEdit?.role_name || "Role" : "Create a role"}
      subtitle="Define a privilege level. Assign permissions afterwards from the role detail page."
      avatarText={(formData.roleName || "R")[0].toUpperCase()}
      footer={
        <>
          <Box sx={{ minWidth: 0, color: "text.secondary", fontSize: "0.78rem" }}>
            {dirty && !loading && !error ? "Unsaved changes" : ""}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={onClose} disabled={loading} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              form="role-form"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {loading ? "Saving…" : isEditMode ? "Save changes" : "Create role"}
            </Button>
          </Box>
        </>
      }
    >
      <Box
        component="form"
        id="role-form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {error && (
          <Alert severity="error" variant="outlined" icon={<WarningAmberIcon />}>
            {error}
          </Alert>
        )}

        <FormSection
          icon={<SecurityOutlinedIcon />}
          title="Identity"
          hint="The name shown in pickers and audit logs."
        >
          <TextField
            label="Role name"
            required
            value={formData.roleName}
            onChange={handleChange("roleName")}
            size="small"
            fullWidth
            disabled={lockedSystemName}
            helperText={
              lockedSystemName ? "System default role names cannot be changed." : " "
            }
          />
        </FormSection>

        <FormSection
          icon={<TextSnippetOutlinedIcon />}
          title="Description & privilege level"
          hint="Higher numbers represent more privileged roles."
        >
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={handleChange("description")}
            size="small"
          />
          <TextField
            label="Hierarchy level"
            type="number"
            required
            value={formData.hierarchyLevel}
            onChange={handleChange("hierarchyLevel")}
            size="small"
            fullWidth
            helperText="100 = highest. Users can only manage roles below their own level."
          />
        </FormSection>
      </Box>
    </FormDialogShell>
  );
}
