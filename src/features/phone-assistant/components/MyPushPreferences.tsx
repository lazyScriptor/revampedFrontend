import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import PhoneAndroidOutlinedIcon from "@mui/icons-material/PhoneAndroidOutlined";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMyDevices } from "@/features/signatures/hooks/useSignatures";
import { isNativePhoneApp } from "../lib/nativeBridge";
import {
  useMyPushPreferences,
  useUpdateMyPushPreferences,
} from "../hooks/usePushSettings";
import type {
  UserPersonalQuietHours,
  UserPushPreferenceUpdate,
} from "../api/phoneAssistantApi";
import { PersonalQuietHoursCard } from "./PersonalQuietHoursCard";
import { PushPreferenceList } from "./PushPreferenceList";

export function MyPushPreferences() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === "dark";

  const surfaceBg = isDark ? "#0f172a" : "#ffffff";
  const borderColor = isDark ? "#334155" : "#e2e8f0";
  const textPrimary = isDark ? "#f8fafc" : "#0f172a";
  const textSecondary = isDark ? "#94a3b8" : "#475569";

  const { data, isLoading, isError } = useMyPushPreferences(true);
  const updatePrefs = useUpdateMyPushPreferences();
  const { data: devicesData } = useMyDevices();

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const nativeDevices = (devicesData?.devices ?? []).filter(
    (d) => d.is_native_app,
  );

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

  const handleSaveQuietHours = async (quiet_hours: UserPersonalQuietHours) => {
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
        quiet_hours,
      });
      setSaveSuccess(true);
    } catch (err: any) {
      setSaveError(
        err?.message || t("phoneAssistant.myNotifications.saveFailed"),
      );
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2.5,
        bgcolor: surfaceBg,
        borderColor,
      }}
    >
      <Stack spacing={2.25}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: isDark
                  ? "rgba(217, 119, 6, 0.16)"
                  : "rgba(245, 158, 11, 0.14)",
                color: "#d97706",
              }}
            >
              <NotificationsActiveOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, fontSize: 16, color: textPrimary }}
              >
                {t("phoneAssistant.myNotifications.title")}
              </Typography>
              <Typography variant="caption" sx={{ color: textSecondary }}>
                {t("phoneAssistant.myNotifications.subtitle")}
              </Typography>
            </Box>
          </Stack>

          {isNativePhoneApp() && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate({ to: "/device/notifications" })}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#d97706",
                color: "#b45309",
              }}
            >
              {t("phoneAssistant.myNotifications.manageOnPhone")}
            </Button>
          )}
        </Stack>

        <PushPreferenceList
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
            quietHours={data?.quiet_hours}
            isSaving={updatePrefs.isPending}
            onSave={handleSaveQuietHours}
          />
        )}

        <Box sx={{ pt: 1, borderTop: `1px solid ${borderColor}` }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: textSecondary,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              display: "block",
              mb: 1,
            }}
          >
            {t("phoneAssistant.myNotifications.pairedPhonesHeading")}
          </Typography>

          {nativeDevices.length === 0 ? (
            <Alert severity="info">
              {t("phoneAssistant.myNotifications.noPairedNativePhone")}
            </Alert>
          ) : (
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              {nativeDevices.map((dev) => (
                <Chip
                  key={dev.operator_device_id}
                  icon={<PhoneAndroidOutlinedIcon fontSize="small" />}
                  label={`${dev.device_label || dev.device_id}${dev.app_version ? ` · v${dev.app_version}` : ""}`}
                  variant="outlined"
                  sx={{
                    borderColor: "#f59e0b",
                    color: textPrimary,
                    fontVariantNumeric: "tabular-nums",
                  }}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
