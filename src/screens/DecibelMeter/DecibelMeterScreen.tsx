import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import AppButton from '../../components/AppButton';
import IconButton from '../../components/IconButton';
import ReferenceTable from '../../components/ReferenceTable';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore, useSignalingStore } from '../../stores/StoreContext';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import {
  formatDuration,
  formatExposure,
  isClipping,
  levelBand,
  MAX_CALIBRATION_DB,
  nioshAllowedMs,
  nioshDosePercent,
  referenceFor,
  sessionLeqDbfs,
  SOUND_REFERENCES,
  toSpl,
} from '../../utils/soundLevel';
import LevelHistoryChart, { bandColor } from './components/LevelHistoryChart';

const isAndroid = Platform.OS === 'android';

type MicPermission = 'granted' | 'denied' | 'blocked';

/**
 * Asks for the microphone on Android. iOS asks when the recorder starts and
 * rejects the start if it's refused (see `isPermissionError`).
 */
async function requestMicPermission(): Promise<MicPermission> {
  if (!isAndroid) {
    return 'granted';
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone access',
      message:
        'ColdBoot listens through the microphone to measure sound levels. Nothing is recorded or kept.',
      buttonNegative: 'Not now',
      buttonPositive: 'Allow',
    },
  );
  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }
  return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
    ? 'blocked'
    : 'denied';
}

/** The iOS recorder's rejection when microphone access is off. */
function isPermissionError(error: unknown): boolean {
  return error instanceof Error && /permission/i.test(error.message);
}

