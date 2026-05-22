import React from "react";
import { Box, Typography, Skeleton, Chip, Link, Stack, Tooltip } from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import ReceiptIcon from "@mui/icons-material/Receipt";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import { useReturnsDueToday } from "@/features/dashboard/hooks/useDashboardHooks";
import type { ReturnItem } from "@/features/dashboard/types";
import dayjs from "dayjs";
import { dashboardTokens as t, dashboardTones } from "../_tokens";

const StatusChip: React.FC<{ days: number }> = ({ days }) => {
  if (days <= 0)
    return (
      <Chip
        label="Due Today"
        size="small"
        sx={{
          bgcolor: dashboardTones.warning.soft,
          color: dashboardTones.warning.on,
          fontWeight: 800,
          height: 18,
          fontSize: 10,
          border: 0,
        }}
      />
    );
  return (
    <Chip
      label={`${days}d overdue`}
      size="small"
      sx={{
        bgcolor: dashboardTones.danger.soft,
        color: dashboardTones.danger.on,
        fontWeight: 800,
        height: 18,
        fontSize: 10,
        border: 0,
      }}
    />
  );
};

const ActionableReturnsTable: React.FC = () => {
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
          px: 2,
          py: 1.25,
          borderBottom: `1px solid ${t.color.border}`,
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
              width: 26,
              height: 26,
              borderRadius: t.radius.md,
              bgcolor: dashboardTones.warning.soft,
              color: dashboardTones.warning.strong,
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
              color: t.color.foreground,
              fontSize: "0.72rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Returns Due
          </Typography>
        </Box>
        {data && (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {data.overdueCount > 0 && (
              <Chip
                label={`${data.overdueCount} overdue`}
                size="small"
                sx={{
                  bgcolor: dashboardTones.danger.soft,
                  color: dashboardTones.danger.on,
                  fontWeight: 800,
                  height: 20,
                  fontSize: 10,
                  border: 0,
                }}
              />
            )}
            <Chip
              label={`${data.total} total`}
              size="small"
              sx={{
                bgcolor: dashboardTones.slate.soft,
                color: dashboardTones.slate.on,
                fontWeight: 700,
                height: 20,
                fontSize: 10,
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
          p: 1,
          // Slim scrollbar
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": {
            background: t.color.border,
            borderRadius: 99,
          },
          "&::-webkit-scrollbar-thumb:hover": { background: t.color.borderStrong },
        }}
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: t.radius.md, mb: 0.75 }} />
          ))
        ) : data?.items.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 0.5,
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
            <Typography variant="body2" sx={{ color: t.color.foreground, fontWeight: 700 }}>
              All clear
            </Typography>
            <Typography variant="caption" sx={{ color: t.color.foregroundFaint }}>
              No returns due today
            </Typography>
          </Box>
        ) : (
          data?.items.map((item: ReturnItem) => {
            const overdue = parseInt(item.days_overdue as unknown as string) > 0;
            return (
              <Box
                key={item.line_id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  px: 1.25,
                  py: 1,
                  mb: 0.5,
                  borderRadius: t.radius.md,
                  borderLeft: `3px solid ${overdue ? dashboardTones.danger.strong : dashboardTones.warning.strong}`,
                  bgcolor: overdue ? `${dashboardTones.danger.soft}66` : t.color.surface,
                  transition: `background-color ${t.motion.fast}`,
                  "&:hover": {
                    bgcolor: t.color.surfaceMuted,
                  },
                }}
              >
                <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: t.color.foreground,
                        fontSize: "0.78rem",
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
                      color: t.color.foregroundMuted,
                      fontSize: "0.72rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.equipment_name} · qty {item.borrow_quantity}
                  </Typography>
                  <Typography variant="caption" sx={{ color: t.color.foregroundFaint, fontSize: "0.68rem" }}>
                    Expected {dayjs(item.expected_return_date).format("D MMM YYYY")}
                  </Typography>
                </Stack>

                <Box sx={{ display: "flex", gap: 0.25, flexShrink: 0 }}>
                  <Tooltip title="Open invoice">
                    <Link href={`/invoices?id=${item.invoice_id}`} underline="none">
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 30,
                          height: 30,
                          borderRadius: t.radius.sm,
                          color: dashboardTones.primary.strong,
                          transition: `background-color ${t.motion.fast}, color ${t.motion.fast}`,
                          "&:hover": {
                            bgcolor: dashboardTones.primary.soft,
                            color: dashboardTones.primary.on,
                          },
                          cursor: "pointer",
                        }}
                      >
                        <ReceiptIcon sx={{ fontSize: 16 }} />
                      </Box>
                    </Link>
                  </Tooltip>
                  <Tooltip title={item.phone_number}>
                    <Link href={`tel:${item.phone_number}`} underline="none">
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 30,
                          height: 30,
                          borderRadius: t.radius.sm,
                          color: dashboardTones.accent.strong,
                          transition: `background-color ${t.motion.fast}, color ${t.motion.fast}`,
                          "&:hover": {
                            bgcolor: dashboardTones.accent.soft,
                            color: dashboardTones.accent.on,
                          },
                          cursor: "pointer",
                        }}
                      >
                        <PhoneIcon sx={{ fontSize: 16 }} />
                      </Box>
                    </Link>
                  </Tooltip>
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
