import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import GridOnIcon from "@mui/icons-material/GridOn";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export interface ImportDoneSummary {
  created: { key: string; equipment_id: number; serial_number: string }[];
  updated: number;
  categoriesCreated: { ref: string; category_id: number; name: string }[];
}

interface ImportDoneStepProps {
  summary: ImportDoneSummary;
  onImportAnother: () => void;
}

export function ImportDoneStep({ summary, onImportAnother }: ImportDoneStepProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sortedSerials = summary.created
    .map((c) => c.serial_number)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const firstSerial = sortedSerials[0];
  const lastSerial = sortedSerials[sortedSerials.length - 1];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, sm: 4 },
        borderRadius: 3,
        bgcolor: "background.paper",
        maxWidth: 620,
        mx: "auto",
        width: "100%",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          bgcolor: "success.main",
          color: "success.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CheckCircleOutlinedIcon fontSize="large" />
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        {t("dataArena.equipmentImport.doneTitle")}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%", maxWidth: 420 }}>
        {summary.created.length > 0 && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "background.default" }}>
            <Typography variant="body1" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {t("dataArena.equipmentImport.doneAdded", { count: summary.created.length })}
            </Typography>
            {firstSerial && (
              <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {t("dataArena.equipmentImport.doneRange", { from: firstSerial, to: lastSerial })}
              </Typography>
            )}
          </Paper>
        )}

        {summary.updated > 0 && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "background.default" }}>
            <Typography variant="body1" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {t("dataArena.equipmentImport.doneUpdated", { count: summary.updated })}
            </Typography>
          </Paper>
        )}

        {summary.categoriesCreated.length > 0 && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "background.default" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.75 }}>
              {t("dataArena.equipmentImport.doneCategories")}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "row", gap: 0.75, justifyContent: "center", flexWrap: "wrap" }}>
              {summary.categoriesCreated.map((cat) => (
                <Chip key={cat.category_id} size="small" color="info" label={cat.name} sx={{ fontWeight: 700 }} />
              ))}
            </Box>
          </Paper>
        )}
      </Box>

      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, width: { xs: "100%", sm: "auto" }, pt: 1 }}>
        <Button
          variant="contained"
          disableElevation
          startIcon={<GridOnIcon />}
          onClick={() => navigate({ to: "/data-arena", search: { section: "equipmentSheet" } as any })}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          {t("dataArena.equipmentImport.openEquipmentSheet")}
        </Button>
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={onImportAnother}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {t("dataArena.equipmentImport.importAnother")}
        </Button>
      </Box>
    </Paper>
  );
}
