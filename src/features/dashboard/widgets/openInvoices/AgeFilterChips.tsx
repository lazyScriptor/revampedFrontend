import React from "react";
import { Box, Chip, Switch, FormControlLabel, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { OpenInvoiceAgeDays } from "@/features/dashboard/types";
import { dashboardTones } from "../../_tokens";

interface AgeFilterChipsProps {
  value: OpenInvoiceAgeDays;
  onChange: (days: OpenInvoiceAgeDays) => void;
  showOnlyOverdueToggle?: boolean;
  onlyOverdue?: boolean;
  onOnlyOverdueChange?: (next: boolean) => void;
}

const AGE_OPTIONS: { days: OpenInvoiceAgeDays; key: string; fallback: string }[] = [
  { days: 7, key: "dashboard.openInvoices.age7", fallback: "> 1 week" },
  { days: 14, key: "dashboard.openInvoices.age14", fallback: "> 2 weeks" },
  { days: 30, key: "dashboard.openInvoices.age30", fallback: "> 1 month" },
  { days: 90, key: "dashboard.openInvoices.age90", fallback: "> 3 months" },
  { days: 0, key: "dashboard.openInvoices.ageAll", fallback: "All time" },
];

export const AgeFilterChips: React.FC<AgeFilterChipsProps> = ({
  value,
  onChange,
  showOnlyOverdueToggle = false,
  onlyOverdue = false,
  onOnlyOverdueChange,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 0.75,
        px: { xs: 1.5, sm: 2 },
        py: 0.85,
        borderBottom: "1px solid",
        borderColor: "divider",
        flexShrink: 0,
        overflowX: "auto",
        flexWrap: { xs: "nowrap", sm: "wrap" },
        "&::-webkit-scrollbar": { display: "none" },
        scrollbarWidth: "none",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.6,
          flexWrap: { xs: "nowrap", sm: "wrap" },
          flexShrink: 0,
        }}
      >
        {AGE_OPTIONS.map((opt) => {
          const active = value === opt.days;
          return (
            <Chip
              key={opt.days}
              size="small"
              clickable
              label={t(opt.key, opt.fallback)}
              onClick={() => onChange(opt.days)}
              aria-pressed={active}
              sx={{
                flexShrink: 0,
                height: 24,
                fontSize: "0.7rem",
                fontWeight: active ? 800 : 600,
                fontVariantNumeric: "tabular-nums",
                bgcolor: active ? dashboardTones.primary.soft : "action.hover",
                color: active ? dashboardTones.primary.on : "text.secondary",
                border: "1px solid",
                borderColor: active ? `${dashboardTones.primary.strong}66` : "divider",
                "&:hover": {
                  bgcolor: active ? dashboardTones.primary.soft : "action.selected",
                },
              }}
            />
          );
        })}
      </Box>

      {showOnlyOverdueToggle && onOnlyOverdueChange && (
        <FormControlLabel
          sx={{
            m: 0,
            flexShrink: 0,
            ml: "auto",
            gap: 0.5,
          }}
          control={
            <Switch
              size="small"
              color="warning"
              checked={onlyOverdue}
              onChange={(e) => onOnlyOverdueChange(e.target.checked)}
              slotProps={{
                input: {
                  "aria-label": t("dashboard.openInvoices.onlyOverdue", "Only overdue"),
                },
              }}
            />
          }
          label={
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: "0.7rem",
                color: onlyOverdue ? dashboardTones.danger.strong : "text.secondary",
                whiteSpace: "nowrap",
              }}
            >
              {t("dashboard.openInvoices.onlyOverdue", "Only overdue")}
            </Typography>
          }
        />
      )}
    </Box>
  );
};
