import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Text as RNText,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Mask, Rect as SvgRect } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MODULES } from '../../constants';
import { useTheme } from '../hooks/useTheme';
import { withAlpha } from '../theme/colorUtils';
import { SPACING } from '../theme/constants';
import AppButton from './AppButton';
import { SpotlightShapeSpec, tutorialPanelLayout } from './tutorialLayout';
import type {
  TutorialSpotlightTarget,
  TutorialStep,
} from './TutorialSpotlightContext';

export type { TutorialStep } from './TutorialSpotlightContext';

interface TutorialModalProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onSpotlightTargetChange?: (target?: TutorialSpotlightTarget) => void;
  /** Defaults to the first-run tour. */
  steps?: TutorialStep[];
  /**
   * The hole to cut in the panel, where the step points. Measured by
   * AppShell in the shell's coordinates, which this overlay shares.
   */
  spotlight?: SpotlightShapeSpec | null;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    icon: 'sparkles-outline',
    title: 'Welcome to ColdBoot',
    description:
      'Your field kit for the outdoors and for when the grid goes down. Here is a quick tour.',
    tips: [
      { icon: 'cloud-offline-outline', text: 'Works without signal' },
      {
        icon: 'phone-portrait-outline',
        text: 'Everything is saved on this phone',
      },
      { icon: 'time-outline', text: 'The tour takes about a minute' },
    ],
  },
  // Screen-to-screen swiping is iOS only: on Android the edge drag belongs to
  // the system back gesture (see AppShell), so that step says so instead.
  Platform.OS === 'android'
    ? {
        id: 'back',
        icon: 'arrow-back-outline',
        title: 'Go Back',
        description:
          "Use your phone's back gesture or button to return to the previous screen.",
      }
    : {
        id: 'back',
        icon: 'swap-horizontal-outline',
        title: 'Swipe to Navigate',
        description: 'Swipe left or right to move between sections and tools.',
        tips: [
          { icon: 'arrow-forward-outline', text: 'Swipe right to go back' },
          {
            icon: 'arrow-back-outline',
            text: 'Swipe left to go forward again',
          },
        ],
      },
  {
    id: 'logo',
    icon: 'home-outline',
    title: 'Tap the Logo',
    description: 'Tap the ColdBoot logo any time to return to the home screen.',
    spotlightTarget: 'logo',
  },
  {
    id: 'search',
    icon: 'search-outline',
    title: 'Find Anything',
    description:
      'Tap the search button in the header to search every tool and reference.',
    spotlightTarget: 'navSearch',
  },
  {
    id: 'settings',
    icon: 'settings-outline',
    title: 'Make It Yours',
    description:
      'Settings holds your theme, text size, shortcuts, offline maps and backups.',
    spotlightTarget: 'settings',
    tips: [
      {
        icon: 'help-circle-outline',
        text: 'Help and this tour live there too',
      },
    ],
  },
  {
    id: 'shortcuts',
    icon: 'notifications-outline',
    title: 'Shortcuts',
    description:
      'Your most-used tools and Alerts, one tap away. Change them in Settings.',
    spotlightTarget: 'footerButtons',
  },
  {
    id: 'modules',
    icon: 'layers-outline',
    title: 'Modules',
    description: 'Every tool lives in one of these modules on the home screen.',
    showModules: true,
  },
  {
    id: 'prepare',
    icon: 'cloud-download-outline',
    title: 'Prepare Before You Go',
    description:
      'Maps only work offline once they are downloaded, so save your area while you still have signal.',
    tips: [
      { icon: 'compass-outline', text: 'Open Map in the Navigation module' },
      { icon: 'library-outline', text: 'Tap Library, then Maps' },
      { icon: 'download-outline', text: 'Download your area or pick one' },
    ],
  },
  {
    id: 'done',
    icon: 'checkmark-circle-outline',
    title: "You're Ready",
    description:
      'Replay this tour any time from Settings → Help & tutorial. The Map has a short tour of its own the first time you open it.',
  },
];

