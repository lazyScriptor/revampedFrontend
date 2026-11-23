import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Overlay, useOverlay, type OverlayComponentProps } from "@/components/overlay";
import { useToast } from "@/components/ui/AppToast";
import { createBrand } from "../api/catalog.api";
import { errorMessage } from "../api/http";
import {
  BASE_UNITS,
  DECIMAL_UNITS,
  type CatalogProduct,
  type CategoryAttribute,
  type FamilyInput,
  type ProductInput,
  type SerialCapture,
  type Tracking,
} from "../api/catalog.types";
import { CatIcon } from "../components/CategoryIcon";
import { Tile } from "../components/Tile";
import { prefillFromWords } from "../catalog/catalogModel";
import { generateFamilyName, generateName, singularTitle } from "../catalog/names";
import { useScanDetector } from "../catalog/scanDetector";
import { useCreateFamily, useCreateProduct } from "../catalog/mutations";
import { BRANDS_KEY, invalidateCatalog, useRetailCatalog, useRetailPermissions } from "../catalog/useRetailCatalog";
import { useRetailSettings } from "../hooks/useRetailSettings";
import { NEW_ITEM_OVERLAY_ID } from "../catalog/overlayIds";

export { NEW_ITEM_OVERLAY_ID };

const STEPS = 5;
const PACK_CHIPS = ["box", "coil", "length", "tin", "bag", "roll"];
const TRACKING: Tracking[] = ["counted", "serial", "untracked"];

