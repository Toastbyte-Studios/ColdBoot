import { MenuView } from '@react-native-menu/menu';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Text } from '../../../components/ScaledText';
import Touchable from '../../../components/Touchable';
import { useTheme } from '../../../hooks/useTheme';
import { SPACING } from '../../../theme';
import { cardSurface } from '../../../theme/cardSurface';
import { ColorScheme, DARK_COLORS } from '../../../theme/colors';
import { onColor } from '../../../theme/colorUtils';
import { formatClock, formatLength } from '../../../utils/timeFormat';
import Waveform from './Waveform';

/**
 * Where the recorder is. `starting` covers the permission check and the
 * recorder spinning up; `saving` runs from the stop tap until the log's row
 * is written.
 */
export type RecordingStatus = 'idle' | 'starting' | 'recording' | 'saving';

/** The last few seconds are called out so the auto-stop isn't a surprise. */
const WARN_REMAINING_SECONDS = 3;

type RecordingControlsProps = {
  status: RecordingStatus;
  /** Recorded so far, in milliseconds. */
  elapsedMs: number;
  /** Recording stops itself at this length, in milliseconds. */
  maxDurationMs: number;
  /** One level per bar, from `addWaveformSample`. */
  waveform: readonly number[];
  /** Bars in the waveform strip: `maxDurationMs` / bucket length. */
  waveformSlots: number;
  disabled?: boolean;
  /** The limits to choose from, in seconds. */
  lengthOptions: readonly number[];
  /** Called with a new limit, in seconds. Only offered while idle. */
  onChangeMaxLength: (seconds: number) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

export default function RecordingControls({
  status,
  elapsedMs,
  maxDurationMs,
  waveform,
  waveformSlots,
  disabled,
  lengthOptions,
  onChangeMaxLength,
  onStartRecording,
  onStopRecording,
}: RecordingControlsProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const isRecording = status === 'recording';
  const isBusy = status === 'starting' || status === 'saving';
  const buttonColor =
    isRecording || status === 'saving' ? COLORS.ERROR : COLORS.SECONDARY_ACCENT;
  const glyphColor = onColor(buttonColor);

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const maxSeconds = Math.round(maxDurationMs / 1000);
  const remainingSeconds = Math.max(0, maxSeconds - elapsedSeconds);
  const warn = isRecording && remainingSeconds <= WARN_REMAINING_SECONDS;

  const lengthActions = useMemo(
    () =>
      lengthOptions.map((seconds) => ({
        id: String(seconds),
        title: formatLength(seconds),
        state: seconds === maxSeconds ? ('on' as const) : ('off' as const),
      })),
    [lengthOptions, maxSeconds],
  );

  const statusText = {
    idle: 'Tap to record',
    starting: 'Starting…',
    recording: 'Tap to stop and save',
    saving: 'Saving…',
  }[status];

  const buttonLabel = {
    idle: 'Start recording',
    starting: 'Starting recording',
    recording: 'Stop and save recording',
    saving: 'Saving voice log',
  }[status];

  return (
    <View style={styles.container}>
      <View style={[styles.panel, cardSurface(COLORS)]}>
        <View style={styles.clockRow}>
          <Text
            style={styles.clock}
            accessibilityLabel={`${elapsedSeconds} of ${maxSeconds} seconds recorded`}
          >
            {formatClock(elapsedSeconds)}
          </Text>
          {status === 'idle' ? (
            <MenuView
              title="Stop recording after"
              actions={lengthActions}
              onPressAction={({ nativeEvent }) =>
                onChangeMaxLength(Number(nativeEvent.event))
              }
              themeVariant={COLORS === DARK_COLORS ? 'dark' : 'light'}
            >
              {/* Not a Touchable: the native menu owns the tap. */}
              <View
                style={styles.lengthChip}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Maximum length, ${formatLength(maxSeconds)}`}
                accessibilityHint="Opens a menu to change it"
                testID="voice-log-length"
              >
                <Text style={styles.remaining}>
                  Up to {formatLength(maxSeconds)}
                </Text>
                <Icon
                  name="chevron-down-outline"
                  size={14}
                  color={COLORS.MUTED}
                />
              </View>
            </MenuView>
          ) : (
            <Text style={[styles.remaining, warn && styles.remainingWarn]}>
              {remainingSeconds < 60
                ? `${remainingSeconds}s left`
                : `${formatClock(remainingSeconds)} left`}
            </Text>
          )}
        </View>
        <Waveform
          samples={waveform}
          slots={waveformSlots}
          color={COLORS.ERROR}
          testID="voice-log-waveform"
        />
      </View>

      {/* Not an IconButton: this is a 96pt circle, and IconButton pins its
          ripple radius to the 44/48 touch target. Touchable leaves the radius
          unset so Android derives it from the view bounds. */}
      <Touchable
        style={[styles.recordButton, { backgroundColor: buttonColor }]}
        rippleColor={glyphColor}
        onPress={isRecording ? onStopRecording : onStartRecording}
        disabled={disabled || isBusy}
        accessibilityLabel={buttonLabel}
        accessibilityRole="button"
        accessibilityState={{ busy: isBusy, disabled: disabled || isBusy }}
      >
        {isBusy ? (
          <ActivityIndicator
            size="large"
            color={glyphColor}
            testID="voice-log-busy"
          />
        ) : (
          <Icon
            name={isRecording ? 'stop-outline' : 'mic-outline'}
            size={48}
            color={glyphColor}
          />
        )}
      </Touchable>

      <Text
        style={[styles.status, isRecording && styles.statusRecording]}
        accessibilityLiveRegion="polite"
      >
        {statusText}
      </Text>
    </View>
  );
}

const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      marginTop: SPACING.lg,
      marginBottom: SPACING.xl,
    },
    panel: {
      alignSelf: 'stretch',
      padding: SPACING.lg,
      marginBottom: SPACING.xl,
    },
    clockRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
    },
    clock: {
      fontSize: 34,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
      color: COLORS.PRIMARY_DARK,
    },
    remaining: {
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      color: COLORS.MUTED,
    },
    lengthChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      minHeight: 32,
      paddingLeft: 8,
    },
    remainingWarn: {
      color: COLORS.ERROR,
      fontWeight: '600',
    },
    recordButton: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
    status: {
      fontSize: 16,
      color: COLORS.PRIMARY_DARK,
      opacity: 0.8,
    },
    statusRecording: {
      color: COLORS.ERROR,
      fontWeight: '600',
      opacity: 1,
    },
  });
