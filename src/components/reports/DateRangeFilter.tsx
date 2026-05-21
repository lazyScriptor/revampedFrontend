import { Box, TextField, Chip, Typography } from "@mui/material";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";

// Presets cover the common periods a manager wants to skim. Custom is implicit
// — once the user types into the date inputs we drop the preset highlight.
type PresetKey = "today" | "7d" | "30d" | "90d" | "month" | "lastMonth" | "ytd" | "all";

const presetRange = (key: PresetKey): { from: string; to: string } => {
  const today = todayLocalStr();
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDaysLocal(today, -6), to: today };
    case "30d":
      return { from: addDaysLocal(today, -29), to: today };
    case "90d":
      return { from: addDaysLocal(today, -89), to: today };
    case "month": {
      const [y, m] = today.split("-").map(Number);
      const first = `${y}-${String(m).padStart(2, "0")}-01`;
      return { from: first, to: today };
    }
    case "lastMonth": {
      const [y, m] = today.split("-").map(Number);
      const lastY = m === 1 ? y - 1 : y;
      const lastM = m === 1 ? 12 : m - 1;
      const first = `${lastY}-${String(lastM).padStart(2, "0")}-01`;
      // last day of last month = day 0 of this month
      const lastDay = new Date(y, m - 1, 0).getDate();
      const last = `${lastY}-${String(lastM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { from: first, to: last };
    }
    case "ytd": {
      const [y] = today.split("-");
      return { from: `${y}-01-01`, to: today };
    }
    case "all":
    default:
      return { from: "", to: "" };
  }
};

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All time" },
];

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  showLabel?: boolean;
}

export function DateRangeFilter({ from, to, onChange, showLabel = true }: DateRangeFilterProps) {
  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.key);
    return r.from === from && r.to === to;
  })?.key;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      {showLabel && (
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", letterSpacing: 0.5 }}>
          DATE RANGE
        </Typography>
      )}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, flexWrap: "wrap" }}>
        {PRESETS.map((p) => {
          const selected = activePreset === p.key;
          return (
            <Chip
              key={p.key}
              label={p.label}
              size="small"
              clickable
              onClick={() => onChange(presetRange(p.key))}
              variant={selected ? "filled" : "outlined"}
              color={selected ? "primary" : "default"}
              sx={{ fontWeight: 700, borderRadius: 1.5 }}
            />
          );
        })}
      </Box>
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          type="date"
          size="small"
          label="From"
          value={from}
          onChange={(e) => onChange({ from: e.target.value, to })}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 170 }}
        />
        <TextField
          type="date"
          size="small"
          label="To"
          value={to}
          onChange={(e) => onChange({ from, to: e.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 170 }}
        />
      </Box>
    </Box>
  );
}
