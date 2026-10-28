import {
  createExpression,
  featureFilter,
  validateStyleMin,
} from '@maplibre/maplibre-gl-style-spec';
import { Layer } from '@maplibre/maplibre-react-native';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import TrailsOverlay from '../src/screens/Map/components/TrailsOverlay';
import type { MeasurementSystem } from '../src/stores/SettingsStore';

type LayerProps = {
  id: string;
  type: string;
  source: string;
  'source-layer': string;
  beforeId?: string;
  minzoom?: number;
  filter: unknown;
  layout: Record<string, unknown>;
  paint: Record<string, unknown>;
};

async function render(
  visible = true,
  measurementSystem: MeasurementSystem = 'imperial',
) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <TrailsOverlay visible={visible} measurementSystem={measurementSystem} />,
    );
  });
  return tree.root.findAllByType(Layer).map((node) => node.props as LayerProps);
}

const byId = (layers: LayerProps[], id: string) => {
  const found = layers.find((layer) => layer.id === id);
  if (!found) {
    throw new Error(`No layer ${id}`);
  }
  return found;
};

/** Does `layer`'s filter keep a line with these properties at zoom 14? */
function keeps(layer: LayerProps, properties: Record<string, unknown>) {
  const { filter } = featureFilter(layer.filter as never);
  return filter({ zoom: 14 }, { type: 2, properties } as never);
}

function label(layer: LayerProps, properties: Record<string, unknown>) {
  const parsed = createExpression(layer.layout['text-field'] as never);
  if (parsed.result !== 'success') {
    throw new Error(JSON.stringify(parsed.value));
  }
  return parsed.value.evaluate({ zoom: 12 }, {
    type: 1,
    properties,
  } as never);
}

describe('TrailsOverlay', () => {
  it('is valid MapLibre style, drawn from the base map’s own data', async () => {
    const layers = await render();
    const style = {
      version: 8,
      glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sources: {
        openmaptiles: {
          type: 'vector',
          url: 'https://tiles.openfreemap.org/planet',
        },
      },
      layers: layers.map(({ beforeId: _beforeId, ...layer }) => layer),
    };

    expect(validateStyleMin(style as never)).toEqual([]);
    expect(new Set(layers.map((layer) => layer.source))).toEqual(
      new Set(['openmaptiles']),
    );
  });

  it('draws trails and tracks under the road labels', async () => {
    const layers = await render();

    for (const id of [
      'coldboot-trails-casing',
      'coldboot-tracks',
      'coldboot-trails',
    ]) {
      expect(byId(layers, id).beforeId).toBe('highway-name-path');
      expect(byId(layers, id)['source-layer']).toBe('transportation');
    }
  });

  it('draws country footpaths as trails, not town sidewalks', async () => {
    const trails = byId(await render(), 'coldboot-trails');

    expect(keeps(trails, { class: 'path', subclass: 'path' })).toBe(true);
    expect(keeps(trails, { class: 'path', subclass: 'bridleway' })).toBe(true);
    expect(keeps(trails, { class: 'path', subclass: 'footway' })).toBe(false);
    expect(keeps(trails, { class: 'path', subclass: 'cycleway' })).toBe(false);
    expect(keeps(trails, { class: 'minor' })).toBe(false);
  });

  it('draws dirt tracks, and leaves roads to the base map', async () => {
    const layers = await render();
    const tracks = byId(layers, 'coldboot-tracks');
    const casing = byId(layers, 'coldboot-trails-casing');

    expect(keeps(tracks, { class: 'track' })).toBe(true);
    expect(keeps(tracks, { class: 'minor' })).toBe(false);
    expect(keeps(tracks, { class: 'service' })).toBe(false);
    expect(keeps(casing, { class: 'track' })).toBe(true);
    expect(keeps(casing, { class: 'path', subclass: 'path' })).toBe(true);
    expect(keeps(casing, { class: 'minor' })).toBe(false);
  });

  it('names trails in the font offline areas already hold', async () => {
    const names = byId(await render(), 'coldboot-trail-names');

    expect(names['source-layer']).toBe('transportation_name');
    expect(names.layout['text-font']).toEqual(['Noto Sans Regular']);
    expect(keeps(names, { class: 'path', subclass: 'path' })).toBe(true);
    expect(keeps(names, { class: 'path', subclass: 'bridleway' })).toBe(true);
    expect(keeps(names, { class: 'path', subclass: 'footway' })).toBe(false);
    expect(keeps(names, { class: 'path', subclass: 'cycleway' })).toBe(false);
    expect(keeps(names, { class: 'path', subclass: 'steps' })).toBe(false);
    expect(keeps(names, { class: 'track' })).toBe(true);
    expect(keeps(names, { class: 'primary' })).toBe(false);
  });

  it('labels peaks with their elevation in feet', async () => {
    const peaks = byId(await render(true, 'imperial'), 'coldboot-peak-names');

    expect(label(peaks, { name: 'Charleston Peak', ele_ft: 11916 })).toBe(
      'Charleston Peak\n11,916 ft',
    );
    expect(label(peaks, { name: 'Unmeasured Peak' })).toBe('Unmeasured Peak');
    expect(label(peaks, { ele_ft: 5280 })).toBe('5,280 ft');
    expect(label(peaks, { ele_ft: 1000 })).toBe('1,000 ft');
    expect(label(peaks, { ele_ft: 1001 })).toBe('1,001 ft');
    expect(label(peaks, { ele_ft: 1010 })).toBe('1,010 ft');
  });

  it('labels peaks in metres for metric users', async () => {
    const peaks = byId(await render(true, 'metric'), 'coldboot-peak-names');

    expect(label(peaks, { name: 'Charleston Peak', ele: 3632 })).toBe(
      'Charleston Peak\n3,632 m',
    );
  });

  it('marks summits, not saddles or ridges', async () => {
    const peaks = byId(await render(), 'coldboot-peaks');

    expect(keeps(peaks, { class: 'peak' })).toBe(true);
    expect(keeps(peaks, { class: 'volcano' })).toBe(true);
    expect(keeps(peaks, { class: 'saddle' })).toBe(false);
  });

  it('hides every layer rather than removing it', async () => {
    const shown = await render(true);
    const hidden = await render(false);

    expect(hidden.map((layer) => layer.id)).toEqual(
      shown.map((layer) => layer.id),
    );
    expect(new Set(shown.map((layer) => layer.layout.visibility))).toEqual(
      new Set(['visible']),
    );
    expect(new Set(hidden.map((layer) => layer.layout.visibility))).toEqual(
      new Set(['none']),
    );
  });
});
