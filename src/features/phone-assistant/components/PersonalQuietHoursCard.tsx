import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useTranslation } from "react-i18next";
import type { UserPersonalQuietHours } from "../api/phoneAssistantApi";

export interface PersonalQuietHoursCardProps {
  quietHours?: UserPersonalQuietHours;
  isSaving?: boolean;
  compact?: boolean;
  onSave: (quietHours: UserPersonalQuietHours) => Promise<void> | void;
}

/** Shared quiet-hours editor used on both Web Profile and Android Device Notifications. */
export function PersonalQuietHoursCard({
  quietHours,
  isSaving = false,
  compact = false,
  onSave,
}: PersonalQuietHoursCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surfaceBg = isDark ? "#0f172a" : "#ffffff";
  const rowBg = isDark ? "#1e293b" : "#f8fafc";
  const borderColor = isDark ? "#334155" : "#e2e8f0";
  const textPrimary = isDark ? "#f8fafc" : "#0f172a";
  const textSecondary = isDark ? "#94a3b8" : "#475569";

  const [enabled, setEnabled] = useState<boolean>(Boolean(quietHours?.enabled));
  const [from, setFrom] = useState<string>(quietHours?.from || "21:00");
  const [to, setTo] = useState<string>(quietHours?.to || "07:00");

  useEffect(() => {
    setEnabled(Boolean(quietHours?.enabled));
    setFrom(quietHours?.from || "21:00");
    setTo(quietHours?.to || "07:00");
  }, [quietHours?.enabled, quietHours?.from, quietHours?.to]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1.5 : 2,
        borderRadius: 2,
        bgcolor: rowBg,
        borderColor,
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: textPrimary }}>
              {t("phoneAssistant.myNotifications.personalQuietHoursTitle")}
            </Typography>
            <Typography variant="caption" sx={{ color: textSecondary }}>
              {t("phoneAssistant.myNotifications.personalQuietHoursHint")}
            </Typography>
          </Box>
          <Switch
            size={compact ? "small" : "medium"}
            color="warning"
            checked={enabled}
            disabled={isSaving}
            onChange={(_e, checked) => setEnabled(checked)}
            slotProps={{
              input: {
                role: "switch",
                "aria-label": t("phoneAssistant.myNotifications.personalQuietHoursTitle"),
              },
            }}
          />
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ alignItems: { xs: "stretch", sm: "center" } }}
        >
          <TextField
            size="small"
            type="time"
            label={t("phoneAssistant.pushSettings.quietFrom")}
            value={from}
            disabled={!enabled || isSaving}
            onChange={(e) => setFrom(e.target.value || "21:00")}
            sx={{
              flex: 1,
              "& .MuiInputBase-root": { bgcolor: surfaceBg, color: textPrimary },
              "& .MuiInputLabel-root": { color: textSecondary },
            }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { style: { fontVariantNumeric: "tabular-nums" } },
            }}
          />
          <TextField
            size="small"
            type="time"
            label={t("phoneAssistant.pushSettings.quietTo")}
            value={to}
            disabled={!enabled || isSaving}
            onChange={(e) => setTo(e.target.value || "07:00")}
            sx={{
              flex: 1,
              "& .MuiInputBase-root": { bgcolor: surfaceBg, color: textPrimary },
              "& .MuiInputLabel-root": { color: textSecondary },
            }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { style: { fontVariantNumeric: "tabular-nums" } },
            }}
          />
          <Button
            size="small"
            variant="outlined"
            color="warning"
            disabled={isSaving}
            startIcon={<SaveOutlinedIcon fontSize="small" />}
            onClick={() =>
              void onSave({
                enabled,
                from: from || null,
                to: to || null,
              })
            }
            sx={{
              minHeight: compact ? 40 : 38,
              textTransform: "none",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {t("phoneAssistant.myNotifications.saveQuietHours")}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
