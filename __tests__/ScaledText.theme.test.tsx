import React from 'react';
import { Text as RNText } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from '../src/components/ScaledText';
import { DARK_COLORS, LIGHT_COLORS } from '../src/theme/colors';

const settings = { fontScale: 1, themeMode: 'dark' as 'light' | 'dark' };

jest.mock('../src/stores', () => ({
  useSettingsStore: () => settings,
}));

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, entry) => ({ ...acc, ...flatten(entry) }),
      {},
    );
  }
  return (style as Record<string, unknown>) ?? {};
}

function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree.root
    .findAllByType(RNText)
    .map((node) => flatten(node.props.style));
}

describe('ScaledText Text colour', () => {
  beforeEach(() => {
    settings.fontScale = 1;
    settings.themeMode = 'dark';
  });

  test('defaults to the dark scheme ink when no colour is given', () => {
    const [style] = render(<Text>Summary</Text>);
    expect(style.color).toBe(DARK_COLORS.PRIMARY_DARK);
  });

  test('defaults to the light scheme ink on the light scheme', () => {
    settings.themeMode = 'light';
    const [style] = render(<Text>Summary</Text>);
    expect(style.color).toBe(LIGHT_COLORS.PRIMARY_DARK);
  });

  test('an explicit colour still wins over the default', () => {
    const [style] = render(<Text style={{ color: '#123456' }}>Label</Text>);
    expect(style.color).toBe('#123456');
  });

  test('a nested Text gets no default, so it inherits its parent colour', () => {
    const [outer, inner] = render(
      <Text style={{ color: '#B45309' }}>
        Sunset <Text style={{ fontSize: 12 }}>PM</Text>
      </Text>,
    );
    expect(outer.color).toBe('#B45309');
    expect(inner.color).toBeUndefined();
  });

  test('font scaling still applies alongside the default colour', () => {
    settings.fontScale = 2;
    const [style] = render(<Text style={{ fontSize: 10 }}>Big</Text>);
    expect(style.fontSize).toBe(20);
    expect(style.color).toBe(DARK_COLORS.PRIMARY_DARK);
  });
});
