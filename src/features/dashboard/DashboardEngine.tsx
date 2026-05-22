import React, { Suspense, useMemo } from "react";
import { Box, Skeleton, Button, Typography } from "@mui/material";
import { DragIndicator, Settings, Close } from "@mui/icons-material";
import { dashboardTokens as dt } from "./_tokens";
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
    sx={{ borderRadius: dt.radius.md, bgcolor: dt.color.surfaceMuted }}
  />
);

const today = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const DashboardEngine: React.FC = () => {
  const { isLoading: configLoading } = useDashboardConfig();

  const layout = useDashboardStore((s) => s.layout);
  const setLayout = useDashboardStore((s) => s.setLayout);
  const setWidgetWidth = useDashboardStore((s) => s.setWidgetWidth);
  const widgetCatalog = useDashboardStore((s) => s.widgetCatalog);
  const isEditMode = useDashboardStore((s) => s.isEditMode);
  const isConfigLoaded = useDashboardStore((s) => s.isConfigLoaded);
  const toggleEditMode = useDashboardStore((s) => s.toggleEditMode);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const userDisplayName = useAuthStore(
    (s) => (s.user?.first_name as string | undefined) || s.user?.username || "",
  );

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
          p: { xs: 2, md: 3 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 1.5,
        }}
      >
        {([1, 1, 1, 1, 2, 2] as const).map((span, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={span === 1 ? 144 : 316}
            sx={{
              borderRadius: dt.radius.lg,
              bgcolor: dt.color.surfaceMuted,
              gridColumn: `span ${span}`,
            }}
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

  // Build a mobile-friendly 2-col layout: KPI cards pair up (w=1 each),
  // charts and tables go full-width (w=2). Items stack without overlap.
  const buildMobileLayout = (): RglLayoutItem[] => {
    const result: RglLayoutItem[] = [];
    let curY = 0;
    let kpiRow: StoreLayoutItem[] = [];

    const flushKpiRow = () => {
      if (!kpiRow.length) return;
      kpiRow.forEach((item, i) => {
        result.push({ i: item.i, x: i % 2, y: curY + Math.floor(i / 2), w: 1, h: item.h });
      });
      curY += Math.ceil(kpiRow.length / 2) * kpiRow[0].h;
      kpiRow = [];
    };

    for (const item of visibleLayout) {
      const isKpi = item.h <= 1 && item.w <= 1;
      if (isKpi) {
        kpiRow.push(item);
      } else {
        flushKpiRow();
        result.push({ i: item.i, x: 0, y: curY, w: 2, h: item.h });
        curY += item.h;
      }
    }
    flushKpiRow();
    return result;
  };

  // Generate responsive layouts for each breakpoint
  const generateResponsiveLayout = (): Record<string, RglLayoutItem[]> => {
    const lgLayout: RglLayoutItem[] = visibleLayout.map((item) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));

    const mobileLayout = buildMobileLayout();

    return {
      lg: lgLayout,
      md: lgLayout,
      sm: mobileLayout, // tablet: 2-col, charts full-width
      xs: mobileLayout, // phone: 2-col, charts full-width
    };
  };

  const responsiveLayouts = generateResponsiveLayout();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: dt.color.background,
      }}
    >
      {/* Header bar — welcome line + filters + customize CTA */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "stretch", lg: "center" },
          flexDirection: { xs: "column", lg: "row" },
          gap: { xs: 1.5, lg: 2 },
          px: { xs: 2, md: 3 },
          py: { xs: 1.5, md: 2 },
          bgcolor: dt.color.surface,
          borderBottom: `1px solid ${dt.color.border}`,
          flexShrink: 0,
        }}
      >
        {/* Welcome / context line — hidden when very narrow to keep filters dominant */}
        <Box sx={{ minWidth: 0, display: { xs: "none", md: "block" }, flexShrink: 0 }}>
          <Typography
            sx={{
              fontSize: "1.05rem",
              fontWeight: 800,
              color: dt.color.foreground,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            {userDisplayName ? `Welcome back, ${userDisplayName}` : "Dashboard"}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: dt.color.foregroundFaint,
              fontSize: "0.72rem",
              fontWeight: 500,
            }}
          >
            {today()}
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: { md: "flex-end", lg: "center" },
          }}
        >
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
            borderRadius: dt.radius.md,
            textTransform: "none",
            fontWeight: 700,
            px: 2,
            borderColor: isEditMode ? "transparent" : dt.color.border,
            color: isEditMode ? "#fff" : dt.color.foreground,
            bgcolor: isEditMode ? dt.color.primary : "transparent",
            "&:hover": {
              bgcolor: isEditMode ? dt.color.primaryStrong : dt.color.surfaceMuted,
              borderColor: isEditMode ? "transparent" : dt.color.borderStrong,
            },
            transition: dt.motion.base,
          }}
        >
          {isEditMode ? "Done editing" : "Customize"}
        </Button>
      </Box>

      {/* Scrollable grid */}
      <Box
        ref={containerRef}
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          overflowX: "hidden",
          px: { xs: 1.5, sm: 2, md: 3 },
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
          layouts={responsiveLayouts}
          breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}
          cols={{ lg: 4, md: 4, sm: 2, xs: 2 }}
          rowHeight={150}
          margin={[12, 12]}
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
                  borderRadius: dt.radius.lg,
                  bgcolor: dt.color.surface,
                  border: `1px solid ${isEditMode ? dt.color.primary : dt.color.border}`,
                  borderStyle: isEditMode ? "dashed" : "solid",
                  boxShadow: isEditMode ? dt.shadow.none : dt.shadow.sm,
                  transition: `box-shadow ${dt.motion.base}, transform ${dt.motion.base}, border-color ${dt.motion.fast}`,
                  "&:hover": isEditMode
                    ? {}
                    : {
                        boxShadow: dt.shadow.md,
                        borderColor: dt.color.borderStrong,
                      },
                  // Close button reveals on card hover (normal mode only)
                  "& .widget-dismiss": {
                    opacity: 0,
                    transform: "scale(0.85)",
                    transition: `opacity ${dt.motion.fast}, transform ${dt.motion.fast}, background-color ${dt.motion.fast}, color ${dt.motion.fast}`,
                  },
                  "&:hover .widget-dismiss": { opacity: 1, transform: "scale(1)" },
                }}
              >
                {/* Edit mode: drag strip + size presets + remove */}
                {isEditMode && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      height: 32,
                      borderBottom: `1px dashed ${dt.color.primary}55`,
                      bgcolor: `${dt.color.primary}0A`,
                      flexShrink: 0,
                      gap: 0.5,
                      px: 0.5,
                    }}
                  >
                    {/* Drag handle — only this element is the actual drag trigger */}
                    <Box
                      className="drag-handle"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.25,
                        pl: 0.5,
                        cursor: "grab",
                        height: "100%",
                        color: dt.color.primary,
                        flexShrink: 0,
                        "&:active": { cursor: "grabbing" },
                      }}
                    >
                      <DragIndicator sx={{ fontSize: 14 }} />
                    </Box>

                    {/* Spacer */}
                    <Box sx={{ flex: 1 }} />

                    {/* Width preset buttons: 1 / 2 / 3 / 4 columns */}
                    {([1, 2, 3, 4] as const).map((size) => {
                      const active = item.w === size;
                      return (
                        <Box
                          key={size}
                          onClick={(e) => {
                            e.stopPropagation();
                            setWidgetWidth(item.i, size);
                          }}
                          title={`${size} column${size > 1 ? "s" : ""}`}
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: 0.75,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.6rem",
                            fontWeight: 800,
                            cursor: "pointer",
                            userSelect: "none",
                            bgcolor: active ? dt.color.primary : "transparent",
                            color: active ? "#fff" : dt.color.foregroundFaint,
                            border: `1px solid ${active ? dt.color.primary : dt.color.border}`,
                            transition: `background-color ${dt.motion.fast}, color ${dt.motion.fast}, border-color ${dt.motion.fast}`,
                            "&:hover": {
                              bgcolor: active ? dt.color.primaryStrong : `${dt.color.primary}18`,
                              borderColor: dt.color.primary,
                              color: active ? "#fff" : dt.color.primary,
                            },
                          }}
                        >
                          {size}
                        </Box>
                      );
                    })}

                    {/* Remove */}
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveWidget(item.i);
                      }}
                      sx={{
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        borderRadius: 0.75,
                        color: dt.color.foregroundFaint,
                        transition: `color ${dt.motion.fast}, background-color ${dt.motion.fast}`,
                        "&:hover": {
                          color: dt.color.danger,
                          bgcolor: `${dt.color.danger}14`,
                        },
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
                      top: 8,
                      right: 8,
                      zIndex: 10,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      bgcolor: dt.color.surfaceMuted,
                      color: dt.color.foregroundFaint,
                      "&:hover": {
                        bgcolor: `${dt.color.danger}14`,
                        color: dt.color.danger,
                      },
                    }}
                  >
                    <Close sx={{ fontSize: 12 }} />
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