function alertMicBlocked() {
  Alert.alert(
    'Microphone access is off',
    'Turn on microphone access for ColdBoot in Settings to use the decibel meter.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  );
}

/** A reading for display: whole dB, with "≥" when the mic is maxed out. */
function formatLevel(dbfs: number, calibrationDb: number): string {
  const db = Math.round(toSpl(dbfs, calibrationDb));
  return isClipping(dbfs) ? `≥${db}` : String(db);
}

function formatCalibration(db: number): string {
  return db > 0 ? `+${db} dB` : `${db} dB`;
}

function formatDose(percent: number): string {
  if (percent < 1) {
    return 'under 1%';
  }
  return `${Math.round(percent)}%`;
}

/** What the current level means for hearing, per NIOSH and the CDC. */
function hearingAdvice(splDb: number): string {
  if (splDb >= 120) {
    return 'Loud enough to harm hearing right away. Cover your ears or move away.';
  }
  if (splDb >= 85) {
    return `At this level, hearing protection is advised after ${formatExposure(
      nioshAllowedMs(splDb),
    )} a day.`;
  }
  if (splDb >= 70) {
    return 'Under the 85 dB limit: safe for a full day, though tiring over time.';
  }
  return 'Quiet enough to listen all day.';
}

const REFERENCE_ROWS = SOUND_REFERENCES.map((reference) => {
  const allowed = nioshAllowedMs(reference.db);
  return {
    key: `${reference.db} dB`,
    values: [reference.label, isFinite(allowed) ? formatExposure(allowed) : ''],
  };
});

/**
 * DecibelMeterScreen component
 *
 * A sound level meter: the current level in dB, the session's minimum,
 * average (Leq) and maximum, a one-minute history, what the level means for
 * hearing (NIOSH exposure limits) and everyday sounds to compare it with. A
 * calibration offset lets the user match it to a meter they trust.
 *
 * The recorder belongs to `SignalingStore` (`startDecibelMeter` /
 * `stopDecibelMeter`), so the meter keeps running when the user leaves this
 * screen, shows in the running-tool card, and can be stopped from there. It
 * stops when ColdBoot goes to the background. Readings are kept in dBFS;
 * this screen converts them with the calibration setting (`utils/soundLevel`).
 *
 * @returns A React element rendering the decibel meter screen.
 */
const DecibelMeterScreenImpl = () => {
  const core = useSignalingStore();
  const settings = useSettingsStore();
  const COLORS = useTheme();
  const [starting, setStarting] = useState(false);
  const isActive = core.decibelMeterActive;
  const session = core.soundSession;
  const calibration = settings.soundMeterCalibration;

  const current = session?.currentDbfs ?? null;
  const currentSpl = current === null ? null : toSpl(current, calibration);
  const leq = session ? sessionLeqDbfs(session) : null;
  const reference = currentSpl === null ? null : referenceFor(currentSpl);
  const levelColor =
    currentSpl === null
      ? COLORS.MUTED
      : bandColor(levelBand(currentSpl), COLORS);

  const handleStart = async () => {
    if (starting) {
      return;
    }
    setStarting(true);
    try {
      const permission = await requestMicPermission();
      if (permission === 'blocked') {
        alertMicBlocked();
        return;
      }
      if (permission === 'denied') {
        return;
      }
      await core.startDecibelMeter();
    } catch (error) {
      if (isPermissionError(error)) {
        alertMicBlocked();
      } else {
        console.error('Error starting the decibel meter:', error);
        Alert.alert(
          "Couldn't start the meter",
          'The microphone may be in use by another app. Try again in a moment.',
        );
      }
    } finally {
      setStarting(false);
    }
  };

  const nudgeCalibration = (step: number) =>
    settings.setSoundMeterCalibration(calibration + step);

  let caption: string;
  if (currentSpl !== null) {
    caption = reference
      ? `About as loud as: ${reference.label.toLowerCase()}`
      : 'Quieter than a whisper';
  } else if (isActive) {
    caption = 'Listening…';
  } else {
    caption = 'Start the meter to measure the sound around you.';
  }

  const stats = session
    ? [
        {
          label: 'MIN',
          value:
            session.minDbfs === null
              ? '—'
              : formatLevel(session.minDbfs, calibration),
        },
        {
          label: 'AVG',
          value: leq === null ? '—' : formatLevel(leq, calibration),
        },
        {
          label: 'MAX',
          value:
            session.maxDbfs === null
              ? '—'
              : formatLevel(session.maxDbfs, calibration),
        },
        {
          label: 'TIME',
          value: formatDuration(session.measuredMs),
        },
      ]
    : null;

  return (
    <StackScreen
      title="Decibel Meter"
      subtitle={
        isActive && current !== null
          ? `${formatLevel(current, calibration)} dB`
          : undefined
      }
      note="Estimated from the phone's microphone and unweighted, so treat it as a guide. Phones can't capture the loudest sounds; readings at the top of the range show as ≥."
      trailing={
        session ? (
          <IconButton
            name="refresh-outline"
            accessibilityLabel="Reset readings"
            onPress={core.resetSoundSession}
          />
        ) : undefined
      }
    >
      {/* Current level, history and session stats */}
      <View style={[styles.card, cardSurface(COLORS)]}>
        <View
          style={styles.readout}
          accessible
          accessibilityLabel={
            current === null
              ? caption
              : `${formatLevel(current, calibration)} decibels. ${caption}`
          }
        >
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: levelColor }]}>
              {current === null ? '—' : formatLevel(current, calibration)}
            </Text>
            <Text style={[styles.unit, { color: COLORS.MUTED }]}>dB</Text>
          </View>
          <Text style={[styles.caption, { color: COLORS.PRIMARY_DARK }]}>
            {caption}
          </Text>
        </View>

        {session && stats ? (
          <>
            <View style={styles.chart}>
              <LevelHistoryChart
                history={session.history}
                calibrationDb={calibration}
                endAt={session.lastReadingAt ?? session.startedAt}
              />
            </View>
            <View
              style={[styles.divider, { backgroundColor: COLORS.SEPARATOR }]}
            />
            <View style={styles.stats}>
              {stats.map((stat) => (
                <View
                  key={stat.label}
                  style={styles.stat}
                  accessible
                  accessibilityLabel={`${stat.label}: ${stat.value}`}
                >
                  <Text style={[styles.statLabel, { color: COLORS.MUTED }]}>
                    {stat.label}
                  </Text>
                  <Text
                    style={[styles.statValue, { color: COLORS.PRIMARY_DARK }]}
                  >
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isActive ? (
          <AppButton
            label={session ? 'Start again' : 'Start measuring'}
            onPress={handleStart}
            disabled={starting}
            variant="success"
            icon="play"
            iconSize={24}
            fullWidth
            accessibilityLabel="Start the decibel meter"
          />
        ) : (
          <AppButton
            label="Stop"
            onPress={core.stopDecibelMeter}
            variant="destructive"
            icon="stop"
            iconSize={24}
            fullWidth
            accessibilityLabel="Stop the decibel meter"
          />
        )}
      </View>

      {/* Hearing safety */}
      {session && currentSpl !== null ? (
        <View style={styles.section}>
          <SectionEyebrow>Hearing safety</SectionEyebrow>
          <View style={[styles.card, styles.textCard, cardSurface(COLORS)]}>
            <Text style={[styles.body, { color: COLORS.PRIMARY_DARK }]}>
              {hearingAdvice(currentSpl)}
            </Text>
            <Text style={[styles.detail, { color: COLORS.MUTED }]}>
              Noise dose this session:{' '}
              {formatDose(nioshDosePercent(session, calibration))} of a day's
              safe limit.
            </Text>
          </View>
        </View>
      ) : null}

      {/* Reference levels */}
      <View style={styles.section}>
        <SectionEyebrow>How loud is that?</SectionEyebrow>
        <ReferenceTable rows={REFERENCE_ROWS} />
        <Text style={[styles.footnote, { color: COLORS.MUTED }]}>
          Times are NIOSH's daily limit at each level before hearing protection
          is needed. Levels from the CDC.
        </Text>
      </View>

      {/* Calibration */}
      <View style={styles.section}>
        <SectionEyebrow>Calibration</SectionEyebrow>
        <View style={[styles.card, styles.textCard, cardSurface(COLORS)]}>
          <View style={styles.calibrationRow}>
            <IconButton
              name="remove-outline"
              accessibilityLabel="Lower readings by 1 dB"
              onPress={() => nudgeCalibration(-1)}
              disabled={calibration <= -MAX_CALIBRATION_DB}
            />
            <Text
              style={[styles.calibrationValue, { color: COLORS.PRIMARY_DARK }]}
              accessibilityLabel={`Calibration ${formatCalibration(
                calibration,
              )}`}
            >
              {formatCalibration(calibration)}
            </Text>
            <IconButton
              name="add-outline"
              accessibilityLabel="Raise readings by 1 dB"
              onPress={() => nudgeCalibration(1)}
              disabled={calibration >= MAX_CALIBRATION_DB}
            />
            {calibration !== 0 ? (
              <AppButton
                label="Reset"
                onPress={() => settings.setSoundMeterCalibration(0)}
                variant="secondary"
                accessibilityLabel="Reset calibration"
              />
            ) : null}
          </View>
          <Text style={[styles.detail, { color: COLORS.MUTED }]}>
            Phones' microphones differ. With a steady sound playing, adjust
            until this matches a sound level meter you trust.
          </Text>
        </View>
      </View>
    </StackScreen>
  );
};

export default observer(DecibelMeterScreenImpl);

const hairline =
  StyleSheet.hairlineWidth < 0.5 ? 0.5 : StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  card: {
    // StackScreen's Android content is full-bleed; cards carry the gutter.
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  textCard: {
    gap: SPACING.sm,
  },
  readout: {
    alignItems: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  value: {
    fontSize: 64,
    fontFamily: 'Bitter-Bold',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 20,
    fontWeight: '600',
  },
  caption: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  chart: {
    marginTop: SPACING.lg,
  },
  divider: {
    height: hairline,
    marginVertical: SPACING.md,
  },
  stats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  controls: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  detail: {
    fontSize: 13,
    lineHeight: 18,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: SPACING.sm,
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
  },
  calibrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  calibrationValue: {
    fontSize: 20,
    fontWeight: '600',
    minWidth: 72,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
