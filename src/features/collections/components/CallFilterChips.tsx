import React from "react";
import { Box, Chip } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { CallFilterKey } from "../types";
import { dashboardTones } from "@/features/dashboard/_tokens";

export type CallFilterCounts = Partial<Record<CallFilterKey, number>>;

interface CallFilterChipsProps {
  value: CallFilterKey | null;
  onChange: (next: CallFilterKey | null) => void;
  counts?: CallFilterCounts;
}

const CALL_FILTER_OPTIONS: Array<{
  key: CallFilterKey;
  i18nKey: string;
  fallback: string;
}> = [
  { key: "not_called_today", i18nKey: "collections.filters.notCalledToday", fallback: "Not called today" },
  { key: "no_answer", i18nKey: "collections.filters.noAnswer", fallback: "No answer" },
  { key: "promised", i18nKey: "collections.filters.promised", fallback: "Promised" },
  { key: "promise_missed", i18nKey: "collections.filters.promiseMissed", fallback: "Promise missed" },
  { key: "call_again_today", i18nKey: "collections.filters.callAgainToday", fallback: "Call again today" },
  { key: "calls_to_note", i18nKey: "collections.filters.callsToNote", fallback: "Calls to note" },
];

export const CallFilterChips: React.FC<CallFilterChipsProps> = ({
  value,
  onChange,
  counts,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.6,
        px: { xs: 1.5, sm: 2 },
        py: 0.65,
        borderBottom: "1px solid",
        borderColor: "divider",
        flexShrink: 0,
        overflowX: "auto",
        flexWrap: { xs: "nowrap", sm: "wrap" },
        "&::-webkit-scrollbar": { display: "none" },
        scrollbarWidth: "none",
      }}
    >
      {CALL_FILTER_OPTIONS.map((opt) => {
        const active = value === opt.key;
        const count = counts?.[opt.key];
        const label =
          typeof count === "number"
            ? `${t(opt.i18nKey, opt.fallback)} (${count})`
            : t(opt.i18nKey, opt.fallback);
        return (
          <Chip
            key={opt.key}
            size="small"
            clickable
            label={label}
            aria-pressed={active}
            onClick={() => onChange(active ? null : opt.key)}
            sx={{
              flexShrink: 0,
              height: 23,
              fontSize: "0.68rem",
              fontWeight: active ? 800 : 600,
              fontVariantNumeric: "tabular-nums",
              bgcolor: active ? dashboardTones.primary.soft : "action.hover",
              color: active ? dashboardTones.primary.on : "text.secondary",
              border: "1px solid",
              borderColor: active ? `${dashboardTones.primary.strong}66` : "divider",
            }}
          />
        );
      })}
    </Box>
  );
};
