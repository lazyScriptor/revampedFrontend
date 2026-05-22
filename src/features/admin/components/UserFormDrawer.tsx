import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/Person2Outlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { userApi } from "../api/admin.api";
import {
  FieldGrid,
  FormDialogShell,
  FormSection,
} from "@/components/forms/FormDialogShell";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: any;
}

const blankForm = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  nic_no: "",
  password: "",
};

export default function UserFormDialog({ open, onClose, onSuccess, userToEdit = null }: Props) {
  const isEditMode = Boolean(userToEdit);

  const [formData, setFormData] = useState(blankForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

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
      setFormData(blankForm);
    }
    setError(null);
    setDirty(false);
  }, [userToEdit, open]);

  const handleChange =
    (field: keyof typeof blankForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      setDirty(true);
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
    } finally {
      setLoading(false);
    }
  };

  const avatarText = isEditMode
    ? `${userToEdit?.first_name?.[0] || ""}${userToEdit?.last_name?.[0] || ""}`.toUpperCase() || "U"
    : "+";

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      maxWidth="sm"
      eyebrow={isEditMode ? "Edit User" : "New User"}
      title={
        isEditMode
          ? `${userToEdit?.first_name || ""} ${userToEdit?.last_name || ""}`.trim() ||
            userToEdit?.username
          : "Create a team member"
      }
      subtitle="Identity, credentials, and basic profile."
      avatarText={avatarText}
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
              form="user-form"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {loading ? "Saving…" : isEditMode ? "Save changes" : "Create user"}
            </Button>
          </Box>
        </>
      }
    >
      <Box
        component="form"
        id="user-form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {error && (
          <Alert severity="error" variant="outlined" icon={<WarningAmberIcon />}>
            {error}
          </Alert>
        )}

        {/* Identity */}
        <FormSection
          icon={<PersonOutlineIcon />}
          title="Identity"
          hint="What the user is called inside the system."
        >
          <FieldGrid>
            <TextField
              label="First name"
              required
              value={formData.first_name}
              onChange={handleChange("first_name")}
              size="small"
              fullWidth
            />
            <TextField
              label="Last name"
              required
              value={formData.last_name}
              onChange={handleChange("last_name")}
              size="small"
              fullWidth
            />
          </FieldGrid>
          <TextField
            label="National ID"
            value={formData.nic_no}
            onChange={handleChange("nic_no")}
            size="small"
            fullWidth
            helperText="Optional but useful for HR/audit records"
          />
        </FormSection>

        {/* Account */}
        <FormSection
          icon={<BadgeOutlinedIcon />}
          title="Account"
          hint="Login credentials. Username is what they type at the login screen."
        >
          <FieldGrid>
            <TextField
              label="Username"
              required
              value={formData.username}
              onChange={handleChange("username")}
              size="small"
              fullWidth
            />
            <TextField
              label="Email address"
              type="email"
              required
              value={formData.email}
              onChange={handleChange("email")}
              size="small"
              fullWidth
            />
          </FieldGrid>
        </FormSection>

        {/* Password */}
        <FormSection
          icon={<LockOutlinedIcon />}
          title={isEditMode ? "Reset password" : "Initial password"}
          hint={
            isEditMode
              ? "Leave blank to keep the user's current password."
              : "The user will use this for their first login. They can change it later from their profile."
          }
        >
          <TextField
            label={isEditMode ? "New password" : "Password"}
            type="password"
            required={!isEditMode}
            value={formData.password}
            onChange={handleChange("password")}
            size="small"
            fullWidth
            autoComplete="new-password"
          />
        </FormSection>
      </Box>
    </FormDialogShell>
  );
}
