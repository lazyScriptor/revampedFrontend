import { Box, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { StockStatus } from "../api/stock.types";
import { tk } from "@/i18n/marker";

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  in_stock: tk("retail.stock.statusInStock"),
  low: tk("retail.stock.statusLow"),
  out: tk("retail.stock.statusOut"),
  not_counted: tk("retail.stock.statusNotCounted"),
  untracked: tk("retail.stock.statusUntracked"),
};

const DOT_COLOR: Record<StockStatus, string> = {
  in_stock: "success.main",
  low: "warning.main",
  out: "error.main",
  not_counted: "text.disabled",
  untracked: "text.disabled",
};

interface Props {
  status: StockStatus;
  size?: number;
  tooltip?: string;
}

/** Semantic status dot using MUI theme tokens only (green in stock, amber low, red out, grey not counted). */
export function StockDot({ status, size = 8, tooltip }: Props) {
  const { t } = useTranslation();
  const label = tooltip ?? t(STOCK_STATUS_LABEL[status]);
  const dot = (
    <Box
      component="span"
      data-testid={`stock-dot-${status}`}
      aria-label={label}
      sx={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: DOT_COLOR[status],
        flexShrink: 0,
      }}
    />
  );
  return tooltip ? <Tooltip title={label}>{dot}</Tooltip> : dot;
}
