import { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { MyProfile } from "../api/me.api";
import { useUpdateProfile } from "../hooks/useMe";

export function ProfileForm({ profile }: { profile: MyProfile }) {
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    phone_number: profile.phone_number || "",
    address_line1: profile.address_line1 || "",
    address_line2: profile.address_line2 || "",
    job_title: profile.job_title || "",
    bio: profile.bio || "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      phone_number: profile.phone_number || "",
      address_line1: profile.address_line1 || "",
      address_line2: profile.address_line2 || "",
      job_title: profile.job_title || "",
      bio: profile.bio || "",
    });
  }, [profile]);

  const handleSubmit = async () => {
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync(form);
      setSaved(true);
    } catch (err: any) {
      setError(err?.message || "Save failed.");
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
        PERSONAL INFORMATION
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField label="First name" size="small" {...field("first_name")} fullWidth />
        <TextField label="Last name" size="small" {...field("last_name")} fullWidth />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField label="Email" size="small" value={profile.email} disabled fullWidth helperText="Email is managed by admin" />
        <TextField label="Username" size="small" value={profile.username} disabled fullWidth helperText="Username is managed by admin" />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField label="Job title" size="small" {...field("job_title")} fullWidth />
        <TextField label="Phone number" size="small" {...field("phone_number")} fullWidth />
      </Box>

      <TextField label="Address line 1" size="small" {...field("address_line1")} fullWidth />
      <TextField label="Address line 2" size="small" {...field("address_line2")} fullWidth />

      <TextField
        label="About / Bio"
        size="small"
        {...field("bio")}
        multiline
        rows={3}
        fullWidth
      />

      {error && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success">Profile saved.</Alert>}

      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        <Button
          variant="contained"
          disableElevation
          onClick={handleSubmit}
          disabled={update.isPending}
          startIcon={update.isPending ? <CircularProgress size={14} sx={{ color: "white" }} /> : <SaveIcon />}
          sx={{ fontWeight: 800 }}
        >
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </Stack>
    </Box>
  );
}
