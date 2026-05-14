import React, { Suspense, useMemo } from "react";
import { Box, Skeleton, Button } from "@mui/material";
import { DragIndicator, Settings, Close } from "@mui/icons-material";
import {
  ResponsiveGridLayout,
  Layout,
  LayoutItem as RglLayoutItem,
  verticalCompactor,
  useContainerWidth,
} from "react-grid-layout";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useDashboardStore } from "@/stores/useDashboardStore";
import { useDashboardConfig } from "@/features/dashboard/hooks/useDashboardHooks";
import { useAuthStore } from "@/stores/useAuthStore";
import { WIDGET_COMPONENTS } from "@/features/dashboard/widgets/WidgetRegistry";
import MasterFilterBar from "@/features/dashboard/MasterFilterBar";
import EditModePanel from "@/features/dashboard/EditModePanel";
import type {
  LayoutItem as StoreLayoutItem,
  WidgetDefinition,
} from "@/features/dashboard/types";

const WidgetSkeleton: React.FC = () => (
  <Skeleton
    variant="rectangular"
    width="100%"
    height="100%"
    sx={{ borderRadius: 2 }}
  />
);

const DashboardEngine: React.FC = () => {
  const { isLoading: configLoading } = useDashboardConfig();

  const layout = useDashboardStore((s) => s.layout);
  const setLayout = useDashboardStore((s) => s.setLayout);
  const widgetCatalog = useDashboardStore((s) => s.widgetCatalog);
  const isEditMode = useDashboardStore((s) => s.isEditMode);
  const isConfigLoaded = useDashboardStore((s) => s.isConfigLoaded);
  const toggleEditMode = useDashboardStore((s) => s.toggleEditMode);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const catalogMap = useMemo(
    () =>
      Object.fromEntries(
        widgetCatalog.map((d: WidgetDefinition) => [d.widget_key, d]),
      ),
    [widgetCatalog],
  );

  const { width: gridWidth, containerRef } = useContainerWidth();

  const handleRemoveWidget = (widgetKey: string) => {
    const def = catalogMap[widgetKey];
    if (def) toggleWidget(def);
  };

  const onLayoutChange = (currentLayout: Layout) => {
    if (!isEditMode) return;
    const merged: StoreLayoutItem[] = currentLayout.map(
      (item: RglLayoutItem) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      }),
    );
    setLayout(merged);
  };

  if (configLoading || !isConfigLoaded) {
    return (
      <Box
        sx={{
          p: 3,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 2,
        }}
      >
        {([1, 1, 1, 1, 2, 2] as const).map((span, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={span === 1 ? 150 : 316}
            sx={{ borderRadius: 2, gridColumn: `span ${span}` }}
          />
        ))}
      </Box>
    );
  }

  const visibleLayout = layout.filter((item) => {
    const def = catalogMap[item.i];
    return (
      def &&
      (!def.required_permission || hasPermission(def.required_permission))
    );
  });

  const rglLayout: RglLayoutItem[] = visibleLayout.map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
  }));

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "#F8FAFC",
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          px: 3,
          py: 1.5,
          bgcolor: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          flexShrink: 0,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <MasterFilterBar />
        </Box>
        <Button
          variant={isEditMode ? "contained" : "outlined"}
          size="small"
          startIcon={<Settings sx={{ fontSize: "16px !important" }} />}
          onClick={toggleEditMode}
          disableElevation
          sx={{
            whiteSpace: "nowrap",
            flexShrink: 0,
            borderRadius: 1.5,
            textTransform: "none",
          }}
        >
          {isEditMode ? "Done" : "Customize"}
        </Button>
      </Box>

      {/* Scrollable grid */}
      <Box
        ref={containerRef}
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          overflowX: "hidden",
          px: 3,
          pt: 2,
          pb: 4,
        }}
      >
        <ResponsiveGridLayout
          key={visibleLayout
            .map((i) => i.i)
            .sort()
            .join(",")}
          width={gridWidth}
          layouts={{ lg: rglLayout, md: rglLayout, sm: rglLayout }}
          breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}
          cols={{ lg: 4, md: 4, sm: 2, xs: 1 }}
          rowHeight={150}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          dragConfig={{ enabled: isEditMode, handle: ".drag-handle" }}
          resizeConfig={{ enabled: false }}
          compactor={verticalCompactor}
          onLayoutChange={onLayoutChange}
        >
          {visibleLayout.map((item) => {
            const WidgetComponent = WIDGET_COMPONENTS[item.i];
            if (!WidgetComponent) return null;

            return (
              <Box
                key={item.i}
                sx={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  width: "100%",
                  overflow: "hidden",
                  borderRadius: 2,
                  bgcolor: "#FFFFFF",
                  border: "1px solid",
                  borderColor: isEditMode ? "primary.300" : "#E2E8F0",
                  borderStyle: isEditMode ? "dashed" : "solid",
                  boxShadow: isEditMode
                    ? "none"
                    : "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.15s ease",
                  "&:hover": isEditMode
                    ? {}
                    : { boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
                  // Close button reveals on card hover (normal mode only)
                  "& .widget-dismiss": {
                    opacity: 0,
                    transition: "opacity 0.15s ease",
                  },
                  "&:hover .widget-dismiss": { opacity: 1 },
                }}
              >
                {/* Edit mode: drag strip + inline close */}
                {isEditMode && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      height: 26,
                      borderBottom: "1px dashed",
                      borderColor: "primary.200",
                      bgcolor: "#EFF6FF",
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      className="drag-handle"
                      sx={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        pl: 1,
                        cursor: "grab",
                        height: "100%",
                        "&:active": { cursor: "grabbing" },
                      }}
                    >
                      <DragIndicator
                        sx={{ fontSize: 16, color: "primary.400" }}
                      />
                    </Box>
                    <Box
                      onClick={() => handleRemoveWidget(item.i)}
                      sx={{
                        width: 26,
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "text.disabled",
                        "&:hover": { color: "#dc2626", bgcolor: "#fee2e2" },
                        transition: "color 0.1s, background-color 0.1s",
                      }}
                    >
                      <Close sx={{ fontSize: 13 }} />
                    </Box>
                  </Box>
                )}

                {/* Normal mode: hover-reveal dismiss button */}
                {!isEditMode && (
                  <Box
                    className="widget-dismiss"
                    onClick={() => handleRemoveWidget(item.i)}
                    sx={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      zIndex: 10,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      bgcolor: "rgba(0,0,0,0.06)",
                      color: "#94a3b8",
                      "&:hover": { bgcolor: "#fee2e2", color: "#dc2626" },
                      transition: "background-color 0.1s, color 0.1s",
                    }}
                  >
                    <Close sx={{ fontSize: 11 }} />
                  </Box>
                )}

                {/* Widget content */}
                <Box sx={{ flexGrow: 1, overflow: "hidden", minHeight: 0 }}>
                  <Suspense fallback={<WidgetSkeleton />}>
                    <WidgetComponent />
                  </Suspense>
                </Box>
              </Box>
            );
          })}
        </ResponsiveGridLayout>
      </Box>

      {/* Edit panel — overlay, does not push content */}
      <EditModePanel />
    </Box>
  );
};

export default DashboardEngine;
