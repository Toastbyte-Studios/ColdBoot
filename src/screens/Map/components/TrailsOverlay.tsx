import { Layer } from '@maplibre/maplibre-react-native';
import React from 'react';
import type { MeasurementSystem } from '../../../stores/SettingsStore';
import type {
  ExpressionSpecification,
  FilterSpecification,
} from '@maplibre/maplibre-gl-style-spec';

/**
 * The vector source in OpenFreeMap's Liberty style (the base map). The overlay
 * draws from it rather than adding a source, so it uses the tiles already on
 * screen or saved offline: nothing extra to download, and it works in every
 * offline area.
 */
const BASE_SOURCE = 'openmaptiles';

/**
 * Liberty's first label layer. Trail lines go just below it, above roads and
 * bridges, so road names still read on top of them.
 */
const BELOW_LABELS = 'highway-name-path';

/** Liberty's label font, so offline areas already hold its glyphs. */
const LABEL_FONT = ['Noto Sans Regular'];

/**
 * Fixed colours: the overlay draws on map tiles, not app chrome (as with the
 * user puck). Paper-map trail colours, chosen to read against Liberty's cream
 * land, green parks and white minor roads.
 */
const TRAIL_COLOR = '#C0492B';
const TRACK_COLOR = '#8B5A2B';
const PEAK_COLOR = '#5C3A1E';
const HALO_COLOR = '#FFFFFF';

/**
 * Footpaths built for walking in the country (OSM highway=path and
 * bridleway). Footways, cycleways and steps are left to Liberty, which draws
 * them as thin white dashes, so town sidewalks don't turn into trails.
 */
const IS_TRAIL: ExpressionSpecification = [
  'all',
  ['==', ['get', 'class'], 'path'],
  ['match', ['get', 'subclass'], ['path', 'bridleway'], true, false],
];

/** Named paths and tracks, for their labels. */
const IS_TRAIL_OR_TRACK_NAME: FilterSpecification = [
  'match',
  ['get', 'class'],
  ['path', 'track'],
  true,
  false,
];

/** Summits, volcanic or not; saddles and ridges aren't drawn. */
const IS_PEAK: FilterSpecification = [
  'match',
  ['get', 'class'],
  ['peak', 'volcano'],
  true,
  false,
];

/** Dirt and forest roads (OSM highway=track). */
const IS_TRACK: ExpressionSpecification = ['==', ['get', 'class'], 'track'];

const TRAIL_WIDTH: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  12,
  1,
  14,
  1.75,
  16,
  2.5,
  18,
  4,
];
const TRACK_WIDTH: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  12,
  1,
  14,
  2,
  16,
  3,
  18,
  5,
];
/** The white edge under each line: its width plus a pixel either side. */
const CASING_WIDTH: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  12,
  3,
  14,
  4,
  16,
  5,
  18,
  7,
];

/** "Mount Charleston\n11,916 ft", "Mount Charleston", or "3,632 m". */
function peakLabel(system: MeasurementSystem): ExpressionSpecification {
  const elevationKey = system === 'metric' ? 'ele' : 'ele_ft';
  const unit = system === 'metric' ? ' m' : ' ft';
  const elevation: ExpressionSpecification = [
    'concat',
    ['number-format', ['get', elevationKey], {}],
    unit,
  ];
  return [
    'case',
    ['all', ['has', 'name'], ['has', elevationKey]],
    ['concat', ['get', 'name'], '\n', elevation],
    ['has', 'name'],
    ['get', 'name'],
    ['has', elevationKey],
    elevation,
    '',
  ];
}

interface TrailsOverlayProps {
  /** Draws the overlay; hidden rather than removed, so it keeps its place. */
  visible: boolean;
  measurementSystem: MeasurementSystem;
}

/**
 * Trails over the base map: footpaths, dirt tracks, their names, and peaks
 * with elevations. Everything Liberty draws, minor roads included, stays.
 *
 * What's offline follows the download's detail: OpenMapTiles puts named,
 * marked or graded trails in zoom-13 tiles (standard detail) and every path
 * in zoom-14 tiles (high detail).
 */
export default function TrailsOverlay({
  visible,
  measurementSystem,
}: TrailsOverlayProps) {
  const visibility = visible ? 'visible' : 'none';

  return (
    <>
      <Layer
        type="line"
        id="coldboot-trails-casing"
        source={BASE_SOURCE}
        source-layer="transportation"
        beforeId={BELOW_LABELS}
        minzoom={12}
        filter={['any', IS_TRAIL, IS_TRACK]}
        layout={{ visibility, 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': HALO_COLOR,
          'line-opacity': 0.8,
          'line-width': CASING_WIDTH,
        }}
      />
      <Layer
        type="line"
        id="coldboot-tracks"
        source={BASE_SOURCE}
        source-layer="transportation"
        beforeId={BELOW_LABELS}
        minzoom={12}
        filter={IS_TRACK}
        layout={{ visibility, 'line-join': 'round' }}
        paint={{
          'line-color': TRACK_COLOR,
          'line-width': TRACK_WIDTH,
          'line-dasharray': [4, 1.5],
        }}
      />
      <Layer
        type="line"
        id="coldboot-trails"
        source={BASE_SOURCE}
        source-layer="transportation"
        beforeId={BELOW_LABELS}
        minzoom={12}
        filter={IS_TRAIL}
        layout={{ visibility, 'line-join': 'round' }}
        paint={{
          'line-color': TRAIL_COLOR,
          'line-width': TRAIL_WIDTH,
          'line-dasharray': [2, 1.25],
        }}
      />
      <Layer
        type="symbol"
        id="coldboot-trail-names"
        source={BASE_SOURCE}
        source-layer="transportation_name"
        minzoom={13}
        filter={IS_TRAIL_OR_TRACK_NAME}
        layout={{
          visibility,
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': LABEL_FONT,
          'text-size': 11,
        }}
        paint={{
          'text-color': TRAIL_COLOR,
          'text-halo-color': HALO_COLOR,
          'text-halo-width': 1.5,
        }}
      />
      <Layer
        type="circle"
        id="coldboot-peaks"
        source={BASE_SOURCE}
        source-layer="mountain_peak"
        minzoom={9}
        filter={IS_PEAK}
        layout={{ visibility }}
        paint={{
          'circle-radius': 3,
          'circle-color': PEAK_COLOR,
          'circle-stroke-color': HALO_COLOR,
          'circle-stroke-width': 1,
        }}
      />
      <Layer
        type="symbol"
        id="coldboot-peak-names"
        source={BASE_SOURCE}
        source-layer="mountain_peak"
        minzoom={9}
        filter={IS_PEAK}
        layout={{
          visibility,
          'text-field': peakLabel(measurementSystem),
          'text-font': LABEL_FONT,
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 0.5],
          'text-optional': true,
        }}
        paint={{
          'text-color': PEAK_COLOR,
          'text-halo-color': HALO_COLOR,
          'text-halo-width': 1.5,
        }}
      />
    </>
  );
}
