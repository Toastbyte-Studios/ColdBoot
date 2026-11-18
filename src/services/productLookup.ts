/**
 * Product lookup by barcode, from Open Food Facts.
 *
 * Used by the Pantry scan screen to fill in a product the pantry hasn't
 * seen: name, brand, label serving and calories. Only the barcode is sent.
 * On by default; the user can turn it off in Settings, and the scan screen
 * works fully without it.
 *
 * Terms (https://openfoodfacts.github.io/openfoodfacts-server/api):
 * - Identify the app with a custom User-Agent, `AppName/Version (contact)`.
 * - Product reads are limited to 15 a minute per IP, which for a mobile app
 *   means per user. {@link LookupQueue} spaces requests to stay under it.
 * - The data is under the Open Database License: credit Open Food Facts
 *   (Settings > Attributions), and don't ship a database built from it.
 *   Looking up one product at a time and saving it on the user's item is
 *   fine.
 */

import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { z } from 'zod';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

/** Product read endpoint. v2 is what the current API tutorial uses. */
export const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product/';

/**
 * Only the fields ColdBoot uses. Both nutrition shapes are requested:
 * `nutriments` (flat, per 100 g and per serving) and `nutrition` (the v3.5
 * structure), so a change in which one the API fills doesn't break lookups.
 */
const FIELDS = [
  'product_name',
  'product_name_en',
  'brands',
  'serving_size',
  'serving_quantity',
  'serving_quantity_unit',
  'product_quantity',
  'product_quantity_unit',
  'nutriments',
  'nutrition',
].join(',');

const LOOKUP_TIMEOUT_MS = 8000;

/** Open Food Facts allows 15 product reads a minute; one every 4.2 s. */
export const LOOKUP_SPACING_MS = 4200;

const MAX_NAME_LENGTH = 100;
const MAX_BRAND_LENGTH = 60;
const MAX_SERVING_SIZE_LENGTH = 60;

/** What a lookup can fill in. Every field may be missing. */
export interface ProductInfo {
  name?: string;
  brand?: string;
  servingSize?: string;
  caloriesPerServing?: number;
  servingsPerUnit?: number;
}

export type LookupResult =
  | { status: 'found'; product: ProductInfo }
  | { status: 'not-found' };

/**
 * The lookup couldn't be done (no connection, timeout, the service is busy
 * or down). Worth trying again later, unlike a product that isn't listed.
 */
export class LookupUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LookupUnavailableError';
  }
}

