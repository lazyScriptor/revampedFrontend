import React, { useState } from "react";
import { Drawer, Box, Typography, IconButton, TextField, Button, Divider, Alert, Stack } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { userApi } from "../api/admin.api";

export default function UserFormDrawer({ open, onClose, onSuccess, userToEdit = null }) {
  const [formData, setFormData] = useState(
    userToEdit || { username: "", email: "", first_name: "", last_name: "", nic_no: "", password: "" }
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (userToEdit) {
        await userApi.updateUser(userToEdit.user_id, formData);
      } else {
        await userApi.createUser(formData);
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
          {userToEdit ? "Edit User" : "Create New User"}
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>
      <Divider />
      <Box p={3} component="form" onSubmit={handleSubmit} sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={3}>
          <TextField
            label="First Name"
            fullWidth
            required
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          />
          <TextField
            label="Last Name"
            fullWidth
            required
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          />
          <TextField
            label="Username"
            fullWidth
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <TextField
            label="Email Address"
            type="email"
            fullWidth
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <TextField
            label="NIC Number"
            fullWidth
            value={formData.nic_no}
            onChange={(e) => setFormData({ ...formData, nic_no: e.target.value })}
          />
          {!userToEdit && (
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          )}
        </Stack>
      </Box>
      <Divider />
      <Box p={3} display="flex" justifyContent="flex-end" gap={2}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button type="submit" variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Save User"}
        </Button>
      </Box>
    </Drawer>
  );
}
