/**
 * @format
 */

import {
  LOOKUP_SPACING_MS,
  LookupQueue,
  LookupUnavailableError,
  PRODUCT_URL,
  lookupProduct,
  lookupUserAgent,
  productFromResponse,
} from '../src/services/productLookup';

/** A product read reply in the flat `nutriments` shape. */
const beans = {
  code: '0036000291452',
  status: 1,
  status_verbose: 'product found',
  product: {
    product_name: 'Black Beans',
    brands: 'Store Brand, Parent Co',
    serving_size: '1/2 cup (130 g)',
    serving_quantity: 130,
    product_quantity: '439',
    product_quantity_unit: 'g',
    nutriments: {
      'energy-kcal_100g': 85,
      'energy-kcal_serving': 110,
    },
  },
};

describe('productFromResponse', () => {
  it('reads name, first brand, serving, calories and servings per can', () => {
    expect(productFromResponse(beans)).toEqual({
      name: 'Black Beans',
      brand: 'Store Brand',
      servingSize: '1/2 cup (130 g)',
      caloriesPerServing: 110,
      servingsPerUnit: 3.4,
    });
  });

  it('prefers the English name', () => {
    const reply = {
      ...beans,
      product: { ...beans.product, product_name_en: 'Black Beans (EN)' },
    };
    expect(productFromResponse(reply)?.name).toBe('Black Beans (EN)');
  });

  it('works calories out from per-100 g when per-serving is missing', () => {
    const reply = {
      ...beans,
      product: {
        ...beans.product,
        nutriments: { 'energy-kcal_100g': 85 },
      },
    };
    // 85 kcal/100 g × 130 g = 110.5
    expect(productFromResponse(reply)?.caloriesPerServing).toBe(111);
  });

  it('reads the v3.5 nutrition structure when nutriments is absent', () => {
    const rest: Record<string, unknown> = { ...beans.product };
    delete rest.nutriments;
    const reply = {
      status: 'success',
      product: {
        ...rest,
        nutrition: {
          aggregated_set: {
            per: '100g',
            nutrients: { 'energy-kcal': { value: 85, unit: 'kcal' } },
          },
        },
      },
    };
    expect(productFromResponse(reply)?.caloriesPerServing).toBe(111);
  });

  it('accepts numbers sent as strings', () => {
    const reply = {
      ...beans,
      product: {
        ...beans.product,
        serving_quantity: '130',
        nutriments: { 'energy-kcal_serving': '110' },
      },
    };
    expect(productFromResponse(reply)).toMatchObject({
      caloriesPerServing: 110,
      servingsPerUnit: 3.4,
    });
  });

  it('skips servings per unit when the units differ', () => {
    const reply = {
      ...beans,
      product: { ...beans.product, product_quantity_unit: 'ml' },
    };
    expect(productFromResponse(reply)?.servingsPerUnit).toBeUndefined();
  });

  it('drops implausible numbers instead of trusting them', () => {
    const reply = {
      ...beans,
      product: {
        ...beans.product,
        serving_quantity: 0.01,
        nutriments: { 'energy-kcal_serving': -5 },
      },
    };
    const product = productFromResponse(reply);
    expect(product?.caloriesPerServing).toBeUndefined();
    expect(product?.servingsPerUnit).toBeUndefined();
  });

  it('reads a malformed field as missing and keeps the rest', () => {
    const reply = {
      ...beans,
      product: { ...beans.product, brands: 42, serving_quantity: 'lots' },
    };
    const product = productFromResponse(reply);
    expect(product?.name).toBe('Black Beans');
    expect(product?.brand).toBeUndefined();
    expect(product?.servingsPerUnit).toBeUndefined();
  });

  it('tidies whitespace and shortens a very long name', () => {
    const reply = {
      ...beans,
      product: {
        ...beans.product,
        product_name: `  Beans \n ${'x'.repeat(200)}`,
      },
    };
    const name = productFromResponse(reply)!.name!;
    expect(name.startsWith('Beans x')).toBe(true);
    expect(name.length).toBe(100);
    expect(name.endsWith('…')).toBe(true);
  });

  it('is null for a product that is not listed', () => {
    expect(
      productFromResponse({ status: 0, status_verbose: 'product not found' }),
    ).toBeNull();
    expect(productFromResponse({ status: 'failure' })).toBeNull();
  });

  it('is null for a listed product with nothing usable', () => {
    expect(productFromResponse({ status: 1, product: {} })).toBeNull();
  });

  it('is null for a reply that is not an object', () => {
    expect(productFromResponse('nope')).toBeNull();
    expect(productFromResponse(null)).toBeNull();
  });
});

