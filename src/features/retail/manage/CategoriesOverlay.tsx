import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CallMergeIcon from "@mui/icons-material/CallMerge";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Overlay, type OverlayComponentProps } from "@/components/overlay";
import { useToast } from "@/components/ui/AppToast";
import { createCategory, deleteCategory, flattenCategories, mergeCategory, updateCategory } from "../api/catalog.api";
import { errorMessage } from "../api/http";
import { BASE_UNITS, type CategoryAttribute, type RetailCategory } from "../api/catalog.types";
import { CATEGORY_ICON_NAMES, CatIcon } from "../components/CategoryIcon";
import { invalidateCatalog, useCategoriesQuery, useRetailPermissions } from "../catalog/useRetailCatalog";
import { reorderSiblings } from "./reorder";

type View = { kind: "list" } | { kind: "edit"; id: number | null; parentId: number | null };

interface Draft {
  name: string;
  name_si: string;
  item_name: string;
  item_name_si: string;
  icon: string;
  default_unit: string;
  is_active: boolean;
  attributes: Array<CategoryAttribute & { _values: string }>;
}

const toDraft = (c?: RetailCategory): Draft => ({
  name: c?.name ?? "",
  name_si: c?.name_si ?? "",
  item_name: c?.item_name ?? "",
  item_name_si: c?.item_name_si ?? "",
  icon: c?.icon ?? "Category",
  default_unit: c?.default_unit ?? "",
  is_active: c?.is_active !== false,
  attributes: (c?.attributes ?? []).map((a) => ({ ...a, _values: "" })),
});

