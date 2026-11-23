import type { ReactNode } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export interface TileProps {
  label: string;
  /** Icon or small picture. */
  media?: ReactNode;
  imageUrl?: string | null;
  count?: number;
  selected?: boolean;
  onClick: () => void;
  /** Smaller tile for rails and chip-like rows. */
  dense?: boolean;
  title?: string;
}

/** A picture/icon tile with a short label: the unit of choice in set-up and tap-through (plan §7.0 rule 3). */
export function Tile({ label, media, imageUrl, count, selected = false, onClick, dense = false, title }: TileProps) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      title={title ?? label}
      sx={(theme) => ({
        flexDirection: "column",
        justifyContent: "center",
        gap: 0.5,
        width: dense ? 92 : 112,
        minHeight: dense ? 72 : 92,
        p: 1,
        borderRadius: 2,
        border: 1,
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? alpha(theme.palette.primary.main, 0.12) : "background.paper",
        color: "text.primary",
        textAlign: "center",
        "&:hover": { borderColor: "primary.main" },
        "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 1 },
      })}
    >
      {imageUrl ? (
        <Box component="img" src={imageUrl} alt="" loading="lazy" sx={{ width: 40, height: 40, objectFit: "contain", borderRadius: 1 }} />
      ) : (
        <Box sx={{ color: selected ? "primary.main" : "text.secondary", display: "flex" }}>{media}</Box>
      )}
      <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.15, wordBreak: "break-word" }}>
        {label}
      </Typography>
      {count !== undefined && (
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {count}
        </Typography>
      )}
    </ButtonBase>
  );
}
