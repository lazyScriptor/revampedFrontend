// features/signatures/components/PairedSignatureWatcher.tsx
//
// Mounted inside the signed-in app. On a phone that is also paired as a
// signature pad, staff often leave it on the dashboard instead of /device,
// so requests from the counter went unnoticed until someone typed /device.
// This watches the same pending list as DeviceHomePage and opens the sign
// page as soon as a request arrives. Renders nothing; does nothing on
// computers that were never paired.
import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { getDeviceId } from '../lib/deviceId';
import { isRequestFinished } from '../lib/deviceShell';
import { useDevicePendingSignatures, useDeviceStatus } from '../hooks/useSignatures';

export function PairedSignatureWatcher() {
  const navigate = useNavigate();
  const deviceId = getDeviceId();
  const status = useDeviceStatus(deviceId, { refetchInterval: 5 * 60_000 });
  const paired = status.data?.paired === true;
  const pending = useDevicePendingSignatures(deviceId, { enabled: paired, refetchInterval: 4_000 });
  // A request the user backed out of shouldn't keep pulling them back.
  const opened = useRef(new Set<string>());

  useEffect(() => {
    const next = pending.data?.pending?.find((p) => p.token && !opened.current.has(p.token) && !isRequestFinished(p.token));
    if (!next?.token) return;
    opened.current.add(next.token);
    navigate({ to: '/sign-paired/$token', params: { token: next.token } });
  }, [pending.data?.pending, navigate]);

  return null;
}
