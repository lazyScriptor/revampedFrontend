import { useState } from "react";
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import GridOnIcon from "@mui/icons-material/GridOn";
import DescriptionIcon from "@mui/icons-material/Description";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useAuthStore } from "@/stores/useAuthStore";

interface ExportMenuProps {
  onExport: (format: "csv" | "pdf" | "excel") => void | Promise<void>;
  disabled?: boolean;
}

export function ExportMenu({ onExport, disabled }: ExportMenuProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canExport = hasPermission?.("reports:export") ?? true;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (!canExport) return null;

  return (
    <>
      <Button
        startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
        variant="outlined"
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={Boolean(anchor)}
        sx={{
          borderRadius: 2,
          textTransform: "none",
          fontWeight: 700,
          fontSize: "0.8125rem",
          borderColor: isDark ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1",
          color: isDark ? "#f8fafc" : "#0f172a",
          bgcolor: isDark ? "rgba(255, 255, 255, 0.04)" : "white",
          px: 1.75,
          py: 0.75,
          transition: "all 0.15s ease",
          "&:hover": {
            borderColor: "#f59e0b",
            bgcolor: isDark ? "rgba(245, 158, 11, 0.1)" : "rgba(245, 158, 11, 0.05)",
            color: "#f59e0b",
          },
        }}
      >
        Export
      </Button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: isDark ? "#1e293b" : "#ffffff",
              border: "1px solid",
              borderColor: isDark ? "#334155" : "#e2e8f0",
              borderRadius: 2.5,
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
              minWidth: 220,
              py: 0.5,
              color: isDark ? "#f8fafc" : "#0f172a",
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onExport("csv");
          }}
          sx={{
            py: 1,
            "&:hover": { bgcolor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9" },
          }}
        >
          <ListItemIcon sx={{ color: "#f59e0b" }}>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="CSV"
            secondary="Quick spreadsheet copy"
            slotProps={{
              primary: { sx: { fontWeight: 700, fontSize: "0.85rem", color: isDark ? "#f8fafc" : "#0f172a" } },
              secondary: { sx: { fontSize: "0.72rem", color: isDark ? "#94a3b8" : "#64748b" } },
            }}
          />
        </MenuItem>

        <MenuItem
          onClick={() => {
            setAnchor(null);
            onExport("excel");
          }}
          sx={{
            py: 1,
            "&:hover": { bgcolor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9" },
          }}
        >
          <ListItemIcon sx={{ color: "#10b981" }}>
            <GridOnIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Excel"
            secondary="Formatted workbook"
            slotProps={{
              primary: { sx: { fontWeight: 700, fontSize: "0.85rem", color: isDark ? "#f8fafc" : "#0f172a" } },
              secondary: { sx: { fontSize: "0.72rem", color: isDark ? "#94a3b8" : "#64748b" } },
            }}
          />
        </MenuItem>

        <MenuItem
          onClick={() => {
            setAnchor(null);
            onExport("pdf");
          }}
          sx={{
            py: 1,
            "&:hover": { bgcolor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9" },
          }}
        >
          <ListItemIcon sx={{ color: "#ef4444" }}>
            <PictureAsPdfIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="PDF"
            secondary="Print-ready document"
            slotProps={{
              primary: { sx: { fontWeight: 700, fontSize: "0.85rem", color: isDark ? "#f8fafc" : "#0f172a" } },
              secondary: { sx: { fontSize: "0.72rem", color: isDark ? "#94a3b8" : "#64748b" } },
            }}
          />
        </MenuItem>
      </Menu>
    </>
  );
}
