// features/signatures/components/SimplifiedSignPage.tsx
//
// Sign page shown on the paired phone when a signature request is pending.
// No name field, no agree-to-terms checkbox — the confirm tap IS the
// agreement; the terms are one tap away in the pad's header.
//
// The pad is landscape and fills the screen. A phone held upright gets the
// pad turned sideways (CSS) so the person just turns the phone; a phone
// already sideways gets it as-is.
//
// The operator never signs here if they have a saved signature: the server
// applies it when the counter makes the request, and this page applies it
// too if it still finds the operator pending.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Avatar,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useNavigate } from '@tanstack/react-router';
import type { SignatureRole } from '@geargrid/contracts';
import { SignatureCanvas, type SignatureCanvasHandle } from './SignatureCanvas';
import { useSignatureSession, useSubmitSignature } from '../hooks/useSignatures';
import { ROLE_LABEL } from '../lib/labels';
import { markRequestFinished, useDeviceManifest, useScreenWakeLock } from '../lib/deviceShell';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from "react-i18next";

const ROLE_ICON: Record<SignatureRole, React.ReactElement> = {
  CUSTOMER: <PersonIcon />,
  OPERATOR: <SupportAgentIcon />,
  GUARANTOR: <PersonIcon />,
  WITNESS: <PersonIcon />,
};

// Seconds the done screen stays up before the phone goes back to waiting.
const AUTO_RETURN_SECONDS = 3;
const HEADER_PX = 52;
const FOOTER_PX = 64;
const GUTTER_PX = 12;

const formatLKR = (n: number) =>
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  }).format(n);

const readViewport = () => ({
  w: typeof window === 'undefined' ? 800 : window.innerWidth,
  h: typeof window === 'undefined' ? 400 : window.innerHeight,
});

