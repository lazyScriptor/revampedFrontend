import React, { useState } from "react";
import { IconButton, Popover, Typography } from "@mui/material";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";

interface InfoTipButtonProps {
  label: string;
  explanation: string;
}

/**
 * Tap-friendly "?" help button that opens a Popover on click/tap (never hover-only).
 */
export const InfoTipButton: React.FC<InfoTipButtonProps> = ({ label, explanation }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <IconButton
        size="small"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(anchorEl ? null : e.currentTarget);
        }}
        sx={{ width: 24, height: 24, p: 0.25, color: "text.secondary" }}
      >
        <HelpOutlineOutlinedIcon sx={{ fontSize: 15 }} />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{
          paper: {
            sx: { p: 1.5, maxWidth: 280, borderRadius: 2 },
          },
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.25 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {explanation}
        </Typography>
      </Popover>
    </>
  );
};
