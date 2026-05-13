import { Box, Typography, Button } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

interface Props {
  onUpload: (file: File) => void;
}

export default function CsvUploadDropzone({ onUpload }: Props) {
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
        Drag and drop a CSV file here, or click to select
      </Typography>
      <Button variant="outlined" sx={{ mt: 2 }} component="span">
        Select File
      </Button>
    </Box>
  );
}
