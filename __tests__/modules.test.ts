import { MODULES } from '../constants';

describe('MODULES', () => {
  it('is in alphabetical order by display name', () => {
    const names = MODULES.map((module) => module.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));

    expect(names).toEqual(sorted);
  });
});
