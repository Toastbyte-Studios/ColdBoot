/**
 * Retail barcode helpers for the pantry.
 *
 * The same can reaches the app in different spellings: iOS reports a 12-digit
 * UPC-A as a 13-digit EAN-13 with a leading zero, Android reports the 12
 * digits, and a hand-typed code may carry spaces or a 14-digit GTIN prefix.
 * Everything is stored in one canonical form so a rescan finds the item it
 * was saved as, whichever way it was entered.
 */

/** True when the last digit is the GS1 check digit for the ones before it. */
export function hasValidCheckDigit(digits: string): boolean {
  if (!/^\d{8,14}$/.test(digits)) return false;
  let sum = 0;
  // Weights alternate 3, 1, 3… starting from the digit next to the check digit.
  for (let i = digits.length - 2, weight = 3; i >= 0; i--) {
    sum += Number(digits[i]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === Number(digits[digits.length - 1]);
}

/**
 * Canonical form of a retail barcode, or `null` if it isn't one.
 *
 * - Spaces and hyphens are ignored; any other non-digit rejects the code.
 * - 8 digits (EAN-8 or UPC-E) are kept as they are. A UPC-E check digit
 *   belongs to its expanded UPC-A form, so it isn't checked here.
 * - 12 (UPC-A), 13 (EAN-13) and 14 (GTIN-14) digits must carry a valid check
 *   digit, which catches most typing slips.
 * - UPC-A, and GTIN-14 with a leading zero, become EAN-13.
 */
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) return null;

  switch (digits.length) {
    case 8:
      return digits;
    case 12:
      return hasValidCheckDigit(digits) ? `0${digits}` : null;
    case 13:
      return hasValidCheckDigit(digits) ? digits : null;
    case 14:
      if (!hasValidCheckDigit(digits)) return null;
      return digits.startsWith('0') ? digits.slice(1) : digits;
    default:
      return null;
  }
}
