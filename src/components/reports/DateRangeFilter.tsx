import { Box, TextField, Chip, Typography, useTheme } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";
import { useTranslation } from "react-i18next";
import { tk } from "@/i18n/marker";

type PresetKey = "today" | "7d" | "30d" | "90d" | "month" | "lastMonth" | "ytd" | "all";

const presetRange = (key: PresetKey): { from: string; to: string } => {
  const today = todayLocalStr();
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDaysLocal(today, -6), to: today };
    case "30d":
      return { from: addDaysLocal(today, -29), to: today };
    case "90d":
      return { from: addDaysLocal(today, -89), to: today };
    case "month": {
      const [y, m] = today.split("-").map(Number);
      const first = `${y}-${String(m).padStart(2, "0")}-01`;
      return { from: first, to: today };
    }
    case "lastMonth": {
      const [y, m] = today.split("-").map(Number);
      const lastY = m === 1 ? y - 1 : y;
      const lastM = m === 1 ? 12 : m - 1;
      const first = `${lastY}-${String(lastM).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m - 1, 0).getDate();
      const last = `${lastY}-${String(lastM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { from: first, to: last };
    }
    case "ytd": {
      const [y] = today.split("-");
      return { from: `${y}-01-01`, to: today };
    }
    case "all":
    default:
      return { from: "", to: "" };
  }
};

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: tk("common.today") },
  { key: "7d", label: tk("shared.DateRangeFilter.7Days") },
  { key: "30d", label: tk("shared.DateRangeFilter.30Days") },
  { key: "90d", label: tk("shared.DateRangeFilter.90Days") },
  { key: "month", label: tk("shared.DateRangeFilter.thisMonth") },
  { key: "lastMonth", label: tk("shared.DateRangeFilter.lastMonth") },
  { key: "ytd", label: "YTD" },
  { key: "all", label: tk("shared.DateRangeFilter.allTime") },
];

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  showLabel?: boolean;
}

export function DateRangeFilter({
  from,
  to,
  onChange,
  showLabel = true,
}: DateRangeFilterProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.key);
    return r.from === from && r.to === to;
  })?.key;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {showLabel && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CalendarMonthIcon sx={{ fontSize: 16, color: "#f59e0b" }} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              color: isDark ? "#94a3b8" : "#475569",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontSize: "0.7rem",
            }}
          >
            {t("shared.DateRangeFilter.dateRange")}
          </Typography>
        </Box>
      )}

      {/* Preset Pills Bar */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 0.75,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {PRESETS.map((p) => {
          const selected = activePreset === p.key;
          return (
            <Chip
              key={p.key}
              label={t(p.label)}
              size="small"
              clickable
              onClick={() => onChange(presetRange(p.key))}
              sx={{
                fontWeight: 700,
                fontSize: "0.75rem",
                borderRadius: "999px",
                height: 28,
                px: 0.5,
                transition: "all 0.15s ease",
                bgcolor: selected
                  ? "#f59e0b"
                  : isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "#f1f5f9",
                color: selected ? "#0f172a" : isDark ? "#94a3b8" : "#475569",
                border: "1px solid",
                borderColor: selected
                  ? "#f59e0b"
                  : isDark
                  ? "rgba(255, 255, 255, 0.08)"
                  : "#e2e8f0",
                "&:hover": {
                  bgcolor: selected
                    ? "#d97706"
                    : isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "#e2e8f0",
                  color: selected ? "#0f172a" : isDark ? "#f8fafc" : "#0f172a",
                },
              }}
            />
          );
        })}
      </Box>

      {/* Custom Date Inputs */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        <TextField
          type="date"
          size="small"
          label={t("common.dateFrom")}
          value={from}
          onChange={(e) => onChange({ from: e.target.value, to })}
          slotProps={{
            inputLabel: {
              shrink: true,
              sx: {
                color: isDark ? "#94a3b8" : "#475569",
                fontWeight: 600,
                fontSize: "0.85rem",
              },
            },
            input: {
              className: "tabular-nums text-sm",
            },
          }}
          sx={{
            width: { xs: "100%", sm: 180 },
            bgcolor: isDark ? "#0f172a" : "#ffffff",
            borderRadius: 2,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#cbd5e1",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#f59e0b",
            },
            "& .MuiInputBase-input": {
              color: isDark ? "#f8fafc" : "#0f172a",
              fontSize: "0.85rem",
              fontWeight: 500,
              fontFamily: "'JetBrains Mono', monospace",
            },
          }}
        />

        <Typography
          variant="caption"
          sx={{
            display: { xs: "none", sm: "block" },
            color: isDark ? "#94a3b8" : "#64748b",
            fontWeight: 700,
          }}
        >
          {t("shared.DateRangeFilter.to")}
        </Typography>

        <TextField
          type="date"
          size="small"
          label={t("common.dateTo")}
          value={to}
          onChange={(e) => onChange({ from, to: e.target.value })}
          slotProps={{
            inputLabel: {
              shrink: true,
              sx: {
                color: isDark ? "#94a3b8" : "#475569",
                fontWeight: 600,
                fontSize: "0.85rem",
              },
            },
            input: {
              className: "tabular-nums text-sm",
            },
          }}
          sx={{
            width: { xs: "100%", sm: 180 },
            bgcolor: isDark ? "#0f172a" : "#ffffff",
            borderRadius: 2,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#cbd5e1",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#f59e0b",
            },
            "& .MuiInputBase-input": {
              color: isDark ? "#f8fafc" : "#0f172a",
              fontSize: "0.85rem",
              fontWeight: 500,
              fontFamily: "'JetBrains Mono', monospace",
            },
          }}
        />
      </Box>
    </Box>
  );
}