describe('lookupProduct', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  function reply(status: number, body: unknown) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: () =>
        body instanceof Error ? Promise.reject(body) : Promise.resolve(body),
    };
  }

  it('asks for only the needed fields and identifies the app', async () => {
    fetchMock.mockResolvedValue(reply(200, beans));
    await lookupProduct('0036000291452');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url.startsWith(`${PRODUCT_URL}0036000291452?fields=`)).toBe(true);
    expect(url).toContain('nutriments');
    expect(options.headers['User-Agent']).toBe(lookupUserAgent());
    expect(lookupUserAgent()).toMatch(
      /^ColdBoot\/\S+ \(\w+; \+https:\/\/toastbyte\.studio; support@toastbyte\.studio\)$/,
    );
  });

  it('returns the product when found', async () => {
    fetchMock.mockResolvedValue(reply(200, beans));
    await expect(lookupProduct('0036000291452')).resolves.toEqual({
      status: 'found',
      product: expect.objectContaining({ name: 'Black Beans' }),
    });
  });

  it('treats 404 and an empty reply as not listed', async () => {
    fetchMock.mockResolvedValueOnce(reply(404, { status: 0 }));
    await expect(lookupProduct('1')).resolves.toEqual({ status: 'not-found' });
    fetchMock.mockResolvedValueOnce(reply(200, { status: 0 }));
    await expect(lookupProduct('1')).resolves.toEqual({ status: 'not-found' });
  });

  it('fails retryably when offline, busy, down or unreadable', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(lookupProduct('1')).rejects.toThrow(LookupUnavailableError);

    fetchMock.mockResolvedValueOnce(reply(429, {}));
    await expect(lookupProduct('1')).rejects.toThrow('Open Food Facts is busy');

    fetchMock.mockResolvedValueOnce(reply(500, {}));
    await expect(lookupProduct('1')).rejects.toThrow(LookupUnavailableError);

    fetchMock.mockResolvedValueOnce(reply(200, new SyntaxError('bad json')));
    await expect(lookupProduct('1')).rejects.toThrow(LookupUnavailableError);
  });
});

describe('LookupQueue', () => {
  it('starts the first task at once and spaces the rest', async () => {
    let clock = 0;
    const waits: number[] = [];
    const queue = new LookupQueue(
      LOOKUP_SPACING_MS,
      () => clock,
      async (ms) => {
        waits.push(ms);
        clock += ms;
      },
    );
    const starts: number[] = [];
    const task = async () => {
      starts.push(clock);
    };

    await Promise.all([queue.run(task), queue.run(task), queue.run(task)]);

    expect(starts).toEqual([0, LOOKUP_SPACING_MS, LOOKUP_SPACING_MS * 2]);
    expect(waits).toEqual([LOOKUP_SPACING_MS, LOOKUP_SPACING_MS]);
  });

  it('does not wait when the last start was long enough ago', async () => {
    let clock = 0;
    const wait = jest.fn(async () => {});
    const queue = new LookupQueue(1000, () => clock, wait);

    await queue.run(async () => undefined);
    clock = 5000;
    await queue.run(async () => undefined);

    expect(wait).not.toHaveBeenCalled();
  });

  it('keeps going after a task fails', async () => {
    const queue = new LookupQueue(0);
    await expect(
      queue.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(queue.run(async () => 'next')).resolves.toBe('next');
  });
});
