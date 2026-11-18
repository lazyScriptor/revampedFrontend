import { useEffect, useRef, useState } from "react";
import { Box, alpha, useTheme } from "@mui/material";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";

/** Wait this long before showing, so fast actions never flash the bar. */
const SHOW_DELAY_MS = 150;
/** How often the bar creeps forward while work is still running. */
const TRICKLE_MS = 220;

/**
 * Slim brand-coloured bar at the very top of the screen while the app is working: a page loading
 * for the first time, a query with no data yet, or a save in progress. Background refreshes of
 * data already on screen do not show it, so polling never makes it flicker.
 *
 * Mount once, near the top of the tree.
 */
export function TopProgressBar() {
  const theme = useTheme();
  const routeLoading = useRouterState({ select: (s) => s.status === "pending" });
  const firstLoads = useIsFetching({ predicate: (q) => q.state.status === "pending" });
  const saving = useIsMutating();
  const active = routeLoading || firstLoads > 0 || saving > 0;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<{ show?: number; trickle?: number; hide?: number }>({});

  useEffect(() => {
    const t = timers.current;
    if (active) {
      window.clearTimeout(t.hide);
      if (!visible && !t.show) {
        t.show = window.setTimeout(() => {
          t.show = undefined;
          setVisible(true);
          setProgress(0.08);
          t.trickle = window.setInterval(() => {
            // Ease towards 90%: big steps at first, then smaller, never reaching the end on its own.
            setProgress((p) => (p < 0.9 ? p + (0.9 - p) * 0.12 : p));
          }, TRICKLE_MS);
        }, SHOW_DELAY_MS);
      }
    } else {
      window.clearTimeout(t.show);
      t.show = undefined;
      window.clearInterval(t.trickle);
      if (visible) {
        setProgress(1);
        t.hide = window.setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 320);
      }
    }
  }, [active, visible]);

  useEffect(() => {
    const t = timers.current;
    return () => {
      window.clearTimeout(t.show);
      window.clearInterval(t.trickle);
      window.clearTimeout(t.hide);
    };
  }, []);

  const main = theme.palette.primary.main;
  return (
    <Box
      role="progressbar"
      aria-hidden={!visible}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: theme.zIndex.tooltip + 1,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease",
      }}
    >
      <Box
        sx={{
          height: "100%",
          width: "100%",
          transformOrigin: "left center",
          transform: `scaleX(${progress})`,
          transition: "transform 220ms ease-out",
          background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${main} 60%, ${theme.palette.primary.dark})`,
          boxShadow: `0 0 10px ${alpha(main, 0.7)}, 0 0 4px ${alpha(main, 0.5)}`,
          borderTopRightRadius: 3,
          borderBottomRightRadius: 3,
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        }}
      />
    </Box>
  );
}
