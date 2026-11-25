import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Alert, Box, Button, InputBase, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import UndoIcon from "@mui/icons-material/Undo";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { updateProduct } from "../api/catalog.api";
import { errorMessage } from "../api/http";
import type { CatalogProduct, RetailBrand, RetailCategory } from "../api/catalog.types";
import { categoryPath, type CatalogCtx } from "../catalog/catalogModel";
import { changedFields, diffProduct, fieldValue, type EditableField, type FieldEdits, type FieldErrors } from "../catalog/diff";
import { invalidateCatalog, patchCatalog } from "../catalog/useRetailCatalog";

// "Edit as sheet": the Stock table as a spreadsheet for bulk edits of price, reorder level, category
// and brand. Only the cells that changed are sent, one PUT per changed product, and a refused row
// keeps its edits and shows the problem on its cells.
// (The Equipment Sheet grid is built around equipment's fields, so this is a smaller grid of its own.)

const NUM = { fontVariantNumeric: "tabular-nums" } as const;
export const SHEET_MAX_ROWS = 300;
const COLS: Array<{ key: EditableField; label: string; kind: "text" | "number" | "category" | "brand"; width: number }> = [
  { key: "sell_price", label: "retail.sheet.sell", kind: "number", width: 96 },
  { key: "contractor_price", label: "retail.sheet.contractor", kind: "number", width: 96 },
  { key: "reorder_level", label: "retail.sheet.reorder", kind: "number", width: 80 },
  { key: "category_id", label: "retail.sheet.category", kind: "category", width: 180 },
  { key: "brand_id", label: "retail.sheet.brand", kind: "brand", width: 140 },
];

interface RowError {
  cells: FieldErrors;
  message?: string;
}

interface Props {
  products: CatalogProduct[];
  ctx: CatalogCtx;
  categories: RetailCategory[];
  brands: RetailBrand[];
  rowHeight: number;
  /** Called after a save with the ids that were saved. */
  onSaved?: (ids: number[]) => void;
}

const CONCURRENCY = 4;

