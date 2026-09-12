import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
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
  Pressable,
  StyleSheet,
  View,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Mask, Rect as SvgRect } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useKeyboardStatus } from '../hooks/useKeyboardStatus';
import { useTheme } from '../hooks/useTheme';
import {
  useNavigationHistory,
  useGestureNavigation,
} from '../navigation/NavigationHistoryContext';
import canGoBack, { goBack } from '../navigation/navigationRef';
import { SCREEN_GUTTER } from '../theme';
import { withAlpha } from '../theme/colorUtils';
import AlertsSheet from './AlertsSheet';
import { HelpModal } from './HelpModal';
import LogoHeader from './LogoHeader';
import { ManageOfflineMapsModal } from './ManageOfflineMapsModal';
import { Text } from './ScaledText';
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

const DATE_FORMAT = 'dddd, MMMM D';
const TUTORIAL_STORAGE_KEY = 'hasSeenTutorial';

/** Edge length of the nav bar's circular icon buttons. */
const NAV_BUTTON = 34;

/**
 * Root layout wrapper for the app.
 *
 * Provides:
 * - A compact nav bar: the app mark, the wordmark over today's date, and the
 *   search and settings buttons.
 * - A bottom tab bar with the floating SOS action.
 * - Global horizontal swipe navigation via a `PanResponder` on the outer
 *   container: right swipes {@link goBack}, left swipes go forward.
 *
 * The header this replaces spent roughly 260px on a date, two icon buttons, a
 * 120px logo circle and a full-width bar that was secretly the search field.
 * The same affordances now fit in one 34px-tall row, which is the space the
 * solar card and module list took over.
 *
 * Gesture behavior:
 * - Requires minimum horizontal movement and favors horizontal intent over
 *   vertical, so it does not fight scrolling or taps.
 * - On release, navigates only on "confident" swipes, using distance (`dx`),
 *   velocity (`vx`) and vertical displacement (`dy`) thresholds.
 *
 * @param props.children - Screen content to render inside the shell.
 */
export default function AppShell({ children }: Props) {
  const navigation = useNavigation<AppShellNavigationProp>();
  const navigationHistory = useNavigationHistory();
  const { disableGestureNavigation } = useGestureNavigation();
  const { isKeyboardVisible, keyboardHeight } = useKeyboardStatus();
  const insets = useSafeAreaInsets();
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
  const sectionHeaderRef = useRef<View>(null);
  const [currentDate, setCurrentDate] = useState(() =>
    dayjs().format(DATE_FORMAT),
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const COLORS = useTheme();

  const markTutorialComplete = () => {
    AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
      .catch(() => {
        // Ignore persistence failures so users are not blocked in the tutorial.
      })
      .finally(() => {
        setIsTutorialVisible(false);
      });
  };

  // Keep `currentDate` in sync with the calendar date by scheduling a timeout
  // to fire exactly at the next midnight. When the timeout runs, it updates
  // the formatted date and then reschedules itself for the following midnight.
  // The cleanup function clears any pending timeout when the component unmounts.
  useEffect(() => {
    const scheduleNextUpdate = () => {
      const now = dayjs();
      const tomorrow = now.add(1, 'day').startOf('day');
      const msUntilMidnight = tomorrow.diff(now);

      timeoutRef.current = setTimeout(() => {
        setCurrentDate(dayjs().format(DATE_FORMAT));
        scheduleNextUpdate();
      }, msUntilMidnight);
    };

    scheduleNextUpdate();

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

  const navButtonStyle = [
    styles.navButton,
    {
      backgroundColor: withAlpha(COLORS.BRAND, 0.1),
      borderColor: withAlpha(COLORS.BRAND, 0.18),
    },
  ];

  return (
    <ScreenContainer>
      <TutorialSpotlightContext.Provider
        value={{
          target: tutorialSpotlightTarget,
          setSpotlightLayout,
          containerRef: gestureContainerRef,
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
            <View style={[styles.navBar, { paddingTop: insets.top + 14 }]}>
              <Pressable
                ref={logoRef}
                onPress={() => navigation.navigate('Home')}
                accessibilityLabel="Go to home screen"
                accessibilityRole="button"
                style={({ pressed }) => (pressed ? styles.pressed : null)}
              >
                <LogoHeader size={NAV_BUTTON} />
              </Pressable>

              <View style={styles.navTitles}>
                <Text style={[styles.wordmark, { color: COLORS.PRIMARY_DARK }]}>
                  ColdBoot
                </Text>
                <Text
                  style={[styles.navDate, { color: COLORS.MUTED }]}
                  accessibilityLabel={`Current date: ${currentDate}`}
                >
                  {currentDate} · Offline ready
                </Text>
              </View>

              <Pressable
                onPress={() => navigation.navigate('Search')}
                accessibilityRole="button"
                accessibilityLabel="Search"
                style={({ pressed }) => [
                  navButtonStyle,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={17}
                  color={COLORS.BRAND}
                />
              </Pressable>

              <Pressable
                onPress={() => setIsSettingsVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={({ pressed }) => [
                  navButtonStyle,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={17}
                  color={COLORS.BRAND}
                />
              </Pressable>
            </View>

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

          <View
            style={
              tutorialSpotlightTarget === 'footerButtons'
                ? styles.spotlightTarget
                : undefined
            }
          >
            <TabBar
              onAlertsPress={() => setIsAlertsVisible(true)}
              alertsActive={isAlertsVisible}
            />
            <SOSFab />
          </View>

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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: SCREEN_GUTTER,
    paddingBottom: 10,
  },
  navTitles: {
    flex: 1,
  },
  wordmark: {
    fontSize: 17,
    fontFamily: 'Bitter-Bold',
    letterSpacing: -0.2,
  },
  navDate: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  navButton: {
    width: NAV_BUTTON,
    height: NAV_BUTTON,
    borderRadius: NAV_BUTTON / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
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
