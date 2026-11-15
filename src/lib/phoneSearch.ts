// Phone contacts synced from a paired phone are searched by phone number only (never by name).
// Customers can be searched by name, customer ID, NIC, or phone number.
// Mirrors phoneSearchCore in revampedBackend_Geargrid/src/utils/customerSearch.js.

/** Fewest phone digits, after a leading 0 / 94 / 0094, for phoneSearchCore. */
export const MIN_PHONE_SEARCH_DIGITS = 3;

/** Fewest raw digits required before querying synced phone contacts from a paired phone. */
export const MIN_CONTACT_SEARCH_DIGITS = 9;

/** True when the text is a phone number search: digits and phone formatting only, enough digits. */
export function isPhoneSearch(text: string): boolean {
  const trimmed = text.trim();
  if (!/^[\d\s+()\-./]+$/.test(trimmed)) return false;
  const core = trimmed.replace(/\D/g, "").replace(/^(?:0094|94|0)/, "");
  return core.length >= MIN_PHONE_SEARCH_DIGITS;
}

/** True when the text is a phone number with at least 9 digits (for synced phone-contact lookup). */
export function isContactPhoneSearch(text: string): boolean {
  if (!isPhoneSearch(text)) return false;
  return text.replace(/\D/g, "").length >= MIN_CONTACT_SEARCH_DIGITS;
}
