import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import {
  AstronomyEvent,
  AstronomyEventType,
} from '../../stores/AstronomyEventStore';
import {
  useAstronomyEventStore,
  useCoreStore,
} from '../../stores/StoreContext';
import { SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import { onColor } from '../../theme/colorUtils';
import { formatDaysUntil } from '../../utils/formatDaysUntil';

const isAndroid = Platform.OS === 'android';

const EVENT_TYPE_DETAILS: Record<
  AstronomyEventType,
  { color: string; description: string }
> = {
  solar_eclipse: {
    color: '#FF6B35',
    description: 'Eclipse',
  },
  lunar_eclipse: {
    color: '#9B59B6',
    description: 'Eclipse',
  },
  solstice: {
    color: '#F39C12',
    description: 'Solstice',
  },
  equinox: {
    color: '#27AE60',
    description: 'Equinox',
  },
  supermoon: {
    color: '#3498DB',
    description: 'Supermoon',
  },
  planet_rise: {
    color: '#1ABC9C',
    description: 'Planet',
  },
};

const formatEventDate = (date: Date): string => {
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

interface EventCardProps {
  event: AstronomyEvent;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const COLORS = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const typeInfo = EVENT_TYPE_DETAILS[event.type] ?? {
    color: COLORS.ACCENT,
    description: event.type,
  };
  const daysUntil = formatDaysUntil(event.date);
  const isImminent = event.date.getTime() - Date.now() < 7 * 24 * 3600 * 1000;

  // Imminence is carried by the card's accent edge and by weight, not by
  // tinting the text: the type colours are 2-3:1 as text on the light card.
  const cardStyle = cardSurface(
    COLORS,
    isImminent ? { accent: typeInfo.color } : undefined,
  );
  const badgeStyle = { backgroundColor: typeInfo.color };
  // White failed on five of the six type colours (as low as 2.2:1); onColor
  // picks ink or paper, whichever reads, for each.
  const badgeTextStyle = { color: onColor(typeInfo.color) };
  const daysUntilStyle = {
    color: COLORS.PRIMARY_DARK,
    fontWeight: (isImminent ? '700' : '500') as '700' | '500',
  };

  return (
    <View style={[styles.eventCard, cardStyle]}>
      <View style={styles.cardRow}>
        <Ionicons
          name={event.icon}
          size={32}
          color={COLORS.PRIMARY_DARK}
          style={styles.eventIcon}
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.eventLabel}>{event.label}</Text>
            <View style={[styles.typeBadge, badgeStyle]}>
              <Text style={[styles.typeBadgeText, badgeTextStyle]}>
                {typeInfo.description}
              </Text>
            </View>
          </View>
          <Text style={styles.eventDate}>{formatEventDate(event.date)}</Text>
          <Text style={[styles.daysUntil, daysUntilStyle]}>{daysUntil}</Text>
          <View style={styles.detailDivider} />
          <Text style={styles.eventDetail}>{event.detail}</Text>
        </View>
      </View>
    </View>
  );
};

/**
 * SkyEventsScreen displays upcoming astronomical events in chronological
 * order for the next 12 months, including eclipses, solstices, equinoxes,
 * supermoons, and planet rise times.
 *
 * All calculations run fully offline using the `astronomia` library.
 *
 * @returns A React element containing the Sky Events screen UI.
 */
function SkyEventsScreen() {
  const COLORS = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const core = useCoreStore();
  const astronomyStore = useAstronomyEventStore();

  const upcomingEvents = astronomyStore.getUpcomingEvents(12);
  const hasLocation = !!core.lastFix;

  return (
    <StackScreen
      title="Sky Events"
      subtitle={
        upcomingEvents.length === 0
          ? 'Next 12 months'
          : `${upcomingEvents.length} event${
              upcomingEvents.length === 1 ? '' : 's'
            } in the next 12 months`
      }
    >
      {!hasLocation && (
        <View style={[styles.locationBanner, cardSurface(COLORS)]}>
          <View style={styles.locationBannerRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.MUTED} />
            <Text style={styles.locationBannerText}>
              Enable location for planet rise times
            </Text>
          </View>
        </View>
      )}

      {upcomingEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No upcoming sky events found in the next 12 months.
          </Text>
        </View>
      ) : (
        upcomingEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))
      )}
    </StackScreen>
  );
}

export default observer(SkyEventsScreen);

const createStyles = (COLORS: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    locationBanner: {
      // StackScreen's Android content is full-bleed; cards carry the gutter.
      marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      overflow: 'hidden',
    },
    locationBannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    locationBannerText: {
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
      color: COLORS.PRIMARY_DARK,
      flexShrink: 1,
    },
    eventCard: {
      width: '80%',
      paddingTop: 18,
      paddingBottom: 14,
      paddingHorizontal: 14,
      marginTop: 10,
      overflow: 'hidden',
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    eventIcon: {
      marginRight: 12,
    },
    cardContent: {
      flex: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 6,
    },
    eventLabel: {
      fontSize: 15,
      fontWeight: 'bold',
      flex: 1,
      color: COLORS.PRIMARY_DARK,
    },
    typeBadge: {
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    eventDate: {
      fontSize: 13,
      marginTop: 4,
      opacity: 0.85,
      color: COLORS.PRIMARY_DARK,
    },
    daysUntil: {
      fontSize: 12,
      marginTop: 2,
      opacity: 0.9,
    },
    detailDivider: {
      marginTop: 10,
      marginBottom: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.SEPARATOR,
    },
    eventDetail: {
      fontSize: 13,
      lineHeight: 18,
      opacity: 0.85,
      color: COLORS.PRIMARY_DARK,
    },
    emptyState: {
      marginTop: 40,
      alignItems: 'center',
      paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
    },
    emptyStateText: {
      fontSize: 14,
      textAlign: 'center',
      color: isAndroid ? COLORS.MUTED : COLORS.MUTED_ON_GROUND,
    },
  });
