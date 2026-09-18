import React from 'react';
import { Text as RNText, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import EntryScreen from '../src/screens/Reference/Shared/EntryScreen';
import { DARK_COLORS, LIGHT_COLORS } from '../src/theme/colors';
import { contrastRatio } from '../src/theme/colorUtils';

/**
 * Regression test for the Reference entry cards in dark mode.
 *
 * The cards painted a themed fill behind text that had no colour of its own,
 * so the text stayed platform-default black on a background that went dark.
 * This renders a full entry in each scheme and requires every piece of text
 * to reach 4.5:1 against the surface it sits on.
 */

let mockScheme: 'light' | 'dark' = 'dark';

jest.mock('../src/stores', () => ({
  useSettingsStore: () => ({ fontScale: 1, themeMode: mockScheme }),
}));

jest.mock('../src/hooks/useTheme', () => {
  const colors = require('../src/theme/colors');
  return {
    useTheme: () =>
      mockScheme === 'dark' ? colors.DARK_COLORS : colors.LIGHT_COLORS,
    getColorSchemeForThemeMode: (mode: string) =>
      mode === 'dark' ? colors.DARK_COLORS : colors.LIGHT_COLORS,
  };
});

jest.mock('../src/hooks/useFooterClearance', () => ({
  useFooterClearance: () => 0,
}));

jest.mock('../src/components/ScreenBody', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

jest.mock('../src/assets/referenceImages', () => ({
  __esModule: true,
  default: {},
  getKnotImage: () => null,
}));

jest.mock('../src/stores/BookmarksStore', () => ({
  addBookmark: jest.fn(),
  removeBookmark: jest.fn(),
  isBookmarked: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

const entry = {
  id: 'test_entry',
  title: 'Hypothermia',
  category: 'Emergency',
  summary: 'Core body temperature below 35°C.',
  steps: ['Move to shelter', 'Remove wet clothing', 'Insulate from ground'],
  do_not: ['Rub the limbs', 'Give alcohol'],
  watch_for: ['Confusion', 'Slurred speech'],
  notes: ['Shivering may stop as it worsens.'],
  related_screen: 'SunTime',
  related_screen_label: 'Open Sun Times',
};

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { entry: mockEntry() } }),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: () => true,
  }),
}));

function mockEntry() {
  return entry;
}

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, item) => ({ ...acc, ...flatten(item) }),
      {},
    );
  }
  return style && typeof style === 'object'
    ? (style as Record<string, unknown>)
    : {};
}

/**
 * The nearest ancestor View with an opaque background, or the screen ground.
 *
 * Text with no card behind it sits on the iOS BACKGROUND_GRADIENT, which runs
 * bottom-to-top, so the header is over its last stop. That stop is the least
 * favourable one in both schemes (darkest in light, lightest in dark), so it
 * is the ground the test judges against.
 */
function surfaceBehind(
  node: ReactTestRenderer.ReactTestInstance,
  ground: string,
): string {
  let current: ReactTestRenderer.ReactTestInstance | null = node.parent;
  while (current) {
    if (current.type === View) {
      const background = flatten(current.props.style).backgroundColor;
      if (
        typeof background === 'string' &&
        /^#[0-9a-f]{6}$/i.test(background)
      ) {
        return background;
      }
    }
    current = current.parent;
  }
  return ground;
}

async function renderScheme(scheme: 'light' | 'dark') {
  mockScheme = scheme;
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<EntryScreen />);
  });
  return tree;
}

describe.each([
  ['dark', DARK_COLORS],
  ['light', LIGHT_COLORS],
] as const)('EntryScreen text in the %s scheme', (scheme, colors) => {
  test('every text node has a colour that reaches 4.5:1 on its surface', async () => {
    const tree = await renderScheme(scheme);
    const texts = tree.root
      .findAllByType(RNText)
      // Nested spans inherit their parent's colour; check the outermost.
      .filter((node) => {
        let parent = node.parent;
        while (parent) {
          if (parent.type === RNText) return false;
          parent = parent.parent;
        }
        return true;
      });

    expect(texts.length).toBeGreaterThan(10);

    for (const node of texts) {
      const color = flatten(node.props.style).color;
      expect(typeof color).toBe('string');
      const surface = surfaceBehind(
        node,
        colors.BACKGROUND_GRADIENT[colors.BACKGROUND_GRADIENT.length - 1],
      );
      const label = React.Children.toArray(node.props.children).join('');
      const ratio = contrastRatio(color as string, surface);
      if (ratio < 4.5) {
        throw new Error(
          `"${label}" is ${ratio.toFixed(2)}:1 (${color} on ${surface})`,
        );
      }
    }
  });

  test('entry content is all rendered', async () => {
    const tree = await renderScheme(scheme);
    const all = tree.root
      .findAllByType(RNText)
      .map((node) => React.Children.toArray(node.props.children).join(''));
    for (const expected of [
      'Hypothermia',
      'SUMMARY',
      'STEPS',
      'DO NOT',
      'WATCH FOR',
      'NOTES',
      'Give alcohol',
      'Open Sun Times',
    ]) {
      expect(all).toContain(expected);
    }
  });
});

describe('MUTED_ON_GROUND', () => {
  test.each([
    ['light', LIGHT_COLORS],
    ['dark', DARK_COLORS],
  ] as const)(
    'clears 4.5:1 on every stop of the %s gradient',
    (_scheme, colors) => {
      for (const stop of colors.BACKGROUND_GRADIENT) {
        expect(
          contrastRatio(colors.MUTED_ON_GROUND, stop),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
});
