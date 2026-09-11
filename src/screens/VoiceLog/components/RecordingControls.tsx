import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Text } from '../../../components/ScaledText';
import Touchable from '../../../components/Touchable';
import { useTheme } from '../../../hooks/useTheme';
import { ColorScheme } from '../../../theme/colors';
import { onColor } from '../../../theme/colorUtils';

type RecordingControlsProps = {
  isRecording: boolean;
  recordingTime: number;
  progress: number;
  maxDuration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

export default function RecordingControls({
  isRecording,
  recordingTime,
  progress,
  maxDuration,
  onStartRecording,
  onStopRecording,
}: RecordingControlsProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const glyphColor = onColor(
    isRecording ? COLORS.ERROR : COLORS.SECONDARY_ACCENT,
  );

  const formatTime = (seconds: number): string => {
    const remaining = maxDuration - seconds;
    return `${remaining}s`;
  };

  return (
    <View style={styles.container}>
      {isRecording && (
        <>
          <View style={styles.progressContainer}>
            <View
              style={[styles.progressBar, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
        </>
      )}

      {/* Not an IconButton: this is a 120pt circle, and IconButton pins its
          ripple radius to the 44/48 touch target. Touchable leaves the radius
          unset so Android derives it from the view bounds. */}
      <Touchable
        style={[styles.recordButton, isRecording && styles.recordButtonActive]}
        rippleColor={glyphColor}
        onPress={isRecording ? onStopRecording : onStartRecording}
        accessibilityLabel={isRecording ? 'Stop Recording' : 'Start Recording'}
        accessibilityRole="button"
      >
        <Icon
          name={isRecording ? 'stop-outline' : 'mic-outline'}
          size={60}
          color={glyphColor}
        />
      </Touchable>

      {!isRecording && (
        <Text style={styles.instruction}>Tap to start recording</Text>
      )}
      {isRecording && <Text style={styles.recordingText}>Recording...</Text>}
    </View>
  );
}

const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 40,
    },
    progressContainer: {
      width: 200,
      height: 6,
      backgroundColor: COLORS.PRIMARY_LIGHT,
      borderRadius: 3,
      marginBottom: 16,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: COLORS.SECONDARY_ACCENT,
      borderRadius: 3,
    },
    timerText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: COLORS.PRIMARY_DARK,
      marginBottom: 20,
    },
    recordButton: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: COLORS.SECONDARY_ACCENT,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    recordButtonActive: {
      backgroundColor: COLORS.ERROR,
    },
    instruction: {
      fontSize: 16,
      color: COLORS.PRIMARY_DARK,
      opacity: 0.8,
    },
    recordingText: {
      fontSize: 16,
      color: COLORS.ERROR,
      fontWeight: 'bold',
    },
  });
