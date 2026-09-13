import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ModuleRow from '../../src/components/ModuleRow';
import { LIGHT_COLORS } from '../../src/theme/colors';

jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: jest.fn(() => require('../../src/theme/colors').LIGHT_COLORS),
}));

jest.mock('../../src/hooks/useIsDarkMode', () => ({
  useIsDarkMode: jest.fn(() => false),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
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

function render(props: Partial<React.ComponentProps<typeof ModuleRow>> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ModuleRow
        title="Core"
        icon="pulse-outline"
        subtitle="Flashlight · notepad · status"
        {...props}
      />,
    );
  });
  return tree;
}

describe('ModuleRow on Android', () => {
  test('carries no chevron — Material list items do not have one', () => {
    const tree = render();
    // The chevron is the component's only SVG path.
    expect(tree.root.findAllByType('Path' as never)).toEqual([]);
  });

  test('the leading icon is a 40dp circle in the secondary container', () => {
    const tree = render();
    const glyph = tree.root.findByProps({ name: 'pulse-outline' });

    expect(glyph.props.size).toBe(22);
    expect(glyph.props.color).toBe(LIGHT_COLORS.ON_SECONDARY_CONTAINER);

    const circle = flatten(glyph.parent?.props.style);
    expect(circle.width).toBe(40);
    expect(circle.height).toBe(40);
    expect(circle.borderRadius).toBe(20);
    expect(circle.backgroundColor).toBe(LIGHT_COLORS.SECONDARY_CONTAINER);
  });

  test('the divider is 1dp and starts under the title', () => {
    const tree = render();
    const divider = tree.root
      .findAllByType('View' as never)
      .map((node) => flatten(node.props.style))
      .find((style) => style.marginLeft === 72);

    expect(divider).toBeDefined();
    expect(divider?.height).toBe(1);
    expect(divider?.backgroundColor).toBe(LIGHT_COLORS.OUTLINE_VARIANT);
  });

  test('the last row in a group draws no divider', () => {
    const tree = render({ showSeparator: false });
    const dividers = tree.root
      .findAllByType('View' as never)
      .map((node) => flatten(node.props.style))
      .filter((style) => style.marginLeft === 72);

    expect(dividers).toEqual([]);
  });

  test('the row is one button labelled with its title and subtitle', () => {
    const onPress = jest.fn();
    const tree = render({ onPress });

    const buttons = tree.root.findAll(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    );

    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.accessibilityLabel).toBe(
      'Core. Flashlight · notepad · status',
    );
    expect(buttons[0].props.android_ripple.color).toBeDefined();

    ReactTestRenderer.act(() => buttons[0].props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
