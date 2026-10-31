// Tap a machine's photo in the equipment table → change it right there.
//
//   choose ──► phone ─────────────► (photo arrives over socket / polling) ─► done
//     │                                            ▲
//     └──► file / drop / paste ─► shrink ─► preview ─► upload ─┘
//                                   │          │        │
//                                   └──────────┴── error (retry keeps the shrunk photo)
//
// The photo is shrunk to WebP in the browser (phone and computer alike), so
// uploads are small; the server checks the real bytes and stores it.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ImageIcon from "@mui/icons-material/Image";
import { useTranslation } from "react-i18next";

import { resolveAssetUrl } from "@/lib/assetUrl";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMyDevices } from "@/features/signatures/hooks/useSignatures";
import { CompressError, assertImageFile, compressImage, formatBytes, type CompressedImage } from "../lib/compressImage";
import {
  applyImageToCaches,
  useCancelPhotoRequest,
  useCreatePhotoRequest,
  useEquipmentPhotoEvents,
  usePhotoRequestStatus,
  useResetEquipmentImage,
  useUploadEquipmentImage,
} from "../hooks/useEquipmentPhoto";
import { EquipmentNumberBadge } from "./EquipmentNumberBadge";
import { useQueryClient } from "@tanstack/react-query";

export interface PhotoDialogEquipment {
  equipment_id: number;
  equipment_name: string;
  serial_number?: string | null;
  image_url?: string | null;
}

type Step =
  | { kind: "choose" }
  | { kind: "preparing" }
  | { kind: "preview"; image: CompressedImage; previewUrl: string }
  | { kind: "uploading"; image: CompressedImage; previewUrl: string; progress: number }
  | { kind: "phone"; token: string; expiresAt: number }
  | { kind: "done"; imageUrl: string | null };

const isOwnUpload = (url?: string | null) => !!url && url.startsWith("/uploads/");

