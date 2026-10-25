import { useMemo, useState } from "react";
import { Box, Checkbox, MenuItem, Pagination, TextField, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import SearchOffIcon from "@mui/icons-material/SearchOff";

import type { CardConfig } from "../lib/equipmentCardFields";
import { EquipmentInfoCard } from "./EquipmentInfoCard";
import { EquipmentDeleteDialog } from "./EquipmentDeleteDialog";

interface EquipmentCardGridProps {
  data: any[];
  isLoading: boolean;
  rowCount: number;
  paginationModel: { page: number; pageSize: number };
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
  onEdit: (equipmentRow: any) => void;
  selectedIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
  config: CardConfig;
}

// Card view of the equipment list. Same data, pagination, selection (→ bulk edit) and
// edit/delete as the table; only the presentation differs.
export function EquipmentCardGrid({
  data,
  isLoading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  onEdit,
  selectedIds = [],
  onSelectionChange,
  config,
}: EquipmentCardGridProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const pageIds = useMemo(() => data.map((d) => d.equipment_id as number), [data]);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;

  const pageSizeOptions = useMemo(() => {
    const set = new Set([12, 24, 48, 96]);
    if (paginationModel.pageSize) set.add(paginationModel.pageSize);
    return Array.from(set).sort((a, b) => a - b);
  }, [paginationModel.pageSize]);

  const pageCount = Math.max(1, Math.ceil(Math.max(0, rowCount ?? data.length) / (paginationModel.pageSize || 1)));
  const border = (theme.palette as any).border?.subtle || theme.palette.divider;

  const toggleOne = (id: number, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange?.(Array.from(next));
  };

  const toggleAllOnPage = (checked: boolean) => {
    const next = new Set(selected);
    for (const id of pageIds) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    onSelectionChange?.(Array.from(next));
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", bgcolor: "background.paper" }}>
      {/* select-all-on-page strip */}
      {data.length > 0 && (
        <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.25, borderBottom: "1px solid", borderColor: border }}>
          <Checkbox
            size="small"
            checked={selectedOnPage > 0 && selectedOnPage === pageIds.length}
            indeterminate={selectedOnPage > 0 && selectedOnPage < pageIds.length}
            onChange={(e) => toggleAllOnPage(e.target.checked)}
            slotProps={{ input: { "aria-label": t("equipment.cards.selectAll") } }}
          />
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {selected.size > 0 ? t("equipment.cards.selectedCount", { count: selected.size }) : t("equipment.cards.selectAll")}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          p: { xs: 1.25, sm: 1.75 },
          opacity: isLoading ? 0.6 : 1,
          transition: "opacity 0.15s ease",
          overscrollBehavior: "contain",
        }}
      >
        {data.length === 0 && !isLoading ? (
          <Box sx={{ minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, color: "text.secondary" }}>
            <SearchOffIcon sx={{ fontSize: 48, opacity: 0.6 }} />
            <Typography sx={{ fontWeight: 700 }}>{t("equipment.cards.empty")}</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: { xs: 1.25, sm: 1.75 }, alignItems: "stretch" }}>
            {data.map((item) => (
              <EquipmentInfoCard
                key={item.equipment_id}
                item={item}
                config={config}
                selected={selected.has(item.equipment_id)}
                onSelect={toggleOne}
                onEdit={onEdit}
                onDelete={(row) => setDeleteId(row.equipment_id)}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* pager */}
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          px: 1.5,
          py: 1,
          borderTop: "1px solid",
          borderColor: border,
        }}
      >
        <TextField
          select
          size="small"
          value={paginationModel.pageSize}
          onChange={(e) => onPaginationModelChange({ page: 0, pageSize: Number(e.target.value) })}
          slotProps={{ htmlInput: { "aria-label": t("equipment.cards.perPage") } }}
          sx={{ width: 84, "& .MuiInputBase-input": { fontSize: "0.82rem", py: 0.6, fontVariantNumeric: "tabular-nums" } }}
        >
          {pageSizeOptions.map((n) => (
            <MenuItem key={n} value={n} sx={{ fontVariantNumeric: "tabular-nums" }}>
              {n}
            </MenuItem>
          ))}
        </TextField>
        <Pagination
          count={pageCount}
          page={paginationModel.page + 1}
          onChange={(_, p) => onPaginationModelChange({ ...paginationModel, page: p - 1 })}
          size="small"
          siblingCount={0}
          color="primary"
          shape="rounded"
        />
      </Box>

      <EquipmentDeleteDialog equipmentId={deleteId} onClose={() => setDeleteId(null)} />
    </Box>
  );
}
