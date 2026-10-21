import React from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography, Skeleton, Chip, Stack, Tooltip } from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import { useNavigate } from "@tanstack/react-router";
import { useReturnsDueToday } from "@/features/dashboard/hooks/useDashboardHooks";
import type { ReturnItem } from "@/features/dashboard/types";
import dayjs from "dayjs";
import { dashboardTokens as dt, dashboardTones } from "../_tokens";

const StatusChip: React.FC<{ days: number }> = ({ days }) => {
  const { t } = useTranslation();
  if (days <= 0)
    return (
      <Chip
        label={t("common.today", "Today")}
        size="small"
        sx={{
          bgcolor: dashboardTones.warning.soft,
          color: dashboardTones.warning.on,
          fontWeight: 800,
          height: 19,
          fontSize: "0.65rem",
          border: `1px solid ${dashboardTones.warning.strong}20`,
        }}
      />
    );
  return (
    <Chip
      label={t("orders.daysOverdue", { count: days, defaultValue: `${days}d overdue` })}
      size="small"
      sx={{
        bgcolor: dashboardTones.danger.soft,
        color: dashboardTones.danger.on,
        fontWeight: 800,
        height: 19,
        fontSize: "0.65rem",
        border: `1px solid ${dashboardTones.danger.strong}20`,
      }}
    />
  );
};

const ActionableReturnsTable: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useReturnsDueToday();

  const customerName = (r: ReturnItem) =>
    r.customer_type === "Business" && r.company_name
      ? r.company_name
      : `${r.first_name} ${r.last_name}`;

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
              bgcolor: dashboardTones.warning.soft,
              color: dashboardTones.warning.strong,
              border: `1px solid ${dashboardTones.warning.strong}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <EventAvailableOutlinedIcon sx={{ fontSize: 16 }} />
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
            {t("dashboard.widgets.returnsDue", "Returns Due Today")}
          </Typography>
        </Box>
        {data && (
          <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
            {data.overdueCount > 0 && (
              <Chip
                label={`${data.overdueCount} ${t("dashboard.widgets.overdue", "overdue")}`}
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
              label={`${data.total} ${t("dashboard.widgets.total", "total")}`}
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
              <EventAvailableOutlinedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="body2" sx={{ color: dt.color.foreground, fontWeight: 700, fontSize: "0.82rem" }}>
              {t("dashboard.ActionableReturnsTable.allClear")}
            </Typography>
            <Typography variant="caption" sx={{ color: dt.color.foregroundFaint, fontSize: "0.72rem" }}>
              {t("dashboard.widgets.noReturns", "No returns due today")}
            </Typography>
          </Box>
        ) : (
          data.items.map((item: ReturnItem) => {
            const overdue = parseInt(item.days_overdue as unknown as string) > 0;
            return (
              <Box
                key={item.line_id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.25,
                  px: 1.5,
                  py: 1.25,
                  mb: 0.75,
                  borderRadius: dt.radius.md,
                  border: `1px solid ${overdue ? `${dashboardTones.danger.strong}33` : dt.color.border}`,
                  borderLeft: `3px solid ${overdue ? dashboardTones.danger.strong : dashboardTones.warning.strong}`,
                  bgcolor: overdue ? `${dashboardTones.danger.soft}33` : dt.color.surface,
                  transition: dt.motion.fast,
                  "&:hover": {
                    bgcolor: dt.color.surfaceMuted,
                    borderColor: overdue ? dashboardTones.danger.strong : dt.color.borderStrong,
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
                      {customerName(item)}
                    </Typography>
                    <StatusChip days={parseInt(item.days_overdue as unknown as string)} />
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
                    {t("dashboard.ActionableReturnsTable.qty", { equipment_name: item.equipment_name, borrow_quantity: item.borrow_quantity })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: dt.color.foregroundFaint, fontSize: "0.68rem" }}>
                    {t("dashboard.ActionableReturnsTable.expected", { value: dayjs(item.expected_return_date).format("D MMM YYYY") })}
                  </Typography>
                </Stack>

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                  <Tooltip title={t("dashboard.ActionableReturnsTable.viewInvoice")}>
                    <Box
                      onClick={() => navigate({ to: "/invoices", search: { id: item.invoice_id } as any })}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: { xs: 34, sm: 32 },
                        height: { xs: 34, sm: 32 },
                        borderRadius: dt.radius.sm,
                        border: `1px solid ${dt.color.border}`,
                        bgcolor: dt.color.surface,
                        color: dashboardTones.primary.strong,
                        cursor: "pointer",
                        transition: dt.motion.fast,
                        "&:hover": {
                          bgcolor: dashboardTones.primary.soft,
                          borderColor: dashboardTones.primary.strong,
                        },
                      }}
                    >
                      <ReceiptLongIcon sx={{ fontSize: 16 }} />
                    </Box>
                  </Tooltip>

                  {item.phone_number && (
                    <Tooltip title={t("dashboard.ActionableReturnsTable.call", { phone_number: item.phone_number })}>
                      <Box
                        component="a"
                        href={`tel:${item.phone_number}`}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: { xs: 34, sm: 32 },
                          height: { xs: 34, sm: 32 },
                          borderRadius: dt.radius.sm,
                          border: `1px solid ${dt.color.border}`,
                          bgcolor: dt.color.surface,
                          color: dashboardTones.accent.strong,
                          textDecoration: "none",
                          cursor: "pointer",
                          transition: dt.motion.fast,
                          "&:hover": {
                            bgcolor: dashboardTones.accent.soft,
                            borderColor: dashboardTones.accent.strong,
                          },
                        }}
                      >
                        <PhoneIcon sx={{ fontSize: 16 }} />
                      </Box>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default ActionableReturnsTable;
