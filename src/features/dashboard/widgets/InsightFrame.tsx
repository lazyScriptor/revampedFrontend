import { Box, Skeleton, Typography } from "@mui/material";

export interface InsightRow {
  key: string | number;
  label: string;
  value: string;
  /** 0-100 bar fill behind the value, optional. */
  share?: number;
  sub?: string;
}

/** Shared body for the equipment widgets: a titled, scrollable list of rows with an optional bar. */
export function InsightFrame({ title, icon, loading, rows, empty }: { title: string; icon: React.ReactNode; loading: boolean; rows: InsightRow[]; empty: string }) {
  return (
    <Box sx={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
        <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.primary" }} noWrap>
          {title}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 1.25 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rectangular" height={34} sx={{ borderRadius: 1, mb: 1 }} />)
        ) : rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>{empty}</Typography>
        ) : (
          rows.map((r) => (
            <Box key={r.key} sx={{ position: "relative", mb: 0.75, borderRadius: 1, overflow: "hidden" }}>
              {r.share != null && (
                <Box sx={{ position: "absolute", inset: 0, width: `${Math.max(2, r.share)}%`, bgcolor: "primary.main", opacity: 0.14 }} />
              )}
              <Box sx={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1, px: 1, py: 0.6 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }} noWrap>{r.label}</Typography>
                  {r.sub && <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }} noWrap>{r.sub}</Typography>}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: "text.primary" }}>{r.value}</Typography>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
