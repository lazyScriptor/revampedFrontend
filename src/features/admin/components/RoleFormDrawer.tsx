import React, { useState, useEffect } from "react";
import {
  Drawer, Box, Typography, IconButton, TextField, Button,
  Divider, Alert, Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { roleApi } from "../api/admin.api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roleToEdit?: any;
}

export default function RoleFormDrawer({ open, onClose, onSuccess, roleToEdit = null }: Props) {
  const isEditMode = Boolean(roleToEdit);

  const [formData, setFormData] = useState({
    roleName: "",
    description: "",
    hierarchyLevel: 10,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset form when roleToEdit changes — map snake_case DB fields to camelCase form fields
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
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: 450 } } }}>
      <Box p={3} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight="bold">
          {isEditMode ? "Edit Role" : "Create New Role"}
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>
      <Divider />
      <Box
        p={3}
        component="form"
        onSubmit={handleSubmit}
        sx={{ flexGrow: 1, overflowY: "auto" }}
      >
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={3}>
          <TextField
            label="Role Name"
            fullWidth
            required
            value={formData.roleName}
            onChange={handleChange("roleName")}
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
          />
          <TextField
            label="Hierarchy Level"
            type="number"
            fullWidth
            required
            value={formData.hierarchyLevel}
            onChange={handleChange("hierarchyLevel")}
            helperText="Higher number = higher privilege (e.g., 100 is the highest). Users can only manage roles below their own level."
          />
        </Stack>
      </Box>
      <Divider />
      <Box p={3} display="flex" justifyContent="flex-end" gap={2}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button type="submit" variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : isEditMode ? "Update Role" : "Create Role"}
        </Button>
      </Box>
    </Drawer>
  );
}
