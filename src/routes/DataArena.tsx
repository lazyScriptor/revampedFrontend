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
import { useTranslation } from "react-i18next";
import { tk } from "@/i18n/marker";

type SectionKey = "imports" | "exports" | "bulk" | "downloads" | "jobs";

const SECTIONS: {
  key: SectionKey;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "imports",
    label: tk("nav.imports"),
    subtitle: tk("pages.DataArena.uploadCsvExcelToBulk"),
    icon: <UploadFileIcon />,
  },
  {
    key: "exports",
    label: tk("nav.exports"),
    subtitle: tk("pages.DataArena.generateFilterableExcelCsvExports"),
    icon: <FileDownloadIcon />,
  },
  {
    key: "bulk",
    label: tk("nav.bulkActions"),
    subtitle: tk("pages.DataArena.applyChangesDeleteStatusUpdate"),
    icon: <PlaylistAddCheckIcon />,
  },
  {
    key: "downloads",
    label: tk("nav.downloads"),
    subtitle: tk("pages.DataArena.everyGeneratedExportFileIs"),
    icon: <FolderZipIcon />,
  },
  {
    key: "jobs",
    label: tk("nav.jobHistory"),
    subtitle: tk("pages.DataArena.trackEveryBulkOperationRunning"),
    icon: <HistoryIcon />,
  },
];

const SECTION_KEYS = SECTIONS.map((s) => s.key);

export default function DataArenaRoute() {
  const { t } = useTranslation();
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
          {t("nav.dataArena")}
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
              {t(active.label)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(active.subtitle)}
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
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ImportPanel />
      <Paper
        elevation={0}
        sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "#f8fafc" }}
      >
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
          {t("pages.DataArena.recentJobs")}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <JobHistoryTable />
        </Box>
      </Paper>
    </Box>
  );
}

function ExportsView() {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ExportPanel />
      <Paper
        elevation={0}
        sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "#f8fafc" }}
      >
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
          {t("pages.DataArena.recentJobs")}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <JobHistoryTable />
        </Box>
      </Paper>
    </Box>
  );
}

function BulkActionsView() {
  const { t } = useTranslation();
  return (
    <Alert
      severity="info"
      variant="outlined"
      sx={{ borderRadius: 2.5, p: 3 }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
        {t("pages.DataArena.bulkActionsComingNext")}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t("pages.DataArena.multiSelectRowsOnThe")}
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
