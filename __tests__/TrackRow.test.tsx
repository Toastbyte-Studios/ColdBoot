import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import TrackRow from '../src/screens/Map/components/LibrarySheet/TrackRow';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

// ScaledText reads the settings store through the stores barrel, which
// would load every native module the app uses.
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

const TRACK = {
  id: 'track-1',
  name: 'Red Rock loop',
  createdAt: '2026-10-20T00:00:00.000Z',
  durationSeconds: 3600,
  distanceMeters: 5000,
  points: [],
};

async function render(
  props: Partial<React.ComponentProps<typeof TrackRow>> = {},
) {
  const handlers = {
    onView: jest.fn(),
    onDelete: jest.fn(),
    onHide: jest.fn(),
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <TrackRow
        track={TRACK}
        measurementSystem="imperial"
        {...handlers}
        {...props}
      />,
    );
  });
  return { tree, ...handlers };
}

const button = (tree: ReactTestRenderer.ReactTestRenderer, label: string) =>
  tree.root.findAll(
    (node) =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];

describe('TrackRow', () => {
  it('offers View for a track that is not on the map', async () => {
    const { tree, onView } = await render();

    expect(button(tree, 'Hide track Red Rock loop from map')).toBeUndefined();
    await ReactTestRenderer.act(async () => {
      button(tree, 'View track Red Rock loop on map').props.onPress();
    });

    expect(onView).toHaveBeenCalledWith(TRACK);
  });

  it('offers Hide for the track on the map', async () => {
    const { tree, onHide, onView } = await render({ isViewed: true });

    expect(button(tree, 'View track Red Rock loop on map')).toBeUndefined();
    await ReactTestRenderer.act(async () => {
      button(tree, 'Hide track Red Rock loop from map').props.onPress();
    });

    expect(onHide).toHaveBeenCalled();
    expect(onView).not.toHaveBeenCalled();
  });

  it('keeps Delete either way', async () => {
    const { tree } = await render({ isViewed: true });

    expect(button(tree, 'Delete track Red Rock loop')).toBeDefined();
  });
});
