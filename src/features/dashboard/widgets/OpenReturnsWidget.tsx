import React, { useMemo, useState } from "react";
import { Box, Button, Chip, Tooltip, Typography } from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useOpenInvoices } from "@/features/dashboard/hooks/useDashboardHooks";
import type { OpenInvoiceAgeDays, OpenInvoiceRow } from "@/features/dashboard/types";
import { SkeletonListRows } from "@/components/ui/loading";
import { suggestedTemplateForOpenInvoice } from "@/features/whatsapp/lib/whatsapp";
import { dashboardTones } from "../_tokens";
import { AgeFilterChips } from "./openInvoices/AgeFilterChips";
import { OpenInvoiceRowItem } from "./openInvoices/OpenInvoiceRow";
import { OpenInvoiceQuickModal } from "./openInvoices/OpenInvoiceQuickModal";

const OpenReturnsWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [olderThanDays, setOlderThanDays] = useState<OpenInvoiceAgeDays>(7);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OpenInvoiceRow | null>(null);

  const { data, isLoading, isError, refetch } = useOpenInvoices("returns", olderThanDays, onlyOverdue);

  const selectedTemplate = useMemo(
    () =>
      selectedInvoice
        ? suggestedTemplateForOpenInvoice({
            hasItemsOut: selectedInvoice.has_items_out,
            daysOverdue: selectedInvoice.days_overdue,
            isUnpaid: selectedInvoice.is_unpaid,
          })
        : undefined,
    [selectedInvoice],
  );

  return (
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
          px: { xs: 1.5, sm: 2 },
          py: 1.15,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.9, minWidth: 0 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "8px",
              bgcolor: dashboardTones.warning.soft,
              color: dashboardTones.warning.strong,
              border: `1px solid ${dashboardTones.warning.strong}25`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Inventory2OutlinedIcon sx={{ fontSize: 16 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "text.primary",
                  fontSize: "0.72rem",
                  whiteSpace: "nowrap",
                }}
              >
                {t("dashboard.openInvoices.returnsTitle", "Equipment not returned")}
              </Typography>
              <Tooltip
                title={t(
                  "dashboard.openInvoices.returnsTooltip",
                  "Open invoices with units still out. Open-ended lines (track overdue off) count as out but never as overdue.",
                )}
              >
                <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary", cursor: "help" }} />
              </Tooltip>
            </Box>
            {data && (
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 900,
                  color: dashboardTones.warning.strong,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.15,
                  fontSize: "1rem",
                }}
              >
                {t("dashboard.openInvoices.unitsOutCount", {
                  count: data.summary.returns.unitsOut,
                  defaultValue: `${data.summary.returns.unitsOut} units out`,
                })}
              </Typography>
            )}
          </Box>
        </Box>

        {data && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexWrap: "wrap" }}>
            <Chip
              size="small"
              label={t("dashboard.openInvoices.invoiceCount", {
                count: data.summary.returns.count,
                defaultValue: `${data.summary.returns.count} invoices`,
              })}
              sx={{
                height: 20,
                fontSize: "0.66rem",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                bgcolor: dashboardTones.slate.soft,
                color: dashboardTones.slate.on,
              }}
            />
            {data.summary.returns.overdueCount > 0 && (
              <Chip
                size="small"
                label={t("dashboard.openInvoices.overdueCountChip", {
                  count: data.summary.returns.overdueCount,
                  defaultValue: `${data.summary.returns.overdueCount} overdue`,
                })}
                sx={{
                  height: 20,
                  fontSize: "0.66rem",
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  bgcolor: dashboardTones.danger.soft,
                  color: dashboardTones.danger.on,
                }}
              />
            )}
          </Box>
        )}
      </Box>

      {/* Age Filter Chips + Only Overdue Toggle */}
      <AgeFilterChips
        value={olderThanDays}
        onChange={setOlderThanDays}
        showOnlyOverdueToggle
        onlyOverdue={onlyOverdue}
        onOnlyOverdueChange={setOnlyOverdue}
      />

      {/* List Body */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          p: { xs: 1, sm: 1.25 },
          "&::-webkit-scrollbar": { width: 5 },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(148, 163, 184, 0.35)",
            borderRadius: 99,
          },
        }}
      >
        {isLoading && !data ? (
          <SkeletonListRows rows={4} avatar={false} />
        ) : isError ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 1,
              py: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t("dashboard.openInvoices.loadError", "Could not load open invoices.")}
            </Typography>
            <Button size="small" variant="outlined" onClick={() => refetch()} sx={{ textTransform: "none" }}>
              {t("common.retry", "Retry")}
            </Button>
          </Box>
        ) : !data?.rows || data.rows.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 0.75,
              py: 3,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: dashboardTones.accent.soft,
                color: dashboardTones.accent.strong,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircleOutlinedIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 700, fontSize: "0.82rem", textAlign: "center" }}>
              {onlyOverdue
                ? t("dashboard.openInvoices.emptyReturnsOverdue", "No overdue returns 🎉")
                : t("dashboard.openInvoices.emptyReturnsAll", "All equipment is back")}
            </Typography>
          </Box>
        ) : (
          data.rows.map((row) => (
            <OpenInvoiceRowItem
              key={row.invoice_id}
              row={row}
              view="returns"
              onRowClick={() => setSelectedInvoice(row)}
            />
          ))
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
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {data && data.totalCount > data.rows.length
            ? t("dashboard.openInvoices.showingOf", {
                shown: data.rows.length,
                total: data.totalCount,
                defaultValue: `Showing ${data.rows.length} of ${data.totalCount}`,
              })
            : ""}
        </Typography>
        <Button
          size="small"
          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
          onClick={() => navigate({ to: "/rental-history" })}
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

      <OpenInvoiceQuickModal
        invoiceId={selectedInvoice?.invoice_id ?? null}
        whatsAppTemplate={selectedTemplate}
        onClose={() => setSelectedInvoice(null)}
      />
    </Box>
  );
};

export default OpenReturnsWidget;
