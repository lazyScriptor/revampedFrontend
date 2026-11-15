// features/signatures/components/DeviceHomePage.tsx
//
// Home tab of the paired phone. Shows who this phone belongs to, whether it is approved and recently synced,
// today's counts and any setup warnings. Signature and photo requests still take over the screen from any
// tab (see DeviceShell).

import { useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  CircularProgress,
  Button,
  Chip,
  Alert,
} from '@mui/material';
import DrawIcon from '@mui/icons-material/Draw';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { getDeviceId, clearDeviceId } from '../lib/deviceId';
import { isStandalone } from '../lib/deviceShell';
import { isNativePhoneApp, nativeBridge } from '@/features/phone-assistant/lib/nativeBridge';
import { DeviceShell } from '@/features/phone-assistant/components/DeviceShell';
import { DeviceSyncCard } from '@/features/phone-assistant/components/DeviceSyncCard';
import { rememberPairedUsername } from '@/features/phone-assistant/lib/openGearGrid';
import { syncFreshness, useOnline, useSyncStatus } from '@/features/phone-assistant/lib/phoneAppState';
import { usePullToRefresh } from '@/features/phone-assistant/lib/usePullToRefresh';
import { useDeviceFollowUps, useDeviceMissedCalls } from '@/features/phone-assistant/hooks/useCalls';
import { useSetupWarningCount } from '@/features/phone-assistant/lib/useSetupWarnings';
import { useDevicePendingPhotos } from '@/features/equipment/hooks/useEquipmentPhoto';
import { useDeviceStatus, useDevicePendingSignatures } from '../hooks/useSignatures';

function Stat({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  return (
    <Box
      component={onClick ? 'button' : 'div'}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      sx={{
        all: 'unset',
        boxSizing: 'border-box',
        cursor: onClick ? 'pointer' : 'default',
        flex: 1,
        minHeight: 64,
        p: 1.25,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        textAlign: 'center',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}

export function DeviceHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  const online = useOnline();
  const { status: sync } = useSyncStatus();
  const freshness = syncFreshness(sync);
  const setupWarnings = useSetupWarningCount();

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
  const missed = useDeviceMissedCalls(50, isDeviceActive && online);
  const followUps = useDeviceFollowUps({ status: 'pending', limit: 50 }, isDeviceActive && online);
  const { pull, refreshing } = usePullToRefresh(() => queryClient.invalidateQueries());

  // The sign-in screen offers this phone's staff member (never the password).
  useEffect(() => {
    rememberPairedUsername(status.data?.operator?.username);
  }, [status.data?.operator?.username]);

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
  const waitingSignatures = (pending.data?.pending ?? []).length + (pendingPhotos.data?.pending ?? []).length;

  return (
    <DeviceShell active="home" hideTitle>
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
        {(pull > 0 || refreshing) && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            {refreshing ? t('phoneShell.refreshing') : t('phoneShell.pullToRefresh')}
          </Typography>
        )}

        {/* Status strip: paired · approved · last sync · offline */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }} aria-label={t('phoneShell.home.statusStrip')}>
          <Chip size="small" color="success" label={t('phoneShell.home.paired')} />
          <Chip
            size="small"
            color={deviceStatus === 'ACTIVE' ? 'success' : 'warning'}
            label={deviceStatus === 'ACTIVE' ? t('phoneShell.home.approved') : t(`phoneAssistant.deviceStatus.${deviceStatus}`)}
          />
          {isNativePhoneApp() && (
            <Chip
              size="small"
              color={freshness === 'fresh' ? 'success' : freshness === 'stale' ? 'warning' : 'default'}
              label={t(`phoneShell.sync.state_${freshness}`)}
            />
          )}
          {!online && <Chip size="small" color="warning" label={t('phoneShell.sync.offline')} />}
        </Box>

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

        {setupWarnings > 0 && (
          <Alert
            severity="warning"
            sx={{ borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate({ to: '/device/settings/$section', params: { section: 'setup' } })} sx={{ minHeight: 40 }}>
                {t('phoneShell.home.fix')}
              </Button>
            }
          >
            {t('phoneShell.home.setupWarnings', { count: setupWarnings })}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', textAlign: 'center' }}
        >
          <Avatar
            sx={{
              bgcolor: isDeviceActive ? 'success.light' : 'warning.light',
              color: isDeviceActive ? 'success.dark' : 'warning.dark',
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 1.5,
            }}
          >
            <CheckCircleOutlinedIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: 'text.primary', mb: 0.5 }}>
            {deviceStatus === 'PENDING'
              ? t("phoneAssistant.deviceHome.pendingTitle")
              : deviceStatus === 'SUSPENDED'
                ? t("phoneAssistant.deviceHome.suspendedTitle")
                : t("signatures.DeviceHomePage.readyToSign")}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {t("signatures.DeviceHomePage.thisPhoneWillOpenAutomatically")}
          </Typography>
          {operator.has_saved_signature && (
            <Chip size="small" icon={<DrawIcon />} label={t("signatures.DeviceHomePage.yourSavedSignatureIsActive")} sx={{ mt: 2 }} />
          )}
        </Paper>

        {isDeviceActive && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Stat label={t('phoneShell.home.missed')} value={(missed.data?.items ?? []).length} onClick={() => navigate({ to: '/device/calls' })} />
            <Stat label={t('phoneShell.home.followUps')} value={(followUps.data?.items ?? []).length} onClick={() => navigate({ to: '/device/calls' })} />
            <Stat label={t('phoneShell.home.requests')} value={waitingSignatures} />
          </Box>
        )}

        {isNativePhoneApp() && <DeviceSyncCard />}

        {!isStandalone() && !isNativePhoneApp() && (
          <Alert severity="info" icon={<AddToHomeScreenIcon />} sx={{ borderRadius: 2, alignItems: 'center' }}>
            <strong>{t("signatures.DeviceHomePage.addToHomeTitle")}</strong>
            <Box component="span" sx={{ display: 'block', fontSize: 12 }}>
              {t("signatures.DeviceHomePage.addToHomeHint")}
            </Box>
          </Alert>
        )}

        {pending.isError && !shopInactive && (
          <Alert severity="warning">
            <strong>{t("signatures.DeviceHomePage.couldnTFetchPendingRequests")}</strong>
            {' '}
            {(pending.error as Error)?.message || t("signatures.DeviceHomePage.retryingAutomatically")}
          </Alert>
        )}
      </Box>
    </DeviceShell>
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
