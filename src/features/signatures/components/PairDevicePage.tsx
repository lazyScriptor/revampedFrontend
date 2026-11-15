// features/signatures/components/PairDevicePage.tsx
//
// Public, no-auth pairing page shown on the phone PWA when no OPERATOR_DEVICE
// is bound to the phone's local device_id yet. Operator mints a code on their
// POS (Profile → Signature → Pair a phone), tells the phone user, who types
// it here. On success → navigates to /device.

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  Stack,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import DrawIcon from '@mui/icons-material/Draw';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import { useNavigate } from '@tanstack/react-router';
import type { DeviceCapabilityMap } from '@geargrid/contracts';
import {
  getOrCreateDeviceId,
  suggestDeviceLabel,
  getDeviceLabel,
  setDeviceLabel as persistDeviceLabel,
  setDeviceToken,
  setDeviceTenantDb,
} from '../lib/deviceId';
import {
  isNativePhoneApp,
  nativeBridge,
  registerDeviceWithServer,
} from '@/features/phone-assistant/lib/nativeBridge';
import { useDeviceManifest } from '../lib/deviceShell';
import {
  useClaimPairingCode,
  useDeviceStatus,
  usePairingCodePreview,
} from '../hooks/useSignatures';
import { Trans, useTranslation } from "react-i18next";

const SHOP_CAPABILITIES = [
  'signatures',
  'photos',
  'caller_brief',
  'bill_view',
  'push',
  'click_to_call',
] as const;

const PHONE_SEND_CAPABILITIES = ['contact_sync', 'call_logging'] as const;

