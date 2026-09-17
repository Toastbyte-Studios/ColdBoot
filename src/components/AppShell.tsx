import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, {
  PropsWithChildren,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  View,
  Easing,
} from 'react-native';
import Svg, { Circle, Defs, Mask, Rect as SvgRect } from 'react-native-svg';
import { useActiveRouteName } from '../hooks/useActiveRouteName';
import { useIsDarkMode } from '../hooks/useIsDarkMode';
import { useKeyboardStatus } from '../hooks/useKeyboardStatus';
import {
  useNavigationHistory,
  useGestureNavigation,
} from '../navigation/NavigationHistoryContext';
import canGoBack, { goBack } from '../navigation/navigationRef';
import AlertsSheet from './AlertsSheet';
import AppBar from './AppBar';
import { HelpModal } from './HelpModal';
import { ManageOfflineMapsModal } from './ManageOfflineMapsModal';
import ScreenContainer from './ScreenContainer';
import { SettingsModal } from './SettingsModal';
import SOSFab from './SOSFab';
import TabBar from './TabBar';
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
}>;

const TUTORIAL_STORAGE_KEY = 'hasSeenTutorial';

/**
 * Routes that take the whole window on Android, with no app bar and no bottom
 * chrome of their own.
 *
 * Material's search is a full-screen view, not a screen with a search field on
 * it: it takes over the window for as long as the user is searching. Its own
 * search bar carries the back arrow, so the app bar would be a second one, and
 * the navigation bar and SOS button would be destinations competing with the
 * thing the user just opened.
 */
const FULL_SCREEN_ROUTES = new Set(['Search']);

/**
 * Root layout wrapper for the app.
 *
 * Provides:
 * - A top app bar ({@link AppBar}), which each platform draws its own way.
 * - A bottom tab bar with the floating SOS action.
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
export default function AppShell({ children }: Props) {
  const navigation = useNavigation<AppShellNavigationProp>();
  const navigationHistory = useNavigationHistory();
  const { disableGestureNavigation } = useGestureNavigation();
  const { isKeyboardVisible, keyboardHeight } = useKeyboardStatus();
  const activeRouteName = useActiveRouteName();
  const isDarkMode = useIsDarkMode();
  const isFullScreenRoute =
    Platform.OS === 'android' &&
    activeRouteName !== undefined &&
    FULL_SCREEN_ROUTES.has(activeRouteName);
  const translateYRef = useRef(new Animated.Value(0)).current;
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isManageOfflineVisible, setIsManageOfflineVisible] = useState(false);
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
    Animated.timing(translateYRef, {
      toValue: isKeyboardVisible ? -keyboardHeight : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isKeyboardVisible, keyboardHeight, translateYRef]);

  useEffect(() => {
    setSpotlightLayout(null);
    const targetRef =
      tutorialSpotlightTarget === 'logo'
        ? logoRef.current
        : tutorialSpotlightTarget === 'navSearch'
          ? navSearchRef.current
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
          <Animated.View
            style={[
              styles.shell,
              { transform: [{ translateY: translateYRef }] },
            ]}
          >
            {isFullScreenRoute ? null : (
              <AppBar
                logoRef={logoRef}
                searchRef={navSearchRef}
                onHomePress={() => navigation.navigate('Home')}
                onSearchPress={() => navigation.navigate('Search')}
                onSettingsPress={() => setIsSettingsVisible(true)}
              />
            )}

            <View style={styles.content}>{children}</View>
          </Animated.View>

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
                  {spotlightLayout && tutorialSpotlightTarget === 'logo' && (
                    <Circle
                      cx={spotlightLayout.x + spotlightLayout.width / 2}
                      cy={spotlightLayout.y + spotlightLayout.height / 2}
                      r={
                        Math.min(
                          spotlightLayout.width,
                          spotlightLayout.height,
                        ) / 2
                      }
                      fill="black"
                    />
                  )}
                  {spotlightLayout &&
                    tutorialSpotlightTarget === 'navSearch' && (
                      <SvgRect
                        x={spotlightLayout.x}
                        y={spotlightLayout.y}
                        width={spotlightLayout.width}
                        height={spotlightLayout.height}
                        rx={spotlightLayout.height / 2}
                        ry={spotlightLayout.height / 2}
                        fill="black"
                      />
                    )}
                  {spotlightLayout &&
                    tutorialSpotlightTarget === 'sectionHeader' && (
                      <SvgRect
                        x={spotlightLayout.x}
                        y={spotlightLayout.y}
                        width={spotlightLayout.width}
                        height={spotlightLayout.height}
                        rx={8}
                        ry={8}
                        fill="black"
                      />
                    )}
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
              <TabBar
                onAlertsPress={() => setIsAlertsVisible(true)}
                onAlertsClose={() => setIsAlertsVisible(false)}
                alertsActive={isAlertsVisible}
              />
              <SOSFab />
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
        onManageOfflineMaps={() => setIsManageOfflineVisible(true)}
        onOpenHelp={() => setIsHelpVisible(true)}
      />

      <ManageOfflineMapsModal
        visible={isManageOfflineVisible}
        onClose={() => setIsManageOfflineVisible(false)}
        onDownloadArea={() => navigation.navigate('DownloadArea')}
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
