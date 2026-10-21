import { Layer, useCurrentPosition } from '@maplibre/maplibre-react-native';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import UserHeadingPuck, {
  USER_HEADING_IMAGE,
  USER_HEADING_IMAGES,
} from '../src/screens/Map/components/UserHeadingPuck';

const POSITION = {
  coords: { latitude: 36.1405, longitude: -115.0677, accuracy: 8 },
  timestamp: 0,
};

async function render(heading?: number | null) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<UserHeadingPuck heading={heading} />);
  });
  return tree;
}

const layers = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Layer).map((node) => node.props);

const layer = (tree: ReactTestRenderer.ReactTestRenderer, id: string) =>
  layers(tree).find((props) => props.id === id);

describe('UserHeadingPuck', () => {
  beforeEach(() => {
    (useCurrentPosition as jest.Mock).mockReturnValue(POSITION);
  });

  it('points an arrow along the compass heading', async () => {
    const tree = await render(135);
    const arrow = layer(tree, 'coldboot-user-heading');

    expect(arrow?.type).toBe('symbol');
    expect(arrow?.source).toBe('mlrn-user-location');
    expect(arrow?.layout).toEqual(
      expect.objectContaining({
        'icon-image': USER_HEADING_IMAGE,
        'icon-rotate': 135,
        'icon-allow-overlap': true,
      }),
    );
  });

  it('keeps pointing true when the map is rotated', async () => {
    const tree = await render(135);

    expect(
      layer(tree, 'coldboot-user-heading')?.layout['icon-rotation-alignment'],
    ).toBe('map');
  });

  it('shows the arrow instead of the dot', async () => {
    const tree = await render(0);

    expect(layer(tree, 'coldboot-user-heading')).toBeDefined();
    expect(layer(tree, 'coldboot-user-dot')).toBeUndefined();
  });

  it('shows a dot until the compass reports', async () => {
    const tree = await render(null);

    expect(layer(tree, 'coldboot-user-heading')).toBeUndefined();
    expect(layer(tree, 'coldboot-user-dot-ring')?.type).toBe('circle');
    expect(layer(tree, 'coldboot-user-dot')?.type).toBe('circle');
  });

  it('turns as the heading changes', async () => {
    const tree = await render(10);

    await ReactTestRenderer.act(async () => {
      tree.update(<UserHeadingPuck heading={275} />);
    });

    expect(layer(tree, 'coldboot-user-heading')?.layout['icon-rotate']).toBe(
      275,
    );
  });

  it('keeps the accuracy circle under the arrow', async () => {
    const tree = await render(90);
    const ids = layers(tree).map((props) => props.id);

    expect(ids).toEqual(['coldboot-user-accuracy', 'coldboot-user-heading']);
  });

  it('skips the accuracy circle without a position', async () => {
    (useCurrentPosition as jest.Mock).mockReturnValue(undefined);
    const tree = await render(90);

    expect(layer(tree, 'coldboot-user-accuracy')).toBeUndefined();
  });

  it('registers the arrow image under the name the layer uses', () => {
    expect(Object.keys(USER_HEADING_IMAGES)).toEqual([USER_HEADING_IMAGE]);
    expect(USER_HEADING_IMAGES[USER_HEADING_IMAGE]).toBeDefined();
  });
});
