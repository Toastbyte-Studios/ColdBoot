import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Vibration } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FlashlightModes } from '../../../../constants';
import { useTheme } from '../../../hooks/useTheme';
import { useSignalingStore } from '../../../stores/StoreContext';
import { onColor } from '../../../theme/colorUtils';
import { Text } from '../../ScaledText';
import Touchable from '../../Touchable';

interface SOSTriggerProps {
  /**
   * Callback fired when the pressing state changes.
   * Used by parent to show/hide the fuse timer overlay.
   */
  onPressingChange?: (isPressing: boolean) => void;
  /**
   * Callback to receive the progress animation value.
   * Called once on mount to provide the animated value for the fuse timer.
   */
  onProgressAnimRef?: (anim: Animated.Value) => void;
}

/**
 * SOSTrigger component handles the emergency SOS activation with a long-press gesture.
 *
 * @remarks
 * - Requires a 1-second hold to activate SOS mode
 * - Provides haptic feedback on press and activation
 * - Exposes pressing state and progress animation for parent's fuse timer overlay
 * - Automatically cleans up timers and animations on unmount
 *
 * @param onPressingChange - Callback when pressing state changes
 * @param onProgressAnimRef - Callback to receive the progress animation value
 * @returns A React element rendering the SOS trigger button
 */
const SOSTrigger = ({
  onPressingChange,
  onProgressAnimRef,
}: SOSTriggerProps) => {
  const core = useSignalingStore();
  const COLORS = useTheme();
  const [isSOSPressing, setIsSOSPressing] = useState(false);
  const sosTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sosProgressAnim = useRef(new Animated.Value(0)).current;
  const sosAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Provide the progress animation to parent on mount
  useEffect(() => {
    onProgressAnimRef?.(sosProgressAnim);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent when pressing state changes
  useEffect(() => {
    onPressingChange?.(isSOSPressing);
  }, [isSOSPressing, onPressingChange]);

  // Handle SOS long press (1 second)
  const handleSOSPressIn = () => {
    setIsSOSPressing(true);

    // Haptic feedback on press
    Vibration.vibrate(50);

    // Start progress animation
    sosAnimationRef.current = Animated.timing(sosProgressAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    });
    sosAnimationRef.current.start();

    sosTimerRef.current = setTimeout(() => {
      // Trigger SOS with tone enabled
      core.setSosWithTone(true);
      core.setFlashlightMode(FlashlightModes.SOS);
      setIsSOSPressing(false);
      sosProgressAnim.setValue(0);

      // Haptic feedback on activation
      Vibration.vibrate(200);
    }, 1000); // 1 second
  };

  const handleSOSPressOut = () => {
    setIsSOSPressing(false);

    // Stop animation if it's running
    if (sosAnimationRef.current) {
      sosAnimationRef.current.stop();
      sosAnimationRef.current = null;
    }

    sosProgressAnim.setValue(0);
    if (sosTimerRef.current) {
      clearTimeout(sosTimerRef.current);
      sosTimerRef.current = null;
    }
  };

  // Shared activation logic used by the hold timer and accessibility path
  const activateSOS = useCallback(() => {
    core.setSosWithTone(true);
    core.setFlashlightMode(FlashlightModes.SOS);
    Vibration.vibrate(200);
  }, [core]);

  // Accessibility action handler — shows a confirmation dialog so assistive-
  // tech users can trigger SOS intentionally without a physical hold
  const handleAccessibilityAction = useCallback(
    ({ nativeEvent }: { nativeEvent: { actionName: string } }) => {
      if (nativeEvent.actionName === 'activate') {
        Alert.alert(
          'Activate SOS?',
          'This will enable SOS flashlight mode with tone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Activate', style: 'destructive', onPress: activateSOS },
          ],
        );
      }
    },
    [activateSOS],
  );

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Stop animation if it's running
      if (sosAnimationRef.current) {
        sosAnimationRef.current.stop();
        sosAnimationRef.current = null;
      }

      sosProgressAnim.setValue(0);
      if (sosTimerRef.current) {
        clearTimeout(sosTimerRef.current);
        sosTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const surface = isSOSPressing ? COLORS.ACCENT : COLORS.ERROR;
  const contentColor = onColor(surface);

  return (
    <Touchable
      onPressIn={handleSOSPressIn}
      onPressOut={handleSOSPressOut}
      accessibilityLabel="Emergency SOS - Hold for 1 Second to Activate"
      accessibilityRole="button"
      accessibilityActions={[{ name: 'activate', label: 'Activate SOS' }]}
      onAccessibilityAction={handleAccessibilityAction}
      rippleColor={contentColor}
      style={[styles.sosSection, { backgroundColor: surface }]}
    >
      <Ionicons name="warning-outline" size={24} color={contentColor} />
      <Text style={[styles.sosText, { color: contentColor }]}>SOS</Text>
    </Touchable>
  );
};

export default observer(SOSTrigger);

const styles = StyleSheet.create({
  sosSection: {
    width: '25%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    gap: 2,
  },
  sosText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
