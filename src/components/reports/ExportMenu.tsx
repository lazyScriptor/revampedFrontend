import { useState } from "react";
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import GridOnIcon from "@mui/icons-material/GridOn";
import DescriptionIcon from "@mui/icons-material/Description";
import { useAuthStore } from "@/stores/useAuthStore";

interface ExportMenuProps {
  onExport: (format: "csv" | "pdf" | "excel") => void | Promise<void>;
  disabled?: boolean;
}

// Single export entrypoint, gated on reports:export. CSV is generated
// client-side from table data so it never needs a backend round-trip; PDF and
// Excel hit the backend `/export?format=` variants.
export function ExportMenu({ onExport, disabled }: ExportMenuProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canExport = hasPermission?.("reports:export") ?? true;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (!canExport) return null;

  return (
    <>
      <Button
        startIcon={<DownloadIcon />}
        variant="outlined"
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        disabled={disabled}
        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
      >
        Export
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onExport("csv");
          }}
        >
          <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="CSV" secondary="Quick spreadsheet copy" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onExport("excel");
          }}
        >
          <ListItemIcon><GridOnIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Excel" secondary="Formatted workbook" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onExport("pdf");
          }}
        >
          <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="PDF" secondary="Print-ready report" />
        </MenuItem>
      </Menu>
    </>
  );
}
