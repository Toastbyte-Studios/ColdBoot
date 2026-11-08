import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import ModuleHero from '../../components/ModuleHero';
import { getBookmarks } from '../../stores/BookmarksStore';
import {
  useBarometerStore,
  useCoreStore,
  useSettingsStore,
} from '../../stores/StoreContext';
import { getLastRead } from '../../utils/lastReadEntry';
import {
  findReferenceEntry,
  referenceEntryMap,
} from '../../utils/referenceEntries';
import {
  bookmarksText,
  currentPressureTrend,
  suggestEntry,
  SUGGESTED_ENTRY_IDS,
} from './referenceHero';
import type ReferenceEntryType from '../../types/data-type';

/**
 * Reference's hero: what's worth reading right now, picked from conditions
 * (Cold mode or a cold battery, falling pressure, sunset within the hour,
 * else the season). Below: bookmarks, the entry opened last, and CPR one
 * tap away.
 */
const ReferenceHero = observer(() => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const core = useCoreStore();
  const barometer = useBarometerStore();
  const settings = useSettingsStore();
  const [now, setNow] = useState(() => new Date());
  const [bookmarkCount, setBookmarkCount] = useState<number | null>(null);
  const [lastRead, setLastRead] = useState<ReferenceEntryType | null>(null);

  // Sunset and the pressure trend move on the scale of minutes.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Bookmarks and the last entry change on other screens, so re-read both
  // whenever the module comes back into view.
  const load = useCallback(async () => {
    const [bookmarks, last] = await Promise.all([
      getBookmarks(),
      getLastRead(),
    ]);
    const entries = referenceEntryMap();
    setBookmarkCount(bookmarks.filter((b) => entries.has(b.id)).length);
    setLastRead(last ? findReferenceEntry(last.id) : null);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    load();
    return unsubscribe;
  }, [navigation, load]);

  const fix = core.lastFix?.coords;
  const suggestion = suggestEntry({
    now,
    coldMode: settings.coldMode,
    batteryTemperatureC: core.batteryTemperatureC,
    pressureTrend: currentPressureTrend(
      barometer.history,
      barometer.paused,
      now.getTime(),
    ),
    latitude: fix?.latitude ?? null,
    longitude: fix?.longitude ?? null,
    system: settings.measurementSystem,
  });
  const suggested = findReferenceEntry(suggestion.id);
  const cpr = findReferenceEntry(SUGGESTED_ENTRY_IDS.cpr);

  const open = (entry: ReferenceEntryType | null) => {
    if (entry) navigation.navigate('Entry', { entry });
  };

  return (
    <ModuleHero
      eyebrow="Suggested now"
      headline={suggested?.title ?? 'Browse the library'}
      headlineTone={suggestion.tone}
      detail={suggestion.reason}
      onPress={() => open(suggested)}
      stats={[
        {
          label: 'Bookmarks',
          value: bookmarkCount == null ? '—' : bookmarksText(bookmarkCount),
          tone: bookmarkCount ? undefined : 'muted',
          onPress: () => navigation.navigate('Bookmark'),
        },
        {
          label: 'Continue',
          value: lastRead?.title ?? 'Nothing yet',
          tone: lastRead ? undefined : 'muted',
          onPress: lastRead ? () => open(lastRead) : undefined,
          accessibilityLabel: lastRead
            ? `Continue reading ${lastRead.title}`
            : undefined,
        },
        {
          label: 'Emergency',
          value: 'CPR',
          tone: 'poor',
          onPress: () => open(cpr),
          accessibilityLabel: 'Open Cardiac Arrest and CPR',
        },
      ]}
    />
  );
});

export default ReferenceHero;
