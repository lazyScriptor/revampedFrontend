import { Box, Chip, TextField, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useActivitySettings } from "@/features/activity/hooks/useActivityHooks";
import type { ReasonListKey, ReasonOption, ReasonValue } from "@/features/activity/types";
import { DEFAULT_REASONS } from "@/features/activity/constants";

export function isReasonValid(value: ReasonValue | null | undefined, required = true): boolean {
  if (!required) return true;
  if (!value || !value.key) return false;
  if (value.key === "other") {
    return Boolean(value.note && value.note.trim().length > 0);
  }
  return true;
}

export interface ReasonChipsProps {
  list: ReasonListKey;
  value: ReasonValue | null;
  onChange: (next: ReasonValue | null) => void;
  required?: boolean;
  label?: string;
  surface?: "light" | "dark" | "auto";
  optionsOverride?: ReasonOption[];
  error?: boolean;
  disabled?: boolean;
}

export function ReasonChips({
  list,
  value,
  onChange,
  required = true,
  label,
  surface = "auto",
  optionsOverride,
  error = false,
  disabled = false,
}: ReasonChipsProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { data: settings } = useActivitySettings(!optionsOverride);

  const isDark = surface === "dark" || (surface === "auto" && theme.palette.mode === "dark");
  const isSi = i18n.language?.startsWith("si");

  const rawOptions = optionsOverride ?? settings?.reasons?.[list] ?? DEFAULT_REASONS[list];
  const activeOptions = rawOptions.filter((o) => o.active !== false);
  // Keep "other" last
  const ordered = [
    ...activeOptions.filter((o) => o.key !== "other"),
    ...activeOptions.filter((o) => o.key === "other"),
  ];

  const selectedKey = value?.key ?? "";
  const isOther = selectedKey === "other";
  const noteMissing = isOther && required && !value?.note?.trim();

  const handleSelect = (key: string) => {
    if (disabled) return;
    if (selectedKey === key && !required) {
      onChange(null);
      return;
    }
    onChange({ key, note: value?.note ?? "" });
  };

  return (
    <Box data-testid={`reason-chips-${list}`} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {label !== "" && (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: error ? "error.main" : isDark ? "#cbd5e1" : "text.secondary",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {label ?? t("reasons.selectReason")}
          {required && <span style={{ color: "#f59e0b" }}>*</span>}
        </Typography>
      )}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        {ordered.map((opt) => {
          const selected = selectedKey === opt.key;
          const text = isSi && opt.label_si ? opt.label_si : opt.label_en;
          return (
            <Chip
              key={opt.key}
              label={text}
              clickable={!disabled}
              disabled={disabled}
              onClick={() => handleSelect(opt.key)}
              aria-pressed={selected}
              sx={{
                minHeight: 36,
                fontWeight: selected ? 800 : 600,
                fontSize: "0.78rem",
                borderRadius: 2,
                bgcolor: selected
                  ? "#f59e0b"
                  : isDark
                    ? "#1e293b"
                    : "#f8fafc",
                color: selected
                  ? "#0f172a"
                  : isDark
                    ? "#e2e8f0"
                    : "#0f172a",
                border: "1px solid",
                borderColor: selected
                  ? "#d97706"
                  : isDark
                    ? "#334155"
                    : "#cbd5e1",
                "&:hover": {
                  bgcolor: selected
                    ? "#d97706"
                    : isDark
                      ? "#334155"
                      : "#f1f5f9",
                },
              }}
            />
          );
        })}
      </Box>

      {selectedKey && (
        <TextField
          size="small"
          fullWidth
          disabled={disabled}
          required={isOther && required}
          error={noteMissing && error}
          value={value?.note ?? ""}
          onChange={(e) => onChange({ key: selectedKey, note: e.target.value })}
          placeholder={
            isOther
              ? t("reasons.otherNoteRequired")
              : t("reasons.optionalNote")
          }
          helperText={
            noteMissing
              ? t("reasons.noteRequiredForOther")
              : undefined
          }
          slotProps={{
            htmlInput: {
              "aria-label": isOther ? t("reasons.otherNoteRequired") : t("reasons.optionalNote"),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: isDark ? "#1e293b" : "#ffffff",
              color: isDark ? "#f8fafc" : "#0f172a",
              "& fieldset": { borderColor: isDark ? "#334155" : "#cbd5e1" },
            },
            "& .MuiInputBase-input": {
              color: isDark ? "#f8fafc" : "#0f172a",
            },
          }}
        />
      )}
    </Box>
  );
}
