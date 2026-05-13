import React, { useState } from "react";
import { Drawer, Box, Typography, IconButton, TextField, Button, Divider, Alert, Stack } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { roleApi } from "../api/admin.api";

export default function RoleFormDrawer({ open, onClose, onSuccess, roleToEdit = null }) {
  const [formData, setFormData] = useState(
    roleToEdit || { roleName: "", description: "", hierarchyLevel: 10 }
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (roleToEdit) {
        await roleApi.updateRole(roleToEdit.role_id, formData);
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
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 450 } }}>
      <Box p={3} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight="bold">
          {roleToEdit ? "Edit Role" : "Create New Role"}
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>
      <Divider />
      <Box p={3} component="form" onSubmit={handleSubmit} sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={3}>
          <TextField
            label="Role Name"
            fullWidth
            required
            value={formData.roleName}
            onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <TextField
            label="Hierarchy Level"
            type="number"
            fullWidth
            required
            value={formData.hierarchyLevel}
            onChange={(e) => setFormData({ ...formData, hierarchyLevel: parseInt(e.target.value) || 0 })}
            helperText="Lower number = higher privilege (e.g. 10 is higher than 50). Maximum 100."
          />
        </Stack>
      </Box>
      <Divider />
      <Box p={3} display="flex" justifyContent="flex-end" gap={2}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button type="submit" variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Save Role"}
        </Button>
      </Box>
    </Drawer>
  );
}
