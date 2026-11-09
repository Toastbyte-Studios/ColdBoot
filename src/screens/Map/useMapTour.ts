import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InteractionManager, View } from 'react-native';
import {
  MapSpotlightTarget,
  TutorialSpotlightContext,
} from '../../components/TutorialSpotlightContext';
import {
  MAP_TOUR_CARD_MIN_HEIGHT,
  MAP_TOUR_ID,
  MAP_TUTORIAL_STEPS,
  MAP_TUTORIAL_STORAGE_KEY,
} from './mapTour';

type MapTourTargets = Record<MapSpotlightTarget, React.RefObject<View | null>>;

export interface MapTour {
  /** Attach each to the view the tour spotlights under that name. */
  targets: MapTourTargets;
  /**
   * False while the first-run map tour is pending or on screen. The location
   * prompt waits on this so the tour can explain it first.
   */
  readyForLocation: boolean;
  /** Replays the tour. Undefined outside the app shell (in tests). */
  replay?: () => void;
}

/**
 * Runs the Map's tour the first time the screen opens, and on request.
 *
 * The tour itself is drawn by AppShell over the whole window; this hook only
 * offers the Map's controls to it as spotlight targets and decides when to
 * start it.
 */
export function useMapTour({
  replayRequested,
  onReplayHandled,
}: {
  /** Set by Help → Replay Map Tour, which navigates here with `tour: true`. */
  replayRequested: boolean;
  onReplayHandled: () => void;
}): MapTour {
  const { startTour, registerSpotlightTarget, endTour } = useContext(
    TutorialSpotlightContext,
  );
  // Without a shell to draw the tour there is nothing to wait for.
  const [readyForLocation, setReadyForLocation] = useState(!startTour);

  const mapView = useRef<View>(null);
  const mapLibrary = useRef<View>(null);
  const mapWaypoint = useRef<View>(null);
  const mapRecord = useRef<View>(null);
  const mapFollow = useRef<View>(null);
  const mapTrails = useRef<View>(null);
  const mapTour = useRef<View>(null);
  const mapCompass = useRef<View>(null);
  const targets = useMemo<MapTourTargets>(
    () => ({
      mapView,
      mapLibrary,
      mapWaypoint,
      mapRecord,
      mapFollow,
      mapTrails,
      mapTour,
      mapCompass,
    }),
    [],
  );

  useEffect(() => {
    if (!registerSpotlightTarget) {
      return;
    }
    const unregister = (
      Object.entries(targets) as [
        MapSpotlightTarget,
        React.RefObject<View | null>,
      ][]
    ).map(([name, ref]) => registerSpotlightTarget(name, ref));
    return () => unregister.forEach((fn) => fn());
  }, [registerSpotlightTarget, targets]);

  const run = useCallback(() => {
    if (!startTour) {
      return;
    }
    startTour({
      id: MAP_TOUR_ID,
      steps: MAP_TUTORIAL_STEPS,
      minCardHeight: MAP_TOUR_CARD_MIN_HEIGHT,
      onFinish: () => {
        AsyncStorage.setItem(MAP_TUTORIAL_STORAGE_KEY, 'true').catch(() => {
          // A failed write only means the tour shows again next time.
        });
        setReadyForLocation(true);
      },
    });
  }, [startTour]);

  // First visit: wait for the push animation to settle, so the controls are
  // where the spotlight will measure them, then start.
  useEffect(() => {
    if (!startTour) {
      return;
    }
    let cancelled = false;
    let task: { cancel: () => void } | undefined;
    AsyncStorage.getItem(MAP_TUTORIAL_STORAGE_KEY)
      .then((seen) => {
        if (cancelled) return;
        if (seen !== null) {
          setReadyForLocation(true);
          return;
        }
        task = InteractionManager.runAfterInteractions(() => {
          if (!cancelled) run();
        });
      })
      .catch(() => {
        if (!cancelled) setReadyForLocation(true);
      });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [run, startTour]);

  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  // A replay from Help. Clearing the request re-runs this effect, so the
  // pending start is guarded by mountedRef rather than cancelled on cleanup.
  useEffect(() => {
    if (!replayRequested) {
      return;
    }
    onReplayHandled();
    InteractionManager.runAfterInteractions(() => {
      if (mountedRef.current) run();
    });
  }, [onReplayHandled, replayRequested, run]);

  // Leaving the Map (Android Back) ends its tour rather than leaving it
  // pointing at controls that are gone.
  useEffect(() => () => endTour?.(MAP_TOUR_ID), [endTour]);

  return { targets, readyForLocation, replay: startTour ? run : undefined };
}