/** How far a step slides in from, in the direction of travel. */
const STEP_SLIDE_DISTANCE = 18;
const STEP_ANIMATION_MS = 220;
const PANEL_RADIUS = 28;
const RING_WIDTH = 3;
/** The app shows dimly around the panel's edges, as with any sheet. */
const SCRIM = 'rgba(0, 0, 0, 0.6)';

/** Draws a hole: filled in the mask, stroked for the ring around it. */
function HoleShape({
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

export default function TutorialModal({
  visible,
  onComplete,
  onSkip,
  onSpotlightTargetChange,
  steps = TUTORIAL_STEPS,
  spotlight = null,
}: TutorialModalProps) {
  const COLORS = useTheme();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [currentStep, setCurrentStep] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(1)).current;
  const direction = useRef<1 | -1>(1);
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const step = steps[Math.min(currentStep, steps.length - 1)];
  const spotlightTarget = step.spotlightTarget;

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
    }
  }, [visible]);

  useEffect(() => {
    let mounted = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        // Only an "on" answer changes anything, so skip the re-render otherwise.
        if (mounted && enabled) setReduceMotion(true);
      })
      .catch(() => {});
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    onSpotlightTargetChange?.(visible ? spotlightTarget : undefined);
  }, [onSpotlightTargetChange, spotlightTarget, visible]);

  // Each step fades and slides in from the side it came from.
  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: STEP_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [currentStep, progress, reduceMotion]);

  if (!visible) {
    return null;
  }

  const goTo = (next: number) => {
    direction.current = next > currentStep ? 1 : -1;
    setCurrentStep(next);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  // A step's hole only shows once this step's target has been measured;
  // until then the text has the whole panel.
  const layout = tutorialPanelLayout({
    width: size.width,
    height: size.height,
    insets,
    shape: step.spotlightTarget ? spotlight : null,
  });
  const { panel, hole, content } = layout;

  const stepTransform = {
    opacity: progress,
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [STEP_SLIDE_DISTANCE * direction.current, 0],
        }),
      },
    ],
  };

  const stepLabel = `Step ${currentStep + 1} of ${steps.length}`;

  return (
    // Fills the shell and swallows every touch: the app underneath, even
    // what shows through the hole, waits until the tour is over.
    <View style={styles.overlay} onLayout={handleLayout}>
      {size.width > 0 ? (
        <Svg
          width={size.width}
          height={size.height}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <Mask id="tutorialHole">
              <SvgRect
                x={0}
                y={0}
                width={size.width}
                height={size.height}
                fill="white"
              />
              {hole ? <HoleShape shape={hole} fill="black" /> : null}
            </Mask>
          </Defs>
          <SvgRect
            x={0}
            y={0}
            width={size.width}
            height={size.height}
            fill={SCRIM}
            mask="url(#tutorialHole)"
          />
          <SvgRect
            x={panel.x}
            y={panel.y}
            width={panel.width}
            height={panel.height}
            rx={PANEL_RADIUS}
            ry={PANEL_RADIUS}
            fill={COLORS.SURFACE}
            stroke={COLORS.BORDER}
            strokeWidth={StyleSheet.hairlineWidth}
            mask="url(#tutorialHole)"
          />
          {/* An accent ring draws the eye to what shows through. */}
          {hole ? (
            <HoleShape
              shape={hole}
              fill="none"
              stroke={COLORS.ACCENT}
              strokeWidth={RING_WIDTH}
            />
          ) : null}
        </Svg>
      ) : null}

      <View
        accessibilityViewIsModal
        style={[
          styles.content,
          {
            left: content.x,
            top: content.y,
            width: content.width,
            height: content.height,
          },
        ]}
      >
        <View style={styles.header}>
          <RNText
            style={[styles.eyebrow, { color: COLORS.MUTED }]}
            accessibilityLabel={stepLabel}
          >
            {stepLabel.toUpperCase()}
          </RNText>
          {!isLastStep && (
            <AppButton
              label="Skip"
              variant="plain"
              size="small"
              onPress={onSkip}
              accessibilityLabel="Skip tutorial"
            />
          )}
        </View>

        <View
          style={styles.progressTrack}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {steps.map((tutorialStep, index) => (
            <View
              key={tutorialStep.id}
              style={[
                styles.progressSegment,
                {
                  backgroundColor:
                    index <= currentStep
                      ? COLORS.BRAND
                      : withAlpha(COLORS.BRAND, 0.18),
                },
              ]}
            />
          ))}
        </View>

        <Animated.View style={[styles.stepViewport, stepTransform]}>
          <ScrollView
            style={styles.stepScroll}
            contentContainerStyle={styles.stepBody}
          >
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: withAlpha(COLORS.BRAND, 0.12) },
              ]}
            >
              <Ionicons name={step.icon} size={48} color={COLORS.BRAND} />
            </View>
            <RNText
              style={[styles.title, { color: COLORS.PRIMARY_DARK }]}
              accessibilityRole="header"
            >
              {step.title}
            </RNText>
            <RNText
              style={[styles.description, { color: COLORS.PRIMARY_DARK }]}
              accessibilityLabel={step.description}
            >
              {step.description}
            </RNText>

            {step.tips ? (
              <View style={styles.tips}>
                {step.tips.map((tip) => (
                  <View
                    key={tip.text}
                    style={[
                      styles.tipRow,
                      { backgroundColor: withAlpha(COLORS.BRAND, 0.06) },
                    ]}
                  >
                    <Ionicons
                      name={tip.icon}
                      size={22}
                      color={COLORS.SECONDARY_ACCENT}
                    />
                    <RNText
                      style={[styles.tipText, { color: COLORS.PRIMARY_DARK }]}
                    >
                      {tip.text}
                    </RNText>
                  </View>
                ))}
              </View>
            ) : null}

            {step.showModules ? (
              <View style={styles.modules}>
                {MODULES.map((module) => (
                  <View
                    key={module.id}
                    style={[
                      styles.moduleChip,
                      {
                        backgroundColor: withAlpha(COLORS.BRAND, 0.08),
                        borderColor: withAlpha(COLORS.BRAND, 0.2),
                      },
                    ]}
                  >
                    <Ionicons
                      name={module.icon}
                      size={18}
                      color={COLORS.BRAND}
                    />
                    <RNText
                      style={[
                        styles.moduleLabel,
                        { color: COLORS.PRIMARY_DARK },
                      ]}
                    >
                      {module.name}
                    </RNText>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>

        <View style={styles.footer}>
          {isFirstStep ? null : (
            <AppButton
              label="Back"
              variant="tinted"
              size="large"
              icon="chevron-back-outline"
              onPress={() => goTo(currentStep - 1)}
              accessibilityLabel="Previous tutorial step"
              style={styles.footerButton}
            />
          )}
          <AppButton
            label={
              isLastStep ? 'Get Started' : isFirstStep ? 'Start Tour' : 'Next'
            }
            size="large"
            onPress={() => {
              if (isLastStep) {
                onComplete();
                return;
              }
              goTo(currentStep + 1);
            }}
            accessibilityLabel={
              isLastStep ? 'Finish tutorial' : 'Next tutorial step'
            }
            style={styles.footerButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    // AppShell renders this last in its full-screen container, so absolute
    // fill covers the whole app, app bar and shortcut bar included.
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
  },
  content: {
    position: 'absolute',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
  },
  stepViewport: {
    flex: 1,
    minHeight: 0,
  },
  stepScroll: {
    flex: 1,
  },
  stepBody: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  iconBadge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    maxWidth: 520,
  },
  tips: {
    alignSelf: 'stretch',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 14,
  },
  tipText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 23,
  },
  modules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  moduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  moduleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingTop: SPACING.md,
  },
  footerButton: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
});
