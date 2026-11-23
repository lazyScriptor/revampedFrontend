import { Fragment, memo, useState } from "react";
import { Box, Chip, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { useTranslation } from "react-i18next";
import type { CatalogProduct } from "../api/catalog.types";
import { CatIcon } from "../components/CategoryIcon";
import { formatRs } from "../format";
import type { CatalogCtx, ProductGroup } from "../catalog/catalogModel";
import { formatVariant } from "../catalog/names";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const MAX_CHIPS = 8;

interface Props {
  groups: ProductGroup[];
  ctx: CatalogCtx;
  rowHeight: number;
  onOpen: (productId: number) => void;
}

const priceText = (products: CatalogProduct[], pick: (p: CatalogProduct) => number | null | undefined) => {
  const values = products.map(pick).filter((v): v is number => v != null && v > 0);
  if (!values.length) return "";
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return lo === hi ? formatRs(lo) : `${formatRs(lo)} – ${formatRs(hi)}`;
};

const packsOf = (products: CatalogProduct[]) => [...new Set(products.flatMap((p) => (p.units ?? []).map((u) => u.unit_name)))];
const barcodeCount = (products: CatalogProduct[]) => products.reduce((n, p) => n + (p.barcodes?.length ?? 0), 0);

const StockCell = () => {
  const { t } = useTranslation();
  return (
    <Tooltip title={t("retail.stock.comesNext")}>
      <Typography variant="body2" color="text.disabled" sx={NUM} aria-label={t("retail.stock.comesNext")}>
        —
      </Typography>
    </Tooltip>
  );
};

const GroupRows = memo(function GroupRows({ group, ctx, rowHeight, onOpen }: { group: ProductGroup; ctx: CatalogCtx; rowHeight: number; onOpen: (id: number) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const multi = group.products.length > 1 || group.familyId != null;
  const first = group.products[0];
  const category = group.categoryId != null ? ctx.categories.get(group.categoryId) : undefined;
  const top = category?.parent_id != null ? ctx.categories.get(category.parent_id) : category;
  const packs = packsOf(group.products);
  const cellSx = { py: 0.25, height: rowHeight } as const;

  return (
    <Fragment>
      <TableRow hover data-testid="stock-row" onClick={() => onOpen(first.product_id)} sx={{ cursor: "pointer", height: rowHeight }}>
        <TableCell sx={{ ...cellSx, width: 36, pl: 1, pr: 0 }}>
          {multi && group.products.length > 1 ? (
            <IconButton
              size="small"
              aria-label={open ? t("common.less") : t("common.more")}
              aria-expanded={open}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((o) => !o);
              }}
            >
              {open ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
            </IconButton>
          ) : null}
        </TableCell>
        <TableCell sx={{ ...cellSx, width: 40, pr: 0.5, color: "text.secondary" }}>
          {first.image_url ? <Box component="img" src={first.image_url ?? undefined} alt="" loading="lazy" sx={{ width: 28, height: 28, objectFit: "cover", borderRadius: 0.5 }} /> : <CatIcon name={category?.icon || top?.icon} fontSize="small" />}
        </TableCell>
        <TableCell sx={{ ...cellSx, minWidth: 220 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            {group.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {[group.brandName, group.categoryPath].filter(Boolean).join(" · ")}
          </Typography>
        </TableCell>
        <TableCell sx={{ ...cellSx, minWidth: 180 }}>
          {group.products.length > 1 && (
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
              {group.products.slice(0, MAX_CHIPS).map((p) => (
                <Chip
                  key={p.product_id}
                  size="small"
                  clickable
                  label={formatVariant(p.variant_label, group.optionUnit) || p.name}
                  color={group.matchedIds.has(p.product_id) ? "primary" : "default"}
                  variant={group.matchedIds.has(p.product_id) ? "filled" : "outlined"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(p.product_id);
                  }}
                  sx={{ height: 24, fontWeight: 700, ...NUM }}
                />
              ))}
              {group.products.length > MAX_CHIPS && <Chip size="small" variant="outlined" label={`+${group.products.length - MAX_CHIPS}`} sx={{ height: 24, ...NUM }} />}
            </Stack>
          )}
        </TableCell>
        <TableCell sx={{ ...cellSx, ...NUM }}>{group.products.length === 1 ? first.code : ""}</TableCell>
        <TableCell align="right" sx={{ ...cellSx, ...NUM, whiteSpace: "nowrap" }}>
          <Box>{priceText(group.products, (p) => p.sell_price)}</Box>
          {group.products.some((p) => (p.contractor_price ?? 0) > 0) && (
            <Typography variant="caption" color="text.secondary" sx={NUM}>
              {priceText(group.products, (p) => p.contractor_price)}
            </Typography>
          )}
        </TableCell>
        <TableCell sx={{ ...cellSx, ...NUM, whiteSpace: "nowrap" }}>
          {first.base_unit}
          {packs.length > 0 && (
            <Typography component="span" variant="caption" color="text.secondary">
              {` · ${packs.join(", ")}`}
            </Typography>
          )}
        </TableCell>
        <TableCell align="right" sx={{ ...cellSx, ...NUM }}>
          {barcodeCount(group.products) || <Typography component="span" variant="body2" color="text.disabled">0</Typography>}
        </TableCell>
        <TableCell align="right" sx={cellSx}>
          <StockCell />
        </TableCell>
      </TableRow>
      {open &&
        group.products.map((p) => (
          <TableRow key={p.product_id} hover data-testid="variant-row" onClick={() => onOpen(p.product_id)} sx={{ cursor: "pointer", height: rowHeight, bgcolor: "action.hover" }}>
            <TableCell sx={cellSx} />
            <TableCell sx={cellSx} />
            <TableCell sx={{ ...cellSx, pl: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, ...NUM }}>
                {formatVariant(p.variant_label, group.optionUnit) || p.name}
              </Typography>
            </TableCell>
            <TableCell sx={cellSx} />
            <TableCell sx={{ ...cellSx, ...NUM }}>{p.code}</TableCell>
            <TableCell align="right" sx={{ ...cellSx, ...NUM, whiteSpace: "nowrap" }}>
              {formatRs(p.sell_price)}
              {(p.contractor_price ?? 0) > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", ...NUM }}>
                  {formatRs(p.contractor_price)}
                </Typography>
              )}
            </TableCell>
            <TableCell sx={{ ...cellSx, ...NUM }}>
              {p.base_unit}
              {(p.units ?? []).length > 0 && (
                <Typography component="span" variant="caption" color="text.secondary">
                  {` · ${(p.units ?? []).map((u) => u.unit_name).join(", ")}`}
                </Typography>
              )}
            </TableCell>
            <TableCell align="right" sx={{ ...cellSx, ...NUM }}>
              {p.barcodes?.length ?? 0}
            </TableCell>
            <TableCell align="right" sx={cellSx}>
              <StockCell />
            </TableCell>
          </TableRow>
        ))}
    </Fragment>
  );
});

/** Compact table, one row per family (size chips expand into variant rows); stand-alone items are single rows. */
export function StockTable({ groups, ctx, rowHeight, onOpen }: Props) {
  const { t } = useTranslation();
  const head = { fontWeight: 800, py: 0.5, whiteSpace: "nowrap", bgcolor: "background.paper" } as const;
  return (
    <Table size="small" stickyHeader aria-label={t("retail.stock.title")} sx={{ minWidth: 860 }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ ...head, width: 36 }} />
          <TableCell sx={{ ...head, width: 40 }} />
          <TableCell sx={head}>{t("retail.stock.colName")}</TableCell>
          <TableCell sx={head}>{t("retail.stock.colSizes")}</TableCell>
          <TableCell sx={head}>{t("retail.stock.colCode")}</TableCell>
          <TableCell sx={head} align="right">
            {t("retail.stock.colPrice")}
          </TableCell>
          <TableCell sx={head}>{t("retail.stock.colUnit")}</TableCell>
          <TableCell sx={head} align="right">
            {t("retail.stock.colBarcodes")}
          </TableCell>
          <TableCell sx={head} align="right">
            {t("retail.stock.colStock")}
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {groups.map((g) => (
          <GroupRows key={g.key} group={g} ctx={ctx} rowHeight={rowHeight} onOpen={onOpen} />
        ))}
      </TableBody>
    </Table>
  );
}
