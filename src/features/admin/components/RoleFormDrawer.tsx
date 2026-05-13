import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, IconButton, TextField, Button,
  Alert, Stack, CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { roleApi } from "../api/admin.api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roleToEdit?: any;
}

export default function RoleFormDialog({ open, onClose, onSuccess, roleToEdit = null }: Props) {
  const isEditMode = Boolean(roleToEdit);

  const [formData, setFormData] = useState({
    roleName: "",
    description: "",
    hierarchyLevel: 10,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roleToEdit) {
      setFormData({
        roleName: roleToEdit.role_name || "",
        description: roleToEdit.description || "",
        hierarchyLevel: roleToEdit.hierarchy_level ?? 10,
      });
    } else {
      setFormData({ roleName: "", description: "", hierarchyLevel: 10 });
    }
    setError(null);
  }, [roleToEdit]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "hierarchyLevel" ? parseInt(e.target.value) || 0 : e.target.value,
    }));
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
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {isEditMode ? "Edit Role" : "Create New Role"}
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box component="form" id="role-form" onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Role Name"
              fullWidth
              required
              value={formData.roleName}
              onChange={handleChange("roleName")}
              size="small"
              disabled={isEditMode && roleToEdit?.is_system_default}
              helperText={isEditMode && roleToEdit?.is_system_default ? "System default role names cannot be changed." : ""}
            />
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
              label="Hierarchy Level"
              type="number"
              fullWidth
              required
              value={formData.hierarchyLevel}
              onChange={handleChange("hierarchyLevel")}
              size="small"
              helperText="Higher number = higher privilege (e.g., 100 is highest). Users can only manage roles below their own level."
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined">Cancel</Button>
        <Button
          type="submit"
          form="role-form"
          variant="contained"
          disableElevation
          disabled={loading}
          onClick={handleSubmit}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {loading ? "Saving..." : isEditMode ? "Save Changes" : "Create Role"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
