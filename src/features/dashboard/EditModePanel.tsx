import React from "react";
import { Box, Typography, Switch, Divider, IconButton, Drawer } from "@mui/material";
import { Close } from "@mui/icons-material";
import { useDashboardStore } from "@/stores/useDashboardStore";

const EditModePanel: React.FC = () => {
  const isEditMode = useDashboardStore((s) => s.isEditMode);
  const layout = useDashboardStore((s) => s.layout);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);
  const toggleEditMode = useDashboardStore((s) => s.toggleEditMode);
  const widgetCatalog = useDashboardStore((s) => s.widgetCatalog);

  return (
    <Drawer
      anchor="right"
      variant="temporary"
      open={isEditMode}
      onClose={toggleEditMode}
      slotProps={{
        paper: {
          sx: {
            width: 300,
            borderLeft: "1px solid #E2E8F0",
            bgcolor: "#FFFFFF",
            px: 2.5,
            py: 3,
            boxShadow: "-8px 0 24px rgba(0,0,0,0.06)",
          },
        },
        backdrop: {
          sx: { bgcolor: "rgba(0,0,0,0.06)" },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.3 }}>
            Customize Dashboard
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Toggle modules on or off
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={toggleEditMode}
          sx={{ color: "text.disabled", mt: -0.5, "&:hover": { color: "text.primary" } }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Typography
        variant="overline"
        sx={{ color: "text.disabled", letterSpacing: 1.2, fontSize: "0.65rem", fontWeight: 600 }}
      >
        Available Modules
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1.5 }}>
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
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                border: "1px solid",
                borderColor: isEnabled ? "primary.200" : "#E2E8F0",
                bgcolor: isEnabled ? "#EFF6FF" : "transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": {
                  borderColor: "primary.300",
                  bgcolor: isEnabled ? "#DBEAFE" : "#F8FAFC",
                },
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: isEnabled ? "primary.800" : "text.primary", fontSize: "0.8rem" }}
                >
                  {widget.display_name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: isEnabled ? "primary.500" : "text.disabled", display: "block", fontSize: "0.7rem" }}
                >
                  {widget.default_w >= 2 ? "Half width" : "Quarter width"}
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
    </Drawer>
  );
};

export default EditModePanel;