interface Row {
  sell: string;
  contractor: string;
  cost: string;
  barcode: string;
}
const blankRow = (): Row => ({ sell: "", contractor: "", cost: "", barcode: "" });
const num = (v: string): number | null => (v.trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const NO_SIZE = "_";

interface Props extends OverlayComponentProps {
  /** Words typed in the finder: pre-selects the brand, category and sizes they name. */
  prefillWords?: string;
  /** Called with the saved items just before the overlay closes. */
  onCreated?: (products: CatalogProduct[]) => void;
}

/** New item / new family as a step-by-tile overlay (plan §7.2): category, brand, sizes, prices, extras. */
function NewItemOverlay({ prefillWords, onCreated }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const overlay = useOverlay();
  const toast = useToast();
  const { canCost } = useRetailPermissions();
  const { catalog, index, ready } = useRetailCatalog();
  const { settings } = useRetailSettings();
  const createFamilyMut = useCreateFamily();
  const createProductMut = useCreateProduct();

  const [step, setStep] = useState(1);
  const [topId, setTopId] = useState<number | null>(null);
  const [subId, setSubId] = useState<number | null>(null);
  const [brandId, setBrandId] = useState<number | null | undefined>(undefined);
  const [itemWord, setItemWord] = useState("");
  const [wordEdited, setWordEdited] = useState(false);
  const [sizes, setSizes] = useState<string[]>([]);
  const [typedSize, setTypedSize] = useState("");
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [tracking, setTracking] = useState<Tracking>("counted");
  const [serialCapture, setSerialCapture] = useState<SerialCapture>("receive");
  const [warranty, setWarranty] = useState("");
  const [reorder, setReorder] = useState("");
  const [baseUnit, setBaseUnit] = useState<string>("pcs");
  const [unitTouched, setUnitTouched] = useState(false);
  const [packs, setPacks] = useState<Array<{ unit_name: string; factor: string }>>([]);
  const [addingBrand, setAddingBrand] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // The detector swallows a scanner's Enter, so a scan into a barcode box does not advance a step.
  useScanDetector(() => {});

  const ctx = index.ctx;
  const cats = catalog.categories.filter((c) => c.is_active !== false);
  const tops = cats.filter((c) => c.parent_id == null).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
  const childrenOf = (id: number | null) => cats.filter((c) => c.parent_id === id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
  const subs = topId != null ? childrenOf(topId) : [];
  const top = topId != null ? ctx.categories.get(topId) : undefined;
  const leaf = subId != null ? ctx.categories.get(subId) : subs.length === 0 ? top : undefined;
  const brands = catalog.brands.filter((b) => b.is_active !== false).sort((a, b) => a.name.localeCompare(b.name));
  const brand = brandId != null ? ctx.brands.get(brandId) : undefined;

  // The sub-category's own attributes win; the category's are the fallback.
  const attrs: CategoryAttribute[] = (leaf?.attributes?.length ? leaf.attributes : top?.attributes) ?? [];
  const variantAttr = attrs.find((a) => a.variant) ?? attrs[0];
  const usualSizes = (variantAttr?.values ?? []).map(String);
  const optionLabel = variantAttr?.name ?? "Size";
  const optionUnit = variantAttr?.unit ?? null;

  // Pre-fill from the finder's typed words, once the catalogue is there.
  useEffect(() => {
    if (prefilled || !ready || !prefillWords) return;
    setPrefilled(true);
    const p = prefillFromWords(prefillWords, ctx);
    if (p.categoryId != null) setTopId(p.categoryId);
    if (p.subCategoryId != null) setSubId(p.subCategoryId);
    if (p.brandId != null) setBrandId(p.brandId);
    if (p.sizes.length) setSizes(p.sizes.map((s) => s.replace(/(mm|cm|m|ft|inch|in|l|kg|g)$/i, "")));
    if (p.leftover && p.categoryId == null) {
      setItemWord(singularTitle(p.leftover));
      setWordEdited(true);
    }
    if (p.categoryId != null && (p.subCategoryId != null || childrenOf(p.categoryId).length === 0)) setStep(p.brandId != null ? 3 : 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, prefillWords, prefilled]);

  // Default name word and unit follow the category until the user changes them.
  useEffect(() => {
    if (wordEdited || !leaf) return;
    // The category's own item name; without one the category name is used as it is (no duplication).
    setItemWord(leaf.item_name?.trim() || leaf.name);
  }, [leaf, wordEdited]);
  useEffect(() => {
    if (unitTouched) return;
    const d = leaf?.default_unit || top?.default_unit;
    if (d && (BASE_UNITS as readonly string[]).includes(d)) setBaseUnit(d);
  }, [leaf, top, unitTouched]);

  const rowKeys = sizes.length ? sizes : [NO_SIZE];
  const rowOf = (k: string): Row => rows[k] ?? blankRow();
  const setRow = (k: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [k]: { ...(r[k] ?? blankRow()), ...patch } }));

  const nameParts = {
    brand: brand?.name,
    item: itemWord,
    pattern: settings.namePattern,
  };
  const nameFor = (size: string) => generateName({ ...nameParts, variant: size === NO_SIZE ? "" : size, unit: optionUnit });
  const previewName = leaf ? nameFor(rowKeys[0]) : "";

  const toggleSize = (s: string) => setSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const addTyped = () => {
    const v = typedSize.trim();
    if (!v) return;
    setSizes((cur) => (cur.includes(v) ? cur : [...cur, v]));
    setTypedSize("");
  };

  const sameForAll = () => {
    const first = rowOf(rowKeys[0]);
    setRows(Object.fromEntries(rowKeys.map((k) => [k, { ...rowOf(k), sell: first.sell, contractor: first.contractor, cost: first.cost }])));
  };

  const pricesValid = rowKeys.every((k) => {
    const r = rowOf(k);
    const sell = num(r.sell);
    const con = num(r.contractor);
    const cost = num(r.cost);
    return sell !== null && sell >= 0 && (r.contractor.trim() === "" || (con !== null && con >= 0)) && (r.cost.trim() === "" || (cost !== null && cost >= 0));
  });
  const packsValid = packs.every((p) => (num(p.factor) ?? 0) > 0);

  const canNext = (s: number) => {
    if (s === 1) return !!leaf;
    if (s === 2) return brandId !== undefined;
    if (s === 3) return true;
    if (s === 4) return pricesValid;
    return true;
  };

  const addBrand = async () => {
    const name = brandName.trim();
    if (!name) return;
    try {
      const b = await createBrand({ name });
      await qc.invalidateQueries({ queryKey: BRANDS_KEY });
      invalidateCatalog(qc);
      setBrandId(b.brand_id);
      setBrandName("");
      setAddingBrand(false);
    } catch (err) {
      setError(errorMessage(err, t("retail.item.saveFailed")));
    }
  };

  const save = async () => {
    if (!leaf || !pricesValid || !packsValid) return;
    setSaving(true);
    setError(null);
    try {
      const units = packs.filter((p) => p.unit_name && (num(p.factor) ?? 0) > 0).map((p) => ({ unit_name: p.unit_name, factor: Number(p.factor) }));
      const shared = {
        tracking,
        serial_capture: tracking === "serial" ? serialCapture : null,
        base_unit: baseUnit,
        allow_decimal: DECIMAL_UNITS.includes(baseUnit),
        reorder_level: num(reorder),
        warranty_months: tracking === "serial" ? num(warranty) : null,
      };
      let created: CatalogProduct[];
      if (sizes.length > 0) {
        const input: FamilyInput = {
          name: generateFamilyName(nameParts),
          category_id: leaf.category_id,
          brand_id: brandId ?? null,
          option_label: optionLabel,
          option_unit: optionUnit,
          variants: sizes.map((s) => {
            const r = rowOf(s);
            return {
              variant_label: s,
              sell_price: Number(r.sell),
              ...(r.contractor.trim() ? { contractor_price: Number(r.contractor) } : {}),
              ...(canCost && r.cost.trim() ? { cost: Number(r.cost) } : {}),
              ...(r.barcode.trim() ? { barcode: r.barcode.trim() } : {}),
            };
          }),
          shared: { ...shared, units },
        };
        created = (await createFamilyMut.mutateAsync(input)).products;
      } else {
        const r = rowOf(NO_SIZE);
        const input: ProductInput = {
          name: previewName || undefined,
          category_id: leaf.category_id,
          brand_id: brandId ?? null,
          ...shared,
          sell_price: Number(r.sell),
          contractor_price: r.contractor.trim() ? Number(r.contractor) : null,
          ...(canCost && r.cost.trim() ? { cost: Number(r.cost) } : {}),
          ...(r.barcode.trim() ? { barcode: r.barcode.trim() } : {}),
          units,
        };
        created = [await createProductMut.mutateAsync(input)];
      }
      toast.showSuccess(t("retail.item.created", { count: created.length || sizes.length || 1 }));
      await overlay.close();
      onCreated?.(created);
    } catch (err) {
      setError(errorMessage(err, t("retail.item.saveFailed")));
    } finally {
      setSaving(false);
    }
  };

  const onConfirm = () => {
    if (saving) return;
    if (step < STEPS) {
      if (canNext(step)) setStep(step + 1);
    } else void save();
  };

  const stepTitle = [
    "",
    t("retail.item.stepCategory"),
    t("retail.item.stepBrand"),
    t("retail.item.stepSizes"),
    t("retail.item.stepPrices"),
    t("retail.item.stepExtras"),
  ][step];

  const footer = (
    <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
      <Button disabled={step === 1 || saving} onClick={() => setStep(step - 1)} sx={{ minHeight: 44 }}>
        {t("common.back")}
      </Button>
      <Stack direction="row" spacing={1}>
        {step >= 4 && step < STEPS && (
          <Button variant="outlined" disabled={!leaf || !pricesValid || saving} onClick={() => void save()} startIcon={<CheckIcon />} sx={{ minHeight: 44 }}>
            {t("common.save")}
          </Button>
        )}
        {step < STEPS ? (
          <Button variant="contained" disabled={!canNext(step)} onClick={() => setStep(step + 1)} endIcon={<NavigateNextIcon />} sx={{ minHeight: 44 }}>
            {t("common.next")}
          </Button>
        ) : (
          <Button variant="contained" disabled={!leaf || !pricesValid || !packsValid || saving} onClick={() => void save()} startIcon={saving ? <CircularProgress size={16} /> : <CheckIcon />} sx={{ minHeight: 44 }}>
            {t("common.save")}
          </Button>
        )}
      </Stack>
    </Stack>
  );

  return (
    <Overlay title={t("retail.item.newTitle")} width={560} onConfirm={onConfirm} footer={footer}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* The generated name is always visible. */}
        <Box sx={{ p: 1.25, borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "action.hover" }} data-testid="name-preview">
          <Typography variant="caption" color="text.secondary">
            {t("retail.item.namePreview")}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
            {previewName || "—"}
            {sizes.length > 1 && (
              <Chip size="small" label={`+${sizes.length - 1}`} sx={{ ml: 1, fontVariantNumeric: "tabular-nums" }} />
            )}
          </Typography>
        </Box>

        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, lineHeight: 1 }}>
          {`${step}/${STEPS} · ${stepTitle}`}
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!ready && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {/* 1: category, then sub-category */}
        {ready && step === 1 && (
          <Box>
            {tops.length === 0 && <Alert severity="info">{t("retail.item.noCategories")}</Alert>}
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }} data-testid="category-tiles">
              {tops.map((c) => (
                <Tile
                  key={c.category_id}
                  label={c.name}
                  imageUrl={c.image_url}
                  media={<CatIcon name={c.icon} />}
                  selected={topId === c.category_id}
                  onClick={() => {
                    setTopId(c.category_id);
                    setSubId(null);
                    setSizes([]);
                    if (childrenOf(c.category_id).length === 0) setStep(2);
                  }}
                />
              ))}
            </Stack>
            {top && subs.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {top.name}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }} data-testid="subcategory-tiles">
                  {subs.map((c) => (
                    <Tile
                      key={c.category_id}
                      dense
                      label={c.name}
                      imageUrl={c.image_url}
                      media={<CatIcon name={c.icon || top.icon} />}
                      selected={subId === c.category_id}
                      onClick={() => {
                        setSubId(c.category_id);
                        setSizes([]);
                        setStep(2);
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        )}

        {/* 2: brand */}
        {ready && step === 2 && (
          <Box>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }} data-testid="brand-tiles">
              {brands.map((b) => (
                <Tile
                  key={b.brand_id}
                  label={b.name}
                  imageUrl={b.logo_url}
                  media={<Typography sx={{ fontWeight: 900, fontSize: 20 }}>{b.name.charAt(0).toUpperCase()}</Typography>}
                  selected={brandId === b.brand_id}
                  onClick={() => {
                    setBrandId(b.brand_id);
                    setStep(3);
                  }}
                />
              ))}
              <Tile label={t("retail.item.noBrand")} media={<CatIcon name="Category" />} selected={brandId === null} onClick={() => { setBrandId(null); setStep(3); }} />
              <Tile label={t("retail.item.addBrand")} media={<AddIcon />} onClick={() => setAddingBrand(true)} />
            </Stack>
            {addingBrand && (
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <TextField
                  autoFocus
                  size="small"
                  fullWidth
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder={t("retail.item.brandName")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      void addBrand();
                    }
                  }}
                  slotProps={{ htmlInput: { "aria-label": t("retail.item.brandName") } }}
                />
                <Button variant="contained" onClick={() => void addBrand()} disabled={!brandName.trim()}>
                  {t("common.add")}
                </Button>
              </Stack>
            )}
          </Box>
        )}

        {/* 3: sizes (several make a family) and the name word */}
        {ready && step === 3 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {optionUnit ? `${optionLabel} (${optionUnit})` : optionLabel}
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }} data-testid="size-chips">
                {[...usualSizes, ...sizes.filter((s) => !usualSizes.includes(s))].map((s) => (
                  <Chip
                    key={s}
                    clickable
                    label={s}
                    color={sizes.includes(s) ? "primary" : "default"}
                    variant={sizes.includes(s) ? "filled" : "outlined"}
                    onClick={() => toggleSize(s)}
                    sx={{ minHeight: 40, minWidth: 48, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                  />
                ))}
              </Stack>
              <TextField
                size="small"
                value={typedSize}
                onChange={(e) => setTypedSize(e.target.value)}
                placeholder={t("retail.item.typeSize")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && typedSize.trim()) {
                    e.preventDefault();
                    e.stopPropagation();
                    addTyped();
                  }
                }}
                sx={{ mt: 1.5, maxWidth: 260 }}
                slotProps={{
                  htmlInput: { "aria-label": t("retail.item.typeSize") },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={addTyped} aria-label={t("common.add")}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                {sizes.length > 1 ? t("retail.item.familyHint", { count: sizes.length }) : t("retail.item.sizesOptional")}
              </Typography>
            </Box>
            <TextField
              size="small"
              label={t("retail.item.nameWord")}
              value={itemWord}
              onChange={(e) => {
                setItemWord(e.target.value);
                setWordEdited(true);
              }}
              sx={{ maxWidth: 320 }}
            />
          </Box>
        )}

        {/* 4: price strip */}
        {ready && step === 4 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }} data-testid="price-strip">
            {rowKeys.length > 1 && (
              <Box>
                <Button size="small" startIcon={<ContentCopyIcon />} onClick={sameForAll}>
                  {t("retail.item.sameForAll")}
                </Button>
              </Box>
            )}
            {rowKeys.map((k) => {
              const r = rowOf(k);
              return (
                <Stack key={k} direction="row" spacing={1} data-testid="price-row" sx={{ alignItems: "center" }}>
                  <Typography variant="body2" sx={{ width: 64, fontWeight: 800, fontVariantNumeric: "tabular-nums" }} noWrap>
                    {k === NO_SIZE ? t("retail.item.price") : k}
                  </Typography>
                  <TextField size="small" label={t("retail.item.sell")} value={r.sell} onChange={(e) => setRow(k, { sell: e.target.value })} error={r.sell !== "" && num(r.sell) === null} slotProps={{ htmlInput: { inputMode: "decimal", "aria-label": `${t("retail.item.sell")} ${k === NO_SIZE ? "" : k}`.trim(), style: { fontVariantNumeric: "tabular-nums" } } }} sx={{ flex: 1, minWidth: 0 }} />
                  <TextField size="small" label={t("retail.item.contractor")} value={r.contractor} onChange={(e) => setRow(k, { contractor: e.target.value })} slotProps={{ htmlInput: { inputMode: "decimal", "aria-label": `${t("retail.item.contractor")} ${k === NO_SIZE ? "" : k}`.trim(), style: { fontVariantNumeric: "tabular-nums" } } }} sx={{ flex: 1, minWidth: 0 }} />
                  {canCost && (
                    <TextField size="small" label={t("retail.item.cost")} value={r.cost} onChange={(e) => setRow(k, { cost: e.target.value })} slotProps={{ htmlInput: { inputMode: "decimal", "aria-label": `${t("retail.item.cost")} ${k === NO_SIZE ? "" : k}`.trim(), style: { fontVariantNumeric: "tabular-nums" } } }} sx={{ flex: 1, minWidth: 0 }} />
                  )}
                </Stack>
              );
            })}
          </Box>
        )}

        {/* 5: optional extras */}
        {ready && step === 5 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {t("retail.item.barcode")}
              </Typography>
              <Stack spacing={1} sx={{ mt: 0.5 }}>
                {rowKeys.map((k) => (
                  <TextField
                    key={k}
                    size="small"
                    value={rowOf(k).barcode}
                    onChange={(e) => setRow(k, { barcode: e.target.value })}
                    placeholder={k === NO_SIZE ? t("retail.item.scanBarcode") : `${k} · ${t("retail.item.scanBarcode")}`}
                    slotProps={{ htmlInput: { "data-scan": "true", "aria-label": `${t("retail.item.barcode")} ${k === NO_SIZE ? "" : k}`.trim(), style: { fontVariantNumeric: "tabular-nums" } } }}
                  />
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {t("retail.item.unit")}
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
                {BASE_UNITS.map((u) => (
                  <Chip key={u} clickable label={u} color={baseUnit === u ? "primary" : "default"} variant={baseUnit === u ? "filled" : "outlined"} onClick={() => { setBaseUnit(u); setUnitTouched(true); }} sx={{ minHeight: 36 }} />
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {t("retail.item.packUnits")}
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
                {PACK_CHIPS.map((u) => {
                  const on = packs.some((p) => p.unit_name === u);
                  return (
                    <Chip key={u} clickable label={u} color={on ? "primary" : "default"} variant={on ? "filled" : "outlined"} onClick={() => setPacks((cur) => (on ? cur.filter((p) => p.unit_name !== u) : [...cur, { unit_name: u, factor: "" }]))} sx={{ minHeight: 36 }} />
                  );
                })}
              </Stack>
              {packs.map((p) => (
                <Stack key={p.unit_name} direction="row" spacing={1} sx={{ alignItems: "center", mt: 1 }}>
                  <Typography variant="body2" sx={{ width: 64, fontWeight: 700 }}>
                    {p.unit_name}
                  </Typography>
                  <TextField
                    size="small"
                    value={p.factor}
                    error={p.factor !== "" && (num(p.factor) ?? 0) <= 0}
                    onChange={(e) => setPacks((cur) => cur.map((x) => (x.unit_name === p.unit_name ? { ...x, factor: e.target.value } : x)))}
                    placeholder={t("retail.item.factor", { unit: baseUnit })}
                    slotProps={{ htmlInput: { inputMode: "decimal", "aria-label": `${p.unit_name} ${t("retail.item.factorLabel")}`, style: { fontVariantNumeric: "tabular-nums" } } }}
                    sx={{ maxWidth: 220 }}
                  />
                  <Tooltip title={t("common.remove")}>
                    <IconButton size="small" onClick={() => setPacks((cur) => cur.filter((x) => x.unit_name !== p.unit_name))} aria-label={t("common.remove")}>
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {t("retail.item.tracking")}
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
                {TRACKING.map((tr) => (
                  <Chip key={tr} clickable label={t(`retail.item.tracking_${tr}`)} color={tracking === tr ? "primary" : "default"} variant={tracking === tr ? "filled" : "outlined"} onClick={() => setTracking(tr)} sx={{ minHeight: 36 }} />
                ))}
              </Stack>
              {tracking === "serial" && (
                <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", mt: 1 }}>
                  {(["receive", "sale"] as SerialCapture[]).map((c) => (
                    <Chip key={c} clickable size="small" label={t(`retail.item.capture_${c}`)} color={serialCapture === c ? "primary" : "default"} variant={serialCapture === c ? "filled" : "outlined"} onClick={() => setSerialCapture(c)} />
                  ))}
                  <TextField size="small" value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder={t("retail.item.warrantyMonths")} slotProps={{ htmlInput: { inputMode: "numeric", "aria-label": t("retail.item.warrantyMonths"), style: { fontVariantNumeric: "tabular-nums" } } }} sx={{ width: 150 }} />
                </Stack>
              )}
            </Box>

            <TextField size="small" label={t("retail.item.reorder")} value={reorder} onChange={(e) => setReorder(e.target.value)} slotProps={{ htmlInput: { inputMode: "decimal", style: { fontVariantNumeric: "tabular-nums" } } }} sx={{ maxWidth: 200 }} />
          </Box>
        )}
      </Box>
    </Overlay>
  );
}

export default NewItemOverlay;
