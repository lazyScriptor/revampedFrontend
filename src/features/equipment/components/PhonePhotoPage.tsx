// Paired phone: the counter tapped a machine's photo → this page opens by
// itself with the rear camera running. Shoot → check → send. If the browser
// blocks the live camera, one tap opens the phone's own camera app instead.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Alert, Box, Button, CircularProgress, LinearProgress, Stack, Typography } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CollectionsIcon from "@mui/icons-material/Collections";
import ReplayIcon from "@mui/icons-material/Replay";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { getDeviceId } from "@/features/signatures/lib/deviceId";
import { markRequestFinished, useDeviceManifest, useScreenWakeLock } from "@/features/signatures/lib/deviceShell";
import { resolveAssetUrl } from "@/lib/assetUrl";
import { CompressError, assertImageFile, compressImage, type CompressedImage } from "../lib/compressImage";
import { submitDevicePhoto, useDevicePhotoRequest } from "../hooks/useEquipmentPhoto";

type Phase = "camera" | "fallback" | "preparing" | "preview" | "sending" | "sent" | "ended";

const AUTO_RETURN_MS = 2000;

const cameraErrorKey = (err: unknown) => {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "cameraBlocked";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "noCamera";
  if (name === "NotReadableError") return "cameraBusy";
  return "cameraUnavailable";
};

