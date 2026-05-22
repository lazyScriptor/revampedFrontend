import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import { useTenants } from "../hooks/useSuperAdminHooks";

const STATUS_DOT: Record<string, string> = {
  Active: "#10b981",
  Suspended: "#ef4444",
  Overdue: "#f59e0b",
};

const TIER_COLOR: Record<string, string> = {
  Basic: "#64748b",
  Pro: "#3b82f6",
  Enterprise: "#8b5cf6",
};

type StatusKey = "all" | "active" | "overdue" | "suspended";
type TierKey = "all" | "Basic" | "Pro" | "Enterprise";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
const resolveLogo = (url?: string | null) => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function TenantListPanel({ selectedId, onSelect }: Props) {
  const { data: tenants = [], isLoading } = useTenants();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusKey>("all");
  const [tier, setTier] = useState<TierKey>("all");

  const counts = useMemo(() => {
    const list = (tenants as any[]) || [];
    return {
      all: list.length,
      active: list.filter((t) => t.subscription_status === "Active").length,
      overdue: list.filter((t) => t.subscription_status === "Overdue").length,
      suspended: list.filter((t) => t.subscription_status === "Suspended").length,
    };
  }, [tenants]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (tenants as any[]).filter((t) => {
      if (status !== "all") {
        const target =
          status === "active" ? "Active" : status === "overdue" ? "Overdue" : "Suspended";
        if (t.subscription_status !== target) return false;
      }
      if (tier !== "all" && t.tier !== tier) return false;
      if (!q) return true;
      return (
        (t.display_name || "").toLowerCase().includes(q) ||
        t.db_name.toLowerCase().includes(q) ||
        (t.contact_email || "").toLowerCase().includes(q)
      );
    });
  }, [tenants, search, status, tier]);

  const STATUS_FILTERS: { key: StatusKey; label: string; color: string }[] = [
    { key: "all", label: "All", color: "#94a3b8" },
    { key: "active", label: "Active", color: "#10b981" },
    { key: "overdue", label: "Overdue", color: "#f59e0b" },
    { key: "suspended", label: "Suspended", color: "#ef4444" },
  ];

  const TIER_FILTERS: { key: TierKey; label: string }[] = [
    { key: "all", label: "All tiers" },
    { key: "Basic", label: "Basic" },
    { key: "Pro", label: "Pro" },
    { key: "Enterprise", label: "Enterprise" },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "#0f172a",
        borderRight: "1px solid #1e293b",
      }}
    >
      {/* Search + filter chips */}
      <Box sx={{ p: 1.5, borderBottom: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search by name, db, or contact…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: "#475569" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              color: "#f1f5f9",
              fontSize: "0.82rem",
              bgcolor: "#1e293b",
              "& fieldset": { borderColor: "#334155" },
              "&:hover fieldset": { borderColor: "#475569" },
              "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
            },
          }}
        />

        {/* Status chips */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {STATUS_FILTERS.map((f) => {
            const active = status === f.key;
            const count = counts[f.key];
            return (
              <Chip
                key={f.key}
                onClick={() => setStatus(f.key)}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <FiberManualRecordIcon sx={{ fontSize: 7, color: f.color }} />
                    <Typography component="span" sx={{ fontSize: "0.66rem", fontWeight: 700 }}>
                      {f.label}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "0.6rem",
                        fontWeight: 800,
                        color: active ? "#f1f5f9" : "#64748b",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {count}
                    </Typography>
                  </Box>
                }
                size="small"
                sx={{
                  height: 22,
                  cursor: "pointer",
                  color: active ? "#f1f5f9" : "#94a3b8",
                  bgcolor: active ? `${f.color}22` : "transparent",
                  border: `1px solid ${active ? f.color : "#334155"}`,
                  "&:hover": {
                    bgcolor: active ? `${f.color}33` : "rgba(30,41,59,0.6)",
                    borderColor: f.color,
                  },
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            );
          })}
        </Box>

        {/* Tier chips */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {TIER_FILTERS.map((f) => {
            const active = tier === f.key;
            const accent = f.key === "all" ? "#94a3b8" : TIER_COLOR[f.key] || "#64748b";
            return (
              <Chip
                key={f.key}
                onClick={() => setTier(f.key)}
                label={f.label}
                size="small"
                sx={{
                  height: 20,
                  cursor: "pointer",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: active ? "#f1f5f9" : "#94a3b8",
                  bgcolor: active ? `${accent}22` : "transparent",
                  border: `1px solid ${active ? accent : "#334155"}`,
                  "&:hover": {
                    bgcolor: active ? `${accent}33` : "rgba(30,41,59,0.6)",
                    borderColor: accent,
                  },
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 4 }}>
            <CircularProgress size={20} sx={{ color: "#3b82f6" }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              color: "#475569",
              textAlign: "center",
              pt: 5,
              px: 2,
            }}
          >
            <BusinessOutlinedIcon sx={{ fontSize: 32, opacity: 0.4 }} />
            <Typography variant="body2" sx={{ fontSize: "0.78rem", fontWeight: 600 }}>
              No tenants match
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "0.66rem" }}>
              Try removing a filter or clearing the search.
            </Typography>
          </Box>
        ) : (
          filtered.map((t: any) => {
            const isSelected = t.tenant_id === selectedId;
            const statusColor = STATUS_DOT[t.subscription_status] || "#64748b";
            const tierColor = TIER_COLOR[t.tier] || "#64748b";
            const branding = t.branding || {};
            const logo = resolveLogo(branding.logoUrl);
            const tenantInitial = (t.display_name || t.db_name || "?")[0]?.toUpperCase();

            return (
              <Box
                key={t.tenant_id}
                onClick={() => onSelect(t.tenant_id)}
                sx={{
                  px: 1.75,
                  py: 1.5,
                  cursor: "pointer",
                  borderBottom: "1px solid #1e293b",
                  borderLeft: "3px solid",
                  borderLeftColor: isSelected ? "#ef4444" : "transparent",
                  bgcolor: isSelected ? "rgba(239,68,68,0.06)" : "transparent",
                  "&:hover": {
                    bgcolor: isSelected ? "rgba(239,68,68,0.08)" : "rgba(30,41,59,0.6)",
                  },
                  transition: "background-color 100ms, border-color 100ms",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                }}
              >
                {/* Logo / initial */}
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1.25,
                    bgcolor: logo ? "transparent" : `${tierColor}22`,
                    color: tierColor,
                    border: `1px solid ${isSelected ? "#ef444455" : "#1e293b"}`,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "0.78rem",
                    flexShrink: 0,
                  }}
                >
                  {logo ? (
                    <img
                      src={logo}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    tenantInitial
                  )}
                </Box>

                {/* Identity */}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isSelected ? "#f1f5f9" : "#cbd5e1",
                        fontWeight: isSelected ? 700 : 600,
                        fontSize: "0.82rem",
                        lineHeight: 1.2,
                      }}
                      noWrap
                    >
                      {t.display_name || t.db_name}
                    </Typography>
                    <FiberManualRecordIcon
                      sx={{
                        fontSize: 9,
                        color: statusColor,
                        flexShrink: 0,
                        ml: 0.5,
                      }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#475569",
                        fontFamily: "ui-monospace, SFMono-Regular, monospace",
                        fontSize: "0.65rem",
                      }}
                      noWrap
                    >
                      {t.db_name}
                    </Typography>
                    <Chip
                      label={t.tier}
                      size="small"
                      sx={{
                        height: 13,
                        fontSize: "0.55rem",
                        color: tierColor,
                        borderColor: `${tierColor}55`,
                        bgcolor: "transparent",
                        border: "1px solid",
                        fontWeight: 700,
                        "& .MuiChip-label": { px: 0.6 },
                      }}
                    />
                  </Box>
                  {t.monthly_rate > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#334155",
                        fontSize: "0.64rem",
                        mt: 0.25,
                        display: "block",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      LKR {Number(t.monthly_rate).toLocaleString()}/mo
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer count */}
      <Box
        sx={{
          px: 1.75,
          py: 1,
          borderTop: "1px solid #1e293b",
          bgcolor: "rgba(15,23,42,0.7)",
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "#475569", fontSize: "0.65rem", fontWeight: 600 }}
        >
          Showing {filtered.length} of {(tenants as any[]).length} tenants
        </Typography>
      </Box>
    </Box>
  );
}
