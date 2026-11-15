import { observer } from 'mobx-react-lite';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/ScaledText';
import { useTheme } from '../../../hooks/useTheme';
import { useCoreStore, useSettingsStore } from '../../../stores/StoreContext';
import { RADIUS, SPACING, TEXT_GUTTER } from '../../../theme';
import { withAlpha } from '../../../theme/colorUtils';
import {
  batteryTemperatureStatus,
  formatTemperature,
} from '../../../utils/batteryTemperature';
import { batteryEstimate, batteryTone } from '../deviceStatusFormatters';
import StatusRow, { toneColor } from './StatusRow';
import StatusSection from './StatusSection';

const isAndroid = Platform.OS === 'android';

/** What each platform calls its battery-stretching mode. */
const SAVER_NAME = isAndroid ? 'Battery Saver' : 'Low Power Mode';

/** Below this, a saver mode that is off is worth pointing out. */
const SAVER_HINT_LEVEL = 0.3;

/**
 * Battery: a level gauge, then charge state, the time-left estimate and
 * whether the system's power-saving mode is on.
 */
const BatterySection = observer(() => {
  const COLORS = useTheme();
  const core = useCoreStore();
  const settings = useSettingsStore();
  const temperatureC = core.batteryTemperatureC;
  const temperature =
    temperatureC == null ? null : batteryTemperatureStatus(temperatureC);
  const level = core.batteryLevel;
  const charging = core.isCharging;
  const tone = batteryTone(level, charging);
  const estimate = batteryEstimate(
    core.batteryEstimateMinutes,
    charging,
    level,
    core.batteryEstimateMeasured,
  );
  const pct = level == null ? null : Math.round(level * 100);
  const saverOff = core.lowPowerMode === false;
  const suggestSaver =
    saverOff && !charging && level != null && level < SAVER_HINT_LEVEL;

  return (
    <StatusSection title="Battery">
      <View
        style={styles.gauge}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Battery level"
        accessibilityValue={
          pct == null ? { text: 'Unknown' } : { min: 0, max: 100, now: pct }
        }
      >
        <Text style={[styles.percent, { color: COLORS.PRIMARY_DARK }]}>
          {pct == null ? '—' : `${pct}%`}
        </Text>
        <View
          style={[
            styles.track,
            { backgroundColor: withAlpha(COLORS.MUTED, 0.2) },
          ]}
        >
          <View
            style={[
              styles.fill,
              {
                width: `${pct ?? 0}%`,
                backgroundColor: toneColor(tone, COLORS),
              },
            ]}
          />
        </View>
      </View>
      <View
        style={[
          styles.separator,
          {
            backgroundColor: isAndroid
              ? COLORS.OUTLINE_VARIANT
              : COLORS.SEPARATOR,
          },
        ]}
      />

      <StatusRow
        label="Power"
        value={
          charging == null
            ? 'Unknown'
            : charging
              ? level != null && level >= 0.99
                ? 'Full, plugged in'
                : 'Charging'
              : 'On battery'
        }
      />
      <StatusRow
        label={estimate.label}
        value={estimate.value}
        detail={estimate.detail}
      />
      <StatusRow
        label={SAVER_NAME}
        value={
          core.lowPowerMode == null
            ? 'Unknown'
            : core.lowPowerMode
              ? 'On'
              : 'Off'
        }
        detail={
          suggestSaver
            ? 'Turn on in Settings to stretch the battery'
            : undefined
        }
        tone={suggestSaver ? 'fair' : undefined}
        isLast={temperature === null}
      />
      {temperatureC != null && temperature ? (
        // Android only: iOS doesn't expose the battery's temperature.
        <StatusRow
          label="Temperature"
          value={formatTemperature(temperatureC, settings.measurementSystem)}
          detail={temperature.label}
          tone={temperature.tone}
          isLast
        />
      ) : null}
    </StatusSection>
  );
});

export default BatterySection;

const hairline =
  StyleSheet.hairlineWidth < 0.5 ? 0.5 : StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  gauge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : SPACING.lg,
  },
  percent: {
    fontSize: 28,
    fontFamily: 'Bitter-Bold',
    minWidth: 72,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: RADIUS.tileSmall,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  separator: {
    height: isAndroid ? 1 : hairline,
    marginLeft: isAndroid ? TEXT_GUTTER : SPACING.lg,
  },
});