export function PhonePhotoPage({ token }: { token: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const deviceId = getDeviceId();
  const request = useDevicePhotoRequest(deviceId, token);
  useDeviceManifest();
  useScreenWakeLock();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("camera");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<CompressedImage | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [endedText, setEndedText] = useState<string | null>(null);

  const goHome = useCallback(() => {
    markRequestFinished(token);
    qc.removeQueries({ queryKey: ["devices", "pending-photos"] });
    navigate({ to: "/device", replace: true });
  }, [token, qc, navigate]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setCameraError("cameraUnavailable");
      setPhase("fallback");
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPhase("camera");
    } catch (err) {
      setCameraError(cameraErrorKey(err));
      setPhase("fallback");
    }
  }, [stopCamera]);

  // Open the camera straight away; release it when leaving.
  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  // The counter may cancel, or the request may run out, while the camera is up.
  useEffect(() => {
    const r = request.data;
    if (!r || phase === "sent" || phase === "sending") return;
    if (r.status !== "PENDING") {
      stopCamera();
      setEndedText(
        r.status === "COMPLETED"
          ? t("equipment.phonePhoto.alreadySent")
          : r.status === "EXPIRED"
            ? t("equipment.phonePhoto.expired")
            : t("equipment.phonePhoto.cancelled"),
      );
      setPhase("ended");
    }
  }, [request.data, phase, stopCamera, t]);

  useEffect(() => {
    if (phase !== "sent" && phase !== "ended") return;
    const id = setTimeout(goHome, phase === "sent" ? AUTO_RETURN_MS : AUTO_RETURN_MS + 1500);
    return () => clearTimeout(id);
  }, [phase, goHome]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const showPreview = (img: CompressedImage) => {
    stopCamera(); // save battery while checking the shot
    setImage(img);
    setPreviewUrl(URL.createObjectURL(img.blob));
    setPhase("preview");
  };

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setPhase("preparing");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      const frame = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!frame) throw new CompressError("unreadable");
      showPreview(await compressImage(frame));
    } catch {
      setError(t("equipment.photo.errors.unreadable"));
      startCamera();
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      assertImageFile(file);
      setPhase("preparing");
      showPreview(await compressImage(file));
    } catch (err) {
      setPhase("fallback");
      setError(err instanceof CompressError ? t(`equipment.photo.errors.${err.code}`) : t("equipment.photo.errors.unreadable"));
    }
  };

  const retake = () => {
    setImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    if (cameraError) setPhase("fallback");
    else startCamera();
  };

  const send = async () => {
    if (!image || !deviceId) return;
    setError(null);
    setProgress(0);
    setPhase("sending");
    try {
      await submitDevicePhoto(deviceId, token, image.blob, setProgress);
      markRequestFinished(token);
      setPhase("sent");
    } catch (err) {
      const e = err as { status?: number; message?: string };
      if (e.status === 410 || e.status === 409) {
        setEndedText(e.message || t("equipment.phonePhoto.cancelled"));
        setPhase("ended");
        return;
      }
      setPhase("preview");
      setError(e.status === 413 ? t("equipment.photo.errors.serverTooLarge") : !e.status ? (navigator.onLine === false ? t("equipment.photo.errors.offline") : t("equipment.photo.errors.network")) : e.message || t("equipment.photo.errors.network"));
    }
  };

  const eq = request.data?.equipment;

  if (!deviceId) {
    return (
      <Centered>
        <Alert severity="warning">{t("equipment.phonePhoto.notPaired")}</Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate({ to: "/pair", replace: true })}>
          {t("equipment.phonePhoto.pairNow")}
        </Button>
      </Centered>
    );
  }

  if (request.isError && !request.data) {
    return (
      <Centered>
        <Alert severity="error" sx={{ mb: 2 }}>
          {(request.error as Error)?.message || t("equipment.phonePhoto.loadFailed")}
        </Alert>
        <Button variant="outlined" onClick={goHome}>
          {t("common.back")}
        </Button>
      </Centered>
    );
  }

  if (phase === "sent" || phase === "ended") {
    return (
      <Centered>
        {phase === "sent" ? (
          <CheckCircleIcon sx={{ fontSize: 72, color: "success.main" }} />
        ) : (
          <PhotoCameraIcon sx={{ fontSize: 64, color: "warning.main" }} />
        )}
        <Typography sx={{ fontWeight: 800, fontSize: 19, mt: 1, textAlign: "center" }}>
          {phase === "sent" ? t("equipment.phonePhoto.sent") : endedText}
        </Typography>
        <Typography sx={{ fontSize: 13, color: "#64748b", mt: 0.5 }}>{t("equipment.phonePhoto.returning")}</Typography>
        <Button sx={{ mt: 2, textTransform: "none" }} variant="contained" onClick={goHome}>
          {t("signatures.SimplifiedSignPage.backToHome")}
        </Button>
      </Centered>
    );
  }

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "#0f172a", color: "#f8fafc", display: "flex", flexDirection: "column" }}>
      {/* Which machine */}
      <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        {eq?.image_url && (
          <Box component="img" src={resolveAssetUrl(eq.image_url) || undefined} alt="" sx={{ width: 40, height: 40, borderRadius: 1.5, objectFit: "cover", bgcolor: "#fff" }} />
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>{t("equipment.phonePhoto.title")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 17, lineHeight: 1.2 }} noWrap>
            {eq?.serial_number ? `${eq.serial_number} · ` : ""}
            {eq?.equipment_name || "…"}
          </Typography>
        </Box>
      </Box>

      {/* Viewfinder / preview */}
      <Box sx={{ flex: 1, position: "relative", bgcolor: "#000", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
        <Box
          component="video"
          ref={videoRef}
          playsInline
          muted
          autoPlay
          sx={{ width: "100%", height: "100%", objectFit: "contain", display: phase === "camera" ? "block" : "none" }}
        />
        {(phase === "preview" || phase === "sending") && previewUrl && (
          <Box component="img" src={previewUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
        )}
        {phase === "preparing" && <CircularProgress sx={{ color: "#fff" }} />}
        {phase === "fallback" && (
          <Stack spacing={1.5} sx={{ alignItems: "center", px: 3, textAlign: "center" }}>
            <CameraAltIcon sx={{ fontSize: 56, color: "#94a3b8" }} />
            {cameraError && <Typography sx={{ color: "#cbd5e1", fontSize: 14 }}>{t(`equipment.phonePhoto.${cameraError}`)}</Typography>}
          </Stack>
        )}
      </Box>

      {/* Controls */}
      <Box sx={{ p: 2, pb: "calc(16px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 1.25 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {phase === "camera" && (
          <Stack sx={{ alignItems: "center", justifyContent: "space-between" }} direction="row">
            <Button onClick={() => galleryInput.current?.click()} sx={{ color: "#cbd5e1", textTransform: "none", minWidth: 72 }} startIcon={<CollectionsIcon />}>
              {t("equipment.phonePhoto.gallery")}
            </Button>
            <Box
              component="button"
              type="button"
              aria-label={t("equipment.phonePhoto.shoot")}
              onClick={shoot}
              sx={{ width: 76, height: 76, borderRadius: "50%", border: "5px solid #fff", bgcolor: "primary.main", cursor: "pointer", boxShadow: "0 0 0 3px rgba(255,255,255,.25)" }}
            />
            <Button onClick={goHome} sx={{ color: "#cbd5e1", textTransform: "none", minWidth: 72 }}>
              {t("common.cancel")}
            </Button>
          </Stack>
        )}

        {phase === "fallback" && (
          <>
            <Button size="large" variant="contained" disableElevation startIcon={<PhotoCameraIcon />} onClick={() => cameraInput.current?.click()} sx={{ py: 1.5, fontWeight: 800, textTransform: "none" }}>
              {t("equipment.phonePhoto.openCamera")}
            </Button>
            <Stack direction="row" spacing={1}>
              <Button fullWidth onClick={() => galleryInput.current?.click()} startIcon={<CollectionsIcon />} sx={{ color: "#cbd5e1", textTransform: "none" }}>
                {t("equipment.phonePhoto.gallery")}
              </Button>
              {cameraError !== "cameraUnavailable" && (
                <Button fullWidth onClick={startCamera} startIcon={<ReplayIcon />} sx={{ color: "#cbd5e1", textTransform: "none" }}>
                  {t("equipment.phonePhoto.retryCamera")}
                </Button>
              )}
              <Button fullWidth onClick={goHome} sx={{ color: "#cbd5e1", textTransform: "none" }}>
                {t("common.cancel")}
              </Button>
            </Stack>
          </>
        )}

        {phase === "preview" && (
          <Stack direction="row" spacing={1.25}>
            <Button fullWidth size="large" variant="outlined" startIcon={<ReplayIcon />} onClick={retake} sx={{ color: "#f8fafc", borderColor: "#475569", textTransform: "none", fontWeight: 700 }}>
              {t("equipment.phonePhoto.retake")}
            </Button>
            <Button fullWidth size="large" variant="contained" disableElevation startIcon={<SendIcon />} onClick={send} sx={{ textTransform: "none", fontWeight: 800 }}>
              {error ? t("equipment.photo.tryAgain") : t("equipment.phonePhoto.send")}
            </Button>
          </Stack>
        )}

        {phase === "sending" && (
          <Stack spacing={1}>
            <LinearProgress variant={progress > 0 ? "determinate" : "indeterminate"} value={progress} sx={{ height: 8, borderRadius: 4 }} />
            <Typography sx={{ textAlign: "center", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {t("equipment.photo.uploading", { pct: progress })}
            </Typography>
          </Stack>
        )}
      </Box>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={onFile} />
    </Box>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 3, bgcolor: "#f8fafc", color: "#0f172a" }}>
      {children}
    </Box>
  );
}
