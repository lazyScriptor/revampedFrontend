import { Box, TextField, MenuItem, Button, Chip, InputAdornment, IconButton, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import TodayIcon from "@mui/icons-material/Today";
import dayjs from "dayjs";
import type { AccountingFilters } from "../hooks/useAccountingFilters";
import { useTranslation } from "react-i18next";
import { tk } from "@/i18n/marker";

interface FilterBarProps {
  filters: AccountingFilters;
  onUpdate: <K extends keyof AccountingFilters>(key: K, value: AccountingFilters[K]) => void;
  onUpdateMultiple: (updates: Partial<AccountingFilters>) => void;
  onReset: () => void;
  /** Which filter controls to show */
  show?: {
    search?: boolean;
    dateRange?: boolean;
    datePresets?: boolean;
    status?: boolean;
    category?: boolean;
    method?: boolean;
    amountRange?: boolean;
    type?: boolean; // journal income/expense toggle
  };
  statusOptions?: { value: string; label: string; color?: string }[];
  categoryOptions?: { value: string; label: string }[];
  methodOptions?: { value: string; label: string }[];
}

// Built per render (not at module load) so "Today/This month" stay correct if the tab is left open past midnight.
const buildDatePresets = () => [
  { label: tk("common.today"), from: dayjs().format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") },
  { label: tk("accounting.AccountingFilterBar.thisWeek"), from: dayjs().startOf("week").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") },
  { label: tk("accounting.thisMonth"), from: dayjs().startOf("month").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") },
  { label: tk("accounting.last30Days"), from: dayjs().subtract(30, "day").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") },
  { label: tk("accounting.last90Days"), from: dayjs().subtract(90, "day").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") },
  { label: tk("accounting.thisYear"), from: dayjs().startOf("year").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") },
  { label: tk("accounting.AccountingFilterBar.allTime"), from: "", to: "" },
];

export default function AccountingFilterBar({
  filters,
  onUpdate,
  onUpdateMultiple,
  onReset,
  show = {},
  statusOptions = [],
  categoryOptions = [],
  methodOptions = [],
}: FilterBarProps) {
  const { t } = useTranslation();
  const DATE_PRESETS = buildDatePresets();
  const {
    search = false,
    dateRange = true,
    datePresets = true,
    status = false,
    category = false,
    method = false,
    amountRange = false,
    type = false,
  } = show;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        p: 2,
        bgcolor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 2.5,
      }}
    >
      {/* Row 1: Search + Date Range */}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
        {search && (
          <TextField
            size="small"
            placeholder={t("accounting.AccountingFilterBar.search")}
            value={filters.search}
            onChange={(e) => onUpdate("search", e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: 220,
              "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 },
            }}
          />
        )}

        {dateRange && (
          <>
            <TextField
              type="date"
              size="small"
              label={t("common.dateFrom")}
              value={filters.dateFrom}
              onChange={(e) => onUpdate("dateFrom", e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 155, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
            />
            <TextField
              type="date"
              size="small"
              label={t("common.dateTo")}
              value={filters.dateTo}
              onChange={(e) => onUpdate("dateTo", e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 155, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
            />
          </>
        )}

        {status && statusOptions.length > 0 && (
          <TextField
            select
            size="small"
            label={t("common.status")}
            value={filters.status.length === 1 ? filters.status[0] : ""}
            onChange={(e) =>
              onUpdate("status", e.target.value ? [e.target.value] : [])
            }
            sx={{ width: 150, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
          >
            <MenuItem value="">{t("accounting.AccountingFilterBar.allStatuses")}</MenuItem>
            {statusOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {t(opt.label)}
              </MenuItem>
            ))}
          </TextField>
        )}

        {category && categoryOptions.length > 0 && (
          <TextField
            select
            size="small"
            label={t("common.category")}
            value={filters.category}
            onChange={(e) => onUpdate("category", e.target.value)}
            sx={{ width: 150, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
          >
            <MenuItem value="">{t("accounting.AccountingFilterBar.allCategories")}</MenuItem>
            {categoryOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {t(opt.label)}
              </MenuItem>
            ))}
          </TextField>
        )}

        {method && methodOptions.length > 0 && (
          <TextField
            select
            size="small"
            label={t("accounting.method")}
            value={filters.method}
            onChange={(e) => onUpdate("method", e.target.value)}
            sx={{ width: 150, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
          >
            <MenuItem value="">{t("accounting.AccountingFilterBar.allMethods")}</MenuItem>
            {methodOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {t(opt.label)}
              </MenuItem>
            ))}
          </TextField>
        )}

        {type && (
          <TextField
            select
            size="small"
            label={t("common.type")}
            value={filters.type}
            onChange={(e) => onUpdate("type", e.target.value)}
            sx={{ width: 140, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
          >
            <MenuItem value="">{t("common.all")}</MenuItem>
            <MenuItem value="income">{t("accounting.AccountingFilterBar.incomeOnly")}</MenuItem>
            <MenuItem value="refund">{t("accounting.AccountingFilterBar.refundsOnly")}</MenuItem>
            <MenuItem value="expense">{t("accounting.AccountingFilterBar.expensesOnly")}</MenuItem>
          </TextField>
        )}

        {amountRange && (
          <>
            <TextField
              size="small"
              label={t("accounting.AccountingFilterBar.minAmount")}
              type="number"
              value={filters.minAmount}
              onChange={(e) => onUpdate("minAmount", e.target.value)}
              sx={{ width: 120, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
            />
            <TextField
              size="small"
              label={t("accounting.AccountingFilterBar.maxAmount")}
              type="number"
              value={filters.maxAmount}
              onChange={(e) => onUpdate("maxAmount", e.target.value)}
              sx={{ width: 120, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
            />
          </>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title={t("accounting.AccountingFilterBar.resetFilters")}>
          <IconButton size="small" onClick={onReset} sx={{ color: "#64748b" }}>
            <ClearAllIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Row 2: Date presets */}
      {datePresets && dateRange && (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {DATE_PRESETS.map((preset) => {
            const isActive = filters.dateFrom === preset.from && filters.dateTo === preset.to;
            return (
              <Chip
                key={preset.label}
                label={t(preset.label)}
                size="small"
                variant={isActive ? "filled" : "outlined"}
                color={isActive ? "primary" : "default"}
                onClick={() =>
                  onUpdateMultiple({ dateFrom: preset.from, dateTo: preset.to })
                }
                icon={<TodayIcon sx={{ fontSize: "14px !important" }} />}
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  height: 26,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  "&:hover": { boxShadow: "0 1px 3px rgba(0,0,0,0.12)" },
                }}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}
