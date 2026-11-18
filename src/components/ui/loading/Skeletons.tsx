import type { ReactNode } from "react";
import { Box, Paper, Skeleton, Stack, alpha, useTheme } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { useTranslation } from "react-i18next";

// Placeholders that match the shape of what is loading, so the screen does not jump when the real
// content arrives. All share the theme's skeleton colour and a gentle wave, which stops for users
// who ask their phone or computer to reduce motion.

const wave = "wave" as const;

/** Wraps a skeleton so screen readers hear "Loading…" once instead of empty shapes. */
function LoadingRegion({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  const { t } = useTranslation();
  return (
    <Box
      role="status"
      aria-busy="true"
      aria-label={t("common.loading")}
      sx={[
        { "@media (prefers-reduced-motion: reduce)": { "& .MuiSkeleton-root::after": { animation: "none" } } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

/** A few lines of text, the last one shorter, like a paragraph. */
export function SkeletonText({ lines = 3, sx }: { lines?: number; sx?: SxProps<Theme> }) {
  return (
    <LoadingRegion sx={sx}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} animation={wave} variant="text" width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </LoadingRegion>
  );
}

/**
 * List rows: an avatar, a name line, a detail line and a small chip. Use for customer, invoice or
 * equipment lists and search results.
 */
export function SkeletonListRows({
  rows = 4,
  avatar = true,
  dense = false,
  sx,
}: {
  rows?: number;
  avatar?: boolean;
  dense?: boolean;
  sx?: SxProps<Theme>;
}) {
  const rowHeight = dense ? 44 : 56;
  return (
    <LoadingRegion sx={sx}>
      <Stack spacing={dense ? 0.5 : 1}>
        {Array.from({ length: rows }, (_, i) => (
          <Stack
            key={i}
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "center", minHeight: rowHeight, px: 1, opacity: 1 - i * (0.5 / rows) }}
          >
            {avatar && <Skeleton animation={wave} variant="circular" width={dense ? 28 : 36} height={dense ? 28 : 36} />}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton animation={wave} variant="text" width={`${70 - (i % 3) * 12}%`} sx={{ fontSize: "0.95rem" }} />
              <Skeleton animation={wave} variant="text" width={`${45 - (i % 2) * 10}%`} sx={{ fontSize: "0.75rem" }} />
            </Box>
            <Skeleton animation={wave} variant="rounded" width={52} height={22} sx={{ borderRadius: 99 }} />
          </Stack>
        ))}
      </Stack>
    </LoadingRegion>
  );
}

/** A card with a title, a big figure and a line of detail, like a KPI tile or a panel. */
export function SkeletonCard({ height = 112, sx }: { height?: number; sx?: SxProps<Theme> }) {
  return (
    <LoadingRegion sx={sx}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, minHeight: height }}>
        <Skeleton animation={wave} variant="text" width="40%" sx={{ fontSize: "0.8rem" }} />
        <Skeleton animation={wave} variant="text" width="65%" sx={{ fontSize: "1.6rem", my: 0.5 }} />
        <Skeleton animation={wave} variant="text" width="50%" sx={{ fontSize: "0.75rem" }} />
      </Paper>
    </LoadingRegion>
  );
}

/** A table: a header row and body rows with columns of varied width. */
export function SkeletonTable({ rows = 6, columns = 5, sx }: { rows?: number; columns?: number; sx?: SxProps<Theme> }) {
  return (
    <LoadingRegion sx={sx}>
      <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
        <Stack direction="row" spacing={2} sx={{ px: 2, py: 1.5, bgcolor: "action.hover" }}>
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} animation={wave} variant="text" sx={{ flex: c === 0 ? 2 : 1, fontSize: "0.8rem" }} />
          ))}
        </Stack>
        {Array.from({ length: rows }, (_, r) => (
          <Stack key={r} direction="row" spacing={2} sx={{ px: 2, minHeight: 56, alignItems: "center", borderTop: 1, borderColor: "divider" }}>
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton key={c} animation={wave} variant="text" sx={{ flex: c === 0 ? 2 : 1 }} width={c === 0 ? undefined : `${60 + ((r + c) % 3) * 12}%`} />
            ))}
          </Stack>
        ))}
      </Paper>
    </LoadingRegion>
  );
}

/**
 * A whole page while its code or first data loads. `pos` mirrors the invoicing screen's three
 * panels (customer, items, checkout), stacked on phones; `default` is a header, KPI strip and table.
 */
export function PageSkeleton({ variant = "default" }: { variant?: "default" | "pos" }) {
  const theme = useTheme();
  if (variant === "pos") {
    return (
      <LoadingRegion sx={{ p: { xs: 1.5, md: 2.5 } }}>
        <Skeleton animation={wave} variant="rounded" height={44} sx={{ borderRadius: 2.5, mb: 2, maxWidth: 360 }} />
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "minmax(280px, 1fr) minmax(0, 1.6fr) minmax(280px, 1fr)" },
          }}
        >
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Skeleton animation={wave} variant="rounded" height={48} sx={{ borderRadius: 2, mb: 2 }} />
            <SkeletonListRows rows={5} />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Skeleton animation={wave} variant="rounded" height={48} sx={{ borderRadius: 2, mb: 2 }} />
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" } }}>
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} animation={wave} variant="rounded" height={96} sx={{ borderRadius: 2 }} />
              ))}
            </Box>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: { xs: "none", md: "block" } }}>
            <SkeletonText lines={4} />
            {/* The checkout button, in a light brand tint so the panel reads as "almost ready". */}
            <Skeleton animation={wave} variant="rounded" height={44} sx={{ borderRadius: 2, mt: 3, bgcolor: alpha(theme.palette.primary.main, 0.22) }} />
          </Paper>
        </Box>
      </LoadingRegion>
    );
  }
  return (
    <LoadingRegion sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Skeleton animation={wave} variant="text" width={220} sx={{ fontSize: "1.6rem" }} />
      <Skeleton animation={wave} variant="text" width={320} sx={{ fontSize: "0.85rem", mb: 2 }} />
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, mb: 2 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} height={96} />
        ))}
      </Box>
      <SkeletonTable rows={6} />
    </LoadingRegion>
  );
}
