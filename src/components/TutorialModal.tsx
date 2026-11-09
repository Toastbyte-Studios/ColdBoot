import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Text as RNText,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MODULES } from '../../constants';
import { useTheme } from '../hooks/useTheme';
import { withAlpha } from '../theme/colorUtils';
import { FOOTER_HEIGHT, SPACING } from '../theme/constants';
import AppButton from './AppButton';
import { TutorialSpotlightTarget } from './TutorialSpotlightContext';

interface TutorialModalProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onSpotlightTargetChange?: (target?: TutorialSpotlightTarget) => void;
}

/** A short line under a step's description, with its own icon. */
interface TutorialTip {
  icon: string;
  text: string;
}

export interface TutorialStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  spotlightTarget?: TutorialSpotlightTarget;
  tips?: TutorialTip[];
  /** Shows a chip for each module, read from MODULES so it can't drift. */
  showModules?: boolean;
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
    description: 'Replay this tour any time from Settings → Help & tutorial.',
  },
];

const TUTORIAL_CARD_BOTTOM_GAP = 5;
const TUTORIAL_CARD_BOTTOM_OFFSET = FOOTER_HEIGHT + TUTORIAL_CARD_BOTTOM_GAP;
/** How far a step slides in from, in the direction of travel. */
const STEP_SLIDE_DISTANCE = 18;
const STEP_ANIMATION_MS = 220;

export default function TutorialModal({
  visible,
  onComplete,
  onSkip,
  onSpotlightTargetChange,
}: TutorialModalProps) {
  const COLORS = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(1)).current;
  const direction = useRef<1 | -1>(1);
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const step = TUTORIAL_STEPS[currentStep];
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

  const stepLabel = `Step ${currentStep + 1} of ${TUTORIAL_STEPS.length}`;

  return (
    <View style={styles.overlay}>
      <View style={styles.cardContainer}>
        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              backgroundColor: COLORS.SURFACE,
              borderColor: COLORS.BORDER,
              shadowColor: COLORS.PRIMARY_DARK,
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
            {TUTORIAL_STEPS.map((tutorialStep, index) => (
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

          <Animated.View style={[styles.contentViewport, stepTransform]}>
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
            >
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: withAlpha(COLORS.BRAND, 0.12) },
                ]}
              >
                <Ionicons name={step.icon} size={34} color={COLORS.BRAND} />
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
                    <View key={tip.text} style={styles.tipRow}>
                      <Ionicons
                        name={tip.icon}
                        size={18}
                        color={COLORS.SECONDARY_ACCENT}
                      />
                      <RNText style={[styles.tipText, { color: COLORS.MUTED }]}>
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
                        size={16}
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
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    // AppShell renders this inside a full-screen flex container, so
    // absolute fill correctly covers the active app viewport.
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20 + TUTORIAL_CARD_BOTTOM_OFFSET,
    zIndex: 300,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '100%',
  },
  card: {
    width: '100%',
    maxHeight: '100%',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: SPACING.md,
    paddingBottom: 20,
    flexShrink: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  contentViewport: {
    flex: 1,
    minHeight: 0,
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 20,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  tips: {
    alignSelf: 'stretch',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
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
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  moduleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  footerButton: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
});
