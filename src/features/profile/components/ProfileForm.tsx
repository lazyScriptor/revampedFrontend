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
import { useTranslation } from "react-i18next";

export function ProfileForm({ profile }: { profile: MyProfile }) {
  const { t } = useTranslation();
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
      setError(err?.message || t("equipment.EquipmentFormDialog.saveFailed"));
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
        {t("profile.ProfileForm.personalInformation")}
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField label={t("common.firstName")} size="small" {...field("first_name")} fullWidth />
        <TextField label={t("common.lastName")} size="small" {...field("last_name")} fullWidth />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField label={t("common.email")} size="small" value={profile.email} disabled fullWidth helperText={t("profile.ProfileForm.emailIsManagedByAdmin")} />
        <TextField label={t("common.username")} size="small" value={profile.username} disabled fullWidth helperText={t("profile.ProfileForm.usernameIsManagedByAdmin")} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField label={t("profile.jobTitle")} size="small" {...field("job_title")} fullWidth />
        <TextField label={t("profile.ProfileForm.phoneNumber")} size="small" {...field("phone_number")} fullWidth />
      </Box>

      <TextField label={t("profile.ProfileForm.addressLine1")} size="small" {...field("address_line1")} fullWidth />
      <TextField label={t("profile.ProfileForm.addressLine2")} size="small" {...field("address_line2")} fullWidth />

      <TextField
        label={t("profile.ProfileForm.aboutBio")}
        size="small"
        {...field("bio")}
        multiline
        rows={3}
        fullWidth
      />

      {error && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success">{t("profile.ProfileForm.profileSaved")}</Alert>}

      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        <Button
          variant="contained"
          disableElevation
          onClick={handleSubmit}
          disabled={update.isPending}
          startIcon={update.isPending ? <CircularProgress size={14} sx={{ color: "white" }} /> : <SaveIcon />}
          sx={{ fontWeight: 800 }}
        >
          {update.isPending ? t("common.saving") : t("common.saveChanges")}
        </Button>
      </Stack>
    </Box>
  );
}
