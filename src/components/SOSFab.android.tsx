import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FlashlightModes } from '../../constants';
import { useTheme } from '../hooks/useTheme';
import { useSignalingStore } from '../stores/StoreContext';
import { FOOTER_HEIGHT, RADIUS, SOS_SIZE } from '../theme';
import { onColor } from '../theme/colorUtils';
import { Text } from './ScaledText';

const HOLD_DURATION_MS = 1000;

/** Opacity of the white sweep that fills the FAB during the hold. */
const PROGRESS_OPACITY = 0.24;

/**
 * The emergency action, as a Material 3 extended FAB.
 *
 * Extended rather than circular because a Material FAB carries its label when
 * the action is critical and infrequent, and this one is both: a user reaching
 * for it has never pressed it before and cannot afford to guess.
 *
 * Behaviour is carried over from the footer's `SOSTrigger` unchanged — a
 * one-second hold, a 50ms haptic on press and 200ms on fire, and an `activate`
 * accessibility action with a confirmation dialog so assistive-tech users can
 * trigger it without a physical hold.
 *
 * Only the progress indicator differs from iOS. A ring stroked round the edge
 * suits a circle; on a 56dp lozenge it would be a stretched oval, so the hold
 * is drawn as a white sweep filling the FAB left to right instead.
 */
const SOSFab = observer(() => {
  const core = useSignalingStore();
  const COLORS = useTheme();
  const insets = useSafeAreaInsets();
  const [isPressing, setIsPressing] = useState(false);
  const [width, setWidth] = useState(0);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const cancelHold = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    progress.setValue(0);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, [progress]);

  const activateSOS = useCallback(() => {
    core.setSosWithTone(true);
    core.setFlashlightMode(FlashlightModes.SOS);
    Vibration.vibrate(200);
  }, [core]);

  const handlePressIn = () => {
    setIsPressing(true);
    Vibration.vibrate(50);

    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      // Linear: the sweep is a clock, and any easing would misreport how much
      // of the hold is left.
      easing: Easing.linear,
      // Drives width, which the native driver cannot animate.
      useNativeDriver: false,
    });
    animationRef.current.start();

    holdTimerRef.current = setTimeout(() => {
      activateSOS();
      setIsPressing(false);
      cancelHold();
    }, HOLD_DURATION_MS);
  };

  const handlePressOut = () => {
    setIsPressing(false);
    cancelHold();
  };

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

  useEffect(() => cancelHold, [cancelHold]);

  const sweepWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
  });
  const foreground = onColor(COLORS.ERROR);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityLabel="Emergency SOS - Hold for 1 Second to Activate"
      accessibilityRole="button"
      accessibilityActions={[{ name: 'activate', label: 'Activate SOS' }]}
      onAccessibilityAction={handleAccessibilityAction}
      style={[
        styles.fab,
        {
          // The FAB floats above the navigation bar rather than inside it.
          bottom: FOOTER_HEIGHT + insets.bottom + 14,
          backgroundColor: COLORS.ERROR,
        },
      ]}
    >
      {isPressing ? (
        <Animated.View
          style={[
            styles.sweep,
            { width: sweepWidth, backgroundColor: foreground },
          ]}
          pointerEvents="none"
        />
      ) : null}

      <View style={styles.content} pointerEvents="none">
        <Ionicons name="warning-outline" size={24} color={foreground} />
        <Text style={[styles.label, { color: foreground }]}>SOS</Text>
      </View>
    </Pressable>
  );
});

export default SOSFab;

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    minHeight: SOS_SIZE,
    paddingHorizontal: 20,
    borderRadius: RADIUS.sos,
    alignItems: 'center',
    justifyContent: 'center',
    // Clips the hold sweep to the FAB's corners.
    overflow: 'hidden',
    // M3 level 3.
    elevation: 6,
  },
  sweep: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    opacity: PROGRESS_OPACITY,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
