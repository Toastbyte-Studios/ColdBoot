import { DARK_COLORS, LIGHT_COLORS } from '../src/theme/colors';
import {
  contrastRatio,
  onColor,
  relativeLuminance,
  withAlpha,
} from '../src/theme/colorUtils';

describe('relativeLuminance', () => {
  test('anchors at both ends of the range', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  test('tolerates a missing leading hash and mixed case', () => {
    expect(relativeLuminance('b45309')).toBeCloseTo(
      relativeLuminance('#B45309'),
      10,
    );
  });

  test('treats unparseable values as fully dark', () => {
    expect(relativeLuminance('transparent')).toBe(0);
    expect(relativeLuminance('rgba(0, 0, 0, 0.5)')).toBe(0);
  });
});

describe('contrastRatio', () => {
  test('is 21:1 for black on white and 1:1 for a color on itself', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#B45309', '#B45309')).toBeCloseTo(1, 5);
  });

  test('is symmetric', () => {
    expect(contrastRatio('#2F5875', '#F7FAFC')).toBeCloseTo(
      contrastRatio('#F7FAFC', '#2F5875'),
      10,
    );
  });
});

describe('onColor', () => {
  // Every tint AppButton can render as a filled background.
  const filledTints = (scheme: typeof LIGHT_COLORS) => [
    scheme.ACCENT,
    scheme.SUCCESS,
    scheme.ERROR,
  ];

  test('clears the 4.5:1 body-text floor on every filled tint, both schemes', () => {
    for (const scheme of [LIGHT_COLORS, DARK_COLORS]) {
      for (const tint of filledTints(scheme)) {
        expect(contrastRatio(tint, onColor(tint))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test('inverts between schemes for the accent', () => {
    // Light mode's accent is a deep amber, dark mode's is a bright one.
    expect(onColor(LIGHT_COLORS.ACCENT)).toBe('#FFFFFF');
    expect(onColor(DARK_COLORS.ACCENT)).toBe('#101B24');
  });

  test('picks ink for mid-luminance tints a naive cutoff would get wrong', () => {
    // #4CA891 sits just under a 0.45 luminance threshold, which would have
    // handed it white at 2.9:1. Comparing ratios gives it ink at 6.1:1.
    expect(onColor(DARK_COLORS.SUCCESS)).toBe('#101B24');
    expect(contrastRatio(DARK_COLORS.SUCCESS, '#FFFFFF')).toBeLessThan(4.5);
  });
});

describe('withAlpha', () => {
  test('converts hex to rgba', () => {
    expect(withAlpha('#2F5875', 0.12)).toBe('rgba(47, 88, 117, 0.12)');
  });

  test('passes through values it cannot parse', () => {
    expect(withAlpha('transparent', 0.16)).toBe('transparent');
  });
});
