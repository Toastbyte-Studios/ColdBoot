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
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Mask, Rect as SvgRect } from 'react-native-svg';
import { useActiveRouteName } from '../hooks/useActiveRouteName';
import { useIsDarkMode } from '../hooks/useIsDarkMode';
import { useTheme } from '../hooks/useTheme';
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
import TutorialModal from './TutorialModal';
import {
  SpotlightLayout,
  TutorialSpotlightContext,
  TutorialSpotlightTarget,
} from './TutorialSpotlightContext';

type Props = PropsWithChildren;

type AppShellNavigationProp = NativeStackNavigationProp<{
  Home: undefined;
  Search: undefined;
  DownloadArea: undefined;
  MapScreen: { library: 'maps' };
}>;

const TUTORIAL_STORAGE_KEY = 'hasSeenTutorial';

/** Breathing room between a spotlit control and the edge of its cut-out. */
const SPOTLIGHT_PADDING = 6;
const SPOTLIGHT_RING_WIDTH = 2.5;

/** A tutorial cut-out, already padded, in the shell's coordinates. */
type SpotlightShapeSpec =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | {
      kind: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      radius: number;
    };

/**
 * The shape the backdrop cuts out around a target: a circle for the round
 * logo, a pill for the app bar's buttons, a rounded box for a section header.
 */
function spotlightShapeFor(
  target: TutorialSpotlightTarget | undefined,
  layout: SpotlightLayout | null,
): SpotlightShapeSpec | null {
  if (!layout || !target || target === 'footerButtons') {
    return null;
  }
  if (target === 'logo') {
    return {
      kind: 'circle',
      cx: layout.x + layout.width / 2,
      cy: layout.y + layout.height / 2,
      r: Math.min(layout.width, layout.height) / 2 + SPOTLIGHT_PADDING,
    };
  }
  const height = layout.height + SPOTLIGHT_PADDING * 2;
  return {
    kind: 'rect',
    x: layout.x - SPOTLIGHT_PADDING,
    y: layout.y - SPOTLIGHT_PADDING,
    width: layout.width + SPOTLIGHT_PADDING * 2,
    height,
    radius: target === 'sectionHeader' ? 8 + SPOTLIGHT_PADDING : height / 2,
  };
}

/** Draws a cut-out shape: filled in the mask, stroked for the ring. */
function SpotlightShape({
  shape,
  fill,
  stroke,
  strokeWidth,
}: {
  shape: SpotlightShapeSpec;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  if (shape.kind === 'circle') {
    return (
      <Circle
        cx={shape.cx}
        cy={shape.cy}
        r={shape.r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  return (
    <SvgRect
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rx={shape.radius}
      ry={shape.radius}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

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
  const COLORS = useTheme();
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
  const [isTutorialVisible, setIsTutorialVisible] = useState(false);
  const [tutorialSpotlightTarget, setTutorialSpotlightTarget] = useState<
    TutorialSpotlightTarget | undefined
  >(undefined);
  const [spotlightLayout, setSpotlightLayout] =
    useState<SpotlightLayout | null>(null);
  const logoRef = useRef<View>(null);
  const gestureContainerRef = useRef<View>(null);
  const navSearchRef = useRef<View>(null);
  const settingsRef = useRef<View>(null);
  const sectionHeaderRef = useRef<View>(null);

  const markTutorialComplete = () => {
    AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
      .catch(() => {
        // Ignore persistence failures so users are not blocked in the tutorial.
      })
      .finally(() => {
        setIsTutorialVisible(false);
      });
  };

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(TUTORIAL_STORAGE_KEY)
      .then((value) => {
        if (isMounted && value === null) {
          setIsTutorialVisible(true);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setSpotlightLayout(null);
    const targetRef =
      tutorialSpotlightTarget === 'logo'
        ? logoRef.current
        : tutorialSpotlightTarget === 'navSearch'
          ? navSearchRef.current
          : tutorialSpotlightTarget === 'settings'
            ? settingsRef.current
            : tutorialSpotlightTarget === 'sectionHeader'
              ? sectionHeaderRef.current
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

          {isTutorialVisible && (
            <Svg
              width="100%"
              height="100%"
              pointerEvents="none"
              style={styles.tutorialBackdrop}
            >
              <Defs>
                <Mask id="backdropMask">
                  <SvgRect
                    x="-1000"
                    y="-1000"
                    width="5000"
                    height="5000"
                    fill="white"
                  />
                  {spotlightShape ? (
                    <SpotlightShape shape={spotlightShape} fill="black" />
                  ) : null}
                </Mask>
              </Defs>
              <SvgRect
                x="-1000"
                y="-1000"
                width="5000"
                height="5000"
                fill="rgba(0,0,0,0.65)"
                mask="url(#backdropMask)"
              />
              {/* An accent ring draws the eye to the cut-out. */}
              {spotlightShape ? (
                <SpotlightShape
                  shape={spotlightShape}
                  fill="none"
                  stroke={COLORS.ACCENT}
                  strokeWidth={SPOTLIGHT_RING_WIDTH}
                />
              ) : null}
            </Svg>
          )}

          {isFullScreenRoute ? null : (
            <View
              style={
                tutorialSpotlightTarget === 'footerButtons'
                  ? styles.spotlightTarget
                  : undefined
              }
            >
              <ShortcutBar
                onAlertsPress={() => setIsAlertsVisible(true)}
                onAlertsClose={() => setIsAlertsVisible(false)}
                alertsActive={isAlertsVisible}
              />
            </View>
          )}

          <TutorialModal
            visible={isTutorialVisible}
            onComplete={markTutorialComplete}
            onSkip={markTutorialComplete}
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
          setIsTutorialVisible(true);
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
  tutorialBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  spotlightTarget: {
    position: 'relative',
    zIndex: 200,
    elevation: 200,
  },
});
