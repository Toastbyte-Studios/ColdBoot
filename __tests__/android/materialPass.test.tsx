import React from 'react';
import { Platform } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import AppSwitch from '../../src/components/AppSwitch';
import Chip from '../../src/components/Chip';
import SegmentedControl from '../../src/components/SegmentedControl';
import { LIGHT_COLORS } from '../../src/theme/colors';

// Resolve the real light-mode tokens rather than restating them here, so the
// mock cannot drift out of the palette.
jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: jest.fn(() => require('../../src/theme/colors').LIGHT_COLORS),
}));

jest.mock('../../src/hooks/useIsDarkMode', () => ({
  useIsDarkMode: jest.fn(() => false),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// These components render their labels through ScaledText, which is a
// mobx-react-lite observer reading the settings store. This suite provides no
// store, and the plain Text is enough for what is asserted here.
jest.mock('../../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

/**
 * Every pressable with the given accessibility role.
 *
 * Matched on the `onPress` prop rather than by component type: `Pressable` is
 * a memo/forwardRef wrapper, so its rendered node type is not the imported
 * component, and a plain role query would also return the host view it
 * renders — the same control twice.
 */
function pressablesWithRole(
  tree: ReactTestRenderer.ReactTestRenderer,
  role: string,
) {
  return tree.root.findAll(
    (node) =>
      node.props.accessibilityRole === role &&
      typeof node.props.onPress === 'function',
  );
}

/** Flattens a style prop — array, nested array, or object — into one object. */
function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, entry) => ({ ...acc, ...flatten(entry) }),
      {},
    );
  }
  return (style as Record<string, unknown>) ?? {};
}

describe('the Android build resolves platform files', () => {
  test('Platform.OS is android, so `.android` overrides win', () => {
    expect(Platform.OS).toBe('android');
  });
});

describe('AppSwitch (Material 3)', () => {
  test('off is an outlined track with no fill', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <AppSwitch
          value={false}
          onValueChange={jest.fn()}
          accessibilityLabel="Night vision tint"
          testID="night-vision"
        />,
      );
    });

    const [control] = pressablesWithRole(tree, 'switch');
    expect(control.props.accessibilityState).toMatchObject({ checked: false });

    const track = tree.root.findByProps({ testID: 'night-vision-track' });
    const style = flatten(track.props.style);
    expect(style.backgroundColor).toBe('transparent');
    expect(style.borderColor).toBe(LIGHT_COLORS.BORDER);
  });

  test('on fills the track with the tint it was given', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <AppSwitch
          value
          tint={LIGHT_COLORS.ACCENT}
          onValueChange={jest.fn()}
          accessibilityLabel="Larger text"
          testID="larger-text"
        />,
      );
    });

    const [control] = pressablesWithRole(tree, 'switch');
    expect(control.props.accessibilityState).toMatchObject({ checked: true });

    const track = tree.root.findByProps({ testID: 'larger-text-track' });
    expect(flatten(track.props.style).backgroundColor).toBe(
      LIGHT_COLORS.ACCENT,
    );
  });

  test('a press reports the opposite of the current value', () => {
    const onValueChange = jest.fn();
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <AppSwitch
          value={false}
          onValueChange={onValueChange}
          accessibilityLabel="Simulate offline"
        />,
      );
    });

    ReactTestRenderer.act(() => {
      pressablesWithRole(tree, 'switch')[0].props.onPress();
    });

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

describe('SegmentedControl (Material 3 outlined segmented button)', () => {
  const OPTIONS = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ] as const;

  function render(value: 'system' | 'light' | 'dark', onChange = jest.fn()) {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <SegmentedControl
          options={OPTIONS}
          value={value}
          onChange={onChange}
          accessibilityLabel="Appearance"
        />,
      );
    });
    return tree;
  }

  test('only the selected segment is filled and carries the check', () => {
    const tree = render('light');
    const segments = pressablesWithRole(tree, 'tab');

    expect(segments).toHaveLength(3);
    expect(
      segments.map((segment) => segment.props.accessibilityState.selected),
    ).toEqual([false, true, false]);

    const selected = segments[1];
    expect(flatten(selected.props.style).backgroundColor).toBe(
      LIGHT_COLORS.SECONDARY_CONTAINER,
    );
    expect(selected.findAllByProps({ name: 'checkmark' }).length).toBe(1);
    expect(tree.root.findAllByProps({ name: 'checkmark' }).length).toBe(1);
  });

  test('pressing a segment reports that segment’s value', () => {
    const onChange = jest.fn();
    const tree = render('system', onChange);

    ReactTestRenderer.act(() => {
      pressablesWithRole(tree, 'tab')[2].props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith('dark');
  });
});

describe('Chip', () => {
  test('a read-only chip is outlined and is not a button', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <Chip dotColor={LIGHT_COLORS.BRAND} label="30.08 in" />,
      );
    });

    expect(pressablesWithRole(tree, 'button')).toEqual([]);
    const chip = tree.root.findByProps({ accessibilityLabel: '30.08 in' });
    const style = flatten(chip.props.style);
    expect(style.borderWidth).toBe(1);
    expect(style.backgroundColor).toBeUndefined();
  });

  test('a selected tertiary chip takes the confirmed container', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <Chip selected tone="tertiary" icon="checkmark" label="GPS locked" />,
      );
    });

    const chip = tree.root.findByProps({ accessibilityLabel: 'GPS locked' });
    const style = flatten(chip.props.style);
    expect(style.backgroundColor).toBe(LIGHT_COLORS.TERTIARY_CONTAINER);
    expect(style.borderWidth).toBeUndefined();
  });
});
