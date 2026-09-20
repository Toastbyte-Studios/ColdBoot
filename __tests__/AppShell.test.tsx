import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import AppShell from '../src/components/AppShell';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue('true'),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/hooks/useActiveRouteName', () => ({
  useActiveRouteName: () => undefined,
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
jest.mock('../src/components/AppBar', () => () => {
  const { View: MockView } = require('react-native');
  return <MockView accessibilityLabel="App bar" />;
});
jest.mock('../src/components/HelpModal', () => ({
  HelpModal: () => null,
}));
jest.mock('../src/components/ScreenContainer', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));
jest.mock('../src/components/SettingsModal', () => ({
  SettingsModal: () => null,
}));
jest.mock('../src/components/ShortcutBar', () => () => null);
jest.mock('../src/components/TutorialModal', () => () => null);

type RenderedNode = ReactTestRenderer.ReactTestRendererJSON | null;

function hasTransformStyle(node: RenderedNode): boolean {
  if (!node) return false;

  const styles = Array.isArray(node.props.style)
    ? node.props.style
    : node.props.style
      ? [node.props.style]
      : [];

  if (
    styles.some(
      (style) =>
        style &&
        typeof style === 'object' &&
        'transform' in style &&
        style.transform !== undefined,
    )
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
