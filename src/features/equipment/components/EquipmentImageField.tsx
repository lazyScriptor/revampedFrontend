import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assetUrl";
import { CompressError, assertImageFile, compressImage } from "../lib/compressImage";
import { EquipmentPhotoDialog } from "./EquipmentPhotoDialog";
import type { Equipment } from "../schemas/equipment.schema";

const SIZE = 112;

function Thumb({ src }: { src?: string | null }) {
  return (
    <Box sx={{ width: SIZE, height: SIZE, flexShrink: 0, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {src ? (
        <Box component="img" src={src} alt="" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        <ImageIcon sx={{ fontSize: 40, color: "grey.400" }} />
      )}
    </Box>
  );
}

interface Props {
  /** The machine being edited; null while creating a new one. */
  equipment?: Equipment | null;
  /** New machine: the chosen photo, uploaded right after the machine is created. */
  pending: Blob | null;
  onPendingChange: (blob: Blob | null) => void;
}

/**
 * The photo in the equipment form. A saved machine uses the same dialog as the table (computer,
 * phone, remove), which saves straight away. A new machine has nothing to attach to yet, so the
 * photo waits and goes up once the machine exists.
 */
export function EquipmentImageField({ equipment, pending, onPendingChange }: Props) {
  const { t } = useTranslation();
  const id = equipment?.equipment_id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Invalidated with the equipment lists whenever a photo changes, so this stays current.
  const { data: fresh } = useQuery({
    queryKey: ["equipment", "form-image", id],
    enabled: !!id,
    queryFn: async () => {
      const body: any = await api.get(`/equipment/${id}`);
      return (body?.data?.equipment ?? body?.equipment ?? body?.data ?? null) as Equipment | null;
    },
  });
  const current = fresh ?? equipment ?? null;

  useEffect(() => {
    if (!pending) {
      setPendingUrl(null);
      return;
    }
    const url = URL.createObjectURL(pending);
    setPendingUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // picking the same file again still fires
    if (!file) return;
    setError(null);
    try {
      assertImageFile(file);
      setPreparing(true);
      const image = await compressImage(file);
      onPendingChange(image.blob);
    } catch (err) {
      setError(err instanceof CompressError ? t(`equipment.photo.errors.${err.code}`) : t("equipment.photo.errors.unreadable"));
    } finally {
      setPreparing(false);
    }
  };

  if (id && current) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Thumb src={resolveAssetUrl(current.image_url)} />
        <Box>
          <Button variant="outlined" size="small" onClick={() => setDialogOpen(true)} sx={{ textTransform: "none", fontWeight: 700 }}>
            {current.image_url ? t("equipment.photo.changePhoto") : t("equipment.photo.addPhoto")}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
            {t("equipment.photo.formHint")}
          </Typography>
        </Box>
        <EquipmentPhotoDialog open={dialogOpen} equipment={current as any} onClose={() => setDialogOpen(false)} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Thumb src={pendingUrl} />
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <input ref={inputRef} type="file" accept="image/*" hidden aria-label={t("equipment.photo.addPhoto")} onChange={onPick} />
          <Button
            variant="outlined"
            size="small"
            disabled={preparing}
            startIcon={preparing ? <CircularProgress size={14} /> : <UploadFileIcon />}
            onClick={() => inputRef.current?.click()}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {pending ? t("equipment.photo.changePhoto") : t("equipment.photo.addPhoto")}
          </Button>
          {pending && (
            <Button size="small" color="inherit" onClick={() => onPendingChange(null)} sx={{ textTransform: "none", fontWeight: 700 }}>
              {t("equipment.photo.resetConfirm")}
            </Button>
          )}
        </Box>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
}
