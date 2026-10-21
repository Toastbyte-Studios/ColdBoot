import { Layer, useCurrentPosition } from '@maplibre/maplibre-react-native';
import React from 'react';

/** Name the arrow is registered under with MapLibre's `Images`. */
export const USER_HEADING_IMAGE = 'coldboot-user-heading';

/** Pass to `<Images images={…} />` inside the map before rendering the puck. */
export const USER_HEADING_IMAGES = {
  [USER_HEADING_IMAGE]: require('../../../../assets/map/user-heading.png'),
};

/** The GeoJSON source `UserLocation` puts the user's position in. */
const USER_LOCATION_SOURCE = 'mlrn-user-location';

/**
 * The puck draws on map tiles, not app chrome, so its colours are fixed
 * rather than themed: MapLibre's location blue (the default puck's, and the
 * arrow image's fill) with a white ring.
 */
const PUCK_BLUE = '#33B5E5';
const PUCK_RING = '#FFFFFF';
const DOT_RING_RADIUS = 9;

interface UserHeadingPuckProps {
  /**
   * Compass heading in degrees from true north. The arrow points this way;
   * without one (no compass reading yet) a plain dot stands in.
   */
  heading?: number | null;
}

/**
 * The user's position on the map: an arrow pointing where the device faces,
 * on an accuracy circle. Render it as `UserLocation`'s child, which supplies
 * the position source and keeps it moving with the user.
 *
 * MapLibre's own heading arrow follows the GPS course, which only exists
 * while moving; this one follows the compass, so it turns as the user does
 * while standing still.
 */
export default function UserHeadingPuck({ heading }: UserHeadingPuckProps) {
  const accuracy = useCurrentPosition()?.coords.accuracy;
  const rotation =
    typeof heading === 'number' && Number.isFinite(heading) ? heading : null;

  return (
    <>
      {typeof accuracy === 'number' && (
        <Layer
          type="circle"
          id="coldboot-user-accuracy"
          source={USER_LOCATION_SOURCE}
          paint={{
            'circle-color': PUCK_BLUE,
            'circle-opacity': 0.2,
            'circle-pitch-alignment': 'map',
            // Grows with zoom so it covers ~`accuracy` metres on the ground,
            // as MapLibre's default puck does.
            'circle-radius': [
              'interpolate',
              ['exponential', 2],
              ['zoom'],
              0,
              DOT_RING_RADIUS,
              22,
              DOT_RING_RADIUS + accuracy * 100,
            ],
          }}
        />
      )}
      {rotation !== null ? (
        <Layer
          type="symbol"
          id="coldboot-user-heading"
          source={USER_LOCATION_SOURCE}
          layout={{
            'icon-image': USER_HEADING_IMAGE,
            'icon-rotate': rotation,
            // Rotate against north, not the screen, so it stays true when
            // the map itself is rotated.
            'icon-rotation-alignment': 'map',
            'icon-pitch-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          }}
        />
      ) : (
        <>
          <Layer
            type="circle"
            id="coldboot-user-dot-ring"
            source={USER_LOCATION_SOURCE}
            paint={{
              'circle-radius': DOT_RING_RADIUS,
              'circle-color': PUCK_RING,
              'circle-pitch-alignment': 'map',
            }}
          />
          <Layer
            type="circle"
            id="coldboot-user-dot"
            source={USER_LOCATION_SOURCE}
            paint={{
              'circle-radius': 6,
              'circle-color': PUCK_BLUE,
              'circle-pitch-alignment': 'map',
            }}
          />
        </>
      )}
    </>
  );
}
