import { useState } from "react";
import { Alert, Box, Button, Paper, Stack, Switch, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getDeviceId } from "@/features/signatures/lib/deviceId";
import { useDeviceManifest } from "@/features/signatures/lib/deviceShell";
import type {
  UserPersonalQuietHours,
  UserPushPreferenceUpdate,
} from "../api/phoneAssistantApi";
import { PersonalQuietHoursCard } from "../components/PersonalQuietHoursCard";
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

  const handleSaveExtras = async (extras: {
    muted?: boolean;
    quiet_hours?: UserPersonalQuietHours;
  }) => {
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const currentPrefs = (data?.preferences ?? []).map((item) => ({
        event_key: item.event_key,
        enabled: item.enabled,
        min_amount: item.min_amount,
      }));
      await updatePrefs.mutateAsync({
        preferences: currentPrefs,
        ...extras,
      });
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
        bgcolor: "background.default",
        color: "text.primary",
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
              color: "text.primary",
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
            bgcolor: "background.paper",
            borderColor: "divider",
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
                color: "warning.main",
              }}
            >
              <NotificationsActiveOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, fontSize: 17, color: "text.primary" }}
              >
                {t("phoneAssistant.deviceNotifications.title")}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {t("phoneAssistant.deviceNotifications.subtitle")}
              </Typography>
            </Box>
          </Stack>

          {!paired ? (
            <Alert severity="warning">
              {t("phoneAssistant.deviceNotifications.unpairedError")}
            </Alert>
          ) : (
            <Stack spacing={2}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "background.default",
                  borderColor: "divider",
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                      {t("phoneAssistant.deviceNotifications.muteThisPhone")}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {t("phoneAssistant.deviceNotifications.muteThisPhoneHint")}
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    color="warning"
                    checked={Boolean(data?.muted)}
                    disabled={updatePrefs.isPending || isLoading}
                    onChange={(_e, checked) => void handleSaveExtras({ muted: checked })}
                    slotProps={{
                      input: {
                        role: "switch",
                        "aria-label": t("phoneAssistant.deviceNotifications.muteThisPhone"),
                      },
                    }}
                  />
                </Stack>
              </Paper>

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

              {!isLoading && !isError && (
                <PersonalQuietHoursCard
                  compact
                  quietHours={data?.quiet_hours}
                  isSaving={updatePrefs.isPending}
                  onSave={(quiet_hours) => handleSaveExtras({ quiet_hours })}
                />
              )}
            </Stack>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
