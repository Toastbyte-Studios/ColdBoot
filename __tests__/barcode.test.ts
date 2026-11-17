/**
 * @format
 */

import { hasValidCheckDigit, normalizeBarcode } from '../src/utils/barcode';

describe('hasValidCheckDigit', () => {
  it('accepts valid UPC-A, EAN-13 and EAN-8 codes', () => {
    expect(hasValidCheckDigit('036000291452')).toBe(true);
    expect(hasValidCheckDigit('4006381333931')).toBe(true);
    expect(hasValidCheckDigit('96385074')).toBe(true);
  });

  it('rejects a wrong check digit', () => {
    expect(hasValidCheckDigit('036000291453')).toBe(false);
    expect(hasValidCheckDigit('4006381333932')).toBe(false);
  });

  it('rejects non-digits and out-of-range lengths', () => {
    expect(hasValidCheckDigit('03600029145A')).toBe(false);
    expect(hasValidCheckDigit('1234567')).toBe(false);
    expect(hasValidCheckDigit('123456789012345')).toBe(false);
  });
});

describe('normalizeBarcode', () => {
  it('turns UPC-A into EAN-13 so iOS and Android scans match', () => {
    expect(normalizeBarcode('036000291452')).toBe('0036000291452');
    expect(normalizeBarcode('0036000291452')).toBe('0036000291452');
  });

  it('keeps EAN-13 as it is', () => {
    expect(normalizeBarcode('4006381333931')).toBe('4006381333931');
  });

  it('drops the leading zero of a GTIN-14 that wraps an EAN-13', () => {
    expect(normalizeBarcode('00036000291452')).toBe('0036000291452');
  });

  it('keeps a GTIN-14 for a case pack', () => {
    expect(normalizeBarcode('10036000291459')).toBe('10036000291459');
  });

  it('keeps 8-digit codes (EAN-8 or UPC-E) without a check', () => {
    expect(normalizeBarcode('96385074')).toBe('96385074');
    expect(normalizeBarcode('01234565')).toBe('01234565');
  });

  it('ignores spaces and hyphens from hand entry', () => {
    expect(normalizeBarcode(' 0 36000 29145 2 ')).toBe('0036000291452');
    expect(normalizeBarcode('036000-291452')).toBe('0036000291452');
  });

  it('rejects typos, letters and wrong lengths', () => {
    expect(normalizeBarcode('036000291453')).toBeNull();
    expect(normalizeBarcode('03600029145A')).toBeNull();
    expect(normalizeBarcode('12345')).toBeNull();
    expect(normalizeBarcode('')).toBeNull();
  });
});
