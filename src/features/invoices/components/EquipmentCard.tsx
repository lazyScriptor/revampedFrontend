import { useState } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";

import type { CatalogEquipment } from "../hooks/usePosEquipmentCatalog";
import { equipmentIcon, equipmentTint, stockLevel } from "@/features/equipment/lib/equipmentVisual";
import { EquipmentNumberBadge } from "@/features/equipment/components/EquipmentNumberBadge";

const MONO = "'JetBrains Mono', monospace";

const STOCK_COLORS = {
  ok: { bg: "#dcfce7", fg: "#15803d" },
  low: { bg: "#fef3c7", fg: "#b45309" },
  out: { bg: "#fee2e2", fg: "#b91c1c" },
} as const;

interface EquipmentCardProps {
  item: CatalogEquipment;
  inCartQty: number;
  onAdd: (item: CatalogEquipment) => void;
  onDecrement: (item: CatalogEquipment) => void;
}

export function EquipmentCard({ item, inCartQty, onAdd, onDecrement }: EquipmentCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  const [imgFailed, setImgFailed] = useState(false);

  const available = Number(item.available_qty) || 0;
  const level = stockLevel(available);
  const inCart = inCartQty > 0;
  const isBulk = !!item.is_bulk_item;
  const atMax = inCartQty >= available;

  const basePrice = Number(item.base_rental_price) || 0;
  const minDays = Number(item.minimum_rental_days) || 1;
  const isDaily = minDays <= 1 && basePrice === Number(item.extra_daily_rate);

  const categoryName = item.EquipmentCategory?.category_name;
  const Icon = equipmentIcon(item.equipment_name, categoryName);
  const [tintBg, tintFg] = equipmentTint(item.equipment_id);
  const showPhoto = !!item.image_url && !imgFailed;

  const text = dark ? "#f8fafc" : "#0f172a";
  const muted = dark ? "#94a3b8" : "#475569";
  const stop = (fn: () => void) => (e: React.SyntheticEvent) => {
    e.stopPropagation();
    fn();
  };

  const roundBtn = {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: 0,
    p: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 10px rgba(15, 23, 42, 0.25)",
    transition: "transform 0.12s ease",
    "&:active": { transform: "scale(0.92)" },
  } as const;

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={item.equipment_name}
      aria-disabled={level === "out" || undefined}
      onClick={() => onAdd(item)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAdd(item);
        }
      }}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        borderRadius: 3,
        overflow: "hidden",
        cursor: level === "out" ? "default" : "pointer",
        bgcolor: dark ? "#1e293b" : "#ffffff",
        border: "1px solid",
        borderColor: inCart ? "primary.main" : dark ? "#334155" : "#e2e8f0",
        boxShadow: inCart ? `0 0 0 2px ${theme.palette.primary.main}` : "0 1px 2px rgba(15, 23, 42, 0.06)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
        outline: "none",
        "@media (hover: hover)": {
          "&:hover": { transform: level === "out" ? "none" : "translateY(-2px)", boxShadow: "0 8px 20px rgba(15, 23, 42, 0.14)" },
        },
        "&:active": { transform: level === "out" ? "none" : "scale(0.985)" },
        "&:focus-visible": { boxShadow: `0 0 0 3px ${theme.palette.primary.light}` },
      }}
    >
      {/* ── Equipment number (top priority) + stock ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 0.75,
          px: 1,
          py: 0.75,
          bgcolor: dark ? "rgba(29, 78, 216, 0.2)" : "#eff6ff",
          borderBottom: "1px solid",
          borderColor: dark ? "#334155" : "#dbeafe",
        }}
      >
        <Box sx={{ minWidth: 0, display: "flex" }}>
          <EquipmentNumberBadge value={item.serial_number} size="md" title={t("equipment.equipmentNo")} />
        </Box>
        {/* stock: icon + number */}
        <Box
          title={level === "out" ? t("equipment.outOfStock") : t("invoices.EquipmentCatalog.stockAria", { count: available })}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            height: 22,
            px: 0.875,
            borderRadius: 11,
            flexShrink: 0,
            bgcolor: STOCK_COLORS[level].bg,
            color: STOCK_COLORS[level].fg,
            fontSize: "0.72rem",
            fontWeight: 800,
            fontFamily: MONO,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {level === "out" ? <BlockIcon sx={{ fontSize: 13 }} /> : <Inventory2OutlinedIcon sx={{ fontSize: 13 }} />}
          {available}
        </Box>
      </Box>

      {/* ── Photo tile ── */}
      <Box
        sx={{
          position: "relative",
          aspectRatio: "4 / 3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: showPhoto ? "linear-gradient(160deg, #ffffff 0%, #e9eff7 100%)" : tintBg,
        }}
      >
        {showPhoto ? (
          <Box
            component="img"
            src={item.image_url as string}
            alt=""
            loading="lazy"
            draggable={false}
            onError={() => setImgFailed(true)}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              p: 1,
              boxSizing: "border-box",
              filter: level === "out" ? "grayscale(1)" : "none",
              opacity: level === "out" ? 0.45 : 1,
            }}
          />
        ) : (
          <Icon sx={{ fontSize: 44, color: tintFg, opacity: level === "out" ? 0.35 : 0.9 }} />
        )}

        {level === "out" && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Box
              sx={{
                px: 1.25,
                py: 0.375,
                borderRadius: 2,
                bgcolor: "#fee2e2",
                color: "#b91c1c",
                fontSize: "0.7rem",
                fontWeight: 800,
                letterSpacing: 0.2,
              }}
            >
              {t("equipment.outOfStock")}
            </Box>
          </Box>
        )}

        {/* already in the order */}
        {inCart && (
          <CheckCircleIcon
            aria-label={t("invoices.EquipmentCatalog.inOrder")}
            sx={{ position: "absolute", top: 6, right: 6, fontSize: 24, color: "primary.main", bgcolor: "#fff", borderRadius: "50%" }}
          />
        )}

        {/* add / stepper / remove */}
        {level !== "out" && (
          <Box sx={{ position: "absolute", right: 8, bottom: 8 }}>
            {!inCart && (
              <Box
                component="button"
                type="button"
                aria-label={t("invoices.EquipmentCatalog.add")}
                onClick={stop(() => onAdd(item))}
                sx={{ ...roundBtn, bgcolor: "primary.main", color: "#fff" }}
              >
                <AddRoundedIcon sx={{ fontSize: 22 }} />
              </Box>
            )}
            {inCart && isBulk && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  height: 36,
                  borderRadius: 18,
                  bgcolor: "primary.main",
                  color: "#fff",
                  boxShadow: "0 4px 10px rgba(15, 23, 42, 0.25)",
                }}
              >
                <Box
                  component="button"
                  type="button"
                  aria-label={t("invoices.EquipmentCatalog.decrease")}
                  onClick={stop(() => onDecrement(item))}
                  sx={{ ...roundBtn, boxShadow: "none", bgcolor: "transparent", color: "inherit", width: 34, height: 34 }}
                >
                  {inCartQty <= 1 ? <DeleteOutlinedIcon sx={{ fontSize: 18 }} /> : <RemoveRoundedIcon sx={{ fontSize: 20 }} />}
                </Box>
                <Box
                  component="span"
                  sx={{ minWidth: 20, textAlign: "center", fontWeight: 800, fontSize: "0.85rem", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}
                >
                  {inCartQty}
                </Box>
                <Box
                  component="button"
                  type="button"
                  aria-label={t("invoices.EquipmentCatalog.increase")}
                  onClick={stop(() => onAdd(item))}
                  sx={{ ...roundBtn, boxShadow: "none", bgcolor: "transparent", color: "inherit", width: 34, height: 34, opacity: atMax ? 0.45 : 1 }}
                >
                  <AddRoundedIcon sx={{ fontSize: 20 }} />
                </Box>
              </Box>
            )}
            {inCart && !isBulk && (
              <Box
                component="button"
                type="button"
                aria-label={t("invoices.EquipmentCatalog.remove")}
                onClick={stop(() => onDecrement(item))}
                sx={{ ...roundBtn, bgcolor: "#fee2e2", color: "#b91c1c" }}
              >
                <DeleteOutlinedIcon sx={{ fontSize: 19 }} />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ── Name + price ── */}
      <Box sx={{ p: 1.25, pt: 1, display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            color: text,
            fontWeight: 700,
            fontSize: "0.8125rem",
            lineHeight: 1.25,
            minHeight: "2.5em",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {item.equipment_name}
        </Typography>
        {item.equipment_name_si && (
          <Typography noWrap sx={{ color: muted, fontWeight: 600, fontSize: "0.72rem", lineHeight: 1.2 }}>
            {item.equipment_name_si}
          </Typography>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: "auto", pt: 0.25 }}>
          <Box
            component="span"
            sx={{ color: text, fontWeight: 800, fontSize: "0.9rem", fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}
          >
            Rs. {basePrice.toLocaleString()}
          </Box>
          {isDaily ? (
            <Box component="span" sx={{ color: muted, fontSize: "0.72rem", fontWeight: 600 }}>
              {t("invoices.EquipmentCatalog.perDay")}
            </Box>
          ) : (
            <Tooltip title={t("invoices.PosLedgerPanel.baseDCover", { minimum_rental_days: minDays })} arrow>
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.375,
                  height: 20,
                  px: 0.75,
                  borderRadius: 10,
                  bgcolor: dark ? "#334155" : "#eff6ff",
                  color: dark ? "#bfdbfe" : "#1d4ed8",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  fontFamily: MONO,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <ScheduleOutlinedIcon sx={{ fontSize: 12 }} />
                {t("invoices.EquipmentCatalog.daysShort", { count: minDays })}
              </Box>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
}
