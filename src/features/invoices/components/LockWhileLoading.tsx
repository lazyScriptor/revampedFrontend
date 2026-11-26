import type { ReactNode } from "react";
import { Box, LinearProgress } from "@mui/material";
import { useTranslation } from "react-i18next";

/**
 * Wraps a Manage panel. While the bill shown is only its quick copy from the list (`locked`),
 * buttons can't be pressed, so nobody pays or returns against figures that are about to update.
 * A thin bar at the top shows that the full bill is loading (`loading`).
 */
export function LockWhileLoading({
  locked,
  loading,
  dark = false,
  children,
}: {
  locked: boolean;
  loading: boolean;
  dark?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{ position: "relative", height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}
      aria-busy={loading || undefined}
    >
      {loading && (
        <LinearProgress
          aria-label={t("invoices.lockWhileLoading.loading", "Loading the latest bill")}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            zIndex: 2,
            bgcolor: dark ? "rgba(248,250,252,0.08)" : "rgba(15,23,42,0.06)",
          }}
        />
      )}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          pointerEvents: locked ? "none" : undefined,
          opacity: locked ? 0.85 : 1,
          transition: "opacity 0.15s",
        }}
        inert={locked || undefined}
        data-testid={locked ? "invoice-preview-locked" : undefined}
      >
        {children}
      </Box>
    </Box>
  );
}
