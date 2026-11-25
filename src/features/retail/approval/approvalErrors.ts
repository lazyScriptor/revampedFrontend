export type ApprovalErrorKind = "locked" | "wrong" | "self" | "method" | "other";

export interface ApprovalError {
  kind: ApprovalErrorKind;
  message: string;
  /** When a locked PIN opens again, if the server said. */
  lockedUntil?: number;
}

/**
 * Turns a failed approve-here call into something the overlay can show. The server's wording is
 * not fixed yet, so this goes by status (423 locked, 401/403 wrong) and by words in the message.
 */
export const parseApprovalError = (err: any): ApprovalError => {
  const status: number | undefined = err?.response?.status;
  const data = err?.response?.data ?? {};
  const message: string = String(data.message || data.error || err?.message || "");
  const code = String(data.code || "").toUpperCase();
  const until = data.locked_until || data.pin_locked_until || data.lockedUntil;
  const lockedUntil = until ? new Date(until).getTime() : undefined;

  if (status === 423 || code.includes("LOCK") || /lock/i.test(message)) {
    return { kind: "locked", message, lockedUntil: Number.isFinite(lockedUntil) ? lockedUntil : undefined };
  }
  if (code.includes("SELF") || /own request|yourself|self/i.test(message)) return { kind: "self", message };
  if (code.includes("METHOD") || /not allowed|method/i.test(message)) return { kind: "method", message };
  if (status === 401 || status === 403 || status === 400 || /incorrect|invalid|wrong/i.test(message)) return { kind: "wrong", message };
  return { kind: "other", message };
};
