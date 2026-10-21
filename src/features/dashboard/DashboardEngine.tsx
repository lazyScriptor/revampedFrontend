import React, { Suspense, useMemo } from "react";
import {
  Box,
  Skeleton,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { DragIndicator, Settings, Close } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
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
    sx={{ borderRadius: dt.radius.lg, bgcolor: dt.color.surfaceMuted }}
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
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { isLoading: configLoading } = useDashboardConfig();

  const layout = useDashboardStore((s) => s.layout);
  const setLayout = useDashboardStore((s) => s.setLayout);
  const setWidgetWidth = useDashboardStore((s) => s.setWidgetWidth);
  const widgetCatalog = useDashboardStore((s) => s.widgetCatalog);
  const isEditMode = useDashboardStore((s) => s.isEditMode);
  const isPanelOpen = useDashboardStore((s) => s.isPanelOpen);
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
    if (!isEditMode || isMobile) return;
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

  const visibleLayout = useMemo(() => {
    return layout.filter((item) => {
      const def = catalogMap[item.i];
      return (
        def &&
        (!def.required_permission || hasPermission(def.required_permission))
      );
    });
  }, [layout, catalogMap, hasPermission]);

  // Desktop RGL Layout
  const desktopLayouts = useMemo(
    () => ({
      lg: visibleLayout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      })),
      md: visibleLayout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      })),
      sm: visibleLayout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      })),
      xs: visibleLayout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      })),
    }),
    [visibleLayout],
  );

  const sortedVisibleLayout = useMemo(() => {
    return [...visibleLayout].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
  }, [visibleLayout]);

  if (configLoading || !isConfigLoaded) {
    return (
      <Box
        sx={{
          p: { xs: 2, md: 3 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        {([1, 1, 1, 1, 2, 2] as const).map((span, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={span === 1 ? 130 : 310}
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

  const renderCardContent = (item: StoreLayoutItem) => {
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
          boxShadow: isEditMode ? dt.shadow.none : dt.shadow.card,
          transition: `box-shadow ${dt.motion.base}, transform ${dt.motion.base}, border-color ${dt.motion.fast}`,
          "&:hover": isEditMode
            ? {}
            : {
                boxShadow: dt.shadow.cardHover,
                borderColor: dt.color.borderStrong,
              },
        }}
      >
        {/* Edit mode toolbar — only rendered when isEditMode is true */}
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
              px: 0.75,
            }}
          >
            {!isMobile && (
              <Box
                className="drag-handle"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "grab",
                  height: "100%",
                  color: dt.color.primary,
                  flexShrink: 0,
                  "&:active": { cursor: "grabbing" },
                }}
              >
                <DragIndicator sx={{ fontSize: 15 }} />
              </Box>
            )}

            <Box sx={{ flex: 1 }} />

            {/* Column Width Presets */}
            {(!isMobile ? [1, 2, 3, 4] : [1, 2]).map((size) => {
              const active = item.w === size;
              return (
                <Box
                  key={size}
                  onClick={(e) => {
                    e.stopPropagation();
                    setWidgetWidth(item.i, size);
                  }}
                  title={t("dashboard.DashboardEngine.colSize", { size })}
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    userSelect: "none",
                    bgcolor: active ? dt.color.primary : "transparent",
                    color: active ? "#fff" : dt.color.foregroundFaint,
                    border: `1px solid ${active ? dt.color.primary : dt.color.border}`,
                    transition: dt.motion.fast,
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

            {/* Remove Card in Edit Mode */}
            <Box
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveWidget(item.i);
              }}
              title={t("dashboard.DashboardEngine.removeWidget")}
              sx={{
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                borderRadius: "6px",
                color: dt.color.foregroundFaint,
                transition: dt.motion.fast,
                "&:hover": {
                  color: dt.color.danger,
                  bgcolor: `${dt.color.danger}14`,
                },
              }}
            >
              <Close sx={{ fontSize: 14 }} />
            </Box>
          </Box>
        )}

        {/* Widget Content */}
        <Box sx={{ flexGrow: 1, overflow: "hidden", minHeight: 0 }}>
          <Suspense fallback={<WidgetSkeleton />}>
            <WidgetComponent />
          </Suspense>
        </Box>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        bgcolor: dt.color.background,
      }}
    >
      {/* Executive Header Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "stretch", md: "center" },
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          gap: { xs: 1.25, md: 2 },
          px: { xs: 2, md: 3 },
          py: { xs: 1.25, md: 1.75 },
          bgcolor: dt.color.surface,
          borderBottom: `1px solid ${dt.color.border}`,
          flexShrink: 0,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Top row on mobile: Title + Customize Button */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: { xs: "100%", md: "auto" },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: { xs: "1.1rem", md: "1.15rem" },
                fontWeight: 800,
                color: dt.color.foreground,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              {userDisplayName
                ? t("dashboard.welcomeBackName", { name: userDisplayName })
                : t("dashboard.title")}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: dt.color.foregroundFaint,
                fontSize: "0.72rem",
                fontWeight: 500,
                display: "block",
              }}
            >
              {today()}
            </Typography>
          </Box>

          <Button
            variant={isEditMode ? "contained" : "outlined"}
            size="small"
            startIcon={<Settings sx={{ fontSize: "15px !important" }} />}
            onClick={toggleEditMode}
            disableElevation
            sx={{
              display: { xs: "inline-flex", md: "none" },
              whiteSpace: "nowrap",
              borderRadius: dt.radius.md,
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.75rem",
              px: 1.5,
              py: 0.5,
              borderColor: isEditMode ? "transparent" : dt.color.border,
              color: isEditMode ? "#fff" : dt.color.foreground,
              bgcolor: isEditMode ? dt.color.primary : "transparent",
              "&:hover": {
                bgcolor: isEditMode ? dt.color.primaryStrong : dt.color.surfaceMuted,
                borderColor: isEditMode ? "transparent" : dt.color.borderStrong,
              },
            }}
          >
            {isEditMode ? t("dashboard.doneEditing") : t("dashboard.customize")}
          </Button>
        </Box>

        {/* Center / Right: Filter Bar with smooth horizontal scroll */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "flex-start", md: "flex-end" },
            flex: 1,
            minWidth: 0,
            maxWidth: "100%",
            width: "100%",
          }}
        >
          <MasterFilterBar />
        </Box>

        {/* Desktop Customize CTA */}
        <Button
          variant={isEditMode ? "contained" : "outlined"}
          size="small"
          startIcon={<Settings sx={{ fontSize: "16px !important" }} />}
          onClick={toggleEditMode}
          disableElevation
          sx={{
            display: { xs: "none", md: "inline-flex" },
            whiteSpace: "nowrap",
            flexShrink: 0,
            borderRadius: dt.radius.md,
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.8rem",
            px: 2,
            py: 0.75,
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
          {isEditMode ? t("dashboard.doneEditing") : t("dashboard.customize")}
        </Button>
      </Box>

      {/* Main Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          overflowX: "hidden",
          pl: { xs: 1.5, sm: 2, md: 3 },
          pt: { xs: 1.5, md: 2.5 },
          pb: 4,
          pr: {
            xs: 1.5,
            sm: 2,
            md: isPanelOpen ? "320px" : 3,
          },
          transition: "padding-right 220ms cubic-bezier(0.4, 0, 0.2, 1)",
          WebkitOverflowScrolling: "touch",
          maxWidth: "100%",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Inner container for width measurement without padding inflation */}
        <Box ref={containerRef} sx={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
          {!isEditMode ? (
            /* Fluid Native CSS Grid: Fills 100% of the screen width with zero dead space */
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, 1fr)",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(4, 1fr)",
                },
                gap: { xs: 1.5, sm: 2 },
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              {sortedVisibleLayout.map((item) => {
                const isKpi = item.h <= 1 && item.w <= 1;
                const desktopSpan = Math.min(4, Math.max(1, item.w));
                const mobileSpan = isKpi ? (item.w > 1 ? 2 : 1) : 2;
                const desktopHeight = item.h <= 1 ? 140 : item.h === 2 ? 296 : 452;
                const mobileHeight = isKpi ? 130 : item.h >= 3 ? 360 : 290;

                return (
                  <Box
                    key={item.i}
                    sx={{
                      gridColumn: {
                        xs: `span ${mobileSpan}`,
                        sm: `span ${mobileSpan}`,
                        md: `span ${desktopSpan}`,
                      },
                      height: { xs: mobileHeight, md: desktopHeight },
                      width: "100%",
                      minWidth: 0,
                    }}
                  >
                    {renderCardContent(item)}
                  </Box>
                );
              })}
            </Box>
          ) : isMobile ? (
            /* Mobile / Tablet Fluid Native CSS Grid in Edit Mode */
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(2, 1fr)" },
                gap: { xs: 1.5, sm: 2 },
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              {visibleLayout.map((item) => {
                const isKpi = item.h <= 1 && item.w <= 1;
                const colSpan = isKpi ? (item.w > 1 ? 2 : 1) : 2;
                const cardHeight = isKpi ? 130 : item.h >= 3 ? 340 : 285;

                return (
                  <Box
                    key={item.i}
                    sx={{
                      gridColumn: `span ${colSpan}`,
                      height: cardHeight,
                      width: "100%",
                      minWidth: 0,
                    }}
                  >
                    {renderCardContent(item)}
                  </Box>
                );
              })}
            </Box>
          ) : (
            /* Desktop Responsive Grid Layout (Drag-and-Drop active during Edit Mode) */
            <ResponsiveGridLayout
              key={visibleLayout
                .map((i) => i.i)
                .sort()
                .join(",")}
              width={gridWidth || containerRef.current?.offsetWidth || 1200}
              layouts={desktopLayouts}
              breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}
              cols={{ lg: 4, md: 4, sm: 4, xs: 4 }}
              rowHeight={140}
              margin={[16, 16]}
              containerPadding={[0, 0]}
              dragConfig={{ enabled: isEditMode, handle: ".drag-handle" }}
              resizeConfig={{ enabled: false }}
              compactor={verticalCompactor}
              onLayoutChange={onLayoutChange}
            >
              {visibleLayout.map((item) => renderCardContent(item))}
            </ResponsiveGridLayout>
          )}
        </Box>
      </Box>

      {/* Customize Modules Drawer */}
      <EditModePanel />
    </Box>
  );
};

export default DashboardEngine;