export function EquipmentPhotoDialog({ open, onClose, equipment }: { open: boolean; onClose: () => void; equipment: PhotoDialogEquipment | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const qc = useQueryClient();
  const canEdit = useAuthStore((s) => s.hasPermission("equipment:edit"));

  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [now, setNow] = useState(Date.now());
  const fileInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const devices = useMyDevices();
  const phoneCount = devices.data?.devices?.length ?? 0;
  const upload = useUploadEquipmentImage();
  const reset = useResetEquipmentImage();
  const createRequest = useCreatePhotoRequest();
  const cancelRequest = useCancelPhotoRequest();
  const phoneToken = step.kind === "phone" ? step.token : null;
  const requestStatus = usePhotoRequestStatus(phoneToken);

  const busy = step.kind === "preparing" || step.kind === "uploading" || reset.isPending || createRequest.isPending;
  const currentUrl = resolveAssetUrl(equipment?.image_url);

  const freePreview = (s: Step) => {
    if ((s.kind === "preview" || s.kind === "uploading") && s.previewUrl) URL.revokeObjectURL(s.previewUrl);
  };

  // Fresh state every time the dialog opens for a machine.
  useEffect(() => {
    if (!open) return;
    setStep({ kind: "choose" });
    setError(null);
    setConfirmReset(false);
  }, [open, equipment?.equipment_id]);

  const finish = useCallback(
    (imageUrl: string | null) => {
      setStep((prev) => {
        freePreview(prev);
        return { kind: "done", imageUrl };
      });
    },
    [],
  );

  // Phone flow: socket is instant; polling below is the fallback.
  const onCaptured = useCallback(
    (p: { token: string; equipment_id: number; image_url: string }) => {
      if (p?.token && p.token === phoneToken) {
        applyImageToCaches(qc, p);
        finish(p.image_url);
      }
    },
    [phoneToken, qc, finish],
  );
  useEquipmentPhotoEvents(onCaptured);

  useEffect(() => {
    const r = requestStatus.data;
    if (!r || step.kind !== "phone" || r.token !== step.token) return;
    if (r.status === "COMPLETED") {
      applyImageToCaches(qc, { equipment_id: r.equipment_id, image_url: r.image_url });
      finish(r.image_url);
    } else if (r.status === "EXPIRED" || r.status === "CANCELLED") {
      setStep({ kind: "choose" });
      setError(r.status === "EXPIRED" ? t("equipment.photo.errors.phoneExpired") : t("equipment.photo.errors.phoneCancelled"));
    }
  }, [requestStatus.data, step, qc, finish, t]);

  // Countdown while waiting for the phone.
  useEffect(() => {
    if (step.kind !== "phone") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step.kind]);

  // Close the "done" screen by itself.
  useEffect(() => {
    if (step.kind !== "done") return;
    const id = setTimeout(onClose, 1400);
    return () => clearTimeout(id);
  }, [step.kind, onClose]);

  const errorText = (err: unknown) => {
    if (err instanceof CompressError) return t(`equipment.photo.errors.${err.code}`);
    const e = err as { status?: number; message?: string; name?: string; code?: string };
    if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return null;
    if (!e?.status) return navigator.onLine === false ? t("equipment.photo.errors.offline") : t("equipment.photo.errors.network");
    if (e.status === 403) return t("equipment.photo.errors.forbidden");
    if (e.status === 413) return t("equipment.photo.errors.serverTooLarge");
    return e.message || t("equipment.photo.errors.network");
  };

  // ── computer: pick / drop / paste ──
  const takeFile = async (file: File | null | undefined) => {
    if (!file || !equipment || busy) return;
    setError(null);
    try {
      assertImageFile(file);
      setStep({ kind: "preparing" });
      const image = await compressImage(file);
      setStep({ kind: "preview", image, previewUrl: URL.createObjectURL(image.blob) });
    } catch (err) {
      setStep({ kind: "choose" });
      setError(errorText(err));
    }
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    takeFile(e.target.files?.[0]);
    e.target.value = ""; // picking the same file again still fires
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    takeFile(e.dataTransfer.files?.[0]);
  };

  useEffect(() => {
    if (!open || !canEdit) return;
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files || []).find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        takeFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canEdit, equipment?.equipment_id, busy]);

  const save = async () => {
    if (!equipment || (step.kind !== "preview" && step.kind !== "uploading")) return;
    const { image, previewUrl } = step;
    setError(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStep({ kind: "uploading", image, previewUrl, progress: 0 });
    try {
      const res = await upload.mutateAsync({
        equipmentId: equipment.equipment_id,
        blob: image.blob,
        signal: ctrl.signal,
        onProgress: (progress) => setStep((s) => (s.kind === "uploading" ? { ...s, progress } : s)),
      });
      finish(res.data.image_url);
    } catch (err) {
      // keep the shrunk photo so "Try again" doesn't need the file again
      setStep({ kind: "preview", image, previewUrl });
      if (!ctrl.signal.aborted) setError(errorText(err));
    } finally {
      abortRef.current = null;
    }
  };

  // ── phone ──
  const askPhone = async () => {
    if (!equipment) return;
    setError(null);
    try {
      const r = await createRequest.mutateAsync(equipment.equipment_id);
      setStep({ kind: "phone", token: r.token, expiresAt: new Date(r.expires_at).getTime() });
    } catch (err) {
      setError(errorText(err));
    }
  };

  const stopPhone = () => {
    if (step.kind === "phone") cancelRequest.mutate(step.token);
    setStep({ kind: "choose" });
  };

  const doReset = async () => {
    if (!equipment) return;
    setError(null);
    setConfirmReset(false);
    try {
      const res = await reset.mutateAsync(equipment.equipment_id);
      finish(res.data.image_url);
    } catch (err) {
      setError(errorText(err));
    }
  };

  const handleClose = () => {
    if (step.kind === "uploading") return; // Cancel upload first
    if (step.kind === "phone") cancelRequest.mutate(step.token);
    freePreview(step);
    onClose();
  };

  if (!equipment) return null;

  const secondsLeft = step.kind === "phone" ? Math.max(0, Math.ceil((step.expiresAt - now) / 1000)) : 0;
  const shownUrl =
    step.kind === "preview" || step.kind === "uploading"
      ? step.previewUrl
      : step.kind === "done"
        ? resolveAssetUrl(step.imageUrl)
        : currentUrl;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: fullScreen ? 0 : 3, overflow: "hidden" } } }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <EquipmentNumberBadge value={equipment.serial_number} size="md" />
        <Typography sx={{ fontWeight: 800, flex: 1, minWidth: 0 }} noWrap title={equipment.equipment_name}>
          {equipment.equipment_name}
        </Typography>
        <IconButton size="small" onClick={handleClose} disabled={step.kind === "uploading"} aria-label={t("common.close")}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Photo / drop zone */}
        <Box
          onDragOver={(e) => {
            if (!canEdit || busy || step.kind === "phone") return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={canEdit ? onDrop : undefined}
          data-testid="photo-dropzone"
          sx={{
            position: "relative",
            aspectRatio: "4 / 3",
            borderRadius: 2.5,
            overflow: "hidden",
            bgcolor: "grey.100",
            border: "2px dashed",
            borderColor: dragOver ? "primary.main" : "transparent",
            outline: dragOver ? `4px solid ${alpha(theme.palette.primary.main, 0.2)}` : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {step.kind === "phone" ? (
            <Stack spacing={1.25} sx={{ alignItems: "center", px: 3, textAlign: "center" }}>
              <Box sx={{ position: "relative", display: "inline-flex" }}>
                <CircularProgress size={76} thickness={2.5} />
                <PhoneIphoneIcon sx={{ position: "absolute", inset: 0, m: "auto", fontSize: 36, color: "primary.main" }} />
              </Box>
              <Typography sx={{ fontWeight: 800 }}>{t("equipment.photo.phoneWaitingTitle")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t("equipment.photo.phoneWaitingHint")}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {t("equipment.photo.expiresIn", { time: `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` })}
              </Typography>
            </Stack>
          ) : shownUrl ? (
            <Box component="img" src={shownUrl} alt={equipment.equipment_name} sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", bgcolor: "#fff" }} />
          ) : (
            <Stack spacing={0.5} sx={{ alignItems: "center", color: "text.disabled" }}>
              <ImageIcon sx={{ fontSize: 56 }} />
              <Typography variant="body2">{t("equipment.photo.noPhoto")}</Typography>
            </Stack>
          )}

          {step.kind === "preparing" && (
            <Box sx={{ position: "absolute", inset: 0, bgcolor: alpha("#fff", 0.8), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t("equipment.photo.preparing")}
              </Typography>
            </Box>
          )}
          {step.kind === "done" && (
            <Box sx={{ position: "absolute", inset: 0, bgcolor: alpha("#fff", 0.55), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Stack spacing={0.5} sx={{ alignItems: "center", bgcolor: "#fff", px: 2.5, py: 1.5, borderRadius: 2, boxShadow: 3 }}>
                <CheckCircleIcon sx={{ color: "success.main", fontSize: 40 }} />
                <Typography sx={{ fontWeight: 800 }}>{t("equipment.photo.saved")}</Typography>
              </Stack>
            </Box>
          )}
          {dragOver && (
            <Box sx={{ position: "absolute", inset: 0, bgcolor: alpha(theme.palette.primary.main, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography sx={{ fontWeight: 800, color: "primary.dark" }}>{t("equipment.photo.dropHere")}</Typography>
            </Box>
          )}
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {!canEdit ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {t("equipment.photo.noPermission")}
          </Alert>
        ) : step.kind === "preview" || step.kind === "uploading" ? (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
              {t("equipment.photo.sizeLine", {
                from: formatBytes(step.image.originalBytes),
                to: formatBytes(step.image.blob.size),
                w: step.image.width,
                h: step.image.height,
              })}
            </Typography>
            {step.kind === "uploading" ? (
              <Stack spacing={1}>
                <LinearProgress variant={step.progress > 0 ? "determinate" : "indeterminate"} value={step.progress} sx={{ height: 8, borderRadius: 4 }} />
                <Stack sx={{ alignItems: "center", justifyContent: "space-between" }} direction="row">
                  <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {t("equipment.photo.uploading", { pct: step.progress })}
                  </Typography>
                  <Button size="small" color="inherit" onClick={() => abortRef.current?.abort()}>
                    {t("common.cancel")}
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Stack direction="row" spacing={1}>
                <Button fullWidth variant="outlined" onClick={() => fileInput.current?.click()} sx={{ textTransform: "none", fontWeight: 700 }}>
                  {t("equipment.photo.chooseAnother")}
                </Button>
                <Button fullWidth variant="contained" disableElevation onClick={save} sx={{ textTransform: "none", fontWeight: 800 }}>
                  {error ? t("equipment.photo.tryAgain") : t("equipment.photo.save")}
                </Button>
              </Stack>
            )}
          </>
        ) : step.kind === "phone" ? (
          <Button variant="outlined" color="inherit" onClick={stopPhone} sx={{ textTransform: "none", fontWeight: 700 }}>
            {t("equipment.photo.cancelPhone")}
          </Button>
        ) : step.kind === "choose" ? (
          <Stack spacing={1}>
            <Button
              variant="contained"
              disableElevation
              size="large"
              startIcon={createRequest.isPending ? <CircularProgress size={18} color="inherit" /> : <PhoneIphoneIcon />}
              disabled={busy || phoneCount === 0}
              onClick={askPhone}
              sx={{ textTransform: "none", fontWeight: 800, py: 1.25 }}
            >
              {t("equipment.photo.takeWithPhone")}
            </Button>
            {phoneCount === 0 && !devices.isLoading && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                {t("equipment.photo.noPhoneHint")}
              </Typography>
            )}
            <Button
              variant="outlined"
              size="large"
              startIcon={<UploadFileIcon />}
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              sx={{ textTransform: "none", fontWeight: 700, py: 1.1 }}
            >
              {t("equipment.photo.uploadFromComputer")}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", display: { xs: "none", sm: "block" } }}>
              {t("equipment.photo.dropOrPaste")}
            </Typography>
            {isOwnUpload(equipment.image_url) &&
              (confirmReset ? (
                <Alert
                  severity="warning"
                  sx={{ borderRadius: 2 }}
                  action={
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" color="inherit" onClick={() => setConfirmReset(false)}>
                        {t("common.cancel")}
                      </Button>
                      <Button size="small" color="warning" variant="contained" disableElevation onClick={doReset}>
                        {t("equipment.photo.resetConfirm")}
                      </Button>
                    </Stack>
                  }
                >
                  {t("equipment.photo.resetQuestion")}
                </Alert>
              ) : (
                <Button
                  color="inherit"
                  size="small"
                  startIcon={reset.isPending ? <CircularProgress size={14} color="inherit" /> : <RestartAltIcon />}
                  disabled={busy}
                  onClick={() => setConfirmReset(true)}
                  sx={{ textTransform: "none", color: "text.secondary" }}
                >
                  {t("equipment.photo.reset")}
                </Button>
              ))}
          </Stack>
        ) : null}

        <input ref={fileInput} type="file" accept="image/*" hidden onChange={onPick} data-testid="photo-file-input" />
      </DialogContent>
    </Dialog>
  );
}
