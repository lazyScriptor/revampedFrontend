import React from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography, Skeleton, Chip, Stack } from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import { useMaintenanceQueue } from "@/features/dashboard/hooks/useDashboardHooks";
import type { MaintenanceItem } from "@/features/dashboard/types";
import dayjs from "dayjs";
import { dashboardTokens as dt, dashboardTones } from "../_tokens";
import { tk } from "@/i18n/marker";

const STATUS_STYLES: Record<
  string,
  { tone: typeof dashboardTones[keyof typeof dashboardTones]; label: string }
> = {
  "Pending Assignment": { tone: dashboardTones.danger, label: tk("pages.Maintenance.unassigned") },
  "In Repair":          { tone: dashboardTones.warning, label: tk("maintenance.inRepair") },
  "Partially Resolved": { tone: dashboardTones.info, label: tk("invoices.partial") },
};

const MaintenanceQueueWidget: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useMaintenanceQueue();

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 1.75, sm: 2 },
          py: 1.25,
          borderBottom: `1px solid ${dt.color.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "8px",
              bgcolor: dashboardTones.info.soft,
              color: dashboardTones.info.strong,
              border: `1px solid ${dashboardTones.info.strong}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BuildIcon sx={{ fontSize: 14 }} />
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: dt.color.foreground,
              fontSize: "0.72rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {t("dashboard.widgets.maintenanceQueue", "Maintenance Queue")}
          </Typography>
        </Box>
        {data && (
          <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
            {data.pendingCount > 0 && (
              <Chip
                label={`${data.pendingCount} ${t("dashboard.widgets.unassigned", "unassigned")}`}
                size="small"
                sx={{
                  bgcolor: dashboardTones.danger.soft,
                  color: dashboardTones.danger.on,
                  fontWeight: 800,
                  height: 20,
                  fontSize: "0.65rem",
                  border: 0,
                }}
              />
            )}
            <Chip
              label={`${data.total} ${t("dashboard.widgets.open", "open")}`}
              size="small"
              sx={{
                bgcolor: dashboardTones.slate.soft,
                color: dashboardTones.slate.on,
                fontWeight: 700,
                height: 20,
                fontSize: "0.65rem",
                border: 0,
              }}
            />
          </Box>
        )}
      </Box>

      {/* List */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          p: { xs: 1, sm: 1.25 },
          "&::-webkit-scrollbar": { width: 5 },
          "&::-webkit-scrollbar-thumb": {
            background: dt.color.border,
            borderRadius: 99,
          },
          "&::-webkit-scrollbar-thumb:hover": { background: dt.color.borderStrong },
        }}
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={58} sx={{ borderRadius: dt.radius.md, mb: 1 }} />
          ))
        ) : !data?.items || data.items.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 0.75,
              py: 4,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                bgcolor: dashboardTones.accent.soft,
                color: dashboardTones.accent.strong,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircleOutlineIcon sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="body2" sx={{ color: dt.color.foreground, fontWeight: 700, fontSize: "0.82rem" }}>
              {t("dashboard.MaintenanceQueueWidget.queueIsClear")}
            </Typography>
            <Typography variant="caption" sx={{ color: dt.color.foregroundFaint, fontSize: "0.72rem" }}>
              {t("dashboard.widgets.noMaintenance", "No equipment under repair")}
            </Typography>
          </Box>
        ) : (
          data.items.map((item: MaintenanceItem) => {
            const style = STATUS_STYLES[item.repair_status] ?? STATUS_STYLES["In Repair"];
            const techName = item.tech_first_name
              ? `${item.tech_first_name} ${item.tech_last_name}`
              : null;

            return (
              <Box
                key={item.log_id}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 1.25,
                  px: 1.5,
                  py: 1.25,
                  mb: 0.75,
                  borderRadius: dt.radius.md,
                  border: `1px solid ${dt.color.border}`,
                  borderLeft: `3px solid ${style.tone.strong}`,
                  bgcolor: dt.color.surface,
                  transition: dt.motion.fast,
                  "&:hover": {
                    bgcolor: dt.color.surfaceMuted,
                    borderColor: dt.color.borderStrong,
                  },
                }}
              >
                <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: dt.color.foreground,
                        fontSize: "0.8rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                      }}
                    >
                      {item.equipment_name}
                    </Typography>
                    <Chip
                      label={t(style.label)}
                      size="small"
                      sx={{
                        bgcolor: style.tone.soft,
                        color: style.tone.on,
                        fontWeight: 800,
                        height: 19,
                        fontSize: "0.65rem",
                        border: `1px solid ${style.tone.strong}20`,
                      }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: dt.color.foregroundMuted,
                      fontSize: "0.72rem",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.category_name} · {t("dashboard.MaintenanceQueueWidget.unitsPending", { count: item.pending_quantity })}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.35 }}>
                      <ScheduleIcon sx={{ fontSize: 12, color: dt.color.foregroundFaint }} />
                      <Typography variant="caption" sx={{ color: dt.color.foregroundFaint, fontSize: "0.68rem" }}>
                        {dayjs(item.reported_date).format("D MMM")}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.35 }}>
                      <PersonOutlinedIcon sx={{ fontSize: 12, color: dt.color.foregroundFaint }} />
                      <Typography
                        variant="caption"
                        sx={{
                          color: techName ? dt.color.foregroundMuted : dashboardTones.danger.strong,
                          fontWeight: techName ? 500 : 700,
                          fontSize: "0.68rem",
                        }}
                      >
                        {techName || t("pages.Maintenance.unassigned")}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default MaintenanceQueueWidget;
