import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useFeature } from "@/features/plan/usePlan";
import { useLockerStatus } from "../hooks/useLocker";
import { isSnoozed, writeSnooze } from "../lib/locker";
import { OpeningDialog } from "./OpeningDialog";

/**
 * Asks the cashier for the morning locker amount until someone enters it. "Later" brings it back
 * after an hour. Owners (locker:manage) are not nagged: they open it from the locker page.
 */
export function LockerOpeningPrompt() {
  const user = useAuthStore((s) => s.user);
  const canManage = useAuthStore((s) => s.hasPermission("locker:manage"));
  const included = useFeature("cash_locker");
  const eligible = included && !!user && (user.permissions || []).includes("locker:count") && !canManage;
  const { data: status } = useLockerStatus(eligible);
  const [now, setNow] = useState(() => Date.now());
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    const id = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(id);
  }, [eligible]);

  const due = eligible && !!status?.needs_opening && !isSnoozed(status.business_date, now);
  // Stay open after saving (status flips to "opened") so the WhatsApp step can still be used.
  useEffect(() => {
    if (due) setActive(true);
  }, [due]);

  if (!eligible || !status || !active) return null;
  return (
    <OpeningDialog
      open
      status={status}
      onClose={() => setActive(false)}
      onLater={() => {
        writeSnooze(status.business_date);
        setNow(Date.now());
        setActive(false);
      }}
    />
  );
}
