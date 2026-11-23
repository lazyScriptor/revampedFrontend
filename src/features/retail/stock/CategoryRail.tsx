import { Box, ButtonBase, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import type { RetailCategory } from "../api/catalog.types";
import { CatIcon } from "../components/CategoryIcon";

interface Props {
  categories: RetailCategory[];
  counts: Map<number, number>;
  selected: number | null;
  selectedSub: number | null;
  onSelect: (categoryId: number | null, subCategoryId: number | null) => void;
  total: number;
}

const byOrder = (a: RetailCategory, b: RetailCategory) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name);

/** Left rail of category tiles (icon, name, count), two levels. On a phone it is a row of chips that scrolls sideways. */
export function CategoryRail({ categories, counts, selected, selectedSub, onSelect, total }: Props) {
  const { t } = useTranslation();
  const active = categories.filter((c) => c.is_active !== false);
  const tops = active.filter((c) => c.parent_id == null).sort(byOrder);
  const subsOf = (id: number) => active.filter((c) => c.parent_id === id).sort(byOrder);

  const tile = (c: RetailCategory, sub: boolean) => {
    const on = sub ? selectedSub === c.category_id : selected === c.category_id && selectedSub == null;
    return (
      <ButtonBase
        key={c.category_id}
        onClick={() => (sub ? onSelect(c.parent_id, c.category_id) : onSelect(c.category_id, null))}
        aria-pressed={on}
        data-testid="rail-tile"
        sx={(theme) => ({
          width: "100%",
          justifyContent: "flex-start",
          gap: 1,
          pl: sub ? 4 : 1,
          pr: 1,
          py: 0.75,
          minHeight: 40,
          borderRadius: 1.5,
          textAlign: "left",
          color: on ? "primary.main" : "text.primary",
          bgcolor: on ? alpha(theme.palette.primary.main, 0.12) : "transparent",
          "&:hover": { bgcolor: on ? alpha(theme.palette.primary.main, 0.16) : "action.hover" },
          "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}` },
        })}
      >
        {c.image_url ? <Box component="img" src={c.image_url ?? undefined} alt="" loading="lazy" sx={{ width: 22, height: 22, objectFit: "contain" }} /> : <CatIcon name={c.icon} fontSize="small" />}
        <Typography variant="body2" sx={{ flex: 1, fontWeight: sub ? 500 : 700, minWidth: 0 }} noWrap>
          {c.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {counts.get(c.category_id) ?? 0}
        </Typography>
      </ButtonBase>
    );
  };

  const chip = (c: RetailCategory, sub: boolean) => {
    const on = sub ? selectedSub === c.category_id : selected === c.category_id && selectedSub == null;
    return (
      <Chip
        key={c.category_id}
        clickable
        icon={<CatIcon name={c.icon} fontSize="small" />}
        label={`${c.name} ${counts.get(c.category_id) ?? 0}`}
        color={on ? "primary" : "default"}
        variant={on ? "filled" : "outlined"}
        onClick={() => (sub ? onSelect(c.parent_id, c.category_id) : onSelect(c.category_id, null))}
        sx={{ flexShrink: 0, minHeight: 36, fontVariantNumeric: "tabular-nums" }}
      />
    );
  };

  const subs = selected != null ? subsOf(selected) : [];

  return (
    <>
      {/* Phone: chips that scroll sideways */}
      <Box sx={{ display: { xs: "block", md: "none" }, minWidth: 0 }} data-testid="rail-chips">
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: { xs: "nowrap", sm: "wrap" }, overflowX: "auto", pb: 0.5 }}>
          <Chip clickable label={`${t("retail.stock.allCategories")} ${total}`} color={selected == null ? "primary" : "default"} variant={selected == null ? "filled" : "outlined"} onClick={() => onSelect(null, null)} sx={{ flexShrink: 0, minHeight: 36, fontVariantNumeric: "tabular-nums" }} />
          {tops.map((c) => chip(c, false))}
        </Stack>
        {subs.length > 0 && (
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: { xs: "nowrap", sm: "wrap" }, overflowX: "auto", pt: 0.5, pb: 0.5 }}>
            {subs.map((c) => chip(c, true))}
          </Stack>
        )}
      </Box>

      {/* Desktop: a rail of tiles */}
      <Box sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", gap: 0.25, width: 224, flexShrink: 0, overflowY: "auto", minHeight: 0, pr: 0.5 }}>
        <ButtonBase
          onClick={() => onSelect(null, null)}
          aria-pressed={selected == null}
          sx={(theme) => ({ width: "100%", justifyContent: "space-between", px: 1, py: 0.75, minHeight: 40, borderRadius: 1.5, color: selected == null ? "primary.main" : "text.primary", bgcolor: selected == null ? alpha(theme.palette.primary.main, 0.12) : "transparent", "&:hover": { bgcolor: "action.hover" } })}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t("retail.stock.allCategories")}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {total}
          </Typography>
        </ButtonBase>
        {tops.map((c) => (
          <Box key={c.category_id}>
            {tile(c, false)}
            {selected === c.category_id && subsOf(c.category_id).map((s) => tile(s, true))}
          </Box>
        ))}
      </Box>
    </>
  );
}