/** Window size, kept current through rotation and browser-bar changes. */
const useViewport = () => {
  const [vp, setVp] = useState(readViewport);
  useEffect(() => {
    const update = () => setVp(readViewport());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return vp;
};

interface SimplifiedSignPageProps {
  token: string;
}

export function SimplifiedSignPage({ token }: SimplifiedSignPageProps) {
  const { t } = useTranslation();
  // ── ALL hooks declared at the top, before any early return.
  //    (Trap 17 — React error #310: calling a hook below an early-return
  //    branch means the first render has fewer hooks than the second.)
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useSignatureSession(token);
  const submit = useSubmitSignature(token);
  const canvasRef = useRef<SignatureCanvasHandle | null>(null);
  const viewport = useViewport();

  const [selectedRole, setSelectedRole] = useState<SignatureRole | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // What the last submit told us, so the screen moves on the moment the
  // server answers instead of waiting for the next session refetch (that
  // gap made it look like the first tap did nothing).
  const [signedHere, setSignedHere] = useState<SignatureRole[]>([]);
  const [allSignedHere, setAllSignedHere] = useState(false);
  const autoOperatorTried = useRef(false);

  const data = session.data; // may be undefined on first renders
  useDeviceManifest();
  useScreenWakeLock();

  // Once the request is finished (signed, expired or cancelled at the counter)
  // go back to the waiting screen by itself, so the next request opens with no taps.
  const finishedStatus: string | null = allSignedHere
    ? 'COMPLETED'
    : data && ['COMPLETED', 'EXPIRED', 'CANCELLED'].includes(data.status)
      ? data.status
      : null;
  const finished = finishedStatus !== null;
  const [returnIn, setReturnIn] = useState(AUTO_RETURN_SECONDS);
  const goHome = useCallback(() => {
    markRequestFinished(token);
    queryClient.removeQueries({ queryKey: ['devices', 'pending'] });
    navigate({ to: '/device', replace: true });
  }, [token, queryClient, navigate]);
  useEffect(() => {
    if (!finished) return;
    markRequestFinished(token);
    setReturnIn(AUTO_RETURN_SECONDS);
    const tick = setInterval(() => setReturnIn((s) => Math.max(0, s - 1)), 1000);
    const go = setTimeout(goHome, AUTO_RETURN_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(go);
    };
  }, [finished, token, goHome]);

  // A full-screen pad must not scroll or pull-to-refresh under the finger.
  useEffect(() => {
    const body = document.body.style;
    const prev = { overflow: body.overflow, overscroll: body.overscrollBehavior };
    body.overflow = 'hidden';
    body.overscrollBehavior = 'none';
    return () => {
      body.overflow = prev.overflow;
      body.overscrollBehavior = prev.overscroll;
    };
  }, []);

  const pendingRoles = useMemo(
    () => (data?.pending_roles || []).filter((r) => !signedHere.includes(r)),
    [data?.pending_roles, signedHere],
  );

  const activeRole: SignatureRole | null = useMemo(() => {
    if (selectedRole && pendingRoles.includes(selectedRole)) return selectedRole;
    return pendingRoles[0] || null;
  }, [selectedRole, pendingRoles]);

  const signatoryName = useMemo(() => {
    if (!data) return 'Signatory';
    if (activeRole === 'OPERATOR') return data.operator_saved_signature?.operator_name || 'Operator';
    if (activeRole === 'CUSTOMER') return data.invoice.customer_name || 'Walk-in customer';
    return 'Signatory';
  }, [activeRole, data]);

  const handleSubmit = useCallback(
    async (useStored = false) => {
      setSubmitError(null);
      if (!activeRole || !data || submit.isPending) return;

      let imageDataUrl: string | null = null;
      if (!useStored) {
        imageDataUrl = canvasRef.current?.toDataUrl('image/png') ?? null;
        if (!imageDataUrl) {
          setSubmitError(t("signatures.SimplifiedSignPage.pleaseDrawYourSignatureIn"));
          return;
        }
      }

      try {
        const result: any = await submit.mutateAsync({
          role: activeRole,
          signatory_name: signatoryName,
          agreed_to_terms: true,
          terms_version: data.terms.version,
          use_stored_operator_signature: useStored,
          image_data_url: useStored ? undefined : imageDataUrl ?? undefined,
        });
        canvasRef.current?.clear();
        setSelectedRole(null);
        setSignedHere((prev) => (prev.includes(activeRole) ? prev : [...prev, activeRole]));
        if (result?.all_captured || result?.status === 'COMPLETED') setAllSignedHere(true);
      } catch (err: any) {
        // Someone (or the auto step) already signed this role: just move on.
        if (err?.status === 409) {
          setSignedHere((prev) => (prev.includes(activeRole) ? prev : [...prev, activeRole]));
          session.refetch();
          return;
        }
        setSubmitError(err?.message || t("signatures.SimplifiedSignPage.submissionFailed"));
      }
    },
    [activeRole, data, signatoryName, submit, session, t],
  );

  // Operator with a saved signature: sign for them, no drawing, no tap.
  const canUseStoredOperatorSig =
    activeRole === 'OPERATOR' && !!data?.operator_saved_signature?.has_saved_signature;
  useEffect(() => {
    if (!canUseStoredOperatorSig || finished || autoOperatorTried.current) return;
    autoOperatorTried.current = true;
    handleSubmit(true);
  }, [canUseStoredOperatorSig, finished, handleSubmit]);

  // ── Early returns from here down — hook count is now stable.
  if (session.isLoading) {
    return (
      <FullBleedCentered>
        <CircularProgress />
      </FullBleedCentered>
    );
  }

  if (session.error || !data) {
    return (
      <FullBleedCentered>
        <Alert severity="error" sx={{ mb: 2 }}>
          {(session.error as Error)?.message || t("signatures.SimplifiedSignPage.couldNotLoadTheSignature")}
        </Alert>
        <Button variant="outlined" onClick={goHome}>{t("common.back")}</Button>
      </FullBleedCentered>
    );
  }

  // Terminal states — the request is done or dead. Bounce back to device home.
  if (finished) {
    return (
      <FullBleedCentered>
        <Avatar
          sx={{
            bgcolor: finishedStatus === 'COMPLETED' ? '#16a34a' : '#f59e0b',
            width: 72,
            height: 72,
            mb: 2,
          }}
        >
          <CheckCircleOutlinedIcon sx={{ fontSize: 44 }} />
        </Avatar>
        <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 1, textAlign: 'center' }}>
          {finishedStatus === 'COMPLETED' ? t("signatures.SignatureCaptureDialog.allSignaturesCaptured") : t("signatures.SimplifiedSignPage.sessionEnded")}
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 2, textTransform: 'none' }}
          onClick={goHome}
        >
          {t("signatures.SimplifiedSignPage.backToHome")}
        </Button>
        <Typography sx={{ mt: 1.5, fontSize: 12, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
          {t("signatures.SimplifiedSignPage.returningIn", { count: returnIn })}
        </Typography>
      </FullBleedCentered>
    );
  }

  const primary = data.tenant.primary_color || '#1976d2';

  // Landscape box: as-is on a sideways phone, turned 90° on an upright one.
  const portrait = viewport.h > viewport.w;
  const padW = portrait ? viewport.h : viewport.w;
  const padH = portrait ? viewport.w : viewport.h;
  const canvasH = Math.max(120, padH - HEADER_PX - FOOTER_PX - GUTTER_PX * 2);
  const savingOperator = canUseStoredOperatorSig && submit.isPending;
  const capturedRoles = data.captured_roles.map((r) => r.role).concat(signedHere);

  return (
    <Box
      data-testid="sign-pad"
      data-rotated={portrait ? 'true' : 'false'}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: padW,
        height: padH,
        transformOrigin: 'top left',
        transform: portrait ? `translateX(${viewport.w}px) rotate(90deg)` : 'none',
        bgcolor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        px: `${GUTTER_PX}px`,
        py: `${GUTTER_PX}px`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {/* Header: who signs, for which bill, terms */}
      <Box sx={{ height: HEADER_PX, display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <Avatar sx={{ bgcolor: primary, width: 36, height: 36 }}>{activeRole ? ROLE_ICON[activeRole] : null}</Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: 16, fontWeight: 800, color: '#0f172a', lineHeight: 1.15 }}>
            {activeRole ? t("signatures.SimplifiedSignPage.signature", { role: t(ROLE_LABEL[activeRole]) }) : ''}
            <Box component="span" sx={{ fontWeight: 500, color: '#64748b', ml: 1, fontSize: 13 }}>
              {t("signatures.SimplifiedSignPage.signingAs", { signatoryName })}
            </Box>
          </Typography>
          <Typography noWrap sx={{ fontSize: 12, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
            {data.invoice.invoice_number} · {formatLKR(data.invoice.total_amount)}
          </Typography>
        </Box>
        {capturedRoles.map((r) => (
          <Chip
            key={r}
            size="small"
            icon={<CheckCircleOutlinedIcon />}
            label={t("signatures.roleSigned", { role: t(ROLE_LABEL[r]) })}
            sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 600, display: { xs: 'none', sm: 'inline-flex' } }}
          />
        ))}
        {pendingRoles.length > 1 &&
          pendingRoles.map((role) => (
            <Chip
              key={role}
              label={t(ROLE_LABEL[role])}
              onClick={() => setSelectedRole(role)}
              color={role === activeRole ? 'primary' : 'default'}
              variant={role === activeRole ? 'filled' : 'outlined'}
              sx={{ fontWeight: 700 }}
            />
          ))}
        <Button
          size="small"
          startIcon={<GavelIcon />}
          onClick={() => setShowTerms(true)}
          sx={{ textTransform: 'none', color: '#475569', flexShrink: 0 }}
        >
          {t("signatures.SimplifiedSignPage.terms")}
        </Button>
      </Box>

      {/* The pad */}
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {activeRole && (
          <SignatureCanvas
            key={activeRole}
            ref={canvasRef}
            height={canvasH}
            rotated={portrait}
            hideClear
            disabled={submit.isPending}
            placeholder={savingOperator ? t("signatures.SimplifiedSignPage.applyingSavedSignature") : undefined}
          />
        )}
        {showTerms && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              p: 2,
              overflowY: 'auto',
              touchAction: 'pan-y',
              zIndex: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontWeight: 700, flex: 1, color: '#0f172a' }}>
                {t("signatures.MobileSignPage.rentalTermsV", { version: data.terms.version })}
              </Typography>
              <IconButton size="small" onClick={() => setShowTerms(false)} aria-label={t("common.close")}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography sx={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>{data.terms.markdown}</Typography>
          </Box>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ height: FOOTER_PX, display: 'flex', alignItems: 'center', gap: 1.5, pt: 1 }}>
        <Button
          variant="outlined"
          size="large"
          startIcon={<DeleteOutlinedIcon />}
          onClick={() => {
            canvasRef.current?.clear();
            setSubmitError(null);
          }}
          disabled={submit.isPending}
          sx={{ textTransform: 'none', fontWeight: 700, color: '#475569', borderColor: '#cbd5e1', flexShrink: 0 }}
        >
          {t("common.clear")}
        </Button>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {submitError && (
            <Typography role="alert" sx={{ color: '#b91c1c', fontSize: 13, fontWeight: 600 }}>
              {submitError}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          size="large"
          disabled={!activeRole || submit.isPending}
          onClick={() => handleSubmit(false)}
          startIcon={submit.isPending ? <CircularProgress size={18} color="inherit" /> : <CheckCircleOutlinedIcon />}
          sx={{ bgcolor: primary, textTransform: 'none', fontWeight: 800, fontSize: 17, px: 4, py: 1.25, minWidth: 220 }}
        >
          {submit.isPending
            ? t("signatures.MobileSignPage.submitting")
            : t("signatures.SimplifiedSignPage.confirmSignature")}
        </Button>
      </Box>
    </Box>
  );
}

function FullBleedCentered({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        bgcolor: '#f8fafc',
      }}
    >
      {children}
    </Box>
  );
}