/** Category tree: order, rename (with Sinhala), icon, usual sizes and units, merge, remove (plan §5.7). */
function CategoriesOverlay({ onClose: _onClose }: OverlayComponentProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const { canManage } = useRetailPermissions();
  const { data = [], isLoading } = useCategoriesQuery();
  const [view, setView] = useState<View>({ kind: "list" });
  const [draft, setDraft] = useState<Draft>(toDraft());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");

  const tree = useMemo(() => {
    // The server may send a tree or a flat list: rebuild the tree from parent_id either way.
    const flat = flattenCategories(data);
    const seen = new Map(flat.map((c) => [c.category_id, c]));
    const all = [...seen.values()];
    const sorted = (list: RetailCategory[]) => [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
    return sorted(all.filter((c) => c.parent_id == null)).map((c) => ({ ...c, children: sorted(all.filter((x) => x.parent_id === c.category_id)) }));
  }, [data]);
  const flat = useMemo(() => tree.flatMap((c) => [c, ...(c.children ?? [])]), [tree]);

  const refresh = () => invalidateCatalog(qc);

  const move = async (siblings: RetailCategory[], index: number, dir: -1 | 1) => {
    const changes = reorderSiblings(siblings.map((s) => ({ id: s.category_id, sort_order: s.sort_order })), index, dir);
    if (!changes.length) return;
    setBusy(true);
    try {
      await Promise.all(changes.map((c) => updateCategory(c.id, { sort_order: c.sort_order })));
      refresh();
    } catch (err) {
      setError(errorMessage(err, t("retail.manage.saveFailed")));
    } finally {
      setBusy(false);
    }
  };

  const open = (id: number | null, parentId: number | null) => {
    setDraft(toDraft(id != null ? flat.find((c) => c.category_id === id) : undefined));
    setMergeTarget("");
    setError(null);
    setView({ kind: "edit", id, parentId });
  };

  const save = async () => {
    if (view.kind !== "edit" || !draft.name.trim()) return;
    setBusy(true);
    setError(null);
    const body = {
      name: draft.name.trim(),
      name_si: draft.name_si.trim() || null,
      item_name: draft.item_name.trim() || null,
      item_name_si: draft.item_name_si.trim() || null,
      icon: draft.icon || null,
      default_unit: draft.default_unit || null,
      is_active: draft.is_active,
      attributes: draft.attributes
        .filter((a) => a.name.trim())
        .map(({ _values, ...a }) => ({ ...a, name: a.name.trim(), unit: a.unit?.trim() || null, values: a.values ?? [], variant: !!a.variant })),
    };
    try {
      if (view.id == null) await createCategory({ ...body, parent_id: view.parentId });
      else await updateCategory(view.id, body);
      refresh();
      toast.showSuccess(t("retail.manage.saved"));
      setView({ kind: "list" });
    } catch (err) {
      setError(errorMessage(err, t("retail.manage.saveFailed")));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (view.kind !== "edit" || view.id == null) return;
    setBusy(true);
    try {
      await deleteCategory(view.id);
      refresh();
      setView({ kind: "list" });
    } catch (err: any) {
      // 409: it still has items; merge it into another category instead.
      setError(err?.response?.status === 409 ? t("retail.manage.hasItems") : errorMessage(err, t("retail.manage.saveFailed")));
    } finally {
      setBusy(false);
    }
  };

  const merge = async () => {
    if (view.kind !== "edit" || view.id == null || !mergeTarget) return;
    setBusy(true);
    try {
      await mergeCategory(view.id, Number(mergeTarget));
      refresh();
      toast.showSuccess(t("retail.manage.merged"));
      setView({ kind: "list" });
    } catch (err) {
      setError(errorMessage(err, t("retail.manage.saveFailed")));
    } finally {
      setBusy(false);
    }
  };

  const setAttr = (i: number, patch: Partial<Draft["attributes"][number]>) =>
    setDraft((d) => ({ ...d, attributes: d.attributes.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));
  const addValues = (i: number) => {
    const a = draft.attributes[i];
    const add = a._values.split(",").map((v) => v.trim()).filter(Boolean);
    if (!add.length) return;
    const have = (a.values ?? []).map(String);
    setAttr(i, { values: [...have, ...add.filter((v) => !have.includes(v))], _values: "" });
  };

  const row = (c: RetailCategory, siblings: RetailCategory[], index: number, depth: number) => (
    <Stack key={c.category_id} direction="row" spacing={0.5} sx={{ alignItems: "center", pl: depth * 3, py: 0.5, borderBottom: 1, borderColor: "divider", opacity: c.is_active === false ? 0.55 : 1 }} data-testid="category-row">
      <Box sx={{ width: 28, display: "flex", color: "text.secondary" }}>
        <CatIcon name={c.icon} fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: depth ? 600 : 800 }} noWrap>
          {c.name}
        </Typography>
        {c.name_si && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {c.name_si}
          </Typography>
        )}
      </Box>
      <Chip size="small" label={c.item_count ?? 0} sx={{ fontVariantNumeric: "tabular-nums" }} />
      {canManage && (
        <>
          <Tooltip title={t("retail.manage.moveUp")}>
            <span>
              <IconButton size="small" disabled={index === 0 || busy} onClick={() => void move(siblings, index, -1)} aria-label={`${t("retail.manage.moveUp")} ${c.name}`}>
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t("retail.manage.moveDown")}>
            <span>
              <IconButton size="small" disabled={index === siblings.length - 1 || busy} onClick={() => void move(siblings, index, 1)} aria-label={`${t("retail.manage.moveDown")} ${c.name}`}>
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {depth === 0 && (
            <Tooltip title={t("retail.manage.addSub")}>
              <IconButton size="small" onClick={() => open(null, c.category_id)} aria-label={`${t("retail.manage.addSub")} ${c.name}`}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t("common.edit")}>
            <IconButton size="small" onClick={() => open(c.category_id, c.parent_id)} aria-label={`${t("common.edit")} ${c.name}`}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Stack>
  );

  if (view.kind === "edit") {
    const editingExisting = view.id != null;
    return (
      <Overlay
        title={editingExisting ? t("retail.manage.editCategory") : t("retail.manage.newCategory")}
        width={560}
        onConfirm={() => void save()}
        footer={
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Button onClick={() => setView({ kind: "list" })} sx={{ minHeight: 44 }}>
              {t("common.back")}
            </Button>
            <Button variant="contained" startIcon={<CheckIcon />} disabled={busy || !draft.name.trim()} onClick={() => void save()} sx={{ minHeight: 44 }}>
              {t("common.save")}
            </Button>
          </Stack>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField size="small" fullWidth autoFocus label={t("retail.manage.name")} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <TextField size="small" fullWidth label={t("retail.manage.nameSi")} value={draft.name_si} onChange={(e) => setDraft({ ...draft, name_si: e.target.value })} />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField size="small" fullWidth label={t("retail.manage.itemName")} value={draft.item_name} onChange={(e) => setDraft({ ...draft, item_name: e.target.value })} helperText={t("retail.manage.itemNameHint")} />
            <TextField size="small" fullWidth label={t("retail.manage.itemNameSi")} value={draft.item_name_si} onChange={(e) => setDraft({ ...draft, item_name_si: e.target.value })} />
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {t("retail.manage.icon")}
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))", gap: 0.75, mt: 0.5 }} data-testid="icon-grid">
              {CATEGORY_ICON_NAMES.map((n) => (
                <IconButton
                  key={n}
                  onClick={() => setDraft({ ...draft, icon: n })}
                  aria-label={n}
                  aria-pressed={draft.icon === n}
                  sx={{ border: 1, borderColor: draft.icon === n ? "primary.main" : "divider", borderRadius: 2, height: 44, color: draft.icon === n ? "primary.main" : "text.secondary" }}
                >
                  <CatIcon name={n} />
                </IconButton>
              ))}
            </Box>
          </Box>

          <TextField size="small" select label={t("retail.manage.defaultUnit")} value={draft.default_unit} onChange={(e) => setDraft({ ...draft, default_unit: e.target.value })} sx={{ maxWidth: 220 }}>
            <MenuItem value="">—</MenuItem>
            {BASE_UNITS.map((u) => (
              <MenuItem key={u} value={u}>
                {u}
              </MenuItem>
            ))}
          </TextField>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {t("retail.manage.attributes")}
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 0.5 }}>
              {draft.attributes.map((a, i) => (
                <Box key={i} sx={{ p: 1, border: 1, borderColor: "divider", borderRadius: 2 }} data-testid="attribute-row">
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <TextField size="small" label={t("retail.manage.attrName")} value={a.name} onChange={(e) => setAttr(i, { name: e.target.value })} sx={{ flex: 2 }} />
                    <TextField size="small" label={t("retail.manage.attrUnit")} value={a.unit ?? ""} onChange={(e) => setAttr(i, { unit: e.target.value })} sx={{ flex: 1 }} />
                    <Tooltip title={t("common.remove")}>
                      <IconButton size="small" onClick={() => setDraft((d) => ({ ...d, attributes: d.attributes.filter((_, j) => j !== i) }))} aria-label={t("common.remove")}>
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap", my: 1 }}>
                    {(a.values ?? []).map((v) => (
                      <Chip key={String(v)} size="small" label={String(v)} onDelete={() => setAttr(i, { values: (a.values ?? []).filter((x) => x !== v) })} sx={{ fontVariantNumeric: "tabular-nums" }} />
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <TextField
                      size="small"
                      value={a._values}
                      placeholder={t("retail.manage.attrValues")}
                      onChange={(e) => setAttr(i, { _values: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          addValues(i);
                        }
                      }}
                      sx={{ flex: 1 }}
                      slotProps={{ htmlInput: { "aria-label": t("retail.manage.attrValues") } }}
                    />
                    <FormControlLabel control={<Checkbox size="small" checked={!!a.variant} onChange={(e) => setAttr(i, { variant: e.target.checked })} />} label={t("retail.manage.isVariant")} />
                  </Stack>
                </Box>
              ))}
              <Box>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setDraft((d) => ({ ...d, attributes: [...d.attributes, { name: "", unit: "", values: [], variant: d.attributes.length === 0, _values: "" }] }))}>
                  {t("retail.manage.addAttribute")}
                </Button>
              </Box>
            </Stack>
          </Box>

          <FormControlLabel control={<Checkbox checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />} label={t("retail.manage.active")} />

          {editingExisting && (
            <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <TextField size="small" select label={t("retail.manage.mergeInto")} value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} sx={{ flex: 1 }}>
                  {flat
                    .filter((c) => c.category_id !== view.id)
                    .map((c) => (
                      <MenuItem key={c.category_id} value={String(c.category_id)}>
                        {c.parent_id != null ? `${flat.find((p) => p.category_id === c.parent_id)?.name ?? ""} › ${c.name}` : c.name}
                      </MenuItem>
                    ))}
                </TextField>
                <Button startIcon={<CallMergeIcon />} disabled={!mergeTarget || busy} onClick={() => void merge()}>
                  {t("retail.manage.merge")}
                </Button>
              </Stack>
              <Box>
                <Button color="error" startIcon={<DeleteOutlinedIcon />} disabled={busy} onClick={() => void remove()}>
                  {t("common.delete")}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Overlay>
    );
  }

  return (
    <Overlay
      title={t("retail.manage.categories")}
      width={520}
      footer={
        canManage ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => open(null, null)} sx={{ minHeight: 44 }}>
            {t("retail.manage.newCategory")}
          </Button>
        ) : undefined
      }
    >
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      {isLoading && <Typography variant="body2">{t("common.loading")}</Typography>}
      {tree.map((c, i) => (
        <Box key={c.category_id}>
          {row(c, tree, i, 0)}
          {(c.children ?? []).map((s, j) => row(s, c.children ?? [], j, 1))}
        </Box>
      ))}
      {!isLoading && tree.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
          {t("retail.item.noCategories")}
        </Typography>
      )}
    </Overlay>
  );
}

export default CategoriesOverlay;
