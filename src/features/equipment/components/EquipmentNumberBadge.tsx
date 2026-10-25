import { Box } from "@mui/material";
import TagIcon from "@mui/icons-material/Tag";

interface EquipmentNumberBadgeProps {
  value?: string | null;
  size?: "sm" | "md" | "lg";
  title?: string;
}

const SIZES = {
  sm: { h: 20, px: 0.625, font: "0.7rem", icon: 12 },
  md: { h: 24, px: 0.875, font: "0.8rem", icon: 14 },
  lg: { h: 30, px: 1.125, font: "0.95rem", icon: 17 },
} as const;

// The machine's own number (its unique SKU / serial). Deliberately the loudest element
// wherever it appears: a solid chip in the tenant's brand colour (amber by default) with
// the theme's matching on-colour text, so it follows branding changes automatically.
export function EquipmentNumberBadge({ value, size = "md", title }: EquipmentNumberBadgeProps) {
  const s = SIZES[size];
  const has = !!value && String(value).trim() !== "";
  return (
    <Box
      component="span"
      title={has ? (title ? `${title}: ${value}` : String(value)) : title}
      data-testid="equipment-number"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.25,
        height: s.h,
        px: s.px,
        maxWidth: "100%",
        minWidth: 0,
        borderRadius: 1.5,
        bgcolor: has ? "primary.main" : "transparent",
        color: has ? "primary.contrastText" : "text.disabled",
        border: has ? "none" : "1px dashed",
        borderColor: has ? undefined : "text.disabled",
        fontFamily: "'JetBrains Mono', monospace",
        fontVariantNumeric: "tabular-nums",
        fontWeight: 800,
        fontSize: s.font,
        letterSpacing: "0.02em",
        lineHeight: 1,
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      <TagIcon sx={{ fontSize: s.icon, opacity: 0.85, flexShrink: 0 }} />
      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
        {has ? value : "—"}
      </Box>
    </Box>
  );
}
