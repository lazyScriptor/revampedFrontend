import { Box, LinearProgress, Paper, Typography, useTheme, alpha } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import { ACTIVITY_FILTER_GROUPS, ACTIVITY_TYPE_META } from "../constants";
import type {
  ActivityStaffSummaryRow,
  ActivitySummaryBucket,
  ActivitySummaryTypeRow,
} from "../types";

interface ActivityChartsProps {
  buckets: ActivitySummaryBucket[];
  granularity: "hour" | "day";
  byType: ActivitySummaryTypeRow[];
  notCheckedCount: number;
  byStaff?: ActivityStaffSummaryRow[];
  canCheck: boolean;
  onBarTap?: (date: string) => void;
  activeDay?: string;
}

export function ActivityCharts({
  buckets,
  granularity,
  byType,
  notCheckedCount,
  byStaff,
  canCheck,
  onBarTap,
  activeDay,
}: ActivityChartsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = theme.palette.divider;
  const gridColor = isDark ? "rgba(148,163,184,0.14)" : "rgba(15,23,42,0.08)";
  const tickColor = isDark ? "#94a3b8" : "#64748b";

  // Flatten bucket counts for Recharts stacked BarChart grouped by ACTIVITY_FILTER_GROUPS
  const barRows = buckets.map((b) => {
    const row: Record<string, any> = {
      key: b.key,
      label: b.label,
      date: b.date,
      total: b.total,
    };
    for (const grp of ACTIVITY_FILTER_GROUPS) {
      row[grp.key] = grp.types.reduce((sum, tp) => sum + (b.counts?.[tp] ?? 0), 0);
    }
    return row;
  });

  // Donut slices: grouped by type + a dedicated "Not checked" segment
  const totalEvents = byType.reduce((s, r) => s + r.count, 0);
  const donutData: Array<{ name: string; value: number; color: string }> = byType
    .filter((r) => r.count > 0)
    .map((r) => {
      const meta = ACTIVITY_TYPE_META[r.type];
      return {
        name: t(meta?.labelKey ?? r.type),
        value: r.count,
        color: meta?.color ?? "#64748b",
      };
    });

  const ringNotChecked =
    notCheckedCount > 0
      ? [
          { name: t("activity.notChecked"), value: notCheckedCount, color: "#f59e0b" },
          {
            name: t("activity.checked"),
            value: Math.max(0, totalEvents - notCheckedCount),
            color: isDark ? "#334155" : "#e2e8f0",
          },
        ]
      : [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
          gap: 2,
        }}
      >
        {/* Stacked bar chart */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            borderColor: border,
            bgcolor: "background.paper",
            minWidth: 0,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {granularity === "hour"
                ? t("activity.charts.activityByHour")
                : t("activity.charts.activityByDay")}
            </Typography>
            {activeDay && (
              <Typography
                variant="caption"
                sx={{ color: "warning.main", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
              >
                {t("activity.charts.filteredDay", { day: activeDay })}
              </Typography>
            )}
          </Box>
          <Box sx={{ width: "100%", height: 210 }}>
            {barRows.length === 0 ? (
              <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  {t("activity.emptyPeriod")}
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barRows}
                  onClick={(state: any) => {
                    const clickedDate = state?.activePayload?.[0]?.payload?.date;
                    if (clickedDate && onBarTap) onBarTap(clickedDate);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1e293b" : "#ffffff",
                      borderColor: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: 8,
                      fontSize: 12,
                      color: isDark ? "#f8fafc" : "#0f172a",
                    }}
                  />
                  {ACTIVITY_FILTER_GROUPS.map((grp) => (
                    <Bar
                      key={grp.key}
                      dataKey={grp.key}
                      name={t(grp.labelKey)}
                      stackId="a"
                      fill={grp.color}
                      cursor={onBarTap ? "pointer" : "default"}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Paper>

        {/* Donut by type + not-checked ring */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            borderColor: border,
            bgcolor: "background.paper",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            {t("activity.charts.shareByType")}
          </Typography>
          <Box sx={{ width: "100%", height: 180, position: "relative" }}>
            {donutData.length === 0 ? (
              <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  {t("activity.emptyPeriod")}
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={68}
                    paddingAngle={2}
                  >
                    {donutData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  {ringNotChecked.length > 0 && (
                    <Pie
                      data={ringNotChecked}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={80}
                      stroke="none"
                    >
                      {ringNotChecked.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                  )}
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1e293b" : "#ffffff",
                      borderColor: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: 8,
                      fontSize: 12,
                      color: isDark ? "#f8fafc" : "#0f172a",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
            {donutData.slice(0, 5).map((d) => (
              <Box key={d.name} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: d.color }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  {d.name} ({d.value})
                </Typography>
              </Box>
            ))}
            {notCheckedCount > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#f59e0b" }} />
                <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {t("activity.notChecked")} ({notCheckedCount})
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Per-staff bars (managers / activity:check only) */}
      {canCheck && byStaff && byStaff.length > 0 && (
        <Paper
          data-testid="per-staff-bars"
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            borderColor: border,
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.25 }}>
            {t("activity.charts.whoDidWhat")}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {(() => {
              const maxTotal = Math.max(1, ...byStaff.map((s) => s.total));
              return byStaff.map((staff) => (
                <Box key={staff.user_id} sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                  <Typography variant="body2" sx={{ width: 130, fontWeight: 700, flexShrink: 0 }} noWrap>
                    {staff.name}
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 120 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (staff.total / maxTotal) * 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: alpha(theme.palette.warning.main, 0.14),
                        "& .MuiLinearProgress-bar": { bgcolor: "#f59e0b", borderRadius: 4 },
                      }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
                  >
                    {t("activity.charts.staffBreakdown", {
                      discounts: staff.discounts,
                      backdated: staff.backdated,
                      refunds: staff.refunds,
                    })}
                  </Typography>
                </Box>
              ));
            })()}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
