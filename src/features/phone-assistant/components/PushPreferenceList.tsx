import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type {
  UserPushPreferenceItem,
  UserPushPreferenceUpdate,
} from "../api/phoneAssistantApi";

interface PushPreferenceListProps {
  preferences: UserPushPreferenceItem[];
  isLoading: boolean;
  isError: boolean;
  isSaving: boolean;
  saveError?: string | null;
  saveSuccess?: boolean;
  onSave: (updates: UserPushPreferenceUpdate[]) => Promise<unknown> | void;
  compact?: boolean;
}

export function PushPreferenceList({
  preferences,
  isLoading,
  isError,
  isSaving,
  saveError,
  saveSuccess,
  onSave,
  compact = false,
}: PushPreferenceListProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surfaceBg = isDark ? "#0f172a" : "#ffffff";
  const rowBg = isDark ? "#1e293b" : "#f8fafc";
  const borderColor = isDark ? "#334155" : "#e2e8f0";
  const textPrimary = isDark ? "#f8fafc" : "#0f172a";
  const textSecondary = isDark ? "#94a3b8" : "#475569";

  const visibleItems = useMemo(
    () => preferences.filter((item) => item.shop_enabled && item.eligible),
    [preferences],
  );

  const [draftAmounts, setDraftAmounts] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    setDraftAmounts((prev) => {
      const next: Record<string, string> = {};
      for (const item of visibleItems) {
        if (prev[item.event_key] !== undefined) {
          next[item.event_key] = prev[item.event_key];
        } else {
          next[item.event_key] =
            item.min_amount !== null && item.min_amount !== undefined
              ? String(item.min_amount)
              : "";
        }
      }
      return next;
    });
  }, [visibleItems]);

  const parseDraftAmount = (
    item: UserPushPreferenceItem,
  ): { valid: boolean; value: number | null; error?: string } => {
    if (!item.has_amount) return { valid: true, value: null };
    const raw = (draftAmounts[item.event_key] ?? "").trim();
    if (!raw) return { valid: true, value: null };
    const num = Number(raw);
    if (!Number.isFinite(num) || num < item.shop_min_amount) {
      return {
        valid: false,
        value: null,
        error: t("phoneAssistant.myNotifications.minAmountValidation", {
          amount: Number(item.shop_min_amount || 0).toLocaleString(),
        }),
      };
    }
    return { valid: true, value: num };
  };

  const handleToggle = (item: UserPushPreferenceItem, checked: boolean) => {
    const parsed = parseDraftAmount(item);
    void onSave([
      {
        event_key: item.event_key,
        enabled: checked,
        min_amount: parsed.valid ? parsed.value : item.min_amount,
      },
    ]);
  };

  const handleSaveThreshold = (item: UserPushPreferenceItem) => {
    const parsed = parseDraftAmount(item);
    if (!parsed.valid) {
      setValidationErrors((prev) => ({
        ...prev,
        [item.event_key]: parsed.error || "",
      }));
      return;
    }
    setValidationErrors((prev) => {
      const copy = { ...prev };
      delete copy[item.event_key];
      return copy;
    });
    void onSave([
      {
        event_key: item.event_key,
        enabled: item.enabled,
        min_amount: parsed.value,
      },
    ]);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={24} sx={{ color: "#d97706" }} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">
        {t("phoneAssistant.myNotifications.loadFailed")}
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      {saveError && <Alert severity="error">{saveError}</Alert>}
      {saveSuccess && (
        <Alert severity="success">
          {t("phoneAssistant.myNotifications.savedBanner")}
        </Alert>
      )}

      {visibleItems.length === 0 ? (
        <Alert severity="info">
          {t("phoneAssistant.myNotifications.empty")}
        </Alert>
      ) : (
        visibleItems.map((item) => {
          const eventLabel = t(
            `phoneAssistant.pushEvents.${item.event_key}.label`,
            { defaultValue: item.event_key },
          );
          const eventDescription = t(
            `phoneAssistant.pushEvents.${item.event_key}.description`,
            { defaultValue: "" },
          );
          const rawDraft = draftAmounts[item.event_key] ?? "";
          const serverAmountStr =
            item.min_amount !== null && item.min_amount !== undefined
              ? String(item.min_amount)
              : "";
          const thresholdDirty = rawDraft !== serverAmountStr;
          const fieldError = validationErrors[item.event_key];

          return (
            <Paper
              key={item.event_key}
              variant="outlined"
              sx={{
                p: compact ? 1.5 : 2,
                borderRadius: 2,
                bgcolor: rowBg,
                borderColor,
              }}
            >
              <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, color: textPrimary }}
                  >
                    {eventLabel}
                  </Typography>
                  {eventDescription && (
                    <Typography
                      variant="caption"
                      sx={{ color: textSecondary, display: "block", mt: 0.25 }}
                    >
                      {eventDescription}
                    </Typography>
                  )}
                </Box>

                <Switch
                  checked={Boolean(item.enabled)}
                  disabled={isSaving}
                  color="warning"
                  onChange={(_e, checked) => handleToggle(item, checked)}
                  slotProps={{
                    input: {
                      role: "switch",
                      "aria-label": eventLabel,
                    },
                  }}
                />
              </Stack>

              {item.has_amount && (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.25}
                  sx={{
                    alignItems: { xs: "stretch", sm: "flex-start" },
                    mt: 1.5,
                    pt: 1.5,
                    borderTop: `1px solid ${borderColor}`,
                  }}
                >
                  <TextField
                    size="small"
                    type="number"
                    label={t("phoneAssistant.myNotifications.minAmountLabel")}
                    value={rawDraft}
                    disabled={!item.enabled || isSaving}
                    error={Boolean(fieldError)}
                    helperText={
                      fieldError ||
                      t("phoneAssistant.myNotifications.shopMinHint", {
                        amount: Number(item.shop_min_amount || 0).toLocaleString(),
                      })
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraftAmounts((prev) => ({
                        ...prev,
                        [item.event_key]: val,
                      }));
                      if (validationErrors[item.event_key]) {
                        setValidationErrors((prev) => {
                          const copy = { ...prev };
                          delete copy[item.event_key];
                          return copy;
                        });
                      }
                    }}
                    sx={{
                      width: { xs: "100%", sm: 220 },
                      "& .MuiInputBase-root": {
                        bgcolor: surfaceBg,
                        color: textPrimary,
                      },
                      "& .MuiInputLabel-root": {
                        color: textSecondary,
                      },
                    }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">Rs.</InputAdornment>
                        ),
                      },
                      htmlInput: {
                        min: item.shop_min_amount,
                        step: 1,
                        inputMode: "numeric",
                        style: { fontVariantNumeric: "tabular-nums" },
                      },
                    }}
                  />

                  {thresholdDirty && (
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={isSaving}
                      onClick={() => handleSaveThreshold(item)}
                      sx={{
                        minHeight: 40,
                        textTransform: "none",
                        fontWeight: 600,
                        borderColor: "#d97706",
                        color: "#b45309",
                        "&:hover": {
                          borderColor: "#b45309",
                          bgcolor: "rgba(217, 119, 6, 0.08)",
                        },
                      }}
                    >
                      {t("phoneAssistant.myNotifications.saveThreshold")}
                    </Button>
                  )}
                </Stack>
              )}
            </Paper>
          );
        })
      )}
    </Stack>
  );
}
