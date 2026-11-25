import React from "react";
import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import type { OpenInvoiceRow, OpenInvoicesView } from "@/features/dashboard/types";
import { WhatsAppButton } from "@/features/whatsapp/components/WhatsAppButton";
import { suggestedTemplateForOpenInvoice } from "@/features/whatsapp/lib/whatsapp";
import { LastCallLine } from "@/features/collections/components/LastCallLine";
import { RowCallControls } from "@/features/collections/components/RowCallControls";
import { dashboardTokens as dt, dashboardTones } from "../../_tokens";
import { PaymentReturnIcons } from "./PaymentReturnIcons";
import { useDashboardMoney } from "@/features/accounting/utils/currency";

interface OpenInvoiceRowProps {
  row: OpenInvoiceRow;
  view: OpenInvoicesView;
  onRowClick: (invoiceId: number) => void;
}

const formatItemsOutSummary = (
  items: { name: string; qty: number }[],
  moreLabel: (n: number) => string,
) => {
  if (!items || items.length === 0) return "";
  const shown = items.slice(0, 2).map((it) => `${it.name} × ${it.qty}`);
  const extra = items.length - 2;
  return extra > 0 ? `${shown.join(", ")} ${moreLabel(extra)}` : shown.join(", ");
};

export const OpenInvoiceRowItem: React.FC<OpenInvoiceRowProps> = ({
  row,
  view,
  onRowClick,
}) => {
  const { t } = useTranslation();
  const money = useDashboardMoney();
  const isHighRisk = row.is_unpaid && row.has_items_out;
  const isOverdue = row.days_overdue > 0;
  const hasPhone = Boolean(row.customer.phone_number);

  const templateKey = suggestedTemplateForOpenInvoice({
    hasItemsOut: row.has_items_out,
    daysOverdue: row.days_overdue,
    isUnpaid: row.is_unpaid,
  });

  const borderTone =
    view === "returns"
      ? isOverdue
        ? dashboardTones.danger.strong
        : dashboardTones.warning.strong
      : isHighRisk
        ? dashboardTones.danger.strong
        : dashboardTones.warning.strong;

  const itemsSummary = formatItemsOutSummary(row.items_out, (n) =>
    t("dashboard.openInvoices.moreItems", { count: n, defaultValue: `+${n} more` }),
  );

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onRowClick(row.invoice_id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRowClick(row.invoice_id);
        }
      }}
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: 1,
        px: 1.25,
        py: 1,
        mb: 0.75,
        borderRadius: dt.radius.md,
        border: "1px solid",
        borderColor: isHighRisk || isOverdue ? `${dashboardTones.danger.strong}33` : "divider",
        borderLeft: `3px solid ${borderTone}`,
        bgcolor: "background.paper",
        cursor: "pointer",
        transition: dt.motion.fast,
        "&:hover": {
          bgcolor: "action.hover",
          borderColor: borderTone,
        },
      }}
    >
      {/* Left: Customer, invoice chip, and context line */}
      <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.65, flexWrap: "wrap", minWidth: 0 }}>
          <Chip
            size="small"
            label={`INV-${row.invoice_id}`}
            sx={{
              height: 19,
              fontSize: "0.65rem",
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: "tabular-nums",
              bgcolor: dashboardTones.slate.soft,
              color: dashboardTones.slate.on,
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              fontSize: "0.8rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {row.customer.name || t("invoices.ReadOnlyInvoiceModal.customer", "Customer")}
          </Typography>
          {isHighRisk && (
            <Chip
              size="small"
              label={t("dashboard.openInvoices.owesAndOut", "Owes + items out")}
              sx={{
                height: 18,
                fontSize: "0.62rem",
                fontWeight: 800,
                bgcolor: dashboardTones.danger.soft,
                color: dashboardTones.danger.on,
              }}
            />
          )}
        </Box>

        {view === "money" ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.7rem",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {t("dashboard.openInvoices.daysAge", {
                count: row.age_days,
                defaultValue: `${row.age_days} days`,
              })}
              {row.customer.phone_number ? ` · ${row.customer.phone_number}` : ""}
            </Typography>
            {row.accrued_charges > 0 && (
              <Typography
                variant="caption"
                sx={{
                  color: dashboardTones.warning.strong,
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {t("dashboard.openInvoices.chargesSoFar", {
                  amount: money.full(row.accrued_charges),
                  defaultValue: `+ ${money.full(row.accrued_charges)} charges so far`,
                })}
              </Typography>
            )}
          </Box>
        ) : (
          <Stack spacing={0.2}>
            {itemsSummary && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {itemsSummary}
              </Typography>
            )}
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.68rem",
                fontWeight: isOverdue ? 800 : 500,
                color: isOverdue ? dashboardTones.danger.strong : "text.secondary",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.open_ended
                ? t("dashboard.openInvoices.openEnded", "Open-ended")
                : isOverdue
                ? t("dashboard.openInvoices.daysOverdueLabel", {
                    count: row.days_overdue,
                    defaultValue: `${row.days_overdue} days overdue`,
                  })
                : row.earliest_due_date
                  ? t("dashboard.openInvoices.dueDateLabel", {
                      date: dayjs(row.earliest_due_date).format("D MMM"),
                      defaultValue: `due ${dayjs(row.earliest_due_date).format("D MMM")}`,
                    })
                  : t("dashboard.openInvoices.openEnded", "Open-ended")}
            </Typography>
          </Stack>
        )}
        {/* Last call line */}
        <LastCallLine lastCall={row.last_call} />
      </Stack>

      {/* Right: Amount / Status icons / Action buttons */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: { xs: "space-between", sm: "flex-end" },
          gap: 0.75,
          flexShrink: 0,
        }}
      >
        {view === "money" && (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 800,
              color: dashboardTones.danger.strong,
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: "tabular-nums",
              fontSize: "0.8rem",
              whiteSpace: "nowrap",
            }}
          >
            {money.full(row.owed)}
          </Typography>
        )}

        <PaymentReturnIcons
          isUnpaid={row.is_unpaid}
          hasItemsOut={row.has_items_out}
          unitsOut={row.units_out}
          owed={row.owed}
        />

        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}
        >
          {hasPhone ? (
            <WhatsAppButton
              variant="icon"
              size="small"
              invoiceId={row.invoice_id}
              templateKey={templateKey}
            />
          ) : (
            <Tooltip title={t("dashboard.openInvoices.noPhoneTooltip", "No phone number on file")}>
              <span>
                <WhatsAppButton
                  variant="icon"
                  size="small"
                  invoiceId={row.invoice_id}
                  templateKey={templateKey}
                  disabled
                />
              </span>
            </Tooltip>
          )}

          <RowCallControls
            customerId={row.customer.customer_id}
            customerName={row.customer.name || t("invoices.ReadOnlyInvoiceModal.customer", "Customer")}
            phone={row.customer.phone_number}
            invoiceIds={[row.invoice_id]}
            lastCall={row.last_call}
          />
        </Box>
      </Box>
    </Box>
  );
};
