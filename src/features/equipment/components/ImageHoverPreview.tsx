import type { ReactElement } from "react";
import { Box, Tooltip } from "@mui/material";

interface Props {
  /** Resolved image URL. Without one, only `fallbackTitle` (if any) is shown. */
  src?: string | null;
  alt?: string;
  fallbackTitle?: string;
  children: ReactElement;
}

/** Hover a machine's small photo to see it large. Mouse only: a tap keeps doing what it did. */
export function ImageHoverPreview({ src, alt = "", fallbackTitle = "", children }: Props) {
  return (
    <Tooltip
      placement="right"
      enterDelay={150}
      enterNextDelay={150}
      disableInteractive
      disableTouchListener
      title={
        src ? (
          <Box
            component="img"
            src={src}
            alt={alt}
            data-testid="image-hover-preview"
            sx={{ display: "block", width: { xs: 220, sm: 320 }, height: { xs: 220, sm: 320 }, objectFit: "contain", bgcolor: "#ffffff", borderRadius: 1.5 }}
          />
        ) : (
          fallbackTitle
        )
      }
      slotProps={
        src
          ? { tooltip: { sx: { p: 0.75, maxWidth: "none", bgcolor: "background.paper", boxShadow: 8, border: "1px solid", borderColor: "divider" } } }
          : undefined
      }
    >
      {children}
    </Tooltip>
  );
}
