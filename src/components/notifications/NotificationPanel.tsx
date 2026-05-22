import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Popover,
  Divider,
  Button,
  Tab,
  Tabs,
  CircularProgress,
} from "@mui/material";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { NotificationItem } from "./NotificationItem";

const TAB_FILTERS = [
  { key: "all", label: "All" },
  { key: "bulk_job", label: "Jobs" },
  { key: "alerts", label: "Alerts" }, // success/warning/error
] as const;

export function NotificationPanel({
  anchorEl,
  open,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}) {
  const items = useNotificationStore((s) => s.items);
  const loading = useNotificationStore((s) => s.loading);
  const markRead = useNotificationStore((s) => s.markRead);
  const remove = useNotificationStore((s) => s.remove);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const socketConnected = useNotificationStore((s) => s.socketConnected);

  const [filter, setFilter] = useState<(typeof TAB_FILTERS)[number]["key"]>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "bulk_job") return items.filter((n) => n.type === "bulk_job" || n.category === "data_arena");
    if (filter === "alerts")
      return items.filter((n) => ["success", "warning", "error"].includes(n.type));
    return items;
  }, [items, filter]);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: 320, sm: 380 },
            maxHeight: 520,
            borderRadius: 2.5,
            boxShadow: "0 12px 32px rgba(15,23,42,0.18)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
            Notifications
          </Typography>
          <Typography variant="caption" sx={{ color: socketConnected ? "#16a34a" : "#94a3b8" }}>
            {socketConnected ? "● Live" : "○ Offline"}
          </Typography>
        </Box>
        <Button
          size="small"
          onClick={markAllRead}
          sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.75rem" }}
        >
          Mark all read
        </Button>
      </Box>

      {/* Tabs */}
      <Tabs
        value={filter}
        onChange={(_, v) => setFilter(v)}
        variant="fullWidth"
        sx={{
          minHeight: 36,
          "& .MuiTab-root": {
            minHeight: 36,
            textTransform: "none",
            fontSize: "0.78rem",
            fontWeight: 700,
          },
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {TAB_FILTERS.map((t) => (
          <Tab key={t.key} value={t.key} label={t.label} />
        ))}
      </Tabs>

      {/* List */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", minHeight: 0 }}>
        {loading && items.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={20} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              py: 5,
              color: "#94a3b8",
            }}
          >
            <NotificationsOffIcon />
            <Typography variant="caption">No notifications yet</Typography>
          </Box>
        ) : (
          filtered.map((n, i) => (
            <Box key={n.notification_id}>
              <NotificationItem
                item={n}
                onMarkRead={markRead}
                onRemove={remove}
                onClose={onClose}
              />
              {i < filtered.length - 1 && <Divider />}
            </Box>
          ))
        )}
      </Box>
    </Popover>
  );
}
