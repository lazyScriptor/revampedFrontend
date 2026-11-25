import { Badge, Box, Button, IconButton, Typography } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { isNativePhoneApp } from "../lib/nativeBridge";
import {
  installWebBackOverlayHandler,
  useSyncNativeStatusBar,
  useUnreadAlertCount,
} from "../lib/phoneAppState";

const ROUTE_TITLE_KEYS: Array<[string, string]> = [
  ["/dashboard", "nav.dashboard"],
  ["/invoices", "nav.invoices"],
  ["/customers", "nav.customers"],
  ["/equipment", "nav.equipment"],
  ["/categories", "nav.categories"],
  ["/maintenance", "nav.maintenance"],
  ["/rental-history", "nav.rentalHistory"],
  ["/activity", "nav.activity"],
  ["/accounting", "nav.accounting"],
  ["/reports", "nav.reports"],
  ["/locker", "nav.cashLocker"],
  ["/workforce", "nav.workforce"],
  ["/messages", "nav.messages"],
  ["/profile", "nav.profile"],
  ["/admin", "nav.userConfiguration"],
  ["/data-arena", "nav.dataArena"],
];

export const PHONE_BAR_HEIGHT = 48;

/**
 * Slim 48px bar at the top of full-system pages when running inside the native GearGrid Phone app.
 * Never rendered in a regular desktop or mobile browser.
 */
export function PhoneAppBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const native = isNativePhoneApp();
  useSyncNativeStatusBar();
  installWebBackOverlayHandler();
  const { count: unreadCount } = useUnreadAlertCount();

  if (!native) return null;

  const matched = ROUTE_TITLE_KEYS.find(([prefix]) => location.pathname.startsWith(prefix));
  const pageTitle = matched
    ? t(matched[1], { defaultValue: "GearGrid" })
    : "GearGrid";

  return (
    <Box
      component="header"
      data-testid="native-phone-bar"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: PHONE_BAR_HEIGHT,
        zIndex: (theme) => theme.zIndex.drawer + 3,
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 1,
        gap: 1,
      }}
    >
      <Button
        size="small"
        startIcon={<HomeOutlinedIcon fontSize="small" />}
        onClick={() => navigate({ to: "/device/alerts" })}
        sx={{
          minHeight: 40,
          textTransform: "none",
          fontWeight: 700,
          color: "text.primary",
          whiteSpace: "nowrap",
          px: 1,
        }}
      >
        {t("phoneShell.phoneHome")}
      </Button>

      <Typography
        variant="subtitle2"
        noWrap
        sx={{
          fontWeight: 700,
          textAlign: "center",
          flex: 1,
          minWidth: 0,
          color: "text.primary",
        }}
      >
        {pageTitle}
      </Typography>

      <IconButton
        aria-label={t("phoneShell.tab_alerts")}
        onClick={() => navigate({ to: "/device/alerts" })}
        sx={{ minWidth: 40, minHeight: 40, color: "text.primary" }}
      >
        <Badge
          badgeContent={unreadCount}
          color="warning"
          max={99}
          sx={{ "& .MuiBadge-badge": { fontVariantNumeric: "tabular-nums" } }}
        >
          <NotificationsNoneOutlinedIcon fontSize="small" />
        </Badge>
      </IconButton>
    </Box>
  );
}
