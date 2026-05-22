import { useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Alert,
} from "@mui/material";
import { useSearch } from "@tanstack/react-router";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import HistoryIcon from "@mui/icons-material/History";
import { ImportPanel } from "@/features/data-arena/components/ImportPanel";
import { ExportPanel } from "@/features/data-arena/components/ExportPanel";
import { JobHistoryTable } from "@/features/data-arena/components/JobHistoryTable";
import { DownloadsTable } from "@/features/data-arena/components/DownloadsTable";

type SectionKey = "imports" | "exports" | "bulk" | "downloads" | "jobs";

const SECTIONS: {
  key: SectionKey;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "imports",
    label: "Imports",
    subtitle: "Upload CSV/Excel to bulk-create records. Jobs run asynchronously.",
    icon: <UploadFileIcon />,
  },
  {
    key: "exports",
    label: "Exports",
    subtitle: "Generate filterable Excel/CSV exports. Files appear in Downloads when ready.",
    icon: <FileDownloadIcon />,
  },
  {
    key: "bulk",
    label: "Bulk Actions",
    subtitle: "Apply changes (delete, status update, tag) to many rows at once.",
    icon: <PlaylistAddCheckIcon />,
  },
  {
    key: "downloads",
    label: "Downloads",
    subtitle: "Every generated export file is here. Re-download anytime.",
    icon: <FolderZipIcon />,
  },
  {
    key: "jobs",
    label: "Job History",
    subtitle: "Track every bulk operation — running, completed, failed, cancelled.",
    icon: <HistoryIcon />,
  },
];

const SECTION_KEYS = SECTIONS.map((s) => s.key);

export default function DataArenaRoute() {
  const search = useSearch({ strict: false }) as { section?: string };

  const activeKey: SectionKey = useMemo(() => {
    const requested = search.section as SectionKey | undefined;
    if (requested && SECTION_KEYS.includes(requested)) return requested;
    return "imports";
  }, [search.section]);

  const active = SECTIONS.find((s) => s.key === activeKey)!;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
      {/* Header */}
      <Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Data Arena
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.25 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: "primary.main",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {active.icon}
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {active.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {active.subtitle}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      {activeKey === "imports" && <ImportsView />}
      {activeKey === "exports" && <ExportsView />}
      {activeKey === "bulk" && <BulkActionsView />}
      {activeKey === "downloads" && <DownloadsView />}
      {activeKey === "jobs" && <JobsView />}
    </Box>
  );
}

function ImportsView() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ImportPanel />
      <Paper
        elevation={0}
        sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "#f8fafc" }}
      >
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
          RECENT JOBS
        </Typography>
        <Box sx={{ mt: 1 }}>
          <JobHistoryTable />
        </Box>
      </Paper>
    </Box>
  );
}

function ExportsView() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ExportPanel />
      <Paper
        elevation={0}
        sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "#f8fafc" }}
      >
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
          RECENT JOBS
        </Typography>
        <Box sx={{ mt: 1 }}>
          <JobHistoryTable />
        </Box>
      </Paper>
    </Box>
  );
}

function BulkActionsView() {
  return (
    <Alert
      severity="info"
      variant="outlined"
      sx={{ borderRadius: 2.5, p: 3 }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
        Bulk Actions — coming next
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Multi-select rows on the Equipment, Customers, and Invoices pages, then dispatch
        operations here (bulk delete, status change, category reassign, tag update). The
        pipeline, worker and notification rails are already in place — the row-selector
        UI lands in the next iteration.
      </Typography>
    </Alert>
  );
}

function DownloadsView() {
  return <DownloadsTable />;
}

function JobsView() {
  return <JobHistoryTable />;
}
