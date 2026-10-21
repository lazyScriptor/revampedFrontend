import { Box, Typography, Button } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useTranslation } from "react-i18next";

interface Props {
  onUpload: (file: File) => void;
}

export default function CsvUploadDropzone({ onUpload }: Props) {
  const { t } = useTranslation();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <Box
      sx={{
        border: "2px dashed #ccc",
        borderRadius: 2,
        p: 4,
        textAlign: "center",
        bgcolor: "#fafafa",
        cursor: "pointer",
        "&:hover": { bgcolor: "#f0f0f0" },
      }}
      component="label"
    >
      <input type="file" accept=".csv" hidden onChange={handleFileChange} />
      <CloudUploadIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
      <Typography variant="h6" color="text.secondary">
        {t("admin.CsvUploadDropzone.dragAndDropACsv")}
      </Typography>
      <Button variant="outlined" sx={{ mt: 2 }} component="span">
        {t("admin.CsvUploadDropzone.selectFile")}
      </Button>
    </Box>
  );
}
