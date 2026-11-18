import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import LaunchIcon from "@mui/icons-material/Launch";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { Lookups } from "@/features/equipment/sheet/sheetModel";
import {
  nextNewCategoryRef,
  suggestClosestMatch,
  type CategoryResolution,
  type UnknownNameEntry,
  type WarehouseResolution,
} from "./importModel";

interface NamesToSortOutPanelProps {
  open: boolean;
  onClose: () => void;
  lookups: Lookups;
  unknownCategories: UnknownNameEntry[];
  unknownWarehouses: UnknownNameEntry[];
  categoryResolutions: Record<string, CategoryResolution>;
  warehouseResolutions: Record<string, WarehouseResolution>;
  canCreateCategory: boolean;
  onResolveCategory: (key: string, res: CategoryResolution) => void;
  onResolveWarehouse: (key: string, res: WarehouseResolution) => void;
}

export function NamesToSortOutPanel({
  open,
  onClose,
  lookups,
  unknownCategories,
  unknownWarehouses,
  categoryResolutions,
  warehouseResolutions,
  canCreateCategory,
  onResolveCategory,
  onResolveWarehouse,
}: NamesToSortOutPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const catOptions = lookups.categories.map((c) => ({ id: c.category_id, name: c.category_name }));
  const whOptions = lookups.warehouses.map((w) => ({ id: w.warehouse_id, name: w.location_name }));

  const hasAny = unknownCategories.length > 0 || unknownWarehouses.length > 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: 430 },
            maxWidth: "100%",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {t("dataArena.equipmentImport.namesPanelTitle")}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label={t("dataArena.equipmentImport.dismiss")}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ p: 2, flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          {t("dataArena.equipmentImport.namesPanelHint")}
        </Typography>

        {!hasAny && (
          <Alert severity="success">{t("dataArena.equipmentImport.nothingToSortOut")}</Alert>
        )}

        {unknownCategories.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {t("dataArena.equipmentImport.namesCategoriesTitle")}
              </Typography>
              {!canCreateCategory && (
                <Typography variant="caption" color="text.secondary">
                  {t("dataArena.equipmentImport.createNewNoPerm")}
                </Typography>
              )}
            </Box>

            {unknownCategories.map((entry) => {
              const res = categoryResolutions[entry.key] ?? { action: "unresolved" as const };
              const suggestion = suggestClosestMatch(entry.rawName, catOptions);

              return (
                <Box
                  key={entry.key}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: 1,
                    borderColor: res.action === "unresolved" ? "warning.main" : "divider",
                    bgcolor: "background.default",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, wordBreak: "break-word" }}>
                      {entry.rawName}
                    </Typography>
                    <Chip
                      size="small"
                      label={t("dataArena.equipmentImport.rowsAffected", { count: entry.rowCount })}
                      sx={{ fontVariantNumeric: "tabular-nums", height: 20, fontSize: 11 }}
                    />
                  </Box>

                  {suggestion && (res.action === "unresolved" || (res.action === "use_existing" && res.categoryId !== suggestion.id)) && (
                    <Box>
                      <Chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        clickable
                        onClick={() => onResolveCategory(entry.key, { action: "use_existing", categoryId: suggestion.id })}
                        label={t("dataArena.equipmentImport.didYouMean", { name: suggestion.name })}
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                  )}

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label={t("dataArena.equipmentImport.chooseExistingCategory")}
                      value={res.action === "use_existing" ? String(res.categoryId) : ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        if (id) onResolveCategory(entry.key, { action: "use_existing", categoryId: id });
                      }}
                    >
                      <MenuItem value="">—</MenuItem>
                      {lookups.categories.map((c) => (
                        <MenuItem key={c.category_id} value={String(c.category_id)}>
                          {c.category_name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  {canCreateCategory && (
                    <Button
                      size="small"
                      variant={res.action === "create_new" ? "contained" : "outlined"}
                      color="info"
                      disableElevation
                      startIcon={<AddCircleOutlineOutlinedIcon />}
                      onClick={() => {
                        if (res.action === "create_new") return;
                        onResolveCategory(entry.key, {
                          action: "create_new",
                          ref: nextNewCategoryRef(categoryResolutions),
                          name: entry.rawName,
                        });
                      }}
                      sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}
                    >
                      {t("dataArena.equipmentImport.createNewCategory")} "{entry.rawName}"
                    </Button>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {unknownCategories.length > 0 && unknownWarehouses.length > 0 && <Divider />}

        {unknownWarehouses.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {t("dataArena.equipmentImport.namesLocationsTitle")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("dataArena.equipmentImport.namesLocationsHint")}
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<LaunchIcon sx={{ fontSize: 14 }} />}
                onClick={() => {
                  onClose();
                  navigate({ to: "/admin/locations" });
                }}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                {t("dataArena.equipmentImport.manageLocations")}
              </Button>
            </Box>

            {unknownWarehouses.map((entry) => {
              const res = warehouseResolutions[entry.key] ?? { action: "unresolved" as const };
              const suggestion = suggestClosestMatch(entry.rawName, whOptions);

              return (
                <Box
                  key={entry.key}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: 1,
                    borderColor: res.action === "unresolved" ? "warning.main" : "divider",
                    bgcolor: "background.default",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, wordBreak: "break-word" }}>
                      {entry.rawName}
                    </Typography>
                    <Chip
                      size="small"
                      label={t("dataArena.equipmentImport.rowsAffected", { count: entry.rowCount })}
                      sx={{ fontVariantNumeric: "tabular-nums", height: 20, fontSize: 11 }}
                    />
                  </Box>

                  {suggestion && (res.action === "unresolved" || (res.action === "use_existing" && res.warehouseId !== suggestion.id)) && (
                    <Box>
                      <Chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        clickable
                        onClick={() => onResolveWarehouse(entry.key, { action: "use_existing", warehouseId: suggestion.id })}
                        label={t("dataArena.equipmentImport.didYouMean", { name: suggestion.name })}
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                  )}

                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={t("dataArena.equipmentImport.chooseExistingLocation")}
                    value={res.action === "use_existing" ? String(res.warehouseId) : ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (id) onResolveWarehouse(entry.key, { action: "use_existing", warehouseId: id });
                    }}
                  >
                    <MenuItem value="">—</MenuItem>
                    {lookups.warehouses.map((w) => (
                      <MenuItem key={w.warehouse_id} value={String(w.warehouse_id)}>
                        {w.location_name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
