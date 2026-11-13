import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useActiveRouteName } from '../hooks/useActiveRouteName';
import { useIsDarkMode } from '../hooks/useIsDarkMode';
import {
  useNavigationHistory,
  useGestureNavigation,
} from '../navigation/NavigationHistoryContext';
import canGoBack, { goBack } from '../navigation/navigationRef';
import { ScreenHeaderProvider } from '../navigation/ScreenHeaderContext';
import { useAppBarHeader } from '../navigation/useAppBarHeader';
import AlertsSheet from './AlertsSheet';
import AppBar from './AppBar';
import { HelpModal } from './HelpModal';
import ScreenContainer from './ScreenContainer';
import { SettingsModal } from './SettingsModal';
import { SettingsSheetContext } from './SettingsSheetContext';
import ShortcutBar from './ShortcutBar';
import { spotlightShapeFor } from './tutorialLayout';
import TutorialModal, { TUTORIAL_STEPS } from './TutorialModal';
import {
  SpotlightLayout,
  TutorialFinishReason,
  TutorialSpotlightContext,
  TutorialSpotlightTarget,
  TutorialTour,
} from './TutorialSpotlightContext';

type Props = PropsWithChildren;

type AppShellNavigationProp = NativeStackNavigationProp<{
  Home: undefined;
  Search: undefined;
  DownloadArea: undefined;
  MapScreen: { library?: 'maps'; tour?: boolean };
}>;

const TUTORIAL_STORAGE_KEY = 'hasSeenTutorial';

/**
 * Routes that take the whole window on Android, with no app bar and no bottom
 * chrome of their own.
 *
 * Material's search is a full-screen view, not a screen with a search field on
 * it: it takes over the window for as long as the user is searching. Its own
 * search bar carries the back arrow, so the app bar would be a second one, and
 * the navigation bar would be a second set of destinations competing with the
 * thing the user just opened.
 */
const FULL_SCREEN_ROUTES = new Set(['Search']);

/**
 * Root layout wrapper for the app.
 *
 * Provides:
 * - A top app bar ({@link AppBar}), which each platform draws its own way.
 * - A bottom shortcut bar.
 * - Global horizontal swipe navigation, on iOS only — see below.
 *
 * Gesture behavior (iOS):
 * - Requires minimum horizontal movement and favors horizontal intent over
 *   vertical, so it does not fight scrolling or taps.
 * - On release, navigates only on "confident" swipes, using distance (`dx`),
 *   velocity (`vx`) and vertical displacement (`dy`) thresholds.
 *
 * The gesture is **not** registered on Android. It captures horizontal drags
 * anywhere in the shell, including the edge where Android 13+ runs predictive
 * back, so leaving it on would mean the app quietly eating the system's own
 * back gesture. Android already has back — from the gesture and from the
 * hardware key — and a hand-rolled forward swipe is not a platform pattern, so
 * there is nothing to replace it with.
 *
 * @param props.children - Screen content to render inside the shell.
 */
export default function AppShell(props: Props) {
  return (
    <ScreenHeaderProvider>
      <AppShellBody {...props} />
    </ScreenHeaderProvider>
  );
}

