import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent } from "react";
import {
  Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, IconButton, Menu, MenuItem, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import ImageIcon from "@mui/icons-material/Image";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assetUrl";
import { useToast } from "@/components/ui/AppToast";
import { NumberInput } from "@/components/ui/NumberInput";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWarehouseOptions } from "@/features/warehouses/hooks/useWarehouseOptions";
import { tk } from "@/i18n/marker";
import { createCategory } from "../api/category.api";
import { bulkSaveEquipment, fetchNextEquipment, type BulkRowError } from "../api/equipment.api";
import { useCategoryOptions } from "../hooks/useCategoryHooks";
import { useUploadEquipmentImage } from "../hooks/useEquipmentPhoto";
import { compressImage } from "../lib/compressImage";
import { formatSerial, nextGridNameNumber, nextGridSerial, parseName, parsePaste, renumberName, renumberSinhala } from "../lib/equipmentNumbering";
import type { Equipment } from "../schemas/equipment.schema";
import { EquipmentCategoryField, type CategoryOption } from "./EquipmentCategoryField";
import { EquipmentNameField } from "./EquipmentNameField";
import { ImageHoverPreview } from "./ImageHoverPreview";

const num = { fontVariantNumeric: "tabular-nums" } as const;

interface GridRow {
  key: number;
  equipment_id?: number;
  category_id: number | "";
  category_text: string;
  equipment_name: string;
  equipment_name_si: string;
  serial_number: string;
  base_rental_price: string;
  extra_daily_rate: string;
  minimum_rental_days: string;
  purchase_cost: string;
  warranty_period_months: string;
  end_of_warranty_date: string;
  total_owned_qty: string;
  warehouse_id: number | "";
  photo: Blob | null;
  photoUrl: string | null;
}

type TextField_ = "equipment_name" | "equipment_name_si" | "serial_number" | "base_rental_price" | "extra_daily_rate" | "minimum_rental_days" | "purchase_cost" | "warranty_period_months" | "end_of_warranty_date" | "total_owned_qty";

const BASE_COLUMNS: { field: TextField_; label: string; width: number }[] = [
  { field: "equipment_name", label: tk("equipment.equipmentName"), width: 270 },
  { field: "equipment_name_si", label: tk("equipment.equipmentNameSi"), width: 200 },
  { field: "serial_number", label: tk("equipment.equipmentNo"), width: 110 },
  { field: "base_rental_price", label: tk("equipment.dailyRate"), width: 100 },
];
const EXTRA_COLUMNS: { field: TextField_; label: string; width: number; type?: string }[] = [
  { field: "extra_daily_rate", label: tk("equipment.extraDailyRate"), width: 100 },
  { field: "minimum_rental_days", label: tk("equipment.minRentalDays"), width: 90 },
  { field: "total_owned_qty", label: tk("equipment.totalOwned"), width: 80 },
  { field: "purchase_cost", label: tk("equipment.purchaseCost"), width: 110 },
  { field: "warranty_period_months", label: tk("equipment.warrantyMonths"), width: 100 },
  { field: "end_of_warranty_date", label: tk("equipment.endOfWarranty"), width: 150, type: "date" },
];
const COLUMNS_KEY = "geargrid-equipment-grid-columns";

const readColumns = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(COLUMNS_KEY) || "null");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

let keySeq = 1;
const emptyRow = (over: Partial<GridRow> = {}): GridRow => ({
  key: keySeq++,
  category_id: "",
  category_text: "",
  equipment_name: "",
  equipment_name_si: "",
  serial_number: "",
  base_rental_price: "",
  extra_daily_rate: "",
  minimum_rental_days: "",
  purchase_cost: "",
  warranty_period_months: "",
  end_of_warranty_date: "",
  total_owned_qty: "",
  warehouse_id: "",
  photo: null,
  photoUrl: null,
  ...over,
});

