import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { useTranslation } from "react-i18next";
import { useDashboardMoney } from "@/features/accounting/utils/currency";
import { dashboardTones } from "../../_tokens";

interface PaymentReturnIconsProps {
  isUnpaid: boolean;
  hasItemsOut: boolean;
  unitsOut: number;
  owed: number;
}

export const PaymentReturnIcons: React.FC<PaymentReturnIconsProps> = ({
  isUnpaid,
  hasItemsOut,
  unitsOut,
  owed,
}) => {
  const { t } = useTranslation();
  const money = useDashboardMoney();

  const moneyTooltip = isUnpaid
    ? t("dashboard.openInvoices.statusUnpaid", {
        amount: money.full(owed),
        defaultValue: `Unpaid: ${money.full(owed)}`,
      })
    : t("dashboard.openInvoices.statusPaid", "Fully paid");

  const itemsTooltip = hasItemsOut
    ? t("dashboard.openInvoices.statusItemsOut", {
        count: unitsOut,
        defaultValue: `${unitsOut} unit(s) still out`,
      })
    : t("dashboard.openInvoices.statusAllBack", "All items returned");

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
      <Tooltip title={moneyTooltip}>
        <Box
          aria-label={moneyTooltip}
          data-status={isUnpaid ? "unpaid" : "paid"}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: "6px",
            bgcolor: isUnpaid ? dashboardTones.danger.soft : dashboardTones.accent.soft,
            color: isUnpaid ? dashboardTones.danger.on : dashboardTones.accent.on,
            border: `1px solid ${isUnpaid ? dashboardTones.danger.strong : dashboardTones.accent.strong}33`,
          }}
        >
          <MonetizationOnOutlinedIcon sx={{ fontSize: 15 }} />
        </Box>
      </Tooltip>

      <Tooltip title={itemsTooltip}>
        <Box
          aria-label={itemsTooltip}
          data-status={hasItemsOut ? "out" : "returned"}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.35,
            minWidth: 24,
            height: 24,
            px: hasItemsOut ? 0.65 : 0,
            borderRadius: "6px",
            bgcolor: hasItemsOut ? dashboardTones.warning.soft : dashboardTones.accent.soft,
            color: hasItemsOut ? dashboardTones.warning.on : dashboardTones.accent.on,
            border: `1px solid ${hasItemsOut ? dashboardTones.warning.strong : dashboardTones.accent.strong}33`,
          }}
        >
          <Inventory2OutlinedIcon sx={{ fontSize: 14 }} />
          {hasItemsOut && (
            <Typography
              component="span"
              sx={{
                fontSize: "0.68rem",
                fontWeight: 800,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {unitsOut}
            </Typography>
          )}
        </Box>
      </Tooltip>
    </Box>
  );
};
