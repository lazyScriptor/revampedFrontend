// features/signatures/components/DeviceHomePage.tsx
//
// Phone's post-pairing "home screen". Polls the pending-signatures endpoint
// every few seconds; the moment the paired operator triggers "Request
// signatures" on the POS, this page auto-navigates to the simplified sign
// page for that invoice. Zero taps required.

import { useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  CircularProgress,
  Button,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import DrawIcon from '@mui/icons-material/Draw';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { useNavigate } from '@tanstack/react-router';
import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen';
import { getDeviceId, clearDeviceId } from '../lib/deviceId';
import { isRequestFinished, isStandalone, useDeviceManifest, useScreenWakeLock } from '../lib/deviceShell';
import { isNativePhoneApp, nativeBridge } from '@/features/phone-assistant/lib/nativeBridge';
import { unpairCurrentDevice } from '@/features/phone-assistant/api/phoneAssistantApi';
import { NativeSetupChecklist } from '@/features/phone-assistant/components/NativeSetupChecklist';
import { MissedCallsAndFollowUpsPanel } from '@/features/phone-assistant/components/MissedCallsAndFollowUpsPanel';
import { useDevicePendingPhotos } from '@/features/equipment/hooks/useEquipmentPhoto';
import {
  useDeviceStatus,
  useDevicePendingSignatures,
} from '../hooks/useSignatures';
import { useTranslation } from "react-i18next";

export function DeviceHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deviceId = getDeviceId();

  // No device_id at all → the phone was never paired. Send to /pair.
  useEffect(() => {
    if (!deviceId) {
      navigate({ to: '/pair', replace: true });
    }
  }, [deviceId, navigate]);

  const status = useDeviceStatus(deviceId, { refetchInterval: 30_000 });
  const shopInactive = status.data?.shop_inactive === true;
  const deviceStatus = status.data?.device_status ?? 'ACTIVE';
  const isDeviceActive = deviceStatus === 'ACTIVE' && !shopInactive;
  const pending = useDevicePendingSignatures(deviceId, {
    enabled: status.data?.paired === true && isDeviceActive,
  });
  const pendingPhotos = useDevicePendingPhotos(deviceId, {
    enabled: status.data?.paired === true && isDeviceActive,
  });
  useDeviceManifest();
  useScreenWakeLock(!!deviceId);

  // If the backend says the device isn't paired any more (operator unpaired
  // it from POS), clear local state and bounce back to pairing.
  // Debounce 1s so a stale cached "not paired" response from immediately
  // after pairing has time to be superseded by the fresh query result
  // (useClaimPairingCode seeds the cache; this is defense in depth).
  useEffect(() => {
    if (!status.isSuccess || status.data?.paired !== false) return;
    const t = setTimeout(() => {
      if (status.data?.paired === false) {
        clearDeviceId();
        void nativeBridge.clearCredentials();
        navigate({ to: '/pair', replace: true });
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [status.isSuccess, status.data?.paired, status.data, navigate]);

  // Auto-redirect to the simplified sign page the moment a pending request
  // appears for this device's paired operator.
  useEffect(() => {
    const first = pending.data?.pending?.find((p) => p.token && !isRequestFinished(p.token));
    if (first?.token) {
      navigate({ to: '/sign-paired/$token', params: { token: first.token }, replace: true });
    }
  }, [pending.data?.pending, navigate]);

  // Same for a photo request: the counter tapped a machine's picture.
  useEffect(() => {
    const next = pendingPhotos.data?.pending?.find((p) => p.token && !isRequestFinished(p.token));
    if (next?.token) navigate({ to: '/photo/$token', params: { token: next.token }, replace: true });
  }, [pendingPhotos.data?.pending, navigate]);

  if (status.isLoading || !deviceId) {
    return (
      <FullBleedCentered>
        <CircularProgress />
      </FullBleedCentered>
    );
  }

  if (!status.data?.paired) {
    return null; // redirecting
  }

  const operator = status.data.operator!;
  const tenant = status.data.tenant!;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(135deg, ${tenant.primary_color} 0%, ${tenant.secondary_color} 100%)`,
          color: 'white',
          px: 2,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {tenant.logo_url ? (
          <Avatar src={tenant.logo_url} sx={{ width: 48, height: 48 }} />
        ) : (
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', width: 48, height: 48 }}>
            <DrawIcon />
          </Avatar>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 17, lineHeight: 1.1 }}>
            {tenant.business_display_name}
          </Typography>
          <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
            {t("signatures.DeviceHomePage.pairedTo", { operator_name: operator.operator_name })}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {deviceStatus === 'PENDING' && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {t("phoneAssistant.deviceHome.pendingApprovalBanner")}
          </Alert>
        )}

        {deviceStatus === 'SUSPENDED' && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            {t("phoneAssistant.deviceHome.suspendedBanner")}
          </Alert>
        )}

        {shopInactive && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            {t(
              "signatures.DeviceHomePage.shopInactiveWarning",
              "Shop subscription is currently inactive. Your phone stays paired and will resume once the shop account is active.",
            )}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            textAlign: 'center',
          }}
        >
          <Avatar
            sx={{
              bgcolor: isDeviceActive ? '#dcfce7' : '#fef3c7',
              color: isDeviceActive ? '#16a34a' : '#d97706',
              width: 72,
              height: 72,
              mx: 'auto',
              mb: 2,
            }}
          >
            <CheckCircleOutlinedIcon sx={{ fontSize: 44 }} />
          </Avatar>
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: 'text.primary', mb: 0.5 }}>
            {deviceStatus === 'PENDING'
              ? t("phoneAssistant.deviceHome.pendingTitle")
              : deviceStatus === 'SUSPENDED'
                ? t("phoneAssistant.deviceHome.suspendedTitle")
                : t("signatures.DeviceHomePage.readyToSign")}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
            {t("signatures.DeviceHomePage.thisPhoneWillOpenAutomatically")}
          </Typography>

          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            <HourglassBottomIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t("signatures.DeviceHomePage.waitingForSignatureRequests")}
            </Typography>
          </Stack>

          {operator.has_saved_signature && (
            <Chip
              size="small"
              icon={<DrawIcon />}
              label={t("signatures.DeviceHomePage.yourSavedSignatureIsActive")}
              sx={{
                mt: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(22, 163, 74, 0.18)' : '#f0fdf4',
                color: (theme) =>
                  theme.palette.mode === 'dark' ? '#86efac' : '#166534',
              }}
            />
          )}
        </Paper>

        {!isStandalone() && !isNativePhoneApp() && (
          <Alert
            severity="info"
            icon={<AddToHomeScreenIcon />}
            sx={{ borderRadius: 2, alignItems: 'center' }}
          >
            <strong>{t("signatures.DeviceHomePage.addToHomeTitle")}</strong>
            <Box component="span" sx={{ display: 'block', fontSize: 12 }}>
              {t("signatures.DeviceHomePage.addToHomeHint")}
            </Box>
          </Alert>
        )}

        {isNativePhoneApp() && (
          <>
            <NativeSetupChecklist />
            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate({ to: '/device/notifications' })}
              sx={{
                minHeight: 44,
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                borderColor: 'warning.main',
                color: 'warning.main',
                bgcolor: 'background.paper',
              }}
            >
              {t("phoneAssistant.myNotifications.manageOnPhone")}
            </Button>
          </>
        )}

        <Button
          fullWidth
          variant="outlined"
          onClick={() => navigate({ to: '/device/privacy' })}
          sx={{
            minHeight: 44,
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            borderColor: 'divider',
            color: 'text.primary',
            bgcolor: 'background.paper',
          }}
        >
          {t("phoneAssistant.devicePrivacy.openPrivacy")}
        </Button>

        {isDeviceActive && <MissedCallsAndFollowUpsPanel mode="device" />}

        {pending.isError && !shopInactive && (
          <Alert severity="warning">
            <strong>{t("signatures.DeviceHomePage.couldnTFetchPendingRequests")}</strong>
            {' '}
            {(pending.error as Error)?.message || t("signatures.DeviceHomePage.retryingAutomatically")}
          </Alert>
        )}
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Button
          fullWidth
          variant="text"
          size="small"
          onClick={async () => {
            if (confirm(t("signatures.DeviceHomePage.unpairThisPhoneYouWill"))) {
              await unpairCurrentDevice().catch(() => null);
              clearDeviceId();
              void nativeBridge.clearCredentials();
              navigate({ to: '/pair', replace: true });
            }
          }}
          sx={{ textTransform: 'none', color: 'text.secondary' }}
        >
          {t("signatures.DeviceHomePage.unpairThisPhone")}
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
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      {children}
    </Box>
  );
}