const isQuantity = (r: GridRow) => Number(r.total_owned_qty) > 1;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Add many machines, or edit many at once, like a spreadsheet. Saves all rows or none. */
export function EquipmentBulkGrid() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: categories = [] } = useCategoryOptions();
  const { data: warehouses = [] } = useWarehouseOptions();
  const canCreateCategory = useAuthStore((s) => s.hasPermission("category:create"));
  const canUse = useAuthStore((s) => s.hasPermission("equipment:create") && s.hasPermission("equipment:edit"));
  const upload = useUploadEquipmentImage();

  const [rows, setRows] = useState<GridRow[]>(() => [emptyRow()]);
  const [serverSerial, setServerSerial] = useState<string | null>(null);
  const [copies, setCopies] = useState<number | "">(5);
  const [extra, setExtra] = useState<string[]>(readColumns);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [errors, setErrors] = useState<BulkRowError[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadType, setLoadType] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const fileFor = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const firstWarehouse = warehouses[0]?.warehouse_id ?? "";
  const manyWarehouses = warehouses.length > 1;
  const columns = useMemo(() => [...BASE_COLUMNS, ...EXTRA_COLUMNS.filter((c) => extra.includes(c.field))], [extra]);

  const refreshSerial = async () => {
    const next = await fetchNextEquipment().catch(() => null);
    if (!next) return;
    setServerSerial(next.serial_number);
    setRows((prev) => prev.map((r, i) => (i === 0 && !r.serial_number && !r.equipment_id ? { ...r, serial_number: next.serial_number } : r)));
  };
  useEffect(() => {
    refreshSerial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (key: number, updates: Partial<GridRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...updates } : r)));
    setErrors([]);
  };

  const nextSerialIn = (list: GridRow[]) => formatSerial(nextGridSerial(serverSerial, list.map((r) => r.serial_number)));

  /** A machine was picked from the name list: this row becomes the next one after it. */
  const pickMachine = async (key: number, machine: Equipment) => {
    const next = await fetchNextEquipment(machine.equipment_id).catch(() => null);
    if (!next) {
      toast.showError(t("equipment.bulkGrid.nextFailed"));
      return;
    }
    setServerSerial(next.serial_number);
    setErrors([]);
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const others = prev.filter((o) => o.key !== key);
        const n = nextGridNameNumber(next.equipment_name, next.name_number ?? 1, others.map((o) => o.equipment_name));
        const si = next.equipment_name_si ?? "";
        return {
          ...r,
          equipment_name: isQuantity(r) ? str(next.base_name) : renumberName(next.equipment_name, n),
          equipment_name_si: isQuantity(r) ? str(next.base_name_si) : renumberSinhala(si, next.equipment_name, n),
          serial_number: r.serial_number || formatSerial(nextGridSerial(next.serial_number, others.map((o) => o.serial_number))),
          category_id: next.category_id ?? r.category_id,
          category_text: categories.find((c) => c.category_id === next.category_id)?.category_name ?? r.category_text,
          base_rental_price: str(next.base_rental_price),
          extra_daily_rate: str(next.extra_daily_rate),
          minimum_rental_days: str(next.minimum_rental_days),
          warehouse_id: next.warehouse_id || r.warehouse_id || firstWarehouse,
        };
      }),
    );
  };

  const pickCategory = (key: number, category: CategoryOption) => patch(key, { category_id: category.category_id, category_text: category.category_name });

  const addCategory = async (key: number, name: string) => {
    try {
      const res: any = await createCategory({ category_name: name } as any);
      const created = res?.category ?? res;
      await qc.invalidateQueries({ queryKey: ["category-options"] });
      pickCategory(key, { category_id: created.category_id, category_name: created.category_name || name });
    } catch (err: any) {
      toast.showError(err?.message || t("equipment.bulkGrid.saveFailed"));
    }
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow({ serial_number: nextSerialIn(prev), warehouse_id: firstWarehouse })]);

  /** Copies of a row, each with the next number in its name and its own machine number. */
  const copyRow = (key: number) => {
    const count = Number(copies) || 1;
    setErrors([]);
    setRows((prev) => {
      const at = prev.findIndex((r) => r.key === key);
      if (at < 0) return prev;
      const source = prev[at];
      const name = parseName(source.equipment_name);
      const si = parseName(source.equipment_name_si);
      let list = prev;
      const made: GridRow[] = [];
      for (let i = 0; i < count; i++) {
        const all = [...list, ...made];
        const n = nextGridNameNumber(source.equipment_name, 2, all.map((r) => r.equipment_name));
        made.push({
          ...source,
          key: keySeq++,
          equipment_id: undefined,
          equipment_name: isQuantity(source) ? name.text : renumberName(source.equipment_name, n),
          equipment_name_si: isQuantity(source) ? si.text : renumberSinhala(source.equipment_name_si, source.equipment_name, n),
          serial_number: nextSerialIn(all),
        });
      }
      list = [...prev.slice(0, at + 1), ...made, ...prev.slice(at + 1)];
      return list;
    });
  };

  const removeRow = (key: number) => setRows((prev) => (prev.length === 1 ? [emptyRow({ serial_number: nextSerialIn([]), warehouse_id: firstWarehouse })] : prev.filter((r) => r.key !== key)));

  const onPaste = (e: ClipboardEvent, rowIndex: number, colIndex: number) => {
    const grid = parsePaste(e.clipboardData.getData("text"));
    if (!grid) return;
    e.preventDefault();
    setErrors([]);
    setRows((prev) => {
      const next = [...prev];
      grid.forEach((cells, y) => {
        const at = rowIndex + y;
        if (!next[at]) next[at] = emptyRow({ serial_number: nextSerialIn(next), warehouse_id: firstWarehouse });
        const updated: GridRow = { ...next[at] };
        cells.forEach((value, x) => {
          const col = columns[colIndex + x];
          if (col) (updated[col.field] as string) = value;
        });
        next[at] = updated;
      });
      return next;
    });
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const key = fileFor.current;
    if (!file || key === null) return;
    try {
      const image = await compressImage(file);
      patch(key, { photo: image.blob, photoUrl: URL.createObjectURL(image.blob) });
    } catch {
      toast.showError(t("equipment.photo.errors.unreadable"));
    }
  };

  const toggleColumn = (field: string) => {
    const next = extra.includes(field) ? extra.filter((f) => f !== field) : [...extra, field];
    setExtra(next);
    try {
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(next));
    } catch {
      /* the choice just isn't remembered */
    }
  };

  const loadExisting = async () => {
    if (!loadType) return;
    setLoading(true);
    try {
      const body: any = await api.get("/equipment", { params: { category_id: loadType, limit: 200 } });
      const list: any[] = body?.data?.equipment || [];
      const categoryName = categories.find((c) => c.category_id === loadType)?.category_name || "";
      const loaded = [...list].reverse().map((m) =>
        emptyRow({
          equipment_id: m.equipment_id,
          category_id: m.category_id,
          category_text: categoryName,
          equipment_name: str(m.equipment_name),
          equipment_name_si: str(m.equipment_name_si),
          serial_number: str(m.serial_number),
          base_rental_price: str(Number(m.base_rental_price)),
          extra_daily_rate: str(Number(m.extra_daily_rate)),
          minimum_rental_days: str(m.minimum_rental_days),
          purchase_cost: m.purchase_cost === null || m.purchase_cost === undefined ? "" : str(Number(m.purchase_cost)),
          warranty_period_months: str(m.warranty_period_months),
          end_of_warranty_date: str(m.end_of_warranty_date).slice(0, 10),
          total_owned_qty: str(m.total_owned_qty),
          warehouse_id: m.warehouse_id,
          photoUrl: resolveAssetUrl(m.image_url),
        }),
      );
      if (!loaded.length) toast.showInfo(t("equipment.bulkGrid.nothingToLoad"));
      else {
        setRows((prev) => [...prev.filter((r) => r.equipment_id || r.equipment_name.trim() || r.category_id), ...loaded]);
        setErrors([]);
      }
    } catch (err: any) {
      toast.showError(err?.message || t("equipment.bulkGrid.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setErrors([]);
    try {
      const payload = rows.map(({ key, category_text, photo, photoUrl, ...r }) => ({
        ...r,
        warehouse_id: r.warehouse_id || firstWarehouse,
      }));
      const res = await bulkSaveEquipment(payload);
      if (!res.saved) {
        setErrors(res.errors);
        return;
      }
      // Machines are saved; a photo that fails must not read as a failed save.
      let photoFails = 0;
      for (const s of res.rows) {
        const blob = rows[s.row]?.photo;
        if (!blob) continue;
        await upload.mutateAsync({ equipmentId: s.equipment_id, blob }).catch(() => {
          photoFails++;
        });
      }
      qc.invalidateQueries({ queryKey: ["equipment"] });
      qc.invalidateQueries({ queryKey: ["equipment-stats"] });
      qc.invalidateQueries({ queryKey: ["pos-equipment-catalog"] });
      toast.showSuccess(t("equipment.bulkGrid.saved", { count: res.rows.length }));
      if (photoFails) toast.showWarning(t("equipment.bulkGrid.photosFailed", { count: photoFails }));
      const next = await fetchNextEquipment().catch(() => null);
      setServerSerial(next?.serial_number ?? null);
      setRows([emptyRow({ serial_number: next?.serial_number ?? "", warehouse_id: firstWarehouse })]);
    } catch (err: any) {
      toast.showError(err?.message || t("equipment.bulkGrid.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!canUse) return <Alert severity="info">{t("equipment.bulkGrid.noPermission")}</Alert>;

  const errorFor = (rowIndex: number, field: string) => errors.find((e) => e.row === rowIndex && e.field === field);
  const errorText = (e?: BulkRowError) => (e ? t(`equipment.bulkGrid.errors.${e.code}`) : undefined);
  const dense = { "& .MuiOutlinedInput-input": { py: 0.75, px: 1, fontSize: "0.85rem" } };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
      <input ref={fileInput} type="file" accept="image/*" hidden aria-label={t("equipment.photo.addPhoto")} onChange={onPhoto} />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={addRow} sx={{ textTransform: "none", fontWeight: 700 }}>
          {t("equipment.bulkGrid.addRow")}
        </Button>
        <NumberInput
          size="small"
          value={copies}
          onChange={setCopies}
          min={1}
          max={100}
          label={t("equipment.bulkGrid.copies")}
          sx={{ width: 100 }}
          slotProps={{ htmlInput: { "aria-label": t("equipment.bulkGrid.copies"), style: num } }}
        />
        <Button variant="outlined" size="small" startIcon={<ViewColumnIcon />} onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ textTransform: "none", fontWeight: 700 }}>
          {t("equipment.bulkGrid.columns")}
        </Button>
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
          {EXTRA_COLUMNS.map((c) => (
            <MenuItem key={c.field} dense>
              <FormControlLabel control={<Checkbox size="small" checked={extra.includes(c.field)} onChange={() => toggleColumn(c.field)} />} label={t(c.label)} />
            </MenuItem>
          ))}
        </Menu>
        <Box sx={{ flexGrow: 1 }} />
        <TextField
          select
          size="small"
          label={t("equipment.bulkGrid.editExisting")}
          value={loadType}
          onChange={(e) => setLoadType(Number(e.target.value))}
          sx={{ minWidth: 200 }}
        >
          {categories.map((c) => (
            <MenuItem key={c.category_id} value={c.category_id}>
              {c.category_name}
            </MenuItem>
          ))}
        </TextField>
        <Button size="small" variant="outlined" disabled={!loadType || loading} onClick={loadExisting} sx={{ textTransform: "none", fontWeight: 700 }}>
          {t("equipment.bulkGrid.load")}
        </Button>
      </Box>

      {errors.length > 0 && <Alert severity="error">{t("equipment.bulkGrid.fixRows", { count: new Set(errors.map((e) => e.row)).size })}</Alert>}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader aria-label={t("equipment.bulkGrid.title")}>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.field} sx={{ fontWeight: 800, minWidth: c.width }}>
                  {t(c.label)}
                </TableCell>
              ))}
              <TableCell sx={{ fontWeight: 800, minWidth: 170 }}>{t("common.category")}</TableCell>
              {manyWarehouses && <TableCell sx={{ fontWeight: 800, minWidth: 150 }}>{t("equipment.warehouse")}</TableCell>}
              <TableCell sx={{ fontWeight: 800 }}>{t("equipment.image")}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, rowIndex) => (
              <TableRow key={r.key} data-testid="grid-row" sx={r.equipment_id ? { bgcolor: "action.hover" } : undefined}>
                {columns.map((c, colIndex) => {
                  const err = errorFor(rowIndex, c.field);
                  // A new row's name lists machines to follow; a saved machine's name is just edited.
                  if (c.field === "equipment_name" && !r.equipment_id) {
                    return (
                      <TableCell key={c.field} sx={{ verticalAlign: "top", ...dense }}>
                        <EquipmentNameField
                          text={r.equipment_name}
                          onTextChange={(v) => patch(r.key, { equipment_name: v })}
                          onPick={(machine) => pickMachine(r.key, machine)}
                          onPaste={(e) => onPaste(e, rowIndex, colIndex)}
                          ariaLabel={`${t(c.label)} ${rowIndex + 1}`}
                          error={!!err}
                          helperText={errorText(err)}
                        />
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell key={c.field} sx={{ verticalAlign: "top" }}>
                      <TextField
                        size="small"
                        fullWidth
                        type={c.field === "end_of_warranty_date" ? "date" : "text"}
                        value={r[c.field]}
                        onChange={(e) => patch(r.key, { [c.field]: e.target.value } as Partial<GridRow>)}
                        onPaste={(e) => onPaste(e, rowIndex, colIndex)}
                        error={!!err}
                        helperText={errorText(err)}
                        sx={dense}
                        slotProps={{ htmlInput: { "aria-label": `${t(c.label)} ${rowIndex + 1}`, style: c.field === "equipment_name" || c.field === "equipment_name_si" ? undefined : num } }}
                      />
                    </TableCell>
                  );
                })}
                <TableCell sx={{ verticalAlign: "top", ...dense }}>
                  <EquipmentCategoryField
                    text={r.category_text}
                    onTextChange={(v) => patch(r.key, { category_text: v, category_id: "" })}
                    categories={categories}
                    onPick={(category) => pickCategory(r.key, category)}
                    onCreate={canCreateCategory ? (name) => addCategory(r.key, name) : undefined}
                    ariaLabel={`${t("common.category")} ${rowIndex + 1}`}
                    error={!!errorFor(rowIndex, "category_id")}
                    helperText={errorText(errorFor(rowIndex, "category_id"))}
                  />
                </TableCell>
                {manyWarehouses && (
                  <TableCell sx={{ verticalAlign: "top" }}>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={r.warehouse_id || firstWarehouse}
                      onChange={(e) => patch(r.key, { warehouse_id: Number(e.target.value) })}
                      sx={dense}
                    >
                      {warehouses.map((w) => (
                        <MenuItem key={w.warehouse_id} value={w.warehouse_id}>
                          {w.location_name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                )}
                <TableCell sx={{ verticalAlign: "top" }}>
                  <ImageHoverPreview src={r.photoUrl} fallbackTitle={t("equipment.photo.addPhoto")}>
                    <IconButton
                      size="small"
                      aria-label={`${t("equipment.photo.addPhoto")} ${rowIndex + 1}`}
                      onClick={() => {
                        fileFor.current = r.key;
                        fileInput.current?.click();
                      }}
                      sx={{ borderRadius: 1, p: 0 }}
                    >
                      {r.photoUrl ? (
                        <Box component="img" src={r.photoUrl} alt="" sx={{ width: 34, height: 34, objectFit: "contain", bgcolor: "#ffffff", borderRadius: 1 }} />
                      ) : (
                        <Box sx={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
                          <ImageIcon sx={{ fontSize: 20, color: "grey.500" }} />
                        </Box>
                      )}
                    </IconButton>
                  </ImageHoverPreview>
                </TableCell>
                <TableCell sx={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                  <Tooltip title={t("equipment.bulkGrid.addCopies", { count: Number(copies) || 1 })}>
                    <IconButton size="small" aria-label={`${t("equipment.bulkGrid.addCopies", { count: Number(copies) || 1 })} ${rowIndex + 1}`} onClick={() => copyRow(r.key)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("equipment.bulkGrid.removeRow")}>
                    <IconButton size="small" aria-label={`${t("equipment.bulkGrid.removeRow")} ${rowIndex + 1}`} onClick={() => removeRow(r.key)}>
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="caption" color="text.secondary">
          {t("equipment.bulkGrid.hint")}
        </Typography>
        <Button variant="contained" disableElevation disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined} onClick={save} sx={{ fontWeight: 800, textTransform: "none" }}>
          {t("equipment.bulkGrid.save", { count: rows.length })}
        </Button>
      </Box>
    </Box>
  );
}
