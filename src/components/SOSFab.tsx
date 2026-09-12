import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FlashlightModes } from '../../constants';
import { useTheme } from '../hooks/useTheme';
import { useSignalingStore } from '../stores/StoreContext';
import { RADIUS, SOS_SIZE } from '../theme';
import { Text } from './ScaledText';

const HOLD_DURATION_MS = 1000;

/** Ring geometry: inset 2px from the edge so the stroke sits inside the circle. */
const RING_RADIUS = SOS_SIZE / 2 - 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The floating emergency action.
 *
 * Behaviour is carried over from the footer's `SOSTrigger` unchanged — a
 * one-second hold, a 50ms haptic on press and 200ms on fire, and an `activate`
 * accessibility action with a confirmation dialog so assistive-tech users can
 * trigger it without a physical hold. Only the shape and the progress
 * indicator are new.
 *
 * Progress is drawn as a ring stroking clockwise around the button's own edge,
 * rather than the old left-to-right fill that swept across the neighbouring
 * notification zone. The feedback now belongs to the control the finger is on.
 */
const SOSFab = observer(() => {
  const core = useSignalingStore();
  const COLORS = useTheme();
  const insets = useSafeAreaInsets();
  const [isPressing, setIsPressing] = useState(false);

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
      // Drives an SVG stroke, which the native driver cannot animate.
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

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel="Emergency SOS - Hold for 1 Second to Activate"
      accessibilityRole="button"
      accessibilityActions={[{ name: 'activate', label: 'Activate SOS' }]}
      onAccessibilityAction={handleAccessibilityAction}
      style={[
        styles.fab,
        {
          bottom: 24 + insets.bottom,
          backgroundColor: COLORS.ERROR,
          shadowColor: COLORS.ERROR,
        },
      ]}
    >
      {isPressing ? (
        <Svg
          width={SOS_SIZE}
          height={SOS_SIZE}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <AnimatedCircle
            cx={SOS_SIZE / 2}
            cy={SOS_SIZE / 2}
            r={RING_RADIUS}
            stroke="#FFFFFF"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            // Start the sweep at 12 o'clock and run clockwise.
            transform={`rotate(-90 ${SOS_SIZE / 2} ${SOS_SIZE / 2})`}
          />
        </Svg>
      ) : null}

      <Ionicons name="warning-outline" size={20} color="#FFFFFF" />
      <Text style={styles.label}>SOS</Text>
    </Pressable>
  );
});

export default SOSFab;

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    width: SOS_SIZE,
    height: SOS_SIZE,
    borderRadius: RADIUS.sos,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.34)',
    shadowOpacity: 0.42,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
