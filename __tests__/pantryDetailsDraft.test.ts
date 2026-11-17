/**
 * @format
 */

import {
  EMPTY_DETAILS_DRAFT,
  detailsDraftFromItem,
  parseDetailsDraft,
} from '../src/screens/Pantry/pantryDetailsDraft';

describe('detailsDraftFromItem', () => {
  it('is empty for a missing item', () => {
    expect(detailsDraftFromItem(undefined)).toEqual(EMPTY_DETAILS_DRAFT);
  });

  it('shows stored numbers as text, including zero', () => {
    expect(
      detailsDraftFromItem({
        id: 'x',
        name: 'Water',
        category: 'Dry Goods',
        quantity: 1,
        barcode: '0036000291452',
        caloriesPerServing: 0,
        servingsPerUnit: 1.5,
        createdAt: 0,
        updatedAt: 0,
      }),
    ).toEqual({
      brand: '',
      barcode: '0036000291452',
      servingSize: '',
      caloriesPerServing: '0',
      servingsPerUnit: '1.5',
    });
  });
});

describe('parseDetailsDraft', () => {
  it('reads blank numbers as absent and keeps every key', () => {
    expect(parseDetailsDraft(EMPTY_DETAILS_DRAFT)).toEqual({
      ok: true,
      details: {
        brand: '',
        barcode: '',
        servingSize: '',
        caloriesPerServing: undefined,
        servingsPerUnit: undefined,
      },
    });
  });

  it('accepts a decimal comma', () => {
    const parsed = parseDetailsDraft({
      ...EMPTY_DETAILS_DRAFT,
      caloriesPerServing: ' 110 ',
      servingsPerUnit: '3,5',
    });
    expect(parsed).toMatchObject({
      ok: true,
      details: { caloriesPerServing: 110, servingsPerUnit: 3.5 },
    });
  });

  it('names the field that is not a number', () => {
    expect(
      parseDetailsDraft({ ...EMPTY_DETAILS_DRAFT, caloriesPerServing: 'abc' }),
    ).toEqual({ ok: false, error: 'Calories per serving must be a number' });
    expect(
      parseDetailsDraft({ ...EMPTY_DETAILS_DRAFT, servingsPerUnit: '1/2' }),
    ).toEqual({ ok: false, error: 'Servings per unit must be a number' });
  });
});
