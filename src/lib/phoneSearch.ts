// Customers are searched by phone number only (a name can match the wrong person).
// Mirrors phoneSearchCore in revampedBackend_Geargrid/src/utils/customerPhoneSearch.js.

/** Fewest phone digits, after a leading 0 / 94 / 0094, a search needs. */
export const MIN_PHONE_SEARCH_DIGITS = 3;

/** True when the text is a phone number search: digits and phone formatting only, enough digits. */
export function isPhoneSearch(text: string): boolean {
  const trimmed = text.trim();
  if (!/^[\d\s+()\-./]+$/.test(trimmed)) return false;
  const core = trimmed.replace(/\D/g, "").replace(/^(?:0094|94|0)/, "");
  return core.length >= MIN_PHONE_SEARCH_DIGITS;
}
