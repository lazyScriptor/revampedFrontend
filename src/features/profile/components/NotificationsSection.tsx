import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Switch,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Divider,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { MyProfile } from "../api/me.api";
import { useUpdatePreferences } from "../hooks/useMe";

type Prefs = {
  channels: { in_app: boolean; email: boolean };
  categories: {
    bulk_jobs: boolean;
    reports: boolean;
    invoices: boolean;
    maintenance: boolean;
    system: boolean;
  };
};

const DEFAULT_PREFS: Prefs = {
  channels: { in_app: true, email: false },
  categories: {
    bulk_jobs: true,
    reports: true,
    invoices: true,
    maintenance: true,
    system: true,
  },
};

const mergePrefs = (raw: any): Prefs => {
  const base = { ...DEFAULT_PREFS };
  if (raw && typeof raw === "object") {
    base.channels = { ...DEFAULT_PREFS.channels, ...(raw.channels || {}) };
    base.categories = { ...DEFAULT_PREFS.categories, ...(raw.categories || {}) };
  }
  return base;
};

const Row = ({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 2,
      py: 1.5,
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: "#64748b" }}>
        {description}
      </Typography>
    </Box>
    <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />
  </Box>
);

export function NotificationsSection({ profile }: { profile: MyProfile }) {
  const update = useUpdatePreferences();
  const [prefs, setPrefs] = useState<Prefs>(mergePrefs(profile.notification_prefs));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(mergePrefs(profile.notification_prefs));
  }, [profile.notification_prefs]);

  const handleSubmit = async () => {
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({ notification_prefs: prefs });
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
        DELIVERY CHANNELS
      </Typography>
      <Box sx={{ mt: 0.5 }}>
        <Row
          title="In-app bell"
          description="Live notifications in the top header. Always recommended."
          checked={prefs.channels.in_app}
          onChange={(v) => setPrefs((p) => ({ ...p, channels: { ...p.channels, in_app: v } }))}
        />
        <Divider />
        <Row
          title="Email"
          description="Important updates copied to your inbox. (Coming soon — toggle is saved.)"
          checked={prefs.channels.email}
          onChange={(v) => setPrefs((p) => ({ ...p, channels: { ...p.channels, email: v } }))}
        />
      </Box>

      <Typography
        variant="overline"
        sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b", mt: 3, display: "block" }}
      >
        CATEGORIES
      </Typography>
      <Box sx={{ mt: 0.5 }}>
        <Row
          title="Bulk jobs"
          description="Imports, exports, downloads — completion alerts."
          checked={prefs.categories.bulk_jobs}
          onChange={(v) =>
            setPrefs((p) => ({ ...p, categories: { ...p.categories, bulk_jobs: v } }))
          }
        />
        <Divider />
        <Row
          title="Reports"
          description="Scheduled report runs and threshold alerts."
          checked={prefs.categories.reports}
          onChange={(v) =>
            setPrefs((p) => ({ ...p, categories: { ...p.categories, reports: v } }))
          }
        />
        <Divider />
        <Row
          title="Invoices"
          description="New invoices, payments, overdues."
          checked={prefs.categories.invoices}
          onChange={(v) =>
            setPrefs((p) => ({ ...p, categories: { ...p.categories, invoices: v } }))
          }
        />
        <Divider />
        <Row
          title="Maintenance"
          description="Equipment service alerts and defect logs."
          checked={prefs.categories.maintenance}
          onChange={(v) =>
            setPrefs((p) => ({ ...p, categories: { ...p.categories, maintenance: v } }))
          }
        />
        <Divider />
        <Row
          title="System"
          description="Account and security announcements."
          checked={prefs.categories.system}
          onChange={(v) =>
            setPrefs((p) => ({ ...p, categories: { ...p.categories, system: v } }))
          }
        />
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {saved && <Alert severity="success" sx={{ mt: 2 }}>Notification preferences saved.</Alert>}

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
          {update.isPending ? "Saving…" : "Save settings"}
        </Button>
      </Stack>
    </Paper>
  );
}
