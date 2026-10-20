import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import WaypointRow from '../src/screens/Map/components/LibrarySheet/WaypointRow';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

// ScaledText reads the settings store through the stores barrel, which
// would load every native module the app uses.
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

const WAYPOINT = {
  id: 'wp-1',
  name: 'Trailhead',
  latitude: 38.62,
  longitude: -115.37,
  createdAt: '2026-10-20T00:00:00.000Z',
};

async function render(
  props: Partial<React.ComponentProps<typeof WaypointRow>> = {},
) {
  const handlers = {
    onNavigate: jest.fn(),
    onDelete: jest.fn(),
    onDownloadArea: jest.fn(),
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <WaypointRow
        waypoint={WAYPOINT}
        currentCoords={null}
        measurementSystem="imperial"
        {...handlers}
        {...props}
      />,
    );
  });
  return { tree, ...handlers };
}

/** The mock MenuView passes its props through. */
const menu = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.find((node) => Array.isArray(node.props.actions));

async function choose(tree: ReactTestRenderer.ReactTestRenderer, id: string) {
  await ReactTestRenderer.act(async () => {
    menu(tree).props.onPressAction({ nativeEvent: { event: id } });
  });
}

describe('WaypointRow', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps Navigate on the row and puts the rest in a menu', async () => {
    const { tree } = await render();

    tree.root.findByProps({ accessibilityLabel: 'Navigate to Trailhead' });
    expect(
      menu(tree).props.actions.map((a: { title: string }) => a.title),
    ).toEqual(['Download area here', 'Delete']);
    tree.root.findByProps({
      accessibilityLabel: 'More actions for Trailhead',
    });
  });

  it('downloads an area centred on the waypoint', async () => {
    const { tree, onDownloadArea } = await render();

    await choose(tree, 'download');

    expect(onDownloadArea).toHaveBeenCalledWith({
      latitude: 38.62,
      longitude: -115.37,
    });
  });

  it('still confirms before deleting', async () => {
    (Alert.alert as jest.Mock).mockImplementation((title, _msg, buttons) => {
      if (title === 'Delete Waypoint') {
        buttons?.[1]?.onPress?.();
      }
    });
    const { tree, onDelete } = await render();

    await choose(tree, 'delete');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Waypoint',
      expect.stringContaining('Trailhead'),
      expect.any(Array),
    );
    expect(onDelete).toHaveBeenCalledWith('wp-1');
  });

  it('offers only Delete when downloads are unavailable', async () => {
    const { tree } = await render({ onDownloadArea: undefined });

    expect(menu(tree).props.actions.map((a: { id: string }) => a.id)).toEqual([
      'delete',
    ]);
  });
});
