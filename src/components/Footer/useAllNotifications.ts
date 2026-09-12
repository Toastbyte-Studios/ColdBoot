import { useTheme } from '../../hooks/useTheme';
import { AppNotification } from '../../stores/NotificationsStore';
import { SolarEventType } from '../../stores/SolarCycleNotificationStore';
import {
  useAstronomyEventStore,
  useNotificationsStore,
  usePantryStore,
  useSolarCycleNotificationStore,
  useWeatherOutlookStore,
} from '../../stores/StoreContext';
import { formatDaysUntil } from '../../utils/formatDaysUntil';

/**
 * Count of notifications the user has not hidden.
 *
 * Derived from {@link useAllNotifications} so the tab bar badge and the alerts
 * sheet can never disagree about how many there are.
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
 * caller so that both the footer badge count and the notifications modal can
 * share the same canonical list without duplicating source logic.
 */
export function useAllNotifications(): AppNotification[] {
  const COLORS = useTheme();
  const solarStore = useSolarCycleNotificationStore();
  const weatherOutlook = useWeatherOutlookStore();
  const pantry = usePantryStore();
  const astronomyStore = useAstronomyEventStore();

  const notifications: AppNotification[] = [];

  // ── Solar events ─────────────────────────────────────────────────────────────
  const iconMap: Record<SolarEventType, string> = {
    sunrise: 'sunny-outline',
    sunset: 'moon-outline',
    dawn: 'partly-sunny-outline',
    dusk: 'moon-outline',
  };

  for (const n of solarStore.activeNotifications) {
    if (n.dismissed) continue;
    notifications.push({
      key: `solar-${n.id}`,
      type: 'solar',
      icon: iconMap[n.eventType] ?? 'sunny-outline',
      iconColor: COLORS.ACCENT,
      message: solarStore.getNotificationMessage(n),
      dismissible: n.eventType !== 'sunrise' && n.eventType !== 'sunset',
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
