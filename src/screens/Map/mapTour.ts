import { Platform } from 'react-native';
import type { TutorialStep } from '../../components/TutorialSpotlightContext';

/** Set once the map tour has been finished or skipped. */
export const MAP_TUTORIAL_STORAGE_KEY = 'hasSeenMapTutorial';

export const MAP_TOUR_ID = 'map';

/**
 * The map tour's card is shorter than the first-run tour's: most steps point
 * at a control, and a tall card would hide the map they act on.
 */
export const MAP_TOUR_CARD_MIN_HEIGHT = 340;

/**
 * The Map's own tour. It runs the first time the screen opens, before the
 * location prompt, so the first step can say why the app wants location.
 * Keep it in step with the action row in MapScreen.
 */
export const MAP_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'intro',
    icon: 'map-outline',
    title: 'Map Basics',
    description:
      'The map has a lot packed into it. Here is a quick look at each tool.',
    tips: [
      {
        icon: 'navigate-outline',
        text: 'GPS works with no cell signal at all',
      },
      {
        icon: 'location-outline',
        text: 'Location puts you on the map and records your routes',
      },
    ],
  },
  {
    id: 'map',
    icon: 'hand-left-outline',
    title: 'Move Around',
    description:
      'Drag to pan and pinch to zoom. Press and hold anywhere to drop a waypoint there.',
    spotlightTarget: 'mapView',
  },
  {
    id: 'library',
    icon: 'library-outline',
    title: 'Library',
    description:
      'Your saved waypoints, recorded tracks and offline maps, all in one sheet. Tap a waypoint to fly to it.',
    spotlightTarget: 'mapLibrary',
  },
  {
    id: 'waypoint',
    icon: 'flag-outline',
    title: 'Add a Waypoint',
    description:
      'Mark camp, water or your car. Save where you are, or type in coordinates by hand.',
    spotlightTarget: 'mapWaypoint',
  },
  {
    id: 'record',
    icon: 'radio-button-on-outline',
    title: 'Record a Track',
    description:
      'Tap to record your route as you move, then tap again to stop and save it.',
    spotlightTarget: 'mapRecord',
    tips: [
      {
        icon: 'lock-closed-outline',
        text:
          Platform.OS === 'android'
            ? 'Allow location "all the time" to keep recording with the screen off'
            : 'Allow location "Always" to keep recording with the screen locked',
      },
    ],
  },
  {
    id: 'follow',
    icon: 'locate-outline',
    title: 'Follow Me',
    description:
      'Keeps the map centred on you as you move. Drag the map to stop following.',
    spotlightTarget: 'mapFollow',
  },
  {
    id: 'trails',
    icon: 'trail-sign-outline',
    title: 'Trails',
    description: 'Show or hide trails, tracks and peaks on top of the map.',
    spotlightTarget: 'mapTrails',
  },
  {
    id: 'compass',
    icon: 'compass-outline',
    title: 'Compass',
    description:
      'Your heading and coordinates, plus the place name when it can be found. Hold the phone flat for the best reading.',
    spotlightTarget: 'mapCompass',
  },
  {
    id: 'offline',
    icon: 'cloud-download-outline',
    title: 'Save Maps for Offline',
    description:
      'Before you lose signal, open Library → Maps and download your area. Downloaded maps work anywhere.',
    spotlightTarget: 'mapLibrary',
  },
  {
    id: 'done',
    icon: 'checkmark-circle-outline',
    title: 'Ready to Explore',
    description:
      'Replay this tour any time from the help button at the end of the map tools.',
    spotlightTarget: 'mapTour',
  },
];
