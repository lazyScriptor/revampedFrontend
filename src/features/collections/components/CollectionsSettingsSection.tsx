import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import AddIcon from "@mui/icons-material/Add";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_CALL_RECORDING_SETTINGS,
  DEFAULT_CALL_RESULTS,
  type CallRecordingSettings,
  type CallResultOption,
} from "../types";
import { useCollectionsSettings, useUpdateCollectionsSettings } from "../hooks/useCollections";

export const CollectionsSettingsSection: React.FC = () => {
  const { t } = useTranslation();
  const settingsQuery = useCollectionsSettings();
  const updateMutation = useUpdateCollectionsSettings();

  const [threshold, setThreshold] = useState<number>(5);
  const [results, setResults] = useState<CallResultOption[]>(DEFAULT_CALL_RESULTS);
  const [recording, setRecording] = useState<CallRecordingSettings>(DEFAULT_CALL_RECORDING_SETTINGS);
  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [legalConfirmed, setLegalConfirmed] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!settingsQuery.data) return;
    if (typeof settingsQuery.data.answered_threshold_seconds === "number") {
      setThreshold(settingsQuery.data.answered_threshold_seconds);
    }
    if (settingsQuery.data.call_results?.length) {
      setResults(settingsQuery.data.call_results);
    }
    if (settingsQuery.data.call_recording) {
      setRecording({ ...DEFAULT_CALL_RECORDING_SETTINGS, ...settingsQuery.data.call_recording });
    }
  }, [settingsQuery.data]);

  const handleSaveAll = async (nextRecording = recording) => {
    await updateMutation.mutateAsync({
      answered_threshold_seconds: threshold,
      call_results: results,
      call_recording: nextRecording,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleToggleRecording = (checked: boolean) => {
    if (!checked) {
      setRecording((r) => ({ ...r, enabled: false }));
      return;
    }
    setLegalConfirmed(false);
    setLegalDialogOpen(true);
  };

  const confirmEnableRecording = () => {
    if (!legalConfirmed) return;
    const next = { ...recording, enabled: true, termsLineEnabled: true };
    setRecording(next);
    setLegalDialogOpen(false);
  };

  const addResultChip = () => {
    setResults((prev) => [
      ...prev.filter((r) => r.key !== "other"),
      {
        key: `custom_${Date.now()}`,
        label_en: "New option",
        label_si: "නව විකල්පය",
        active: true,
      },
      ...prev.filter((r) => r.key === "other"),
    ]);
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, border: 1, borderColor: "divider", borderRadius: 2.5 }}>
      <Stack spacing={2.5}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {t("collections.settings.title", "Collections, Call Outcomes & Recording")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(
                "collections.settings.subtitle",
                "Configure answered duration threshold, call result chips, and automatic call recording.",
              )}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            disableElevation
            startIcon={<SaveOutlinedIcon />}
            disabled={updateMutation.isPending}
            onClick={() => handleSaveAll()}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {updateMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
          </Button>
        </Box>

        {savedNotice && (
          <Alert severity="success">{t("collections.settings.saved", "Collections settings saved.")}</Alert>
        )}
        {updateMutation.isError && (
          <Alert severity="error">{t("collections.settings.saveFailed", "Could not save collections settings.")}</Alert>
        )}

        {/* Answered threshold */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t("collections.settings.answeredThreshold", "Answered call threshold (seconds)")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t(
                "collections.settings.answeredThresholdHint",
                "Calls lasting this many seconds or longer are pre-selected as Answered.",
              )}
            </Typography>
          </Box>
          <TextField
            size="small"
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Math.max(1, Number(e.target.value) || 5))}
            slotProps={{ htmlInput: { min: 1, max: 120, "aria-label": "Answered threshold seconds", style: { fontVariantNumeric: "tabular-nums", textAlign: "right" } } }}
            sx={{ width: 120 }}
          />
        </Box>

        <Divider />

        {/* Call result chip list */}
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t("collections.settings.resultChipsTitle", "Call result chips")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("collections.settings.resultChipsHint", "Shown on the call card after an answered call. 'Other' cannot be removed.")}
              </Typography>
            </Box>
            <Button size="small" startIcon={<AddIcon />} onClick={addResultChip} sx={{ textTransform: "none", fontWeight: 700 }}>
              {t("common.add", "Add")}
            </Button>
          </Box>

          <Stack spacing={1}>
            {results.map((item, idx) => (
              <Box
                key={item.key}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr auto auto" },
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <TextField
                  size="small"
                  label="English"
                  value={item.label_en}
                  onChange={(e) =>
                    setResults((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, label_en: e.target.value } : r)),
                    )
                  }
                />
                <TextField
                  size="small"
                  label="සිංහල"
                  value={item.label_si}
                  onChange={(e) =>
                    setResults((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, label_si: e.target.value } : r)),
                    )
                  }
                />
                <Switch
                  size="small"
                  checked={item.active}
                  disabled={item.key === "other"}
                  onChange={(e) =>
                    setResults((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, active: e.target.checked } : r)),
                    )
                  }
                />
                <IconButton
                  size="small"
                  disabled={item.key === "other"}
                  aria-label="Remove result chip"
                  onClick={() => setResults((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </Box>

        <Divider />

        {/* Call recording block */}
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {t("collections.settings.recordingTitle", "Automatic call recording")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t(
                  "collections.settings.recordingHint",
                  "Off by default. Attaches recordings from paired phones' built-in recorders for authorized roles.",
                )}
              </Typography>
            </Box>
            <Switch
              checked={recording.enabled}
              onChange={(e) => handleToggleRecording(e.target.checked)}
              slotProps={{ input: { "aria-label": t("collections.settings.enableRecording", "Enable call recording") } }}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5, alignItems: "center" }}>
            <FormControl size="small">
              <InputLabel>{t("collections.settings.retentionDays", "Keep recordings for")}</InputLabel>
              <Select
                label={t("collections.settings.retentionDays", "Keep recordings for")}
                value={recording.retentionDays}
                onChange={(e) =>
                  setRecording((r) => ({ ...r, retentionDays: Number(e.target.value) as 30 | 90 | 180 }))
                }
              >
                <MenuItem value={30}>30 {t("collections.report.days", "days")}</MenuItem>
                <MenuItem value={90}>90 {t("collections.report.days", "days")}</MenuItem>
                <MenuItem value={180}>180 {t("collections.report.days", "days")}</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={recording.mobileData}
                  onChange={(e) => setRecording((r) => ({ ...r, mobileData: e.target.checked }))}
                />
              }
              label={
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {t("collections.settings.mobileData", "Upload on mobile data")}
                </Typography>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={recording.deleteFromPhoneAfterUpload}
                  onChange={(e) =>
                    setRecording((r) => ({ ...r, deleteFromPhoneAfterUpload: e.target.checked }))
                  }
                />
              }
              label={
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {t("collections.settings.deleteAfterUpload", "Delete from phone after upload")}
                </Typography>
              }
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={recording.termsLineEnabled}
                onChange={(e) => setRecording((r) => ({ ...r, termsLineEnabled: e.target.checked }))}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t("collections.settings.termsLineEnabled", "Print call-recording notice on bill terms")}
              </Typography>
            }
          />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <TextField
              size="small"
              label={t("collections.settings.termsLineEn", "Receipt terms line (English)")}
              value={recording.termsLine_en}
              onChange={(e) => setRecording((r) => ({ ...r, termsLine_en: e.target.value }))}
            />
            <TextField
              size="small"
              label={t("collections.settings.termsLineSi", "Receipt terms line (Sinhala)")}
              value={recording.termsLine_si}
              onChange={(e) => setRecording((r) => ({ ...r, termsLine_si: e.target.value }))}
            />
          </Box>
        </Stack>
      </Stack>

      {/* Legal confirmation dialog */}
      <Dialog open={legalDialogOpen} onClose={() => setLegalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("collections.settings.legalTitle", "Confirm call recording legal notice")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            {t(
              "collections.settings.legalBody",
              "Call recordings are personal data under Sri Lanka's Personal Data Protection Act (No. 9 of 2022). Make sure you have taken legal advice and enabled customer notice on your bill terms.",
            )}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={legalConfirmed}
                onChange={(e) => setLegalConfirmed(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t("collections.settings.legalCheckbox", "I have taken legal advice")}
              </Typography>
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLegalDialogOpen(false)}>{t("common.cancel", "Cancel")}</Button>
          <Button variant="contained" disabled={!legalConfirmed} onClick={confirmEnableRecording}>
            {t("collections.settings.confirmEnable", "Enable recording")}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
