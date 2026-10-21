// features/signatures/components/SignatureCaptureDialog.tsx
//
// Pops over the POS. Creates a signature session on open, shows the QR +
// expiry countdown + per-role status, listens on sockets, and closes clean
// when all required roles have signed. Operator can hit Cancel at any time.

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { SignatureCheckpoint, SignatureRole } from '@geargrid/contracts';
import { connectSocket, getSocket } from '@/lib/socket';
import { ROLE_LABEL, CHECKPOINT_LABEL } from '../lib/labels';
import {
  useCreateSignatureRequest,
  useCancelSignatureRequest,
  useSignatureSocketEvents,
  useSignatureSession,
} from '../hooks/useSignatures';
import { useTranslation } from "react-i18next";

interface SignatureCaptureDialogProps {
  open: boolean;
  onClose: () => void;
  invoiceId: number;
  checkpoint: SignatureCheckpoint;
  required_roles: SignatureRole[];
  onCompleted?: () => void;
  title?: string;
}

export function SignatureCaptureDialog({
  open,
  onClose,
  invoiceId,
  checkpoint,
  required_roles,
  onCompleted,
  title,
}: SignatureCaptureDialogProps) {
  const { t } = useTranslation();
  const createMut = useCreateSignatureRequest();
  const cancelMut = useCancelSignatureRequest();

  const [session, setSession] = useState<null | {
    token: string;
    sign_path: string;
    expires_at: string;
    request_id?: number;
  }>(null);
  const [capturedRoles, setCapturedRoles] = useState<SignatureRole[]>([]);
  const [pendingRoles, setPendingRoles] = useState<SignatureRole[]>(required_roles);
  const [allDone, setAllDone] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<number | null>(null);

  // ── Open: mint the session ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSession(null);
    setCapturedRoles([]);
    setPendingRoles(required_roles);
    setAllDone(false);
    setError(null);
    setRequestId(null);

    (async () => {
      try {
        const result = await createMut.mutateAsync({
          invoiceId,
          checkpoint,
          required_roles,
          expires_in_minutes: 10,
        });
        if (cancelled) return;
        setSession(result);
        // The backend doesn't echo the DB row id in CreateSignatureRequest's
        // response (token is sufficient to resume), but our socket channel
        // keys by request_id. We'll fill request_id from the first socket
        // event — see "capture-triggered id capture" below.
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || t("signatures.SignatureCaptureDialog.couldNotStartTheSignature"));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) {
      setSecondsLeft(0);
      return;
    }
    const expiresMs = new Date(session.expires_at).getTime();
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((expiresMs - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // ── Socket subscription (instant feedback path). Resolves against the
  //    first inbound event's request_id so we don't need the id up front.
  useSignatureSocketEvents({
    activeRequestId: requestId,
    onCaptured: (payload) => {
      setCapturedRoles((prev) => (prev.includes(payload.role) ? prev : [...prev, payload.role]));
      setPendingRoles(payload.pending_roles);
    },
    onAllCaptured: () => {
      setAllDone(true);
      onCompleted?.();
    },
    onCancelled: () => {
      setError(t("signatures.SignatureCaptureDialog.thisSessionWasCancelled"));
    },
  });

  // ── Polling fallback. Sockets can race, drop messages, or (on strict
  //    networks like corporate wifi + Brave Shields) never connect at all.
  //    Polling the session every 2s while the dialog is open guarantees
  //    the POS notices completion within 2s regardless of the socket layer.
  const sessionPoll = useSignatureSession(session?.token || null);
  useEffect(() => {
    if (!sessionPoll.data || allDone) return;
    const liveCaptured = sessionPoll.data.captured_roles.map((r) => r.role);
    const livePending = sessionPoll.data.pending_roles;
    // Merge whatever the poll says is captured with whatever sockets have
    // already shown us (keeps the roles chip from flickering).
    setCapturedRoles((prev) => Array.from(new Set([...prev, ...liveCaptured])));
    setPendingRoles(livePending);
    if (sessionPoll.data.status === 'COMPLETED') {
      setAllDone(true);
      onCompleted?.();
    }
  }, [sessionPoll.data, allDone, onCompleted]);

  // Attach the request_id from any first incoming event. Our socket channel
  // is keyed by request_id (not invoice_id) because an invoice can have
  // multiple capture sessions over time, but the backend only returns the
  // id in socket payloads — not in CreateSignatureRequest's HTTP response.
  useEffect(() => {
    if (!session || requestId) return;
    connectSocket();
    const socket = getSocket();
    const onCaptured = (p: any) => {
      if (p?.invoice_id === invoiceId) setRequestId(p.request_id);
    };
    const onAll = (p: any) => {
      if (p?.invoice_id === invoiceId) setRequestId(p.request_id);
    };
    socket.on('signature:captured', onCaptured);
    socket.on('signature:all-captured', onAll);
    return () => {
      socket.off('signature:captured', onCaptured);
      socket.off('signature:all-captured', onAll);
    };
  }, [session, requestId, invoiceId]);

  const qrUrl = useMemo(() => {
    if (!session) return null;
    return `${window.location.origin}${session.sign_path}`;
  }, [session]);

  const handleCancel = async () => {
    if (session?.token && !allDone) {
      try {
        await cancelMut.mutateAsync(session.token);
      } catch {
        // ignore
      }
    }
    onClose();
  };

  const copyLink = async () => {
    if (!qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrUrl);
    } catch {
      // ignore
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  // ── Auto-dismiss after success. Show the "All signatures captured ✓"
  //    confirmation for 1.5s so the operator SEES it, then close the
  //    dialog and let the parent refresh the receipt preview.
  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(() => onClose(), 1500);
    return () => clearTimeout(t);
  }, [allDone, onClose]);

  return (
    <Dialog
      open={open}
      onClose={allDone ? onClose : undefined}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 3, overflow: 'hidden' },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#0f172a',
          color: '#f8fafc',
          px: 2.5,
          py: 1.75,
          fontSize: 16,
        }}
      >
        <span>{title || t("signatures.SignatureCaptureDialog.captureSignature", { checkpoint: t(CHECKPOINT_LABEL[checkpoint]) })}</span>
        <IconButton size="small" onClick={handleCancel} sx={{ color: '#f8fafc' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!session && !error && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2, color: '#64748b' }}>{t("signatures.SignatureCaptureDialog.preparingSession")}</Typography>
          </Box>
        )}

        {session && !allDone && qrUrl && (
          <>
            <Typography sx={{ fontSize: 13, color: '#64748b', textAlign: 'center', mb: 1.5 }}>
              {t("signatures.SignatureCaptureDialog.scanTheQrCodeWith")}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                p: 2,
                bgcolor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: 2,
              }}
            >
              <QRCodeSVG value={qrUrl} size={192} level="M" includeMargin />
            </Box>

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mt: 1.5 }}
            >
              <Chip
                size="small"
                icon={<HourglassTopIcon fontSize="small" />}
                label={t("signatures.SignatureCaptureDialog.expiresIn", { minutes, value: String(seconds).padStart(2, '0') })}
                sx={{
                  bgcolor: secondsLeft < 60 ? '#fef3c7' : '#f1f5f9',
                  color: '#334155',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                }}
              />
              <Button
                size="small"
                startIcon={<ContentCopyIcon fontSize="small" />}
                onClick={copyLink}
                sx={{ textTransform: 'none', color: '#64748b' }}
              >
                {t("signatures.SignatureCaptureDialog.copyLink")}
              </Button>
            </Stack>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>
                {t("signatures.SignatureCaptureDialog.signatures")}
              </Typography>
              <Stack spacing={1}>
                {required_roles.map((role) => {
                  const done = capturedRoles.includes(role);
                  return (
                    <Stack
                      key={role}
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: 1.5,
                        bgcolor: done ? '#dcfce7' : '#f1f5f9',
                      }}
                    >
                      {done ? (
                        <CheckCircleOutlinedIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                      ) : (
                        <HourglassTopIcon sx={{ color: '#64748b', fontSize: 20 }} />
                      )}
                      <Typography sx={{ fontSize: 14, color: '#0f172a', flex: 1, fontWeight: done ? 600 : 400 }}>
                        {t(ROLE_LABEL[role])}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: done ? '#166534' : '#64748b' }}>
                        {done ? t("signatures.SignatureCaptureDialog.signed") : t("signatures.SignatureCaptureDialog.waiting")}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          </>
        )}

        {allDone && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleOutlinedIcon sx={{ color: '#16a34a', fontSize: 56, mb: 1 }} />
            <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 0.5 }}>
              {t("signatures.SignatureCaptureDialog.allSignaturesCaptured")}
            </Typography>
            <Typography sx={{ color: '#64748b', fontSize: 13 }}>
              {t("signatures.SignatureCaptureDialog.closingAutomatically")}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {!allDone ? (
          <Button onClick={handleCancel} sx={{ textTransform: 'none', color: '#64748b' }}>
            {t("common.cancel")}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={onClose}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {t("signatures.SignatureCaptureDialog.closeNow")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
