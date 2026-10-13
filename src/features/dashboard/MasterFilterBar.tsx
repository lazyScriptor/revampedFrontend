import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Popover,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  StorefrontOutlined,
  CalendarMonthOutlined,
  Check,
} from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useWarehouseOptions } from "@/features/warehouses/hooks/useWarehouseOptions";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";
import { dashboardTokens as dt } from "./_tokens";

interface PresetRange {
  label: string;
  days: number;
}

const PRESETS: PresetRange[] = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

const MasterFilterBar: React.FC = () => {
  const { t } = useTranslation();
  const globalFilters = useDashboardStore((s) => s.globalFilters);
  const updateFilter = useDashboardStore((s) => s.updateFilter);
  const queryClient = useQueryClient();
  const { data: warehouseList = [] } = useWarehouseOptions();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customAnchorEl, setCustomAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Temporary custom dates in popover
  const [customStart, setCustomStart] = useState(globalFilters.startDate);
  const [customEnd, setCustomEnd] = useState(globalFilters.endDate);

  const today = todayLocalStr();

  // Determine active preset
  const activePreset = PRESETS.find((p) => {
    const expectedStart = addDaysLocal(today, -p.days);
    return globalFilters.startDate === expectedStart && globalFilters.endDate === today;
  });

  const isCustomActive = !activePreset;

  const handleSelectPreset = (days: number) => {
    const start = addDaysLocal(today, -days);
    updateFilter("startDate", start);
    updateFilter("endDate", today);
  };

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      updateFilter("startDate", customStart);
      updateFilter("endDate", customEnd);
    }
    setCustomAnchorEl(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["warehouse-options"] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: { xs: "flex-start", md: "flex-end" },
        gap: { xs: 1, sm: 1.25 },
        flexWrap: "nowrap",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-x",
        overscrollBehaviorX: "contain",
        maxWidth: "100%",
        width: "100%",
        py: 0.5,
        px: { xs: 0.25, md: 0 },
        // Smooth scroll styling
        "&::-webkit-scrollbar": {
          height: 3,
        },
        "&::-webkit-scrollbar-track": {
          background: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          background: dt.color.borderStrong,
          borderRadius: 99,
        },
      }}
    >
      {/* Depot / Warehouse Selector */}
      <FormControl size="small" sx={{ minWidth: { xs: 120, sm: 155 }, flexShrink: 0 }}>
        <Select
          value={globalFilters.warehouseId ? String(globalFilters.warehouseId) : "all"}
          onChange={(e) =>
            updateFilter(
              "warehouseId",
              e.target.value === "all" ? null : Number(e.target.value),
            )
          }
          displayEmpty
          startAdornment={
            <StorefrontOutlined
              sx={{
                fontSize: 16,
                color: dt.color.foregroundFaint,
                mr: 0.75,
                ml: -0.25,
                flexShrink: 0,
              }}
            />
          }
          sx={{
            height: 34,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: dt.color.foreground,
            bgcolor: dt.color.surface,
            borderRadius: dt.radius.md,
            borderColor: dt.color.border,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: dt.color.border,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: dt.color.borderStrong,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: dt.color.primary,
              borderWidth: "1.5px",
            },
            "& .MuiSelect-select": {
              py: 0,
              pr: "28px !important",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            },
          }}
        >
          <MenuItem value="all" sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
            {t("dashboard.allWarehouses", "All Depots")}
          </MenuItem>
          {warehouseList.map((wh) => (
            <MenuItem key={wh.warehouse_id} value={String(wh.warehouse_id)} sx={{ fontSize: "0.8rem" }}>
              {wh.location_name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Segmented Quick Date Pills */}
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          bgcolor: dt.color.surfaceMuted,
          p: "3px",
          borderRadius: dt.radius.md,
          border: `1px solid ${dt.color.border}`,
          flexShrink: 0,
          gap: "2px",
        }}
      >
        {PRESETS.map((p) => {
          const isSelected = activePreset?.days === p.days;
          return (
            <Button
              key={p.days}
              size="small"
              onClick={() => handleSelectPreset(p.days)}
              sx={{
                minWidth: { xs: 36, sm: 42 },
                height: 26,
                px: 1,
                py: 0,
                fontSize: "0.72rem",
                fontWeight: isSelected ? 800 : 600,
                color: isSelected ? dt.color.primaryStrong : dt.color.foregroundMuted,
                bgcolor: isSelected ? dt.color.surface : "transparent",
                boxShadow: isSelected ? dt.shadow.sm : "none",
                borderRadius: "6px",
                textTransform: "none",
                transition: dt.motion.fast,
                "&:hover": {
                  bgcolor: isSelected ? dt.color.surface : `${dt.color.primary}12`,
                  color: isSelected ? dt.color.primaryStrong : dt.color.foreground,
                },
              }}
            >
              {p.label}
            </Button>
          );
        })}

        {/* Custom Range Trigger */}
        <Button
          size="small"
          onClick={(e) => {
            setCustomStart(globalFilters.startDate);
            setCustomEnd(globalFilters.endDate);
            setCustomAnchorEl(e.currentTarget);
          }}
          startIcon={<CalendarMonthOutlined sx={{ fontSize: "13px !important" }} />}
          sx={{
            height: 26,
            px: 1,
            py: 0,
            fontSize: "0.72rem",
            fontWeight: isCustomActive ? 800 : 600,
            color: isCustomActive ? dt.color.primaryStrong : dt.color.foregroundMuted,
            bgcolor: isCustomActive ? dt.color.surface : "transparent",
            boxShadow: isCustomActive ? dt.shadow.sm : "none",
            borderRadius: "6px",
            textTransform: "none",
            transition: dt.motion.fast,
            "&:hover": {
              bgcolor: isCustomActive ? dt.color.surface : `${dt.color.primary}12`,
              color: isCustomActive ? dt.color.primaryStrong : dt.color.foreground,
            },
          }}
        >
          {isCustomActive ? "Custom" : "Dates"}
        </Button>
      </Box>

      {/* Popover for Custom Date Selection */}
      <Popover
        open={Boolean(customAnchorEl)}
        anchorEl={customAnchorEl}
        onClose={() => setCustomAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              mt: 1,
              borderRadius: dt.radius.md,
              boxShadow: dt.shadow.lg,
              border: `1px solid ${dt.color.border}`,
              width: 280,
            },
          },
        }}
      >
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, mb: 1.5, color: dt.color.foreground }}>
          Custom Date Range
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <TextField
            type="date"
            label="Start Date"
            size="small"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: "100%" }}
          />
          <TextField
            type="date"
            label="End Date"
            size="small"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: "100%" }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 0.5 }}>
            <Button
              size="small"
              onClick={() => setCustomAnchorEl(null)}
              sx={{ textTransform: "none", fontSize: "0.75rem", color: dt.color.foregroundMuted }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Check sx={{ fontSize: "14px !important" }} />}
              onClick={handleApplyCustom}
              disableElevation
              sx={{
                textTransform: "none",
                fontSize: "0.75rem",
                fontWeight: 700,
                bgcolor: dt.color.primary,
                "&:hover": { bgcolor: dt.color.primaryStrong },
              }}
            >
              Apply
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* Refresh Icon Button */}
      <Tooltip title={t("dashboard.refresh", "Refresh data")}>
        <IconButton
          size="small"
          onClick={handleRefresh}
          sx={{
            width: 34,
            height: 34,
            borderRadius: dt.radius.md,
            border: `1px solid ${dt.color.border}`,
            bgcolor: dt.color.surface,
            color: dt.color.foregroundMuted,
            flexShrink: 0,
            transition: dt.motion.fast,
            "&:hover": {
              bgcolor: dt.color.surfaceMuted,
              color: dt.color.primary,
              borderColor: dt.color.borderStrong,
            },
          }}
        >
          <RefreshIcon
            sx={{
              fontSize: 17,
              animation: isRefreshing ? "spin 0.7s linear infinite" : "none",
              "@keyframes spin": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" },
              },
            }}
          />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default MasterFilterBar;