export function StockSheet({ products, ctx, categories, brands, rowHeight, onSaved }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<number, FieldEdits>>({});
  const [errors, setErrors] = useState<Record<number, RowError>>({});
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);

  const rows = products.slice(0, SHEET_MAX_ROWS);
  const byId = useMemo(() => new Map(rows.map((p) => [p.product_id, p])), [rows]);

  // Categories a product can sit in: the lowest level (a sub-category, or a category with none).
  const leafCategories = useMemo(() => {
    const parents = new Set(categories.map((c) => c.parent_id).filter((x): x is number => x != null));
    return categories
      .filter((c) => c.is_active !== false && !parents.has(c.category_id))
      .map((c) => ({ id: c.category_id, label: categoryPath(ctx, c.category_id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, ctx]);

  const valueOf = (p: CatalogProduct, f: EditableField) => edits[p.product_id]?.[f] ?? fieldValue(p, f);
  const isChanged = (p: CatalogProduct, f: EditableField) => {
    const e = edits[p.product_id];
    return !!e && changedFields(p, { [f]: e[f] ?? fieldValue(p, f) } as FieldEdits).length > 0;
  };
  const dirtyIds = Object.keys(edits)
    .map(Number)
    .filter((id) => byId.has(id) && changedFields(byId.get(id)!, edits[id]).length > 0);
  const changeCount = dirtyIds.reduce((n, id) => n + changedFields(byId.get(id)!, edits[id]).length, 0);

  const setCell = (p: CatalogProduct, f: EditableField, value: string) => {
    setEdits((cur) => ({ ...cur, [p.product_id]: { ...cur[p.product_id], [f]: value } }));
    if (errors[p.product_id]?.cells[f]) setErrors((cur) => ({ ...cur, [p.product_id]: { ...cur[p.product_id], cells: { ...cur[p.product_id].cells, [f]: undefined } } }));
  };

  const move = (e: KeyboardEvent, rowIndex: number, col: EditableField) => {
    const delta = e.key === "ArrowDown" || e.key === "Enter" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!delta || e.nativeEvent.isComposing) return;
    e.preventDefault();
    e.stopPropagation();
    const target = tableRef.current?.querySelector<HTMLElement>(`[data-cell="${rowIndex + delta}:${col}"]`);
    target?.focus();
  };

  const discard = () => {
    setEdits({});
    setErrors({});
    setNote(null);
  };

  const save = async () => {
    setSaving(true);
    setNote(null);
    const nextErrors: Record<number, RowError> = {};
    const jobs: Array<{ id: number; input: ReturnType<typeof diffProduct>["input"] }> = [];
    for (const id of dirtyIds) {
      const { input, errors: cellErrors } = diffProduct(byId.get(id)!, edits[id]);
      if (Object.keys(cellErrors).length) nextErrors[id] = { cells: cellErrors };
      else jobs.push({ id, input });
    }
    const saved: number[] = [];
    for (let i = 0; i < jobs.length; i += CONCURRENCY) {
      await Promise.all(
        jobs.slice(i, i + CONCURRENCY).map(async ({ id, input }) => {
          try {
            const p = await updateProduct(id, input);
            patchCatalog(qc, [{ ...byId.get(id)!, ...input, ...p }]);
            saved.push(id);
          } catch (err: any) {
            const server = err?.response?.data?.errors;
            const cells: FieldErrors = {};
            if (server && typeof server === "object" && !Array.isArray(server)) {
              for (const [k, v] of Object.entries(server)) if (COLS.some((c) => c.key === k) || k === "name") cells[k as EditableField] = String(v);
            }
            nextErrors[id] = { cells, message: Object.keys(cells).length ? undefined : errorMessage(err, t("retail.sheet.rowFailed")) };
          }
        }),
      );
    }
    setErrors(nextErrors);
    if (saved.length) {
      setEdits((cur) => {
        const rest = { ...cur };
        saved.forEach((id) => delete rest[id]);
        return rest;
      });
      invalidateCatalog(qc);
      onSaved?.(saved);
    }
    setNote(Object.keys(nextErrors).length ? t("retail.sheet.someFailed", { saved: saved.length, failed: Object.keys(nextErrors).length }) : t("retail.sheet.allSaved", { count: saved.length }));
    setSaving(false);
  };

  const head = { fontWeight: 800, py: 0.5, whiteSpace: "nowrap", bgcolor: "background.paper" } as const;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", pb: 1, flexWrap: "wrap" }}>
        <Typography variant="body2" sx={{ fontWeight: 700, ...NUM }} data-testid="sheet-count">
          {t("retail.sheet.changes", { count: changeCount })}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<UndoIcon />} disabled={saving || dirtyIds.length === 0} onClick={discard}>
          {t("retail.sheet.discard")}
        </Button>
        <Button size="small" variant="contained" startIcon={<CheckIcon />} disabled={saving || dirtyIds.length === 0} onClick={() => void save()}>
          {t("common.save")}
        </Button>
      </Stack>
      {products.length > SHEET_MAX_ROWS && (
        <Alert severity="info" sx={{ mb: 1 }}>
          {t("retail.sheet.capped", { count: SHEET_MAX_ROWS })}
        </Alert>
      )}
      {note && (
        <Alert severity={Object.keys(errors).length ? "warning" : "success"} sx={{ mb: 1 }} onClose={() => setNote(null)}>
          {note}
        </Alert>
      )}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <Table size="small" stickyHeader ref={tableRef} sx={{ minWidth: 900 }} aria-label={t("retail.sheet.title")}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...head, minWidth: 220 }}>{t("retail.stock.colName")}</TableCell>
              <TableCell sx={head}>{t("retail.stock.colCode")}</TableCell>
              {COLS.map((c) => (
                <TableCell key={c.key} sx={head} align={c.kind === "number" ? "right" : "left"}>
                  {t(c.label)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((p, rowIndex) => {
              const rowError = errors[p.product_id];
              return (
                <TableRow key={p.product_id} data-testid="sheet-row" sx={{ height: rowHeight }}>
                  <TableCell sx={{ py: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {p.name}
                    </Typography>
                    {rowError?.message && (
                      <Typography variant="caption" color="error">
                        {rowError.message}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ py: 0.25, ...NUM }}>{p.code}</TableCell>
                  {COLS.map((c) => {
                    const changed = isChanged(p, c.key);
                    const err = rowError?.cells[c.key];
                    const common = {
                      "data-cell": `${rowIndex}:${c.key}`,
                      "aria-label": `${t(c.label)} ${p.name}`,
                      "aria-invalid": err ? true : undefined,
                    };
                    return (
                      <TableCell
                        key={c.key}
                        align={c.kind === "number" ? "right" : "left"}
                        sx={(theme) => ({
                          py: 0.25,
                          px: 0.75,
                          width: c.width,
                          bgcolor: err ? alpha(theme.palette.error.main, 0.14) : changed ? alpha(theme.palette.primary.main, 0.14) : undefined,
                        })}
                      >
                        <Tooltip title={err ? t(err) : ""} disableHoverListener={!err} open={err ? undefined : false} placement="top">
                          {c.kind === "category" || c.kind === "brand" ? (
                            <Box
                              component="select"
                              value={valueOf(p, c.key)}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCell(p, c.key, e.target.value)}
                              onKeyDown={(e: KeyboardEvent) => move(e, rowIndex, c.key)}
                              {...common}
                              sx={{ width: "100%", fontSize: 13, border: 0, outline: 0, bgcolor: "transparent", color: "inherit", fontFamily: "inherit", py: 0.5 }}
                            >
                              <option value="">—</option>
                              {c.kind === "category"
                                ? leafCategories.map((o) => (
                                    <option key={o.id} value={String(o.id)}>
                                      {o.label}
                                    </option>
                                  ))
                                : brands
                                    .filter((b) => b.is_active !== false)
                                    .map((b) => (
                                      <option key={b.brand_id} value={String(b.brand_id)}>
                                        {b.name}
                                      </option>
                                    ))}
                            </Box>
                          ) : (
                            <InputBase
                              fullWidth
                              value={valueOf(p, c.key)}
                              onChange={(e) => setCell(p, c.key, e.target.value)}
                              onKeyDown={(e) => move(e, rowIndex, c.key)}
                              inputProps={{ ...common, inputMode: "decimal", style: { textAlign: "right", fontSize: 13, ...NUM } }}
                            />
                          )}
                        </Tooltip>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
