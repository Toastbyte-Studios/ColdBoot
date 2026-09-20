const US_STATE_ABBR: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'District of Columbia': 'DC',
};

const NOMINATIM_USER_AGENT =
  'ColdBoot Survival App (toastbyte.studio, support@toastbyte.studio)';

const DEFAULT_TIMEOUT_MS = 3_000;

export type ReverseGeocodeResult = {
  compassName: string;
  areaName: string | null;
};

export function buildOfflineAreaFallbackName(date = new Date()): string {
  return `Area Download ${date.toLocaleDateString()}`;
}

function getCompassName(address: Record<string, string | undefined>): string {
  const city =
    address.city ?? address.town ?? address.village ?? address.hamlet ?? null;
  const state = address.state;
  const county = address.county;
  const country = address.country;

  if (city && state) {
    const abbr = US_STATE_ABBR[state] ?? state;
    return `${city}, ${abbr}`;
  }
  if (county && country) {
    return `${county}, ${country}`;
  }
  if (country) {
    return country;
  }
  return '--';
}

function getAreaName(
  address: Record<string, string | undefined>,
  data: Record<string, unknown>,
): string | null {
  const dataName = typeof data.name === 'string' ? data.name : null;
  return (
    dataName ??
    address.attraction ??
    address.neighbourhood ??
    address.suburb ??
    address.city_district ??
    address.city ??
    address.town ??
    address.village ??
    address.hamlet ??
    address.county ??
    address.state ??
    address.country ??
    null
  );
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  options?: {
    timeoutMs?: number;
    signal?: AbortSignal;
  },
): Promise<ReverseGeocodeResult | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();

  if (options?.signal?.aborted) {
    clearTimeout(timeout);
    return null;
  }

  options?.signal?.addEventListener('abort', onAbort);

  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'en',
          'User-Agent': NOMINATIM_USER_AGENT,
        },
      },
    );

    if (!resp.ok) {
      return null;
    }

    const data = (await resp.json()) as Record<string, unknown>;
    const addressRaw = data.address;
    if (!addressRaw || typeof addressRaw !== 'object') {
      return null;
    }

    const address = addressRaw as Record<string, string | undefined>;
    return {
      compassName: getCompassName(address),
      areaName: getAreaName(address, data),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener('abort', onAbort);
  }
}
