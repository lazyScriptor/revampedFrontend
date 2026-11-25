import { useCallback } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Box, Dialog, Drawer, IconButton, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import { useOverlayLevel } from "./OverlayProvider";

export interface OverlayProps {
  title: ReactNode;
  /** Runs on Enter, unless focus is in a multi-line field or on a button/link. */
  onConfirm?: () => void;
  /** Drawer width on md+ (number = px). */
  width?: number | string;
  /** Fixed bar under the content (action buttons, totals). */
  footer?: ReactNode;
  /** Extra controls on the right of the title bar. */
  headerActions?: ReactNode;
  children: ReactNode;
}

const isMultiLine = (el: EventTarget | null) => {
  const node = el as HTMLElement | null;
  if (!node) return false;
  return node.tagName === "TEXTAREA" || node.isContentEditable === true;
};

const isNativelyActivated = (el: EventTarget | null) => {
  const node = el as HTMLElement | null;
  if (!node) return false;
  return (
    node.tagName === "BUTTON" ||
    node.tagName === "A" ||
    node.tagName === "SELECT" ||
    node.getAttribute?.("role") === "button" ||
    node.getAttribute?.("role") === "combobox"
  );
};

/**
 * The one overlay shell: a right-hand drawer on md+, a full-screen dialog on phones.
 * Esc and the backdrop close it (MUI only sends them to the top level); Enter confirms.
 * Only theme tokens are used for colour, so it follows light/dark and the shop's brand colour.
 */
export function Overlay({ title, onConfirm, width = 480, footer, headerActions, children }: OverlayProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const level = useOverlayLevel();
  const depth = level?.depth ?? 0;
  const close = level?.close ?? (() => {});
  const showBack = depth > 0 || isPhone;

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== "Enter" || !onConfirm) return;
      if (e.defaultPrevented || e.nativeEvent.isComposing) return; // IME (Sinhala typing) uses Enter
      if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isMultiLine(e.target) || isNativelyActivated(e.target)) return;
      e.preventDefault();
      onConfirm();
    },
    [onConfirm],
  );

  const body = (
    <Box
      onKeyDown={onKeyDown}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        bgcolor: "background.paper",
        color: "text.primary",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.75,
          minHeight: 52,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Tooltip title={showBack ? t("common.back") : t("common.close")}>
          <IconButton
            onClick={close}
            aria-label={showBack ? t("common.back") : t("common.close")}
            sx={{ width: 44, height: 44 }}
          >
            {showBack ? <ArrowBackIcon /> : <CloseIcon />}
          </IconButton>
        </Tooltip>
        <Typography component="h2" variant="subtitle1" noWrap sx={{ fontWeight: 800, flex: 1, minWidth: 0 }}>
          {title}
        </Typography>
        {headerActions}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2 }}>{children}</Box>
      {footer && (
        <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider", p: 1.5, bgcolor: "background.paper" }}>{footer}</Box>
      )}
    </Box>
  );

  const onModalClose = () => close();

  if (isPhone) {
    return (
      <Dialog open fullScreen onClose={onModalClose} aria-label={typeof title === "string" ? title : undefined}>
        {body}
      </Dialog>
    );
  }

  return (
    <Drawer
      anchor="right"
      open
      onClose={onModalClose}
      slotProps={{
        paper: {
          sx: { width, maxWidth: "100vw" },
        },
      }}
    >
      {body}
    </Drawer>
  );
}
