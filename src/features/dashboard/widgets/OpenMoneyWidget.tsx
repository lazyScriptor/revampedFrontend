import React, { useMemo, useState } from "react";
import { Box, Button, Chip, Tooltip, Typography } from "@mui/material";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
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
import { AgingBar } from "./openInvoices/AgingBar";
import { OpenInvoiceRowItem } from "./openInvoices/OpenInvoiceRow";
import { OpenInvoiceQuickModal } from "./openInvoices/OpenInvoiceQuickModal";

const OpenMoneyWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [olderThanDays, setOlderThanDays] = useState<OpenInvoiceAgeDays>(7);
  const [selectedInvoice, setSelectedInvoice] = useState<OpenInvoiceRow | null>(null);

  const { data, isLoading, isError, refetch } = useOpenInvoices("money", olderThanDays);

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

  const emptyMessage = (() => {
    switch (olderThanDays) {
      case 0:
        return t("dashboard.openInvoices.emptyMoneyAll", "Nothing owed across open invoices 🎉");
      case 7:
        return t("dashboard.openInvoices.emptyMoney7", "Nothing owed older than 1 week 🎉");
      case 14:
        return t("dashboard.openInvoices.emptyMoney14", "Nothing owed older than 2 weeks 🎉");
      case 30:
        return t("dashboard.openInvoices.emptyMoney30", "Nothing owed older than 1 month 🎉");
      case 90:
        return t("dashboard.openInvoices.emptyMoney90", "Nothing owed older than 3 months 🎉");
    }
  })();

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
              bgcolor: dashboardTones.danger.soft,
              color: dashboardTones.danger.strong,
              border: `1px solid ${dashboardTones.danger.strong}25`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MonetizationOnOutlinedIcon sx={{ fontSize: 16 }} />
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
                {t("dashboard.openInvoices.moneyTitle", "Money owed")}
              </Typography>
              <Tooltip
                title={t(
                  "dashboard.openInvoices.moneyTooltip",
                  "Open invoices (Active & Pending Payment). Completed invoices with a balance are not shown, matching Receivables.",
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
                  color: dashboardTones.danger.strong,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.15,
                  fontSize: "1rem",
                }}
              >
                Rs. {data.summary.money.owed.toLocaleString()}
              </Typography>
            )}
          </Box>
        </Box>

        {data && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexWrap: "wrap" }}>
            <Chip
              size="small"
              label={t("dashboard.openInvoices.invoiceCount", {
                count: data.summary.money.count,
                defaultValue: `${data.summary.money.count} invoices`,
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
            {data.summary.money.owedWithItemsOut > 0 && (
              <Chip
                size="small"
                label={t("dashboard.openInvoices.withItemsOutAmount", {
                  amount: data.summary.money.owedWithItemsOut.toLocaleString(),
                  defaultValue: `Rs. ${data.summary.money.owedWithItemsOut.toLocaleString()} with items out`,
                })}
                sx={{
                  height: 20,
                  fontSize: "0.66rem",
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  bgcolor: dashboardTones.warning.soft,
                  color: dashboardTones.warning.on,
                }}
              />
            )}
          </Box>
        )}
      </Box>

      {/* Age Filter Chips */}
      <AgeFilterChips value={olderThanDays} onChange={setOlderThanDays} />

      {/* Stacked Aging Bar */}
      {data && (
        <AgingBar
          buckets={data.buckets}
          activeAgeFilter={olderThanDays}
          onSelectBucket={setOlderThanDays}
        />
      )}

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
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          data.rows.map((row) => (
            <OpenInvoiceRowItem
              key={row.invoice_id}
              row={row}
              view="money"
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
          onClick={() => navigate({ to: "/accounting", search: { tab: "receivables" } as any })}
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

export default OpenMoneyWidget;
