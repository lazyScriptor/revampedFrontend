import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, Button, Chip, Dialog, DialogContent, IconButton, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import OpenInFullOutlinedIcon from "@mui/icons-material/OpenInFullOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate } from "@tanstack/react-router";
import { useReturnsDueToday } from "@/features/dashboard/hooks/useDashboardHooks";
import type { ReturnItem } from "@/features/dashboard/types";
import type { CallFilterKey } from "@/features/collections/types";
import { CallFilterChips } from "@/features/collections/components/CallFilterChips";
import { LastCallLine } from "@/features/collections/components/LastCallLine";
import { RowCallControls } from "@/features/collections/components/RowCallControls";
import { VirtualizedList } from "@/features/dashboard/components/VirtualizedList";
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
  const [callFilter, setCallFilter] = useState<CallFilterKey | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useReturnsDueToday(callFilter);

  const customerName = (r: ReturnItem) =>
    r.customer_type === "Business" && r.company_name
      ? r.company_name
      : `${r.first_name} ${r.last_name}`;

  const renderCardBody = (inOverlay = false) => (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
          {data && (
            <>
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
            </>
          )}
          <IconButton
            size="small"
            onClick={() => setExpanded(!inOverlay)}
            aria-label={inOverlay ? t("common.close", "Close") : t("dashboard.openInvoices.expand", "Expand")}
            sx={{ width: 28, height: 28 }}
          >
            {inOverlay ? <CloseIcon fontSize="small" /> : <OpenInFullOutlinedIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Box>
      </Box>

      {/* Call Filter Chips */}
      <CallFilterChips value={callFilter} onChange={setCallFilter} counts={data?.callCounts} />

      {/* List */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
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
          <VirtualizedList
            items={data.items}
            estimatedItemHeight={86}
            getKey={(item) => item.line_id}
            renderItem={(item: ReturnItem) => {
              const overdue = parseInt(item.days_overdue as unknown as string) > 0;
              return (
                <Box
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
                    <Typography variant="caption" sx={{ color: dt.color.foregroundFaint, fontSize: "0.68rem", fontVariantNumeric: "tabular-nums" }}>
                      {t("dashboard.ActionableReturnsTable.expected", { value: dayjs(item.expected_return_date).format("D MMM YYYY") })}
                    </Typography>
                    <LastCallLine lastCall={item.last_call} />
                  </Stack>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
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

                    <RowCallControls
                      customerId={item.customer_id ?? 0}
                      customerName={customerName(item)}
                      phone={item.phone_number}
                      invoiceIds={[item.invoice_id]}
                      lastCall={item.last_call}
                    />
                  </Box>
                </Box>
              );
            }}
          />
        )}
      </Box>

      {/* Footer See All */}
      <Box
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 0.75,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          flexShrink: 0,
        }}
      >
        <Button
          size="small"
          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
          onClick={() =>
            navigate({
              to: "/reports/customers/collections",
              search: { not_returned: "1", date_basis: "due_date" } as any,
            })
          }
          sx={{
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.74rem",
            color: dashboardTones.primary.on,
            py: 0.25,
          }}
        >
          {t("dashboard.openInvoices.seeAll", "See all")}
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      {renderCardBody(false)}
      <Dialog fullScreen open={expanded} onClose={() => setExpanded(false)}>
        <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
          {renderCardBody(true)}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActionableReturnsTable;
