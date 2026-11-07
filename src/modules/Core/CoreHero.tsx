import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import ModuleHero, { HeroTone } from '../../components/ModuleHero';
import { useTheme } from '../../hooks/useTheme';
import { batterySummary } from '../../screens/ColdWeather/ColdWeatherScreen';
import { batteryTone } from '../../screens/DeviceStatus/deviceStatusFormatters';
import { useReadinessItems } from '../../screens/DeviceStatus/useReadinessItems';
import {
  useChecklistStore,
  useCoreStore,
  useNotesStore,
  useSettingsStore,
} from '../../stores/StoreContext';
import {
  activeChecklist,
  checklistText,
  latestNote,
  noteText,
} from './coreHero';

const SAVER_NAME =
  Platform.OS === 'android' ? 'Battery Saver' : 'Low Power Mode';

/**
 * Core's hero: how long the phone will last, the thing every other tool
 * depends on, with Cold mode's state when it's on. Below: off-grid readiness
 * (the same checklist as Device Status), the checklist you're working
 * through, and your latest note or voice log.
 */
const CoreHero = observer(() => {
  const COLORS = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const core = useCoreStore();
  const settings = useSettingsStore();
  const checklists = useChecklistStore();
  const notes = useNotesStore();
  const readiness = useReadinessItems();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const level = core.batteryLevel;
  const tone = batteryTone(level, core.isCharging);
  const headlineTone: HeroTone | undefined =
    tone === 'poor' ? 'poor' : tone === 'fair' ? 'fair' : undefined;
  const power = core.isCharging
    ? 'Charging'
    : core.lowPowerMode
      ? `${SAVER_NAME} on`
      : 'On battery';
  const detail = settings.coldMode
    ? `Cold mode on · ${power.toLowerCase()}`
    : power;

  const ready = readiness.filter((item) => item.status === 'ready').length;
  const checklist = activeChecklist(
    checklists.checklists,
    checklists.checklistItems,
  );
  const note = latestNote(notes.notes);

  return (
    <ModuleHero
      eyebrow="Battery"
      headline={batterySummary(
        level,
        core.isCharging,
        core.batteryEstimateMinutes,
      )}
      headlineTone={headlineTone}
      detail={detail}
      onPress={() =>
        navigation.navigate(settings.coldMode ? 'ColdWeather' : 'DeviceStatus')
      }
      graphic={
        level == null ? null : (
          <BatteryGlyph
            level={level}
            fill={
              tone === 'poor'
                ? COLORS.ERROR
                : tone === 'fair'
                  ? COLORS.ACCENT
                  : COLORS.SECONDARY_ACCENT
            }
            outline={COLORS.BORDER}
          />
        )
      }
      stats={[
        {
          label: 'Readiness',
          value: `${ready} of ${readiness.length}`,
          tone: ready === readiness.length ? 'good' : 'fair',
          onPress: () => navigation.navigate('DeviceStatus'),
        },
        checklist
          ? {
              label: 'Checklist',
              value: checklistText(checklist),
              onPress: () =>
                navigation.navigate('ChecklistEntry', {
                  checklist: checklist.checklist,
                }),
            }
          : {
              label: 'Checklist',
              value: 'None yet',
              tone: 'muted',
              onPress: () => navigation.navigate('Checklist'),
            },
        note
          ? {
              label: 'Latest note',
              value: noteText(note, now),
              onPress: () => navigation.navigate('NoteEntry', { note }),
            }
          : {
              label: 'Latest note',
              value: 'None yet',
              tone: 'muted',
              onPress: () => navigation.navigate('Notepad'),
            },
      ]}
    />
  );
});

/** A small battery, filled to the level. */
function BatteryGlyph({
  level,
  fill,
  outline,
}: {
  level: number;
  fill: string;
  outline: string;
}) {
  const width = 54;
  const height = 26;
  const inner = (width - 6) * Math.min(1, Math.max(0, level));
  return (
    <Svg width={width + 5} height={height}>
      <Rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        rx={6}
        stroke={outline}
        strokeWidth={2}
        fill="none"
      />
      <Rect
        x={width}
        y={height / 2 - 5}
        width={4}
        height={10}
        rx={2}
        fill={outline}
      />
      <Rect
        x={4}
        y={4}
        width={inner}
        height={height - 8}
        rx={3.5}
        fill={fill}
      />
    </Svg>
  );
}

export default CoreHero;
