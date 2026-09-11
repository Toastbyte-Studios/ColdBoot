import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../hooks/useTheme';
import { SolarEventType } from '../../../stores/SolarCycleNotificationStore';
import {
  useAstronomyEventStore,
  useCoreStore,
  usePantryStore,
  useSolarCycleNotificationStore,
  useWeatherOutlookStore,
} from '../../../stores/StoreContext';
import { formatDaysUntil } from '../../../utils/formatDaysUntil';
import { Text } from '../../ScaledText';

/**
 * SolarCycleNotification component displays the next upcoming
 * sunrise or sunset notification with time remaining.
 *
 * @remarks
 * - Rotates through all available notification types every 8 seconds:
 *   slot 0 — solar event (if upcoming) or lunar phase (when solar is complete)
 *   slot 1 — weather outlook summary (when available)
 *   slot 2 — next astronomy event within 30 days (when available)
 *   slot 3+ — pantry expiration alerts (one per alerting item, when present)
 * - Shows an icon indicating sunrise (sun) or sunset (moon)
 * - Displays a dynamic message with time remaining until the event
 * - Automatically updates notifications when device location changes
 * - Refreshes display every minute to update time remaining
 *
 * @returns A React element rendering the solar cycle notification
 */
const SolarCycleNotification = () => {
  const core = useCoreStore();
  const solarNotifications = useSolarCycleNotificationStore();
  const weatherOutlook = useWeatherOutlookStore();
  const pantry = usePantryStore();
  const astronomyStore = useAstronomyEventStore();
  const COLORS = useTheme();
  const pantryExpirationAlertsCount = pantry.getExpirationAlerts().length;

  /**
   * Rotation index cycles through all available notification types:
   *   0 = solar event (if upcoming) or lunar phase
   *   1 = weather outlook (when available)
   *   2 = next astronomy event within 30 days (when available)
   *   3+ = pantry expiration alerts (one per alerting item)
   */
  const [rotationIndex, setRotationIndex] = useState(0);

  // Update solar cycle notifications when location changes
  useEffect(() => {
    if (core.lastFix) {
      const { latitude, longitude } = core.lastFix.coords;
      solarNotifications.updateNotifications(latitude, longitude);
      astronomyStore.computeEvents(latitude, longitude);
    } else {
      astronomyStore.computeEventsWithoutLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core.lastFix]);

  // Refresh notification display every minute to update time remaining
  useEffect(() => {
    const interval = setInterval(() => {
      solarNotifications.updateCurrentTime();
    }, 60000);
    return () => clearInterval(interval);
  }, [solarNotifications]);

  // Rotate through all notification slots every 8 seconds.
  // Weather, astronomy, and pantry alerts rotate alongside solar/lunar.
  // Depend on getExpirationAlerts().length (not pantry.items) so the effect
  // re-runs when items are pushed/removed without the array reference changing.
  // Also depend on nextAstroEvent's identity so totalSlots stays accurate when
  // an event enters or leaves the 30-day window between recomputes.
  // Also reset rotationIndex when totalSlots shrinks to avoid invalid slot state.
  const nextAstroEventId = astronomyStore.getNextAstronomyEvent()?.id ?? null;
  useEffect(() => {
    const weatherSummary = weatherOutlook.getCurrentMonthSummary();
    const pantryAlerts = pantry.getExpirationAlerts();
    const nextAstroEvent = astronomyStore.getNextAstronomyEvent();
    // slot 0 = solar/lunar (always present), then weather, then astronomy, then pantry alerts
    const totalSlots =
      1 +
      (weatherSummary ? 1 : 0) +
      (nextAstroEvent ? 1 : 0) +
      pantryAlerts.length;
    if (totalSlots <= 1) {
      // Nothing extra to rotate through; reset index in case pool just shrank to 1.
      setRotationIndex(0);
      return;
    }

    // Clamp index when the pool shrank but still has multiple slots.
    setRotationIndex((prev) => (prev >= totalSlots ? 0 : prev));

    const interval = setInterval(() => {
      setRotationIndex((prev) => (prev >= totalSlots - 1 ? 0 : prev + 1));
    }, 8000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    weatherOutlook.outlook,
    weatherOutlook,
    pantryExpirationAlertsCount,
    astronomyStore.events.length,
    nextAstroEventId,
  ]);

  const nextNotification = solarNotifications.getNextNotification();
  const weatherSummary = weatherOutlook.getCurrentMonthSummary();
  const pantryAlerts = pantry.getExpirationAlerts();
  const nextAstroEvent = astronomyStore.getNextAstronomyEvent();

  // Determine slot boundaries
  const weatherSlot = 1;
  const astroSlot = weatherSummary ? 2 : 1;
  const pantryStartSlot = astroSlot + (nextAstroEvent ? 1 : 0);

  // ── Slot 0: Solar event (if active) or Lunar phase ──────────────────────────
  if (rotationIndex === 0) {
    if (nextNotification) {
      // Map event types to icon names
      const iconMap: Record<SolarEventType, string> = {
        sunrise: 'sunny-outline',
        sunset: 'moon-outline',
        dawn: 'partly-sunny-outline',
        dusk: 'moon',
      };
      return (
        <View style={styles.notificationContent}>
          <Ionicons
            name={iconMap[nextNotification.eventType] || 'sunny-outline'}
            size={20}
            color={COLORS.ACCENT}
            style={styles.notificationIcon}
          />
          <Text
            style={[styles.notificationText, { color: COLORS.PRIMARY_DARK }]}
            numberOfLines={2}
          >
            {solarNotifications.getNotificationMessage(nextNotification)}
          </Text>
        </View>
      );
    }

    if (solarNotifications.allSolarEventsComplete()) {
      // Lunar phase after all solar events are done
      const lunarCycle = solarNotifications.getCurrentLunarCycle();
      return (
        <View style={styles.notificationContent}>
          <Ionicons
            name="moon"
            size={20}
            color={COLORS.ACCENT}
            style={styles.notificationIcon}
          />
          <Text
            style={[styles.notificationText, { color: COLORS.PRIMARY_DARK }]}
            numberOfLines={2}
          >
            {`${lunarCycle.phaseName} (${lunarCycle.illumination}%)`}
          </Text>
        </View>
      );
    }

    // No solar or lunar — fall through to show NO NOTIFICATIONS below
  }

  // ── Slot 1: Weather summary (when available) ─────────────────────────────────
  if (rotationIndex === weatherSlot && weatherSummary) {
    return (
      <View style={styles.notificationContent}>
        <Ionicons
          name="partly-sunny-outline"
          size={20}
          color={COLORS.ACCENT}
          style={styles.notificationIcon}
        />
        <Text
          style={[styles.notificationText, { color: COLORS.PRIMARY_DARK }]}
          numberOfLines={2}
        >
          {weatherSummary}
        </Text>
      </View>
    );
  }

  // ── Astronomy slot: Next sky event within 30 days ────────────────────────────
  if (rotationIndex === astroSlot && nextAstroEvent) {
    const countdownText = formatDaysUntil(nextAstroEvent.date);
    return (
      <View style={styles.notificationContent}>
        <Ionicons
          name={nextAstroEvent.icon}
          size={20}
          color={COLORS.ACCENT}
          style={styles.notificationIcon}
        />
        <Text
          style={[styles.notificationText, { color: COLORS.PRIMARY_DARK }]}
          numberOfLines={2}
        >
          {`${nextAstroEvent.label} — ${countdownText}`}
        </Text>
      </View>
    );
  }

  // ── Slots 3+: Pantry expiration alerts ───────────────────────────────────────
  const pantryAlertIndex = rotationIndex - pantryStartSlot;
  if (pantryAlertIndex >= 0 && pantryAlertIndex < pantryAlerts.length) {
    const alert = pantryAlerts[pantryAlertIndex];
    const alertMessages: Record<string, string> = {
      expired: `Must use today: ${alert.item.name} has expired`,
      '30day': `Heads up: ${alert.item.name} expires within the month`,
    };
    const highlightColor =
      alert.alertType === 'expired'
        ? 'rgba(211,47,47,0.22)'
        : 'rgba(249,168,37,0.28)';
    return (
      <View style={styles.notificationContent}>
        <Ionicons
          name="nutrition-outline"
          size={20}
          color={alert.alertType === 'expired' ? '#d32f2f' : '#f9a825'}
          style={styles.notificationIcon}
        />
        <View
          style={[styles.alertHighlight, { backgroundColor: highlightColor }]}
        >
          <Text
            style={[styles.notificationText, { color: COLORS.PRIMARY_DARK }]}
            numberOfLines={2}
          >
            {alertMessages[alert.alertType]}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Text style={[styles.notificationText, { color: COLORS.PRIMARY_DARK }]}>
      NO NOTIFICATIONS
    </Text>
  );
};

export default observer(SolarCycleNotification);

const styles = StyleSheet.create({
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  },
  notificationIcon: {
    flexShrink: 0,
  },
  notificationText: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  alertHighlight: {
    flexShrink: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
