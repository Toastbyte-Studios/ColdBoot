import * as Menu from '@react-native-menu/menu';
import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import AppBarIOS from '../src/components/AppBar';
import AppBarAndroid from '../src/components/AppBar.android';
import { backDestinations } from '../src/navigation/backDestinations';

jest.mock('@react-navigation/native', () => ({
  NavigationRouteContext: require('react').createContext(undefined),
}));
jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));
jest.mock('../src/hooks/useRippleColor', () => ({
  useRippleColor: () => 'rgba(0,0,0,0.1)',
}));
jest.mock('../src/hooks/useCurrentDate', () => ({
  useCurrentDate: () => 'Friday, November 6',
}));
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));
jest.mock('../src/components/ConnectionDot', () => () => null);
jest.mock('../src/components/LogoHeader', () => () => null);
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/navigation/navigationRef', () => ({
  navigationRef: { isReady: () => false },
}));

// Exported only by the mock (__mocks__/@react-native-menu/menu.tsx), so the
// real package's types don't know it.
const { mockMenuShow } = Menu as unknown as { mockMenuShow: jest.Mock };

const stack = [
  { key: 'home-1', name: 'Home' },
  { key: 'prep-1', name: 'PrepperModule' },
  { key: 'pantry-1', name: 'Pantry' },
  { key: 'cat-1', name: 'PantryCategory' },
];
const headers = {
  'prep-1': { title: 'Prepper' },
  'pantry-1': { title: 'Pantry' },
  'cat-1': { title: 'Canned goods' },
};

describe('backDestinations', () => {
  it('lists the screens behind, nearest first and Home last', () => {
    expect(backDestinations(stack, 3, headers)).toEqual([
      { id: 'pantry-1', title: 'Pantry', popCount: 1, isHome: false },
      { id: 'prep-1', title: 'Prepper', popCount: 2, isHome: false },
      { id: 'home-1', title: 'Home', popCount: 3, isHome: true },
    ]);
  });

  it('falls back to a readable route name for an untitled screen', () => {
    const [nearest] = backDestinations(
      [
        { key: 'h', name: 'Home' },
        { key: 'a', name: 'PantryCategory' },
        { key: 'b', name: 'NewPantryItem' },
      ],
      2,
      {},
    );
    expect(nearest.title).toBe('Pantry Category');
  });

  it('is empty on Home', () => {
    expect(backDestinations(stack, 0, headers)).toEqual([]);
  });
});

const history = backDestinations(stack, 3, headers);
const baseProps = {
  logoRef: { current: null },
  searchRef: { current: null },
  onHomePress: jest.fn(),
  onSearchPress: jest.fn(),
  onSettingsPress: jest.fn(),
  header: { title: 'Canned goods' },
};

async function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
}

const menuOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.find(
    (node) =>
      Array.isArray(node.props.actions) &&
      typeof node.props.onPressAction === 'function',
  );

const backButton = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.find(
    (node) =>
      node.props.accessibilityLabel === 'Go back' &&
      typeof node.props.onPress === 'function',
  );

describe.each([
  ['iOS', AppBarIOS],
  ['Android', AppBarAndroid],
])('%s back button', (_platform, AppBar) => {
  beforeEach(() => jest.clearAllMocks());

  it('goes back one screen on a tap', async () => {
    const onBackPress = jest.fn();
    const onBackHistorySelect = jest.fn();
    const tree = await render(
      <AppBar
        {...baseProps}
        onBackPress={onBackPress}
        backHistory={history}
        onBackHistorySelect={onBackHistorySelect}
      />,
    );

    backButton(tree).props.onPress();
    expect(onBackPress).toHaveBeenCalled();
    expect(onBackHistorySelect).not.toHaveBeenCalled();
  });

  it('jumps to the screen picked from the history menu', async () => {
    const onBackHistorySelect = jest.fn();
    const tree = await render(
      <AppBar
        {...baseProps}
        backHistory={history}
        onBackHistorySelect={onBackHistorySelect}
      />,
    );
    const menu = menuOf(tree);

    expect(menu.props.actions.map((a: { title: string }) => a.title)).toEqual([
      'Pantry',
      'Prepper',
      'Home',
    ]);

    menu.props.onPressAction({ nativeEvent: { event: 'home-1' } });
    expect(onBackHistorySelect).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Home', popCount: 3 }),
    );
  });
});

describe('platform specifics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('iOS opens the menu on touch-and-hold and marks Home with a house', async () => {
    const tree = await render(
      <AppBarIOS {...baseProps} backHistory={history} />,
    );
    const menu = menuOf(tree);

    expect(menu.props.shouldOpenOnLongPress).toBe(true);
    expect(menu.props.actions[2]).toMatchObject({
      title: 'Home',
      image: 'house',
    });
  });

  it('gives the iOS history menu a 44pt trigger', async () => {
    const tree = await render(
      <AppBarIOS {...baseProps} backHistory={history} />,
    );
    const menu = menuOf(tree);
    const targetStyle = StyleSheet.flatten(menu.props.children.props.style);

    expect(targetStyle).toMatchObject({ width: 44, height: 44 });
  });

  it('Android opens the menu from the long press only', async () => {
    const tree = await render(
      <AppBarAndroid {...baseProps} backHistory={history} />,
    );

    expect(menuOf(tree).props.shouldOpenOnLongPress).toBeUndefined();
    backButton(tree).props.onPress();
    expect(mockMenuShow).not.toHaveBeenCalled();

    backButton(tree).props.onLongPress();
    expect(mockMenuShow).toHaveBeenCalledTimes(1);
  });
});
