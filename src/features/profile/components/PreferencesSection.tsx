import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Autocomplete,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { MyProfile } from "../api/me.api";
import { useUpdatePreferences } from "../hooks/useMe";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "si", label: "සිංහල (Sinhala)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
];

const DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "2026-05-22 (ISO)" },
  { value: "DD/MM/YYYY", label: "22/05/2026 (DMY)" },
  { value: "MM/DD/YYYY", label: "05/22/2026 (MDY)" },
  { value: "DD MMM YYYY", label: "22 May 2026" },
];

// Common timezones — the Autocomplete is freeSolo so users can paste any IANA tz.
const COMMON_TIMEZONES = [
  "Asia/Colombo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Nairobi",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

export function PreferencesSection({ profile }: { profile: MyProfile }) {
  const update = useUpdatePreferences();
  const [form, setForm] = useState({
    language: profile.language || "en",
    timezone: profile.timezone || "Asia/Colombo",
    date_format: profile.date_format || "YYYY-MM-DD",
    time_format: profile.time_format || "24h",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      language: profile.language || "en",
      timezone: profile.timezone || "Asia/Colombo",
      date_format: profile.date_format || "YYYY-MM-DD",
      time_format: profile.time_format || "24h",
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

  return (
    <Paper
      elevation={0}
      sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "white" }}
    >
      <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
        DISPLAY PREFERENCES
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", mb: 2 }}>
        Localisation & format
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField
          select
          size="small"
          label="Language"
          value={form.language}
          onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
          fullWidth
        >
          {LANGUAGES.map((l) => (
            <MenuItem key={l.code} value={l.code}>
              {l.label}
            </MenuItem>
          ))}
        </TextField>

        <Autocomplete
          options={COMMON_TIMEZONES}
          value={form.timezone}
          freeSolo
          onChange={(_, v) => setForm((f) => ({ ...f, timezone: v || "" }))}
          onInputChange={(_, v) => setForm((f) => ({ ...f, timezone: v }))}
          renderInput={(params) => (
            <TextField {...params} label="Timezone" size="small" fullWidth />
          )}
        />

        <TextField
          select
          size="small"
          label="Date format"
          value={form.date_format}
          onChange={(e) => setForm((f) => ({ ...f, date_format: e.target.value }))}
          fullWidth
        >
          {DATE_FORMATS.map((d) => (
            <MenuItem key={d.value} value={d.value}>
              {d.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Time format"
          value={form.time_format}
          onChange={(e) =>
            setForm((f) => ({ ...f, time_format: e.target.value as "12h" | "24h" }))
          }
          fullWidth
        >
          <MenuItem value="24h">24-hour (14:30)</MenuItem>
          <MenuItem value="12h">12-hour (2:30 PM)</MenuItem>
        </TextField>
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {saved && <Alert severity="success" sx={{ mt: 2 }}>Preferences saved.</Alert>}

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button
          variant="contained"
          disableElevation
          onClick={handleSubmit}
          disabled={update.isPending}
          startIcon={
            update.isPending ? <CircularProgress size={14} sx={{ color: "white" }} /> : <SaveIcon />
          }
          sx={{ fontWeight: 800 }}
        >
          {update.isPending ? "Saving…" : "Save preferences"}
        </Button>
      </Stack>
    </Paper>
  );
}