function AppShellBody({ children }: Props) {
  const navigation = useNavigation<AppShellNavigationProp>();
  const navigationHistory = useNavigationHistory();
  const { disableGestureNavigation } = useGestureNavigation();
  const activeRouteName = useActiveRouteName();
  const appBarHeader = useAppBarHeader();
  const isDarkMode = useIsDarkMode();
  const isFullScreenRoute =
    Platform.OS === 'android' &&
    activeRouteName !== undefined &&
    FULL_SCREEN_ROUTES.has(activeRouteName);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const settingsSheet = useMemo(
    () => ({ openSettings: () => setIsSettingsVisible(true) }),
    [],
  );
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [isAlertsVisible, setIsAlertsVisible] = useState(false);
  const [activeTour, setActiveTour] = useState<TutorialTour | null>(null);
  const [tutorialSpotlightTarget, setTutorialSpotlightTarget] = useState<
    TutorialSpotlightTarget | undefined
  >(undefined);
  const [spotlightLayout, setSpotlightLayout] =
    useState<SpotlightLayout | null>(null);
  const logoRef = useRef<View>(null);
  const gestureContainerRef = useRef<View>(null);
  const navSearchRef = useRef<View>(null);
  const settingsRef = useRef<View>(null);
  const footerRef = useRef<View>(null);
  const sectionHeaderRef = useRef<View>(null);
  /** Views screens have offered to spotlight (the Map's controls). */
  const screenTargetsRef = useRef(
    new Map<TutorialSpotlightTarget, React.RefObject<View | null>>(),
  );

  const startTour = useCallback((tour: TutorialTour) => {
    setActiveTour(tour);
  }, []);

  const firstRunTour = useMemo<TutorialTour>(
    () => ({
      id: 'main',
      steps: TUTORIAL_STEPS,
      onFinish: () => {
        AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true').catch(() => {
          // Ignore persistence failures so users are not blocked in the
          // tutorial.
        });
      },
    }),
    [],
  );

  const finishTour = useCallback(
    (reason: TutorialFinishReason) => {
      activeTour?.onFinish?.(reason);
      setActiveTour(null);
    },
    [activeTour],
  );

  const endTour = useCallback((id: string) => {
    setActiveTour((current) => (current?.id === id ? null : current));
  }, []);

  // Android Back during a tour skips it, rather than navigating away underneath.
  useEffect(() => {
    if (!activeTour) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        finishTour('skip');
        return true;
      },
    );
    return () => subscription.remove();
  }, [activeTour, finishTour]);

  const registerSpotlightTarget = useCallback(
    (target: TutorialSpotlightTarget, ref: React.RefObject<View | null>) => {
      const targets = screenTargetsRef.current;
      targets.set(target, ref);
      return () => {
        if (targets.get(target) === ref) {
          targets.delete(target);
        }
      };
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(TUTORIAL_STORAGE_KEY)
      .then((value) => {
        if (isMounted && value === null) {
          setActiveTour((current) => current ?? firstRunTour);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [firstRunTour]);

  useEffect(() => {
    // The previous hole stays until the new target is measured, so stepping
    // between neighbouring controls doesn't flash the text across the panel.
    if (!tutorialSpotlightTarget) {
      setSpotlightLayout(null);
      return;
    }
    const targetRef =
      tutorialSpotlightTarget === 'logo'
        ? logoRef.current
        : tutorialSpotlightTarget === 'navSearch'
          ? navSearchRef.current
          : tutorialSpotlightTarget === 'settings'
            ? settingsRef.current
            : tutorialSpotlightTarget === 'footerButtons'
              ? footerRef.current
              : tutorialSpotlightTarget === 'sectionHeader'
                ? sectionHeaderRef.current
                : tutorialSpotlightTarget
                  ? (screenTargetsRef.current.get(tutorialSpotlightTarget)
                      ?.current ?? null)
                  : null;
    if (!targetRef) return;
    let cancelled = false;
    targetRef.measureInWindow(
      (ex: number, ey: number, ew: number, eh: number) => {
        gestureContainerRef.current?.measureInWindow(
          (cx: number, cy: number) => {
            if (!cancelled) {
              setSpotlightLayout({
                x: ex - cx,
                y: ey - cy,
                width: ew,
                height: eh,
              });
            }
          },
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [tutorialSpotlightTarget]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
          // Android owns horizontal edge drags: capturing them here would
          // swallow the system's predictive back gesture.
          if (Platform.OS === 'android') return false;

          // If gesture navigation is disabled, don't capture any gestures
          if (disableGestureNavigation) return false;

          // Capture a clear right-swipe anywhere in the shell.
          // Avoid interfering with vertical scrolling/taps.
          const { dx, dy } = gestureState;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          const wantsBack = dx > 0;
          const wantsForward = dx < 0;

          if (wantsBack && !canGoBack()) return false;
          if (wantsForward && !navigationHistory.canGoForward()) return false;
          if (!wantsBack && !wantsForward) return false;

          // Make it easier to start the gesture, but still bias against vertical scroll.
          if (absDx < 6) return false;
          if (absDx < absDy * 0.9) return false;
          return true;
        },
        onPanResponderRelease: (_evt, gestureState) => {
          const { dx, dy, vx } = gestureState;
          const absDy = Math.abs(dy);

          // Trigger back/forward on a confident horizontal swipe.
          if (dx > 35 && absDy < 60) {
            goBack();
            return;
          }
          if (dx > 25 && vx > 0.25 && absDy < 80) {
            goBack();
            return;
          }

          if (dx < -35 && absDy < 60) {
            navigationHistory.goForward();
            return;
          }
          if (dx < -25 && vx < -0.25 && absDy < 80) {
            navigationHistory.goForward();
          }
        },
      }),
    [navigationHistory, disableGestureNavigation],
  );

  const spotlightShape = spotlightShapeFor(
    tutorialSpotlightTarget,
    spotlightLayout,
  );

  const handleSpotlightTargetChange = useCallback(
    (target?: TutorialSpotlightTarget) => {
      setTutorialSpotlightTarget(target);
    },
    [],
  );

  return (
    <ScreenContainer>
      {/* Edge to edge: the app paints under the status bar and the system
          navigation bar, and the safe-area insets keep content out from under
          them. The bar style follows the in-app theme rather than the OS,
          which the user can have pinned the other way. */}
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      />

      <TutorialSpotlightContext.Provider
        value={{
          target: tutorialSpotlightTarget,
          setSpotlightLayout,
          containerRef: gestureContainerRef,
          navSearchRef,
          sectionHeaderRef,
          registerSpotlightTarget,
          startTour,
          endTour,
          activeTourId: activeTour?.id,
        }}
      >
        <View
          ref={gestureContainerRef}
          style={styles.gestureContainer}
          {...panResponder.panHandlers}
        >
          <View style={styles.shell}>
            {isFullScreenRoute ? null : (
              <AppBar
                logoRef={logoRef}
                searchRef={navSearchRef}
                settingsRef={settingsRef}
                onHomePress={() => navigation.dispatch(StackActions.popToTop())}
                onSearchPress={() => navigation.navigate('Search')}
                onSettingsPress={() => setIsSettingsVisible(true)}
                header={appBarHeader}
              />
            )}

            <SettingsSheetContext.Provider value={settingsSheet}>
              <View style={styles.content}>{children}</View>
            </SettingsSheetContext.Provider>
          </View>

          {isFullScreenRoute ? null : (
            <ShortcutBar
              spotlightRef={footerRef}
              onAlertsPress={() => setIsAlertsVisible(true)}
              onAlertsClose={() => setIsAlertsVisible(false)}
              alertsActive={isAlertsVisible}
            />
          )}

          <TutorialModal
            key={activeTour?.id ?? 'none'}
            visible={activeTour !== null}
            steps={activeTour?.steps}
            spotlight={spotlightShape}
            onComplete={() => finishTour('complete')}
            onSkip={() => finishTour('skip')}
            onSpotlightTargetChange={handleSpotlightTargetChange}
          />
        </View>
      </TutorialSpotlightContext.Provider>

      <AlertsSheet
        visible={isAlertsVisible}
        onClose={() => setIsAlertsVisible(false)}
      />

      <SettingsModal
        visible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
        onManageOfflineMaps={() =>
          navigation.navigate('MapScreen', { library: 'maps' })
        }
        onOpenHelp={() => setIsHelpVisible(true)}
      />

      <HelpModal
        visible={isHelpVisible}
        onClose={() => setIsHelpVisible(false)}
        onLaunchTutorial={() => {
          setIsHelpVisible(false);
          setActiveTour(firstRunTour);
        }}
        onLaunchMapTutorial={() => {
          setIsHelpVisible(false);
          // The Map starts its own tour once its controls are on screen.
          navigation.navigate('MapScreen', { tour: true });
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gestureContainer: {
    flex: 1,
    width: '100%',
  },
  shell: {
    flex: 1,
    alignItems: 'stretch',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'stretch',
  },
});
