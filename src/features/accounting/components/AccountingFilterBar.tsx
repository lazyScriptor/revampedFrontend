import { Box, TextField, MenuItem, Button, Chip, InputAdornment, IconButton, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import TodayIcon from "@mui/icons-material/Today";
import dayjs from "dayjs";
import type { AccountingFilters } from "../hooks/useAccountingFilters";

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

const DATE_PRESETS = [
  { label: "Today", from: dayjs().format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") },
  { label: "This Week", from: dayjs().startOf("week").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") },
  { label: "This Month", from: dayjs().startOf("month").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") },
  { label: "Last 30 Days", from: dayjs().subtract(30, "day").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") },
  { label: "Last 90 Days", from: dayjs().subtract(90, "day").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") },
  { label: "This Year", from: dayjs().startOf("year").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") },
  { label: "All Time", from: "", to: "" },
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
            placeholder="Search..."
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
              label="From"
              value={filters.dateFrom}
              onChange={(e) => onUpdate("dateFrom", e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 155, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
            />
            <TextField
              type="date"
              size="small"
              label="To"
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
            label="Status"
            value={filters.status.length === 1 ? filters.status[0] : ""}
            onChange={(e) =>
              onUpdate("status", e.target.value ? [e.target.value] : [])
            }
            sx={{ width: 150, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {statusOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        )}

        {category && categoryOptions.length > 0 && (
          <TextField
            select
            size="small"
            label="Category"
            value={filters.category}
            onChange={(e) => onUpdate("category", e.target.value)}
            sx={{ width: 150, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categoryOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        )}

        {method && methodOptions.length > 0 && (
          <TextField
            select
            size="small"
            label="Method"
            value={filters.method}
            onChange={(e) => onUpdate("method", e.target.value)}
            sx={{ width: 150, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
          >
            <MenuItem value="">All Methods</MenuItem>
            {methodOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        )}

        {type && (
          <TextField
            select
            size="small"
            label="Type"
            value={filters.type}
            onChange={(e) => onUpdate("type", e.target.value)}
            sx={{ width: 140, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="income">Income Only</MenuItem>
            <MenuItem value="expense">Expenses Only</MenuItem>
          </TextField>
        )}

        {amountRange && (
          <>
            <TextField
              size="small"
              label="Min Amount"
              type="number"
              value={filters.minAmount}
              onChange={(e) => onUpdate("minAmount", e.target.value)}
              sx={{ width: 120, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
            />
            <TextField
              size="small"
              label="Max Amount"
              type="number"
              value={filters.maxAmount}
              onChange={(e) => onUpdate("maxAmount", e.target.value)}
              sx={{ width: 120, "& .MuiInputBase-input": { fontSize: "0.8rem", py: 0.8 } }}
            />
          </>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Reset Filters">
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
                label={preset.label}
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
