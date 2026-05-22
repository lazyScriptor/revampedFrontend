import { useEffect, useRef, useState } from "react";
import { Badge, IconButton, Tooltip } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { NotificationPanel } from "./NotificationPanel";

export function NotificationBell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const init = useNotificationStore((s) => s.init);
  const teardown = useNotificationStore((s) => s.teardown);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      init();
    } else {
      teardown();
    }
  }, [isAuthenticated, init, teardown]);

  if (!isAuthenticated) return null;

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          ref={anchorRef}
          onClick={() => setOpen((v) => !v)}
          sx={{ color: "text.secondary" }}
        >
          <Badge
            badgeContent={unreadCount > 99 ? "99+" : unreadCount}
            color="error"
            invisible={unreadCount === 0}
            sx={{
              "& .MuiBadge-badge": {
                fontSize: "0.65rem",
                height: 16,
                minWidth: 16,
                fontWeight: 800,
              },
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Lazy mount — panel + items never enter the tree until the user opens
          the bell. Cheaper to render and isolates any panel-internal error. */}
      {open && (
        <NotificationPanel
          anchorEl={anchorRef.current}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