export function PairDevicePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useDeviceManifest();
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const [code, setCode] = useState('');
  const [label, setLabel] = useState<string>(() => getDeviceLabel() || suggestDeviceLabel());
  const [submitError, setSubmitError] = useState<string | null>(null);

  // If the phone is already paired (e.g. landed on /pair by accident), skip
  // the form entirely and send to its home.
  const statusQuery = useDeviceStatus(deviceId);
  useEffect(() => {
    if (statusQuery.data?.paired) {
      navigate({ to: '/device', replace: true });
    }
  }, [statusQuery.data?.paired, navigate]);

  const claim = useClaimPairingCode();

  const normalizedCode = useMemo(
    () =>
      code
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace(/^([A-Z0-9]{3})([A-Z0-9]+)$/, '$1-$2')
        .slice(0, 7),
    [code],
  );

  const previewQuery = usePairingCodePreview(
    normalizedCode.length === 7 ? normalizedCode : null,
  );
  const [consentedCaps, setConsentedCaps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const req = previewQuery.data?.requested_capabilities;
    if (!req) return;
    const initial: Record<string, boolean> = {};
    for (const [key, val] of Object.entries(req)) {
      initial[key] = val !== false;
    }
    setConsentedCaps(initial);
  }, [previewQuery.data?.code, previewQuery.data?.requested_capabilities]);

  const canSubmit = normalizedCode.length === 7 && !claim.isPending;

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitError(null);
    if (!canSubmit) return;
    try {
      const setup = isNativePhoneApp()
        ? await nativeBridge.getSetupStatus().catch(() => null)
        : null;
      const paired = await claim.mutateAsync({
        code: normalizedCode,
        device_id: deviceId,
        device_label: label || undefined,
        ...(setup?.deviceModel ? { device_model: setup.deviceModel } : {}),
        ...(setup?.osVersion ? { os_version: setup.osVersion } : {}),
        ...(setup?.appVersion ? { app_version: setup.appVersion } : {}),
        ...(previewQuery.data
          ? { consented_capabilities: consentedCaps as DeviceCapabilityMap }
          : {}),
      });
      if (label) persistDeviceLabel(label);
      if (paired?.device_token) setDeviceToken(paired.device_token);
      if (paired?.tenant_db_name) setDeviceTenantDb(paired.tenant_db_name);
      if (isNativePhoneApp() && paired?.device_token && paired?.tenant_db_name) {
        await nativeBridge.setCredentials({
          deviceId,
          deviceToken: paired.device_token,
          tenantDb: paired.tenant_db_name,
          apiBaseUrl: import.meta.env.VITE_API_URL,
        });
        await registerDeviceWithServer({
          app_version: setup?.appVersion || '1.0.0',
          ...(setup?.deviceModel ? { device_model: setup.deviceModel } : {}),
          ...(setup?.osVersion ? { os_version: setup.osVersion } : {}),
          ...(setup?.reportedState ? { reported_state: setup.reportedState } : {}),
        }).catch(() => null);
      }
      navigate({ to: '/device', replace: true });
    } catch (err: any) {
      setSubmitError(err?.message || t("signatures.PairDevicePage.couldNotPairThisPhone"));
    }
  };

  if (statusQuery.isLoading) {
    return (
      <FullBleedCentered>
        <CircularProgress />
      </FullBleedCentered>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        display: 'flex',
        flexDirection: 'column',
        px: 2,
        py: 3,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Avatar sx={{ bgcolor: '#1d4ed8', color: '#fff', width: 44, height: 44 }}>
          <DrawIcon />
        </Avatar>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', lineHeight: 1.1 }}>
            {t("signatures.PairDevicePage.pairThisPhone")}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t("signatures.PairDevicePage.oneTimeSetupToSign")}
          </Typography>
        </Box>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
          <Trans i18nKey="signatures.PairDevicePage.openPosInstruction" values={{ path: t("signatures.PairDevicePage.profileSignaturePairAPhone") }} components={{ strong: <strong /> }} />
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            autoFocus
            label={t("signatures.PairDevicePage.pairingCode")}
            placeholder={t("signatures.PairDevicePage.abcXyz")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            slotProps={{
              htmlInput: {
                maxLength: 10,
                style: {
                  fontSize: 28,
                  letterSpacing: 6,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  textTransform: 'uppercase',
                },
              },
            }}
            // Show the normalized code as helper text so the user sees the
            // dashed form the backend expects.
            helperText={normalizedCode ? t("signatures.PairDevicePage.interpretedAs", { normalizedCode }) : ' '}
          />

          <TextField
            fullWidth
            label={t("signatures.PairDevicePage.labelOptional")}
            placeholder={suggestDeviceLabel()}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            sx={{ mt: 1.5 }}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />

          {previewQuery.data && (
            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 1.75,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary' }}>
                {previewQuery.data.shop_name || 'GearGrid'}
                {previewQuery.data.staff_name ? ` · ${previewQuery.data.staff_name}` : ''}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                {t("phoneAssistant.pairingPreview.shopWillBeAbleTo")}
              </Typography>
              <Stack spacing={0.25} sx={{ mb: 1 }}>
                {SHOP_CAPABILITIES.filter(
                  (k) => previewQuery.data?.requested_capabilities?.[k] !== false,
                ).map((k) => (
                  <FormControlLabel
                    key={k}
                    control={
                      <Checkbox
                        size="small"
                        color="warning"
                        checked={consentedCaps[k] !== false}
                        onChange={(_e, checked) =>
                          setConsentedCaps((prev) => ({ ...prev, [k]: checked }))
                        }
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: 12.5, color: 'text.primary' }}>
                        {t(`phoneAssistant.capabilities.${k}`)}
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                ))}
              </Stack>

              {PHONE_SEND_CAPABILITIES.some(
                (k) => previewQuery.data?.requested_capabilities?.[k] !== false,
              ) && (
                <>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                    {t("phoneAssistant.pairingPreview.phoneWillSend")}
                  </Typography>
                  <Stack spacing={0.25}>
                    {PHONE_SEND_CAPABILITIES.filter(
                      (k) => previewQuery.data?.requested_capabilities?.[k] !== false,
                    ).map((k) => (
                      <FormControlLabel
                        key={k}
                        control={
                          <Checkbox
                            size="small"
                            color="warning"
                            checked={consentedCaps[k] !== false}
                            onChange={(_e, checked) =>
                              setConsentedCaps((prev) => ({ ...prev, [k]: checked }))
                            }
                          />
                        }
                        label={
                          <Typography sx={{ fontSize: 12.5, color: 'text.primary' }}>
                            {t(`phoneAssistant.capabilities.${k}`)}
                          </Typography>
                        }
                        sx={{ m: 0 }}
                      />
                    ))}
                  </Stack>
                </>
              )}

              {previewQuery.data.will_require_approval && (
                <Alert severity="info" sx={{ mt: 1.25, py: 0.5, fontSize: 12 }}>
                  {t("phoneAssistant.pairingPreview.approvalRequiredNotice")}
                </Alert>
              )}
            </Paper>
          )}

          {submitError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={!canSubmit}
            sx={{
              mt: 2.5,
              py: 1.5,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: 16,
            }}
          >
            {claim.isPending ? t("signatures.PairDevicePage.pairing") : t("signatures.PairDevicePage.pairThisPhone")}
          </Button>
        </form>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 2,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.14)' : '#eef2ff',
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(129, 140, 248, 0.35)' : '#c7d2fe',
        }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          <SmartphoneIcon sx={{ color: 'primary.main', fontSize: 20, mt: 0.2 }} />
          <Box>
            <Typography sx={{ fontSize: 13, color: 'text.primary', fontWeight: 600, mb: 0.5 }}>
              {t("signatures.PairDevicePage.keepThisAppOnYour")}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
              {t("signatures.PairDevicePage.oncePairedYouLlTap")}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {statusQuery.data?.paired === false && (
        <Chip
          icon={<CheckCircleOutlinedIcon />}
          label={t("signatures.PairDevicePage.phoneReadyToPair")}
          size="small"
          sx={{ alignSelf: 'center', mt: 2, bgcolor: 'action.hover', color: 'text.primary' }}
        />
      )}
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
