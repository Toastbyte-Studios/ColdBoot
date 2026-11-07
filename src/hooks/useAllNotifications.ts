import { AppNotification } from '../stores/NotificationsStore';
import { SolarEventType } from '../stores/SolarCycleNotificationStore';
import {
  useAstronomyEventStore,
  useCoreStore,
  useNotificationsStore,
  usePantryStore,
  useSettingsStore,
  useSolarCycleNotificationStore,
  useWeatherOutlookStore,
} from '../stores/StoreContext';
import {
  formatTemperature,
  NO_CHARGE_BELOW_C,
} from '../utils/batteryTemperature';
import { formatDaysUntil } from '../utils/formatDaysUntil';
import { useTheme } from './useTheme';

/**
 * Count of notifications the user has not hidden.
 *
 * Derived from {@link useAllNotifications} so the shortcut bar badge and the
 * alerts sheet can never disagree about how many there are.
 */
export function useVisibleNotificationCount(): number {
  const allNotifications = useAllNotifications();
  const notificationsStore = useNotificationsStore();
  return allNotifications.filter((n) => !notificationsStore.isHidden(n.key))
    .length;
}

/**
 * Builds the full list of current in-app notifications across all sources
 * (solar events, lunar phase, weather, astronomy, pantry expiration).
 *
 * Each entry carries a stable `key` that NotificationsStore uses to persist
 * dismissed state.  Filtering by hidden keys is intentionally left to the
 * caller so that both the shortcut bar badge count and the alerts sheet can share
 * the same canonical list without duplicating source logic.
 */
export function useAllNotifications(): AppNotification[] {
  const COLORS = useTheme();
  const solarStore = useSolarCycleNotificationStore();
  const weatherOutlook = useWeatherOutlookStore();
  const pantry = usePantryStore();
  const astronomyStore = useAstronomyEventStore();
  const core = useCoreStore();
  const settings = useSettingsStore();

  const notifications: AppNotification[] = [];

  // ── Frozen battery (Android only) ─────────────────────────────────────────────
  // First, because it's the one alert where acting on it wrong does lasting
  // harm: charging a lithium-ion battery below freezing damages it for good.
  // Keyed by day, so dismissing it hides today's warning, not every future one.
  const temperatureC = core.batteryTemperatureC;
  if (temperatureC != null && temperatureC <= NO_CHARGE_BELOW_C) {
    notifications.push({
      key: `battery-freezing-${new Date().toDateString()}`,
      type: 'device',
      icon: 'thermometer-outline',
      iconColor: COLORS.ERROR,
      message: `Battery is below freezing (${formatTemperature(
        temperatureC,
        settings.measurementSystem,
      )}). Don't charge it until it warms up.`,
      dismissible: true,
    });
  }

  // ── Solar events ─────────────────────────────────────────────────────────────
  const iconMap: Record<SolarEventType, string> = {
    sunrise: 'sunny-outline',
    sunset: 'moon-outline',
    dawn: 'partly-sunny-outline',
    dusk: 'moon-outline',
  };

  // Upcoming only: a sunset that has already happened is not an alert.
  for (const n of solarStore.upcomingNotifications) {
    notifications.push({
      key: `solar-${n.id}`,
      type: 'solar',
      icon: iconMap[n.eventType] ?? 'sunny-outline',
      iconColor: COLORS.ACCENT,
      message: solarStore.getNotificationMessage(n),
      // Keys include the event time, so dismissing hides today's alert only.
      dismissible: true,
    });
  }

  // ── Lunar phase (when all solar events are complete) ──────────────────────────
  if (solarStore.allSolarEventsComplete()) {
    const lunar = solarStore.getCurrentLunarCycle();
    notifications.push({
      key: 'lunar-phase',
      type: 'solar',
      icon: 'moon-outline',
      iconColor: COLORS.ACCENT,
      message: `${lunar.phaseName} (${lunar.illumination}%)`,
      dismissible: true,
    });
  }

  // ── Weather outlook ───────────────────────────────────────────────────────────
  const weatherSummary = weatherOutlook.getCurrentMonthSummary();
  if (weatherSummary) {
    notifications.push({
      key: 'weather-monthly-outlook',
      type: 'weather',
      icon: 'partly-sunny-outline',
      iconColor: COLORS.ACCENT,
      message: weatherSummary,
      dismissible: true,
    });
  }

  // ── Next astronomy event ──────────────────────────────────────────────────────
  const nextAstro = astronomyStore.getNextAstronomyEvent();
  if (nextAstro) {
    notifications.push({
      key: `astro-${nextAstro.id}`,
      type: 'astronomy',
      icon: nextAstro.icon,
      iconColor: COLORS.ACCENT,
      message: `${nextAstro.label} — ${formatDaysUntil(nextAstro.date)}`,
      dismissible: true,
    });
  }

  // ── Pantry expiration alerts ──────────────────────────────────────────────────
  for (const alert of pantry.getExpirationAlerts()) {
    const isExpired = alert.alertType === 'expired';
    notifications.push({
      key: `pantry-${alert.item.id}-${alert.alertType}`,
      type: 'pantry',
      icon: 'nutrition-outline',
      iconColor: isExpired ? COLORS.ERROR : '#f9a825',
      message: isExpired
        ? `Must use today: ${alert.item.name} has expired`
        : `Heads up: ${alert.item.name} expires within the month`,
      highlightColor: isExpired
        ? 'rgba(211,47,47,0.22)'
        : 'rgba(249,168,37,0.28)',
      dismissible: true,
    });
  }

  return notifications;
}
