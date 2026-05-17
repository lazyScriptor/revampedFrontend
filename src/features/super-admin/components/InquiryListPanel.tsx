import { useMemo, useState } from "react";
import {
    Box,
    Typography,
    Chip,
    TextField,
    InputAdornment,
    CircularProgress,
    IconButton,
    MenuItem,
    Select,
    FormControl,
    Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListOffOutlinedIcon from "@mui/icons-material/FilterListOffOutlined";
import {
    useInquiries,
    type InquiryListParams,
    type InquiryRow,
} from "../hooks/useSuperAdminHooks";

// Aligned with the backend ENUM values — keep in sync if you add a new status.
const STATUS_DOT: Record<string, string> = {
    new: "#3b82f6",
    contacted: "#f59e0b",
    qualified: "#10b981",
    closed: "#64748b",
};

const TYPE_COLOR: Record<string, string> = {
    demo: "#3b82f6",
    sales: "#10b981",
    support: "#f59e0b",
    partnership: "#8b5cf6",
    other: "#64748b",
};

interface Props {
    selectedId: number | null;
    onSelect: (id: number) => void;
}

export default function InquiryListPanel({ selectedId, onSelect }: Props) {
    // Local filter state; passed to useInquiries which server-paginates.
    const [filters, setFilters] = useState<InquiryListParams>({
        page: 1,
        pageSize: 50,
    });
    const [search, setSearch] = useState("");

    // Debounce search by lifting to query params only after user pauses.
    // For simplicity we just commit on every change — TanStack Query will
    // dedupe identical querystrings via queryKey memoisation.
    const queryParams = useMemo(
        () => ({ ...filters, search: search.trim() || undefined }),
        [filters, search],
    );

    const { data, isLoading } = useInquiries(queryParams);
    const rows = (data?.rows ?? []) as InquiryRow[];

    const hasFilters =
        !!filters.status ||
        !!filters.inquiry_type ||
        !!search.trim();

    const resetFilters = () => {
        setFilters({ page: 1, pageSize: 50 });
        setSearch("");
    };

    return (
        <>
            {/* Filter bar */}
            <Box
                sx={{
                    px: 1.5,
                    py: 1.25,
                    borderBottom: "1px solid #1e293b",
                    bgcolor: "#0f172a",
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                }}
            >
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Search name, email, company…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon
                                        sx={{ fontSize: 16, color: "#64748b" }}
                                    />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{
                        "& .MuiInputBase-root": {
                            bgcolor: "#020617",
                            color: "#e2e8f0",
                            fontSize: "0.78rem",
                        },
                        "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#1e293b",
                        },
                    }}
                />

                <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                    <FormControl size="small" sx={filterSx}>
                        <Select
                            value={filters.status || ""}
                            displayEmpty
                            onChange={(e) =>
                                setFilters((f) => ({
                                    ...f,
                                    status: e.target.value || undefined,
                                    page: 1,
                                }))
                            }
                        >
                            <MenuItem value="">All statuses</MenuItem>
                            {["new", "contacted", "qualified", "closed"].map(
                                (s) => (
                                    <MenuItem key={s} value={s}>
                                        {s}
                                    </MenuItem>
                                ),
                            )}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={filterSx}>
                        <Select
                            value={filters.inquiry_type || ""}
                            displayEmpty
                            onChange={(e) =>
                                setFilters((f) => ({
                                    ...f,
                                    inquiry_type: e.target.value || undefined,
                                    page: 1,
                                }))
                            }
                        >
                            <MenuItem value="">All types</MenuItem>
                            {[
                                "demo",
                                "sales",
                                "support",
                                "partnership",
                                "other",
                            ].map((t) => (
                                <MenuItem key={t} value={t}>
                                    {t}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {hasFilters && (
                        <Tooltip title="Clear filters">
                            <IconButton
                                size="small"
                                onClick={resetFilters}
                                sx={{
                                    color: "#94a3b8",
                                    "&:hover": { color: "#f1f5f9" },
                                }}
                            >
                                <FilterListOffOutlinedIcon
                                    sx={{ fontSize: 16 }}
                                />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>

            {/* List */}
            <Box sx={{ flex: 1, overflow: "auto" }}>
                {isLoading && (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            p: 4,
                        }}
                    >
                        <CircularProgress size={20} />
                    </Box>
                )}
                {!isLoading && rows.length === 0 && (
                    <Box sx={{ p: 4, textAlign: "center" }}>
                        <Typography
                            variant="caption"
                            sx={{ color: "#64748b" }}
                        >
                            {hasFilters
                                ? "No inquiries match your filters."
                                : "No inquiries yet — submissions from geargrid.live/contact will appear here."}
                        </Typography>
                    </Box>
                )}
                {rows.map((row) => {
                    const isSelected = row.inquiry_id === selectedId;
                    const isUnread = row.status === "new";
                    return (
                        <Box
                            key={row.inquiry_id}
                            onClick={() => onSelect(row.inquiry_id)}
                            sx={{
                                px: 1.5,
                                py: 1.1,
                                cursor: "pointer",
                                borderBottom: "1px solid #1e293b",
                                bgcolor: isSelected
                                    ? "rgba(59,130,246,0.12)"
                                    : "transparent",
                                borderLeft: `3px solid ${isSelected ? "#3b82f6" : "transparent"}`,
                                "&:hover": {
                                    bgcolor: isSelected
                                        ? "rgba(59,130,246,0.18)"
                                        : "rgba(30,41,59,0.5)",
                                },
                                transition: "0.1s",
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.75,
                                    mb: 0.25,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        bgcolor:
                                            STATUS_DOT[row.status] || "#64748b",
                                        flexShrink: 0,
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: "#f1f5f9",
                                        fontWeight: isUnread ? 700 : 500,
                                        fontSize: "0.78rem",
                                        flex: 1,
                                        minWidth: 0,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {row.name}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: "#64748b",
                                        fontSize: "0.62rem",
                                        flexShrink: 0,
                                    }}
                                >
                                    {formatRelative(row.createdAt)}
                                </Typography>
                            </Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: "#94a3b8",
                                    fontSize: "0.68rem",
                                    display: "block",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    pl: 1.25,
                                }}
                            >
                                {row.email}
                                {row.company ? ` · ${row.company}` : ""}
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 0.5,
                                    mt: 0.5,
                                    pl: 1.25,
                                }}
                            >
                                <Chip
                                    label={row.inquiry_type}
                                    size="small"
                                    sx={{
                                        height: 16,
                                        fontSize: "0.55rem",
                                        fontWeight: 600,
                                        color:
                                            TYPE_COLOR[row.inquiry_type] ||
                                            "#94a3b8",
                                        bgcolor: `${TYPE_COLOR[row.inquiry_type] || "#94a3b8"}22`,
                                        "& .MuiChip-label": { px: 0.7 },
                                    }}
                                />
                                <Chip
                                    label={row.status}
                                    size="small"
                                    sx={{
                                        height: 16,
                                        fontSize: "0.55rem",
                                        fontWeight: 600,
                                        color: STATUS_DOT[row.status] || "#94a3b8",
                                        bgcolor: `${STATUS_DOT[row.status] || "#94a3b8"}22`,
                                        "& .MuiChip-label": { px: 0.7 },
                                    }}
                                />
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {/* Footer count */}
            {!isLoading && data && (
                <Box
                    sx={{
                        flexShrink: 0,
                        px: 1.5,
                        py: 0.75,
                        borderTop: "1px solid #1e293b",
                        bgcolor: "#0f172a",
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{ color: "#64748b", fontSize: "0.65rem" }}
                    >
                        {data.total} inquir
                        {data.total === 1 ? "y" : "ies"} total
                    </Typography>
                </Box>
            )}
        </>
    );
}

// Small relative time formatter — keeps the list scannable without leaning on
// a date library. Falls back to "MMM D" for anything older than a week.
const formatRelative = (iso: string) => {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const filterSx = {
    minWidth: 110,
    flex: 1,
    "& .MuiInputBase-root": {
        bgcolor: "#020617",
        color: "#e2e8f0",
        fontSize: "0.7rem",
        height: 30,
    },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#1e293b" },
    "& .MuiSelect-icon": { color: "#64748b" },
};
