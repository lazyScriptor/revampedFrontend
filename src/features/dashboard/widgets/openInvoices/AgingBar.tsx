import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useDashboardMoney } from "@/features/accounting/utils/currency";
import type {
  OpenInvoiceAgeDays,
  OpenInvoiceBucket,
  OpenInvoiceBucketKey,
} from "@/features/dashboard/types";

interface AgingBarProps {
  buckets: OpenInvoiceBucket[];
  activeAgeFilter: OpenInvoiceAgeDays;
  onSelectBucket: (olderThanDays: OpenInvoiceAgeDays) => void;
}

const BUCKET_META: Record<
  OpenInvoiceBucketKey,
  { labelKey: string; fallback: string; color: string; filterDays: OpenInvoiceAgeDays }
> = {
  "0_7": { labelKey: "dashboard.openInvoices.bucket0_7", fallback: "0–7d", color: "#F59E0B", filterDays: 0 },
  "8_14": { labelKey: "dashboard.openInvoices.bucket8_14", fallback: "8–14d", color: "#F97316", filterDays: 7 },
  "15_30": { labelKey: "dashboard.openInvoices.bucket15_30", fallback: "15–30d", color: "#EF4444", filterDays: 14 },
  "31_90": { labelKey: "dashboard.openInvoices.bucket31_90", fallback: "31–90d", color: "#DC2626", filterDays: 30 },
  "90_plus": { labelKey: "dashboard.openInvoices.bucket90Plus", fallback: "90+d", color: "#991B1B", filterDays: 90 },
};

export const AgingBar: React.FC<AgingBarProps> = ({
  buckets,
  activeAgeFilter,
  onSelectBucket,
}) => {
  const { t } = useTranslation();
  const money = useDashboardMoney();
  const totalOwed = buckets.reduce((sum, b) => sum + (b.owed || 0), 0);

  if (!buckets.length || totalOwed <= 0) return null;

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2 },
        py: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          width: "100%",
          height: 10,
          borderRadius: 99,
          overflow: "hidden",
          gap: "2px",
          bgcolor: "action.hover",
        }}
      >
        {buckets.map((bucket) => {
          if (bucket.owed <= 0) return null;
          const meta = BUCKET_META[bucket.key];
          const pct = Math.max(4, (bucket.owed / totalOwed) * 100);
          const isSelected = activeAgeFilter === meta.filterDays;
          const label = t(meta.labelKey, meta.fallback);
          const tip = `${label}: ${money.full(bucket.owed)} (${bucket.count})`;

          return (
            <Tooltip key={bucket.key} title={tip}>
              <Box
                role="button"
                tabIndex={0}
                aria-label={tip}
                data-testid={`aging-segment-${bucket.key}`}
                onClick={() => onSelectBucket(meta.filterDays)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectBucket(meta.filterDays);
                  }
                }}
                sx={{
                  width: `${pct}%`,
                  bgcolor: meta.color,
                  cursor: "pointer",
                  opacity: isSelected ? 1 : 0.85,
                  outline: isSelected ? "2px solid currentColor" : "none",
                  transition: "opacity 150ms ease, transform 150ms ease",
                  "&:hover": { opacity: 1 },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: 0.65,
          overflowX: "auto",
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {buckets.map((bucket) => {
          const meta = BUCKET_META[bucket.key];
          if (bucket.count === 0) return null;
          return (
            <Box
              key={bucket.key}
              onClick={() => onSelectBucket(meta.filterDays)}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.4,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  bgcolor: meta.color,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.65rem",
                  color: "text.secondary",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {t(meta.labelKey, meta.fallback)} · {money.full(bucket.owed)} ({bucket.count})
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
