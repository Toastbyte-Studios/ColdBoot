import { conversionCategories } from '../src/utils/unitConversions';

describe('conversionCategories', () => {
  it('is in alphabetical order by name', () => {
    const names = conversionCategories.map((category) => category.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));

    expect(names).toEqual(sorted);
  });
});
