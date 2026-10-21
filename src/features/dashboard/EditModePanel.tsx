import React from "react";
import { Box, Typography, Switch, Divider, IconButton, Drawer, Button, Tooltip } from "@mui/material";
import { Close, Check } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useDashboardStore } from "@/stores/useDashboardStore";

const EditModePanel: React.FC = () => {
  const { t } = useTranslation();
  const isPanelOpen = useDashboardStore((s) => s.isPanelOpen);
  const closePanel = useDashboardStore((s) => s.closePanel);
  const layout = useDashboardStore((s) => s.layout);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);
  const widgetCatalog = useDashboardStore((s) => s.widgetCatalog);

  return (
    <Drawer
      anchor="right"
      variant="temporary"
      open={isPanelOpen}
      onClose={closePanel}
      hideBackdrop
      disableScrollLock
      slotProps={{
        root: {
          style: { pointerEvents: "none" },
        },
        paper: {
          sx: {
            pointerEvents: "auto",
            width: { xs: "90vw", sm: 340, md: 320 },
            maxWidth: 380,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            borderLeft: "1px solid",
            borderColor: "border.subtle",
            bgcolor: "background.paper",
            p: { xs: 2, sm: 2.5 },
            boxShadow: "-8px 0 24px rgba(0,0,0,0.12)",
          },
        },
      }}
    >
      {/* Header with clear Title and Close Icon */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ pr: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.3 }}>
            {t("dashboard.customizeDashboard", "Customize Dashboard")}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("dashboard.toggleModules", "Toggle and arrange modules")}
          </Typography>
        </Box>
        <Tooltip title={t("common.close", "Close")}>
          <IconButton
            size="small"
            onClick={closePanel}
            aria-label={t("dashboard.EditModePanel.closeCustomizer")}
            sx={{
              color: "text.secondary",
              bgcolor: "action.hover",
              borderRadius: 1.5,
              mt: -0.5,
              "&:hover": { color: "text.primary", bgcolor: "action.selected" },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Typography
        variant="overline"
        sx={{ color: "text.secondary", letterSpacing: 1.2, fontSize: "0.68rem", fontWeight: 700 }}
      >
        {t("dashboard.availableModules", "AVAILABLE MODULES")}
      </Typography>

      {/* Scrollable list of modules */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          mt: 1.5,
          flexGrow: 1,
          overflowY: "auto",
          pr: 0.5,
          "&::-webkit-scrollbar": { width: 5 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "#cbd5e1", borderRadius: 4 },
        }}
      >
        {widgetCatalog.map((widget) => {
          const isEnabled = layout.some((item) => item.i === widget.widget_key);

          return (
            <Box
              key={widget.widget_key}
              onClick={() => toggleWidget(widget)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 1.75,
                py: 1.25,
                borderRadius: 2,
                border: "1px solid",
                borderColor: isEnabled ? "primary.main" : "border.subtle",
                bgcolor: isEnabled ? "rgba(37, 99, 235, 0.05)" : "transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: isEnabled ? "rgba(37, 99, 235, 0.09)" : "action.hover",
                },
              }}
            >
              <Box sx={{ minWidth: 0, pr: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: isEnabled ? "primary.dark" : "text.primary", fontSize: "0.82rem" }}
                >
                  {t(widget.display_name)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: isEnabled ? "primary.main" : "text.secondary", display: "block", fontSize: "0.7rem", fontWeight: 500 }}
                >
                  {widget.default_w >= 2 ? t("dashboard.halfWidth", "Half Width") : t("dashboard.quarterWidth", "Quarter Width")}
                </Typography>
              </Box>
              <Switch
                checked={isEnabled}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleWidget(widget)}
                color="primary"
                size="small"
              />
            </Box>
          );
        })}
      </Box>

      {/* Sticky Bottom Done / Close Button */}
      <Box
        sx={{
          mt: "auto",
          pt: 2,
          pb: 0.5,
          borderTop: "1px solid",
          borderColor: "border.subtle",
          bgcolor: "background.paper",
          flexShrink: 0,
        }}
      >
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<Check />}
          onClick={closePanel}
          disableElevation
          sx={{
            fontWeight: 800,
            borderRadius: 2,
            py: 1.25,
            textTransform: "none",
            fontSize: "0.88rem",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
            "&:hover": {
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
            },
          }}
        >
          {t("dashboard.doneEditing", "Done Customizing")}
        </Button>
      </Box>
    </Drawer>
  );
};

export default EditModePanel;
