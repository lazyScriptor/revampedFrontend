import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  MenuItem,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import { useTranslation } from "react-i18next";
import { ACTIVITY_FILTER_GROUPS } from "../constants";
import type { ActivityEventType, ActivityFilterState, SavedActivityFilter } from "../types";

interface ActivityFiltersBarProps {
  filters: ActivityFilterState;
  onChange: (patch: Partial<ActivityFilterState>) => void;
  onReset: () => void;
  staffOptions?: Array<{ user_id: number; name: string }>;
  savedFilters?: SavedActivityFilter[];
  onSaveFilter?: (name: string) => void;
  onDeleteSavedFilter?: (id: string) => void;
  onApplySavedFilter?: (saved: SavedActivityFilter) => void;
}

export function ActivityFiltersBar({
  filters,
  onChange,
  onReset,
  staffOptions = [],
  savedFilters = [],
  onSaveFilter,
  onDeleteSavedFilter,
  onApplySavedFilter,
}: ActivityFiltersBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");

  const toggleGroupTypes = (groupTypes: ActivityEventType[]) => {
    const allSelected = groupTypes.every((tp) => filters.types.includes(tp));
    const next = allSelected
      ? filters.types.filter((tp) => !groupTypes.includes(tp))
      : Array.from(new Set([...filters.types, ...groupTypes]));
    onChange({ types: next });
  };

  const secondaryCount = [
    Boolean(filters.staff),
    Boolean(filters.customer?.trim()),
    Boolean(filters.invoice?.trim()),
    Boolean(filters.amount_min),
    Boolean(filters.unread),
    filters.checked && filters.checked !== "all",
    Boolean(filters.high_only),
    Boolean(filters.after_hours),
  ].filter(Boolean).length;

  const secondaryControls = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          placeholder={t("activity.filters.customerSearch")}
          value={filters.customer ?? ""}
          onChange={(e) => onChange({ customer: e.target.value })}
          sx={{ minWidth: 160, flex: { xs: "1 1 100%", sm: "0 1 180px" } }}
          slotProps={{ htmlInput: { "aria-label": t("activity.filters.customerSearch") } }}
        />
        <TextField
          size="small"
          placeholder={t("activity.filters.billSearch")}
          value={filters.invoice ?? ""}
          onChange={(e) => onChange({ invoice: e.target.value })}
          sx={{ minWidth: 140, flex: { xs: "1 1 48%", sm: "0 1 150px" } }}
          slotProps={{ htmlInput: { "aria-label": t("activity.filters.billSearch") } }}
        />
        <TextField
          size="small"
          type="number"
          placeholder={t("activity.filters.amountMin")}
          value={filters.amount_min ?? ""}
          onChange={(e) => onChange({ amount_min: e.target.value })}
          sx={{ minWidth: 120, flex: { xs: "1 1 48%", sm: "0 1 130px" } }}
          slotProps={{ htmlInput: { min: 0, "aria-label": t("activity.filters.amountMin"), style: { fontVariantNumeric: "tabular-nums" } } }}
        />
        {staffOptions.length > 0 && (
          <TextField
            select
            size="small"
            label={t("activity.filters.staff")}
            value={filters.staff ?? ""}
            onChange={(e) => onChange({ staff: e.target.value ? Number(e.target.value) : "" })}
            sx={{ minWidth: 140, flex: { xs: "1 1 100%", sm: "0 1 160px" } }}
          >
            <MenuItem value="">{t("common.all")}</MenuItem>
            {staffOptions.map((s) => (
              <MenuItem key={s.user_id} value={s.user_id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      {/* State chips */}
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
        <Chip
          size="small"
          clickable
          label={t("activity.filters.unread")}
          color={filters.unread ? "primary" : "default"}
          variant={filters.unread ? "filled" : "outlined"}
          onClick={() => onChange({ unread: !filters.unread })}
          sx={{ fontWeight: 700 }}
        />
        <Chip
          size="small"
          clickable
          label={t("activity.notChecked")}
          color={filters.checked === "not_checked" ? "warning" : "default"}
          variant={filters.checked === "not_checked" ? "filled" : "outlined"}
          onClick={() =>
            onChange({ checked: filters.checked === "not_checked" ? "all" : "not_checked" })
          }
          sx={{ fontWeight: 700 }}
        />
        <Chip
          size="small"
          clickable
          label={t("activity.checked")}
          color={filters.checked === "checked" ? "success" : "default"}
          variant={filters.checked === "checked" ? "filled" : "outlined"}
          onClick={() =>
            onChange({ checked: filters.checked === "checked" ? "all" : "checked" })
          }
          sx={{ fontWeight: 700 }}
        />
        <Chip
          size="small"
          clickable
          label={t("activity.filters.highOnly")}
          color={filters.high_only ? "error" : "default"}
          variant={filters.high_only ? "filled" : "outlined"}
          onClick={() => onChange({ high_only: !filters.high_only })}
          sx={{ fontWeight: 700 }}
        />
        <Chip
          size="small"
          clickable
          label={`🌙 ${t("activity.afterHours")}`}
          color={filters.after_hours ? "secondary" : "default"}
          variant={filters.after_hours ? "filled" : "outlined"}
          onClick={() => onChange({ after_hours: !filters.after_hours })}
          sx={{ fontWeight: 700 }}
        />

        {onSaveFilter && (
          <Button
            size="small"
            startIcon={<BookmarkAddOutlinedIcon fontSize="small" />}
            onClick={() => setSaveDialogOpen(true)}
            sx={{ textTransform: "none", fontWeight: 700, ml: "auto" }}
          >
            {t("activity.filters.saveFilter")}
          </Button>
        )}
        <Button size="small" color="inherit" onClick={onReset} sx={{ textTransform: "none", fontWeight: 700 }}>
          {t("common.clear")}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      {/* Saved filters pinned chips */}
      {savedFilters.length > 0 && (
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t("activity.filters.saved")}:
          </Typography>
          {savedFilters.map((sf) => (
            <Chip
              key={sf.id}
              size="small"
              label={sf.name}
              clickable
              onClick={() => onApplySavedFilter?.(sf)}
              onDelete={onDeleteSavedFilter ? () => onDeleteSavedFilter(sf.id) : undefined}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Box>
      )}

      {/* Type chips (sideways scroll on phones, wraps on sm+) + mobile Filters button */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          sx={{
            flex: 1,
            display: "flex",
            gap: 0.75,
            flexWrap: { xs: "nowrap", sm: "wrap" },
            overflowX: { xs: "auto", sm: "visible" },
            pb: { xs: 0.5, sm: 0 },
            minWidth: 0,
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {ACTIVITY_FILTER_GROUPS.map((grp) => {
            const active = grp.types.every((tp) => filters.types.includes(tp));
            return (
              <Chip
                key={grp.key}
                size="small"
                clickable
                label={t(grp.labelKey)}
                onClick={() => toggleGroupTypes(grp.types)}
                variant={active ? "filled" : "outlined"}
                sx={{
                  flexShrink: 0,
                  fontWeight: 700,
                  bgcolor: active ? grp.color : undefined,
                  color: active ? "#ffffff" : undefined,
                  borderColor: active ? grp.color : undefined,
                  "&:hover": active ? { bgcolor: grp.color } : undefined,
                }}
              />
            );
          })}
        </Box>

        {isMobile && (
          <Badge badgeContent={secondaryCount} color="primary" invisible={secondaryCount === 0}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setSheetOpen(true)}
              sx={{ flexShrink: 0, textTransform: "none", fontWeight: 700 }}
            >
              {t("activity.filters.title")}
            </Button>
          </Badge>
        )}
      </Box>

      {/* Desktop inline secondary controls */}
      {!isMobile && secondaryControls}

      {/* Mobile Filters Sheet */}
      <Drawer anchor="bottom" open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t("activity.filters.title")}
          </Typography>
          {secondaryControls}
          <Button variant="contained" onClick={() => setSheetOpen(false)} sx={{ textTransform: "none", fontWeight: 800 }}>
            {t("common.close")}
          </Button>
        </Box>
      </Drawer>

      {/* Save filter dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{t("activity.filters.saveFilterTitle")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            label={t("activity.filters.filterName")}
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder={t("activity.filters.filterNamePlaceholder")}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} color="inherit" sx={{ textTransform: "none" }}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            disabled={!filterName.trim()}
            onClick={() => {
              onSaveFilter?.(filterName.trim());
              setFilterName("");
              setSaveDialogOpen(false);
            }}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
