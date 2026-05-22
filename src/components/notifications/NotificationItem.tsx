import { Box, IconButton, Typography, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WorkIcon from "@mui/icons-material/Work";
import CloseIcon from "@mui/icons-material/Close";
import { NotificationRow } from "@/features/notifications/api/notifications.api";
import { useNavigate } from "@tanstack/react-router";

const TONE: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  success: { color: "#16a34a", bg: "#dcfce7", icon: <CheckCircleIcon sx={{ fontSize: 18 }} /> },
  error: { color: "#dc2626", bg: "#fee2e2", icon: <ErrorIcon sx={{ fontSize: 18 }} /> },
  warning: { color: "#d97706", bg: "#fef3c7", icon: <WarningAmberIcon sx={{ fontSize: 18 }} /> },
  bulk_job: { color: "#2563eb", bg: "#dbeafe", icon: <WorkIcon sx={{ fontSize: 18 }} /> },
  info: { color: "#0f172a", bg: "#e2e8f0", icon: <InfoOutlinedIcon sx={{ fontSize: 18 }} /> },
  system: { color: "#475569", bg: "#f1f5f9", icon: <InfoOutlinedIcon sx={{ fontSize: 18 }} /> },
};

const relTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export function NotificationItem({
  item,
  onMarkRead,
  onRemove,
  onClose,
}: {
  item: NotificationRow;
  onMarkRead: (id: number) => void;
  onRemove: (id: number) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const tone = TONE[item.type] || TONE.info;
  const isUnread = !item.read_at;

  const handleClick = () => {
    if (isUnread) onMarkRead(item.notification_id);
    if (item.link) {
      onClose();
      // Parse path + query so TanStack can navigate
      const [path, query] = item.link.split("?");
      const search: Record<string, string> = {};
      if (query) {
        for (const part of query.split("&")) {
          const [k, v] = part.split("=");
          if (k) search[decodeURIComponent(k)] = decodeURIComponent(v || "");
        }
      }
      navigate({ to: path as any, search: search as any });
    }
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        display: "flex",
        gap: 1.5,
        px: 2,
        py: 1.25,
        cursor: item.link ? "pointer" : "default",
        bgcolor: isUnread ? "#f8fafc" : "transparent",
        borderLeft: `3px solid ${isUnread ? tone.color : "transparent"}`,
        transition: "background-color 0.15s",
        "&:hover": { bgcolor: "#f1f5f9" },
        position: "relative",
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          minWidth: 32,
          borderRadius: "50%",
          bgcolor: tone.bg,
          color: tone.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {tone.icon}
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: isUnread ? 800 : 600,
            color: "#0f172a",
            lineHeight: 1.3,
          }}
          noWrap
        >
          {item.title}
        </Typography>
        {item.message && (
          <Typography
            variant="caption"
            sx={{
              color: "#475569",
              mt: 0.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {item.message}
          </Typography>
        )}
        <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.7rem" }}>
          {relTime(item.createdAt)}
        </Typography>
      </Box>

      <Tooltip title="Dismiss">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.notification_id);
          }}
          sx={{ alignSelf: "flex-start" }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
