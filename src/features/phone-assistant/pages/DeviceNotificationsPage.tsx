import { useState } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getDeviceId } from "@/features/signatures/lib/deviceId";
import { useDeviceManifest } from "@/features/signatures/lib/deviceShell";
import type { UserPushPreferenceUpdate } from "../api/phoneAssistantApi";
import { PushPreferenceList } from "../components/PushPreferenceList";
import {
  useDevicePushPreferences,
  useUpdateDevicePushPreferences,
} from "../hooks/usePushSettings";

export function DeviceNotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useDeviceManifest();

  const paired = Boolean(getDeviceId());
  const { data, isLoading, isError } = useDevicePushPreferences(paired);
  const updatePrefs = useUpdateDevicePushPreferences();

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (updates: UserPushPreferenceUpdate[]) => {
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updatePrefs.mutateAsync(updates);
      setSaveSuccess(true);
    } catch (err: any) {
      setSaveError(
        err?.message || t("phoneAssistant.myNotifications.saveFailed"),
      );
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f8fafc",
        color: "#0f172a",
        p: 2,
        pb: 4,
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 540, mx: "auto" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate({ to: "/device" })}
            sx={{
              minHeight: 40,
              textTransform: "none",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {t("phoneAssistant.deviceNotifications.backToDevice")}
          </Button>
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            p: 2.25,
            borderRadius: 2.5,
            bgcolor: "#ffffff",
            borderColor: "#e2e8f0",
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 2 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(245, 158, 11, 0.14)",
                color: "#d97706",
              }}
            >
              <NotificationsActiveOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}
              >
                {t("phoneAssistant.deviceNotifications.title")}
              </Typography>
              <Typography variant="caption" sx={{ color: "#475569" }}>
                {t("phoneAssistant.deviceNotifications.subtitle")}
              </Typography>
            </Box>
          </Stack>

          {!paired ? (
            <Alert severity="warning">
              {t("phoneAssistant.deviceNotifications.unpairedError")}
            </Alert>
          ) : (
            <PushPreferenceList
              compact
              preferences={data?.preferences ?? []}
              isLoading={isLoading}
              isError={isError}
              isSaving={updatePrefs.isPending}
              saveError={saveError}
              saveSuccess={saveSuccess}
              onSave={handleSave}
            />
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
