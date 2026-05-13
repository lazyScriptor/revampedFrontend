import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, IconButton, TextField, Button,
  Alert, Stack, CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { userApi } from "../api/admin.api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: any;
}

export default function UserFormDialog({ open, onClose, onSuccess, userToEdit = null }: Props) {
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

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        username: userToEdit.username || "",
        email: userToEdit.email || "",
        first_name: userToEdit.first_name || "",
        last_name: userToEdit.last_name || "",
        nic_no: userToEdit.nic_no || "",
        password: "",
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {isEditMode ? "Edit User" : "Create New User"}
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box component="form" id="user-form" onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField label="First Name" fullWidth required value={formData.first_name} onChange={handleChange("first_name")} size="small" />
              <TextField label="Last Name" fullWidth required value={formData.last_name} onChange={handleChange("last_name")} size="small" />
            </Box>
            <TextField label="Username" fullWidth required value={formData.username} onChange={handleChange("username")} size="small" />
            <TextField label="Email Address" type="email" fullWidth required value={formData.email} onChange={handleChange("email")} size="small" />
            <TextField label="NIC Number" fullWidth value={formData.nic_no} onChange={handleChange("nic_no")} size="small" />
            <TextField
              label={isEditMode ? "New Password (leave blank to keep current)" : "Password"}
              type="password"
              fullWidth
              required={!isEditMode}
              value={formData.password}
              onChange={handleChange("password")}
              size="small"
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined">Cancel</Button>
        <Button
          type="submit"
          form="user-form"
          variant="contained"
          disableElevation
          disabled={loading}
          onClick={handleSubmit}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {loading ? "Saving..." : isEditMode ? "Save Changes" : "Create User"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