/** Identifies ColdBoot, with the same contact as the map and repeater clients. */
export function lookupUserAgent(): string {
  return `ColdBoot/${DeviceInfo.getVersion()} (${Platform.OS}; +https://toastbyte.studio; support@toastbyte.studio)`;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** A number, or a string that is one (the API sends both). */
const looseNumber = z
  .union([z.number(), z.string()])
  .transform((value) => (typeof value === 'number' ? value : Number(value)))
  .pipe(z.number().finite());

/** An optional field: anything malformed reads as missing. */
function optional<T extends z.ZodTypeAny>(schema: T) {
  return schema.optional().catch(undefined);
}

const productSchema = z.object({
  product_name: optional(z.string()),
  product_name_en: optional(z.string()),
  brands: optional(z.string()),
  serving_size: optional(z.string()),
  serving_quantity: optional(looseNumber),
  serving_quantity_unit: optional(z.string()),
  product_quantity: optional(looseNumber),
  product_quantity_unit: optional(z.string()),
  nutriments: optional(z.record(z.string(), z.unknown())),
  nutrition: optional(
    z.object({
      aggregated_set: optional(
        z.object({
          per: optional(z.string()),
          nutrients: optional(
            z.record(
              z.string(),
              z.object({ value: optional(looseNumber) }).catch({}),
            ),
          ),
        }),
      ),
    }),
  ),
});

const responseSchema = z.object({
  status: optional(z.union([z.number(), z.string()])),
  product: optional(z.unknown()),
});

function cleanText(value: string | undefined, max: number): string | undefined {
  const text = value?.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function readNumber(value: unknown): number | undefined {
  const parsed = looseNumber.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** Same unit, treating a missing unit as grams (the API's default). */
function sameUnit(a: string | undefined, b: string | undefined): boolean {
  return (a ?? 'g').toLowerCase() === (b ?? 'g').toLowerCase();
}

/**
 * The fields ColdBoot uses, from a product read response, or `null` when the
 * response holds no product. Implausible numbers are dropped rather than
 * trusted: the data is crowd-sourced.
 */
export function productFromResponse(json: unknown): ProductInfo | null {
  const response = responseSchema.safeParse(json);
  if (!response.success) return null;
  const { status } = response.data;
  if (status === 0 || status === 'failure') return null;

  const parsed = productSchema.safeParse(response.data.product);
  if (!parsed.success) return null;
  const p = parsed.data;

  const servingQuantity =
    p.serving_quantity !== undefined && p.serving_quantity > 0
      ? p.serving_quantity
      : undefined;

  // Calories per serving: as printed if listed, else worked out from the
  // per-100 g figure and the serving weight.
  let calories = readNumber(p.nutriments?.['energy-kcal_serving']);
  if (calories === undefined && servingQuantity !== undefined) {
    const per100 =
      readNumber(p.nutriments?.['energy-kcal_100g']) ??
      (p.nutrition?.aggregated_set?.per === 'serving'
        ? undefined
        : p.nutrition?.aggregated_set?.nutrients?.['energy-kcal']?.value);
    if (per100 !== undefined) {
      calories = (per100 * servingQuantity) / 100;
    }
  }
  if (calories !== undefined && !(calories >= 0 && calories <= 5000)) {
    calories = undefined;
  }

  let servingsPerUnit: number | undefined;
  if (
    servingQuantity !== undefined &&
    p.product_quantity !== undefined &&
    p.product_quantity > 0 &&
    sameUnit(p.serving_quantity_unit, p.product_quantity_unit)
  ) {
    const servings =
      Math.round((p.product_quantity / servingQuantity) * 10) / 10;
    if (servings >= 0.5 && servings <= 1000) servingsPerUnit = servings;
  }

  const product: ProductInfo = {
    name: cleanText(p.product_name_en || p.product_name, MAX_NAME_LENGTH),
    brand: cleanText(p.brands?.split(',')[0], MAX_BRAND_LENGTH),
    servingSize: cleanText(p.serving_size, MAX_SERVING_SIZE_LENGTH),
    caloriesPerServing:
      calories === undefined ? undefined : Math.round(calories),
    servingsPerUnit,
  };

  const hasAnything = Object.values(product).some((v) => v !== undefined);
  return hasAnything ? product : null;
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/**
 * Looks up one barcode. Resolves `not-found` when Open Food Facts doesn't
 * list it; rejects with {@link LookupUnavailableError} when it couldn't ask.
 *
 * @param barcode - Canonical barcode (see `utils/barcode`).
 */
export async function lookupProduct(barcode: string): Promise<LookupResult> {
  const url = `${PRODUCT_URL}${encodeURIComponent(barcode)}?fields=${FIELDS}`;

  let response: Response;
  try {
    response = await fetchWithTimeout(
      url,
      {
        headers: {
          'User-Agent': lookupUserAgent(),
          Accept: 'application/json',
        },
      },
      LOOKUP_TIMEOUT_MS,
    );
  } catch {
    throw new LookupUnavailableError('No connection to Open Food Facts');
  }

  if (response.status === 404) return { status: 'not-found' };
  if (!response.ok) {
    throw new LookupUnavailableError(
      response.status === 429 || response.status === 503
        ? 'Open Food Facts is busy'
        : `Open Food Facts answered ${response.status}`,
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new LookupUnavailableError(
      'Open Food Facts sent an unreadable reply',
    );
  }

  const product = productFromResponse(json);
  return product ? { status: 'found', product } : { status: 'not-found' };
}

// ---------------------------------------------------------------------------
// Rate limit
// ---------------------------------------------------------------------------

/**
 * Runs lookups one at a time, starting each at least `spacingMs` after the
 * previous one started, so a quick run of new barcodes stays inside the
 * service's rate limit. The first one starts at once.
 */
export class LookupQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private lastStart = -Infinity;

  constructor(
    private readonly spacingMs: number = LOOKUP_SPACING_MS,
    private readonly now: () => number = Date.now,
    private readonly wait: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      const delay = this.lastStart + this.spacingMs - this.now();
      if (delay > 0) await this.wait(delay);
      this.lastStart = this.now();
      return task();
    });
    this.tail = result.catch(() => undefined);
    return result;
  }
}
