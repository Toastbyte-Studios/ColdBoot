import React from 'react';
import { Platform, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
const originalPlatform = Platform.OS;

jest.mock('@react-navigation/native', () => {
  const navigation = {
    dispatch: jest.fn(),
  };
  const StackActions = {
    popToTop: jest.fn(() => ({ type: 'POP_TO_TOP' })),
  };

  return {
    StackActions,
    navigation,
    useNavigation: () => navigation,
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue('true'),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/hooks/useActiveRouteName', () => ({
  useActiveRouteName: jest.fn(() => undefined),
}));

// AppShell reads the theme for the spotlight ring. The real hook pulls in the
// root store, so resolve the light palette directly.
jest.mock('../src/hooks/useTheme', () => ({
  useTheme: jest.fn(() => require('../src/theme/colors').LIGHT_COLORS),
}));
jest.mock('../src/hooks/useIsDarkMode', () => ({
  useIsDarkMode: () => false,
}));

jest.mock('../src/navigation/NavigationHistoryContext', () => ({
  useNavigationHistory: () => ({
    canGoForward: () => false,
    goForward: jest.fn(),
  }),
  useGestureNavigation: () => ({
    disableGestureNavigation: false,
  }),
}));

jest.mock('../src/navigation/navigationRef', () => ({
  __esModule: true,
  default: () => false,
  goBack: jest.fn(),
}));

jest.mock('../src/components/AlertsSheet', () => () => null);
jest.mock(
  '../src/components/AppBar',
  () =>
    ({ onHomePress }: { onHomePress: () => void }) => {
      const {
        Pressable: MockPressable,
        View: MockView,
      } = require('react-native');
      return (
        <MockView accessibilityLabel="App bar">
          <MockPressable
            accessibilityLabel="Home action"
            onPress={onHomePress}
          />
        </MockView>
      );
    },
);
jest.mock('../src/components/HelpModal', () => ({
  HelpModal: () => null,
}));
jest.mock('../src/components/ScreenContainer', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => {
    const ReactModule = require('react');
    return ReactModule.createElement(ReactModule.Fragment, null, children);
  },
}));
jest.mock('../src/components/SettingsModal', () => ({
  SettingsModal: () => null,
}));
jest.mock('../src/components/ShortcutBar', () => () => null);
jest.mock('../src/components/TutorialModal', () => () => null);

const AppShell = require('../src/components/AppShell')
  .default as typeof import('../src/components/AppShell').default;
const mockUseActiveRouteName = require('../src/hooks/useActiveRouteName')
  .useActiveRouteName as jest.Mock;

type RenderedNode =
  | ReactTestRenderer.ReactTestRendererJSON
  | ReactTestRenderer.ReactTestRendererJSON[]
  | null;

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: os,
  });
}

function hasTransformStyle(node: RenderedNode): boolean {
  if (!node) return false;
  if (Array.isArray(node)) {
    return node.some((child) => hasTransformStyle(child));
  }

  const { StyleSheet } = require('react-native');
  const flattenedStyle = StyleSheet.flatten(node.props.style);
  const transform = flattenedStyle?.transform;

  if (
    Array.isArray(transform) &&
    transform.some((t) => t && typeof t === 'object' && 'translateY' in t)
  ) {
    return true;
  }

  const children = node.children ?? [];

  return children.some((child) => {
    if (typeof child === 'string') {
      return false;
    }

    return hasTransformStyle(child);
  });
}

afterEach(() => {
  mockUseActiveRouteName.mockReturnValue(undefined);
  setPlatform(originalPlatform);
});

test('AppShell renders its children without a translate transform', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <AppShell>
        <Text>Screen content</Text>
      </AppShell>,
    );
  });

  expect(tree.root.findByProps({ accessibilityLabel: 'App bar' })).toBeTruthy();
  expect(tree.root.findByProps({ children: 'Screen content' })).toBeTruthy();
  expect(hasTransformStyle(tree.toJSON())).toBe(false);
});

test('AppShell pops to the root when the Home logo is pressed', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  const { navigation, StackActions } = require('@react-navigation/native');

  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <AppShell>
        <Text>Screen content</Text>
      </AppShell>,
    );
  });

  ReactTestRenderer.act(() => {
    tree.root
      .findByProps({ accessibilityLabel: 'Home action' })
      .props.onPress();
  });

  expect(StackActions.popToTop).toHaveBeenCalled();
  expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'POP_TO_TOP' });
});

test('AppShell keeps full-screen Android routes unshifted', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  setPlatform('android');
  mockUseActiveRouteName.mockReturnValue('Search');

  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <AppShell>
        <Text>Full-screen content</Text>
      </AppShell>,
    );
  });

  expect(() =>
    tree.root.findByProps({ accessibilityLabel: 'App bar' }),
  ).toThrow();
  expect(
    tree.root.findByProps({ children: 'Full-screen content' }),
  ).toBeTruthy();
  expect(hasTransformStyle(tree.toJSON())).toBe(false);
});
