import { useEffect, useState } from "react";
import { Box, LinearProgress } from "@mui/material";

/**
 * A thin brand-coloured line for the bottom edge of a search box while results are refreshing.
 * Put it inside a `position: relative` wrapper around the field. It waits briefly before showing,
 * so quick answers never flash it.
 */
export function SearchProgress({ active, delayMs = 120 }: { active: boolean; delayMs?: number }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const t = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(t);
  }, [active, delayMs]);

  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        left: 10,
        right: 10,
        bottom: 0,
        height: 2,
        borderRadius: 2,
        overflow: "hidden",
        opacity: shown ? 1 : 0,
        transition: "opacity 160ms ease",
        pointerEvents: "none",
      }}
    >
      <LinearProgress color="primary" sx={{ height: 2, bgcolor: "transparent" }} />
    </Box>
  );
}
