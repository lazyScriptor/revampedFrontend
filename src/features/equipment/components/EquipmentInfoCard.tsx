import { useState } from "react";
import { resolveAssetUrl } from "@/lib/assetUrl";
import type { ElementType, ReactNode } from "react";
import { alpha, Box, Checkbox, Chip, IconButton, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import RemoveShoppingCartOutlinedIcon from "@mui/icons-material/RemoveShoppingCartOutlined";

import { formatDisplayDate } from "@/lib/dates";
import { equipmentIcon, equipmentTint } from "../lib/equipmentVisual";
import { CARD_FIELDS, type CardConfig, type CardFieldKey } from "../lib/equipmentCardFields";
import { EquipmentNumberBadge } from "./EquipmentNumberBadge";

const MONO = "'JetBrains Mono', monospace";
const FIELD = Object.fromEntries(CARD_FIELDS.map((f) => [f.key, f])) as Record<CardFieldKey, (typeof CARD_FIELDS)[number]>;

const rs = (v: unknown) => `Rs. ${Number(v || 0).toLocaleString()}`;

interface EquipmentInfoCardProps {
  item: any;
  config: CardConfig;
  selected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export function EquipmentInfoCard({ item, config, selected, onSelect, onEdit, onDelete }: EquipmentInfoCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  const [imgFailed, setImgFailed] = useState(false);

  const label = (key: CardFieldKey) => t(FIELD[key].labelKey);
  const on = (key: CardFieldKey) => config[key];

  const available = Number(item.available_qty) || 0;
  const isAvailable = available > 0;
  const showPhoto = !!item.image_url && !imgFailed;
  const categoryName = item.EquipmentCategory?.category_name;
  const Placeholder = equipmentIcon(item.equipment_name, categoryName);
  const [tintBg, tintFg] = equipmentTint(item.equipment_id);

  const border = (theme.palette as any).border?.subtle || theme.palette.divider;
  const soft = alpha(theme.palette.text.primary, dark ? 0.1 : 0.06);

  // ── building blocks ──
  const InfoChip = ({ k, children }: { k: CardFieldKey; children: ReactNode }) => {
    const Icon = FIELD[k].icon as ElementType;
    return (
      <Box
        component="span"
        title={label(k)}
        aria-label={label(k)}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          height: 24,
          px: 0.875,
          maxWidth: "100%",
          minWidth: 0,
          borderRadius: 3,
          bgcolor: soft,
          color: "text.primary",
          fontSize: "0.74rem",
          fontWeight: 600,
        }}
      >
        <Icon sx={{ fontSize: 15, color: "text.secondary", flexShrink: 0 }} />
        <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {children}
        </Box>
      </Box>
    );
  };

  const Figure = ({ k, children, strong }: { k: CardFieldKey; children: ReactNode; strong?: boolean }) => {
    const Icon = FIELD[k].icon as ElementType;
    return (
      <Box
        component="span"
        title={label(k)}
        aria-label={label(k)}
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, minWidth: 0, color: "text.primary" }}
      >
        <Icon sx={{ fontSize: strong ? 20 : 16, color: strong ? "primary.main" : "text.secondary", flexShrink: 0 }} />
        <Box
          component="span"
          sx={{
            fontFamily: MONO,
            fontVariantNumeric: "tabular-nums",
            fontWeight: strong ? 800 : 600,
            fontSize: strong ? "1rem" : "0.8rem",
            whiteSpace: "nowrap",
          }}
        >
          {children}
        </Box>
      </Box>
    );
  };

  const tiles: Array<{ k: CardFieldKey; value: number; color: string; bg: string }> = [];
  const total = Number(item.total_owned_qty) || 0;
  const rented = Number(item.rented_qty) || 0;
  const defective = Number(item.defective_qty) || 0;
  if (on("totalQty")) tiles.push({ k: "totalQty", value: total, color: theme.palette.text.primary, bg: soft });
  if (on("availableQty"))
    tiles.push({
      k: "availableQty",
      value: available,
      color: available > 0 ? theme.palette.success.main : theme.palette.warning.main,
      bg: alpha(available > 0 ? theme.palette.success.main : theme.palette.warning.main, 0.12),
    });
  if (on("rentedQty"))
    tiles.push({
      k: "rentedQty",
      value: rented,
      color: rented > 0 ? theme.palette.info.main : theme.palette.text.secondary,
      bg: alpha(rented > 0 ? theme.palette.info.main : theme.palette.text.primary, rented > 0 ? 0.12 : 0.06),
    });
  if (on("defectiveQty"))
    tiles.push({
      k: "defectiveQty",
      value: defective,
      color: defective > 0 ? theme.palette.error.main : theme.palette.text.secondary,
      bg: alpha(defective > 0 ? theme.palette.error.main : theme.palette.text.primary, defective > 0 ? 0.12 : 0.06),
    });

  const identityChips = on("category") || on("location") || on("type");
  const priceFigures = on("dailyRate") || on("extraRate") || on("minDays") || on("purchaseCost");
  const otherFigures = on("warranty") || on("warrantyEnd") || on("createdAt");

  return (
    <Box
      data-testid="equipment-card"
      sx={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: selected ? "primary.main" : border,
        boxShadow: selected ? `0 0 0 2px ${theme.palette.primary.main}` : "0 1px 3px rgba(15, 23, 42, 0.06)",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease",
        "@media (hover: hover)": { "&:hover": { boxShadow: "0 8px 22px rgba(15, 23, 42, 0.14)", transform: "translateY(-2px)" } },
      }}
    >
      {/* ── Equipment number first: it is what staff look for ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          pl: 1.25,
          pr: 0.5,
          py: 0.75,
          bgcolor: alpha(theme.palette.primary.main, dark ? 0.16 : 0.1),
          borderBottom: "1px solid",
          borderColor: border,
        }}
      >
        <Box sx={{ minWidth: 0, flex: "0 1 auto", display: "flex" }}>
          <EquipmentNumberBadge value={item.serial_number} size="lg" title={t("equipment.equipmentNo")} />
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Chip
          size="small"
          icon={isAvailable ? <CheckCircleIcon /> : <RemoveShoppingCartOutlinedIcon />}
          label={isAvailable ? t("common.available") : t("equipment.outOfStock")}
          color={isAvailable ? "success" : "warning"}
          variant="outlined"
          sx={{ fontWeight: 700, fontSize: "0.7rem", height: 22, "& .MuiChip-icon": { fontSize: 14 } }}
        />
        <Checkbox
          size="small"
          checked={selected}
          onChange={(e) => onSelect(item.equipment_id, e.target.checked)}
          slotProps={{ input: { "aria-label": t("equipment.cards.select") } }}
          sx={{ p: 0.5 }}
        />
      </Box>

      {/* ── Photo ── */}
      <Box
        sx={{
          position: "relative",
          aspectRatio: "3 / 2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: showPhoto ? "linear-gradient(160deg, #ffffff 0%, #e9eff7 100%)" : tintBg,
        }}
      >
        {showPhoto ? (
          <Box
            component="img"
            src={resolveAssetUrl(item.image_url) || undefined}
            alt=""
            loading="lazy"
            draggable={false}
            onError={() => setImgFailed(true)}
            sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", p: 1.25, boxSizing: "border-box" }}
          />
        ) : (
          <Placeholder sx={{ fontSize: 56, color: tintFg, opacity: 0.9 }} />
        )}
      </Box>

      {/* ── Details ── */}
      <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1.25, flex: 1, minWidth: 0 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem",
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {item.equipment_name}
          </Typography>
          {on("nameSi") && item.equipment_name_si && (
            <Typography noWrap sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.8rem", mt: 0.25 }}>
              {item.equipment_name_si}
            </Typography>
          )}
        </Box>

        {identityChips && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {on("category") && <InfoChip k="category">{categoryName || "—"}</InfoChip>}
            {on("location") && <InfoChip k="location">{item.Warehouse?.location_name || "—"}</InfoChip>}
            {on("type") && (
              <Box
                component="span"
                title={label("type")}
                aria-label={label("type")}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  height: 24,
                  px: 0.875,
                  borderRadius: 3,
                  bgcolor: soft,
                  fontSize: "0.74rem",
                  fontWeight: 600,
                }}
              >
                {item.is_bulk_item ? (
                  <LayersOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                ) : (
                  <QrCode2OutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                )}
                {item.is_bulk_item ? t("equipment.cards.bulk") : t("equipment.cards.single")}
              </Box>
            )}
          </Box>
        )}

        {priceFigures && (
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1.75, rowGap: 0.75 }}>
            {on("dailyRate") && (
              <Figure k="dailyRate" strong>
                {rs(item.base_rental_price)}
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.7rem", fontWeight: 600, ml: 0.5 }}>
                  {t("equipment.cards.perDay")}
                </Box>
              </Figure>
            )}
            {on("minDays") && <Figure k="minDays">{t("equipment.cards.daysShort", { count: Number(item.minimum_rental_days) || 1 })}</Figure>}
            {on("extraRate") && <Figure k="extraRate">{rs(item.extra_daily_rate)}</Figure>}
            {on("purchaseCost") && <Figure k="purchaseCost">{item.purchase_cost ? rs(item.purchase_cost) : "—"}</Figure>}
          </Box>
        )}

        {tiles.length > 0 && (
          <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`, gap: 0.75 }}>
            {tiles.map(({ k, value, color, bg }) => {
              const Icon = FIELD[k].icon as ElementType;
              return (
                <Box
                  key={k}
                  title={label(k)}
                  aria-label={`${label(k)}: ${value}`}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.25,
                    py: 0.75,
                    borderRadius: 2,
                    bgcolor: bg,
                    color,
                  }}
                >
                  <Icon sx={{ fontSize: 18 }} />
                  <Box component="span" sx={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.1 }}>
                    {value}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {otherFigures && (
          <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 1.75, rowGap: 0.5 }}>
            {on("warranty") && <Figure k="warranty">{item.warranty_period_months ? t("equipment.cards.monthsShort", { count: item.warranty_period_months }) : "—"}</Figure>}
            {on("warrantyEnd") && <Figure k="warrantyEnd">{item.end_of_warranty_date ? formatDisplayDate(item.end_of_warranty_date) : "—"}</Figure>}
            {on("createdAt") && <Figure k="createdAt">{item.createdAt ? formatDisplayDate(item.createdAt) : "—"}</Figure>}
          </Box>
        )}
      </Box>

      {/* ── Actions ── */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.75, px: 1.25, py: 0.75, borderTop: "1px solid", borderColor: border }}>
        <IconButton
          size="small"
          aria-label={t("common.edit")}
          title={t("common.edit")}
          onClick={() => onEdit(item)}
          sx={{ color: "primary.main", bgcolor: alpha(theme.palette.primary.main, 0.1), "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.2) } }}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label={t("common.delete")}
          title={t("common.delete")}
          onClick={() => onDelete(item)}
          sx={{ color: "error.main", bgcolor: alpha(theme.palette.error.main, 0.1), "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.2) } }}
        >
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
