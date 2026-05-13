import React, { useState, useEffect } from "react";
import {
  Drawer, Box, Typography, IconButton, TextField, Button,
  Divider, Alert, Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { userApi } from "../api/admin.api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: any;
}

export default function UserFormDrawer({ open, onClose, onSuccess, userToEdit = null }: Props) {
  const isEditMode = Boolean(userToEdit);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    nic_no: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset form when userToEdit changes
  useEffect(() => {
    if (userToEdit) {
      setFormData({
        username: userToEdit.username || "",
        email: userToEdit.email || "",
        first_name: userToEdit.first_name || "",
        last_name: userToEdit.last_name || "",
        nic_no: userToEdit.nic_no || "",
        password: "", // never pre-fill password
      });
    } else {
      setFormData({ username: "", email: "", first_name: "", last_name: "", nic_no: "", password: "" });
    }
    setError(null);
  }, [userToEdit]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isEditMode) {
        // Only send changed fields + password if filled
        const payload: any = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          username: formData.username,
          email: formData.email,
          nic_no: formData.nic_no,
        };
        if (formData.password) payload.password = formData.password;
        await userApi.updateUser(userToEdit.user_id, payload);
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
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: 450 } } }}>
      <Box p={3} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight="bold">
          {isEditMode ? "Edit User" : "Create New User"}
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
          <TextField label="First Name" fullWidth required value={formData.first_name} onChange={handleChange("first_name")} />
          <TextField label="Last Name" fullWidth required value={formData.last_name} onChange={handleChange("last_name")} />
          <TextField label="Username" fullWidth required value={formData.username} onChange={handleChange("username")} />
          <TextField label="Email Address" type="email" fullWidth required value={formData.email} onChange={handleChange("email")} />
          <TextField label="NIC Number" fullWidth value={formData.nic_no} onChange={handleChange("nic_no")} />
          <TextField
            label={isEditMode ? "New Password (leave blank to keep current)" : "Password"}
            type="password"
            fullWidth
            required={!isEditMode}
            value={formData.password}
            onChange={handleChange("password")}
          />
        </Stack>
      </Box>
      <Divider />
      <Box p={3} display="flex" justifyContent="flex-end" gap={2}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button type="submit" variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : isEditMode ? "Update User" : "Create User"}
        </Button>
      </Box>
    </Drawer>
  );
}
