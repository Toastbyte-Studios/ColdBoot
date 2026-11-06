import { NavigationRouteContext } from '@react-navigation/native';
import React from 'react';
import { Text as RNText } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import AppBar from '../src/components/AppBar';
import StackScreen from '../src/components/StackScreen';
import {
  ScreenHeader,
  ScreenHeaderProvider,
  useScreenHeader,
} from '../src/navigation/ScreenHeaderContext';
import { useAppBarHeader } from '../src/navigation/useAppBarHeader';

let mockActiveRoute: { name: string; key: string } | undefined;

// The real package isn't transformed for Jest; a plain context stands in for
// the route context the navigator provides.
jest.mock('@react-navigation/native', () => ({
  NavigationRouteContext: require('react').createContext(undefined),
}));

jest.mock('../src/hooks/useActiveRoute', () => ({
  useActiveRoute: () => mockActiveRoute,
}));
jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));
jest.mock('../src/hooks/useFooterClearance', () => ({
  useFooterClearance: () => 0,
}));
jest.mock('../src/hooks/useCurrentDate', () => ({
  useCurrentDate: () => 'Thursday, November 5',
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

/** Reports what the app bar would show, the way AppShell reads it. */
let shown: ScreenHeader | null = null;
function AppBarProbe() {
  shown = useAppBarHeader();
  return null;
}

function Route({
  routeKey,
  children,
}: {
  routeKey: string;
  children: React.ReactNode;
}) {
  return (
    <NavigationRouteContext.Provider
      value={{ key: routeKey, name: routeKey, params: undefined }}
    >
      {children}
    </NavigationRouteContext.Provider>
  );
}

function Header(props: ScreenHeader) {
  useScreenHeader(props);
  return null;
}

async function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(RNText)
    .map((node) => React.Children.toArray(node.props.children).join(''));

describe('app bar header', () => {
  beforeEach(() => {
    shown = null;
    mockActiveRoute = undefined;
  });

  it('shows nothing on Home, so the Home bar is unchanged', async () => {
    mockActiveRoute = { name: 'Home', key: 'home' };
    await render(
      <ScreenHeaderProvider>
        <AppBarProbe />
      </ScreenHeaderProvider>,
    );
    expect(shown).toBeNull();
  });

  it("shows the active StackScreen's title and subtitle", async () => {
    mockActiveRoute = { name: 'NoteEntry', key: 'note-1' };
    const tree = await render(
      <ScreenHeaderProvider>
        <AppBarProbe />
        <Route routeKey="note-1">
          <StackScreen title="Field notes" subtitle="Nov 5 · Hiking">
            <RNText>Body</RNText>
          </StackScreen>
        </Route>
      </ScreenHeaderProvider>,
    );

    expect(shown).toMatchObject({
      title: 'Field notes',
      subtitle: 'Nov 5 · Hiking',
    });
    // The large title no longer renders inside the screen.
    expect(texts(tree)).not.toContain('Field notes');
    expect(texts(tree)).toContain('Body');
  });

  it('picks the screen on top when two are mounted, and the one below after going back', async () => {
    mockActiveRoute = { name: 'B', key: 'b' };
    const tree = await render(
      <ScreenHeaderProvider>
        <AppBarProbe />
        <Route routeKey="a">
          <Header title="Pantry" />
        </Route>
        <Route routeKey="b">
          <Header title="Canned goods" />
        </Route>
      </ScreenHeaderProvider>,
    );
    expect(shown?.title).toBe('Canned goods');

    // Pop B: it unmounts and A is the active route again.
    mockActiveRoute = { name: 'A', key: 'a' };
    await ReactTestRenderer.act(async () => {
      tree.update(
        <ScreenHeaderProvider>
          <AppBarProbe />
          <Route routeKey="a">
            <Header title="Pantry" />
          </Route>
        </ScreenHeaderProvider>,
      );
    });
    expect(shown?.title).toBe('Pantry');
  });

  it('keeps the last header for a route that registers none (the modal)', async () => {
    mockActiveRoute = { name: 'UnitConversion', key: 'uc' };
    const ui = () => (
      <ScreenHeaderProvider>
        <AppBarProbe />
        <Route routeKey="uc">
          <Header title="Unit Conversion" />
        </Route>
      </ScreenHeaderProvider>
    );
    const tree = await render(ui());
    expect(shown?.title).toBe('Unit Conversion');

    mockActiveRoute = { name: 'ConversionCategory', key: 'modal' };
    await ReactTestRenderer.act(async () => tree.update(ui()));
    expect(shown?.title).toBe('Unit Conversion');
  });

  it("calls the screen's latest onBack through a stable wrapper", async () => {
    mockActiveRoute = { name: 'VoiceLog', key: 'vl' };
    const first = jest.fn();
    const second = jest.fn();
    const ui = (onBack: () => void) => (
      <ScreenHeaderProvider>
        <AppBarProbe />
        <Route routeKey="vl">
          <Header title="Voice Logs" onBack={onBack} />
        </Route>
      </ScreenHeaderProvider>
    );
    const tree = await render(ui(first));
    const wrapper = shown?.onBack;

    await ReactTestRenderer.act(async () => tree.update(ui(second)));
    expect(shown?.onBack).toBe(wrapper);

    shown?.onBack?.();
    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
  });
});

describe('AppBar', () => {
  const baseProps = {
    logoRef: { current: null },
    searchRef: { current: null },
    onHomePress: jest.fn(),
    onSearchPress: jest.fn(),
    onSettingsPress: jest.fn(),
  };

  const backButton = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.find(
      (node) =>
        node.props.accessibilityLabel === 'Go back' &&
        typeof node.props.onPress === 'function',
    );

  it('shows ColdBoot and the date on Home', async () => {
    const tree = await render(<AppBar {...baseProps} header={null} />);
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['ColdBoot', 'Thursday, November 5']),
    );
    expect(
      tree.root.findAll((n) => n.props.accessibilityLabel === 'Go back'),
    ).toHaveLength(0);
  });

  it('shows back, title and subtitle on a nested screen', async () => {
    const onBackPress = jest.fn();
    const tree = await render(
      <AppBar
        {...baseProps}
        header={{ title: 'Sun Times', subtitle: '34.05° N' }}
        onBackPress={onBackPress}
      />,
    );
    const all = texts(tree);
    expect(all).toEqual(expect.arrayContaining(['Sun Times', '34.05° N']));
    expect(all).not.toContain('ColdBoot');
    expect(all).not.toContain('Thursday, November 5');

    backButton(tree).props.onPress();
    expect(onBackPress).toHaveBeenCalled();
  });

  it("uses the screen's own onBack when it has one", async () => {
    const onBack = jest.fn();
    const onBackPress = jest.fn();
    const tree = await render(
      <AppBar
        {...baseProps}
        header={{ title: 'Voice Logs', onBack }}
        onBackPress={onBackPress}
      />,
    );
    backButton(tree).props.onPress();
    expect(onBack).toHaveBeenCalled();
    expect(onBackPress).not.toHaveBeenCalled();
  });
});
