import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SCREEN_GUTTER, SPACING } from '../theme';
import Chip from './Chip';
import { Text } from './ScaledText';
import SectionEyebrow from './SectionEyebrow';

const isAndroid = Platform.OS === 'android';

/** How a stat reads: a status colour, or plain. */
export type HeroTone = 'good' | 'fair' | 'poor' | 'muted';

export type HeroStat = {
  label: string;
  value: string;
  tone?: HeroTone;
  /** Makes the stat open whatever it summarises. */
  onPress?: () => void;
  accessibilityLabel?: string;
};

type Props = {
  /** Small caps label over the headline, e.g. "Pressure trend". */
  eyebrow: string;
  /** The one fact (or action) this module leads with. */
  headline: string;
  headlineTone?: HeroTone;
  /** One line under the headline: what it means, or what to do. */
  detail?: string;
  /** A small graphic at the trailing edge (a sparkline, a gauge). */
  graphic?: React.ReactNode;
  /** Controls under the detail line, for a hero that is an action (SOS). */
  actions?: React.ReactNode;
  /** Opens the tool the headline comes from. */
  onPress?: () => void;
  /** Up to three supporting readings. */
  stats: HeroStat[];
};

/**
 * The hero card at the top of a module screen.
 *
 * It is Home's Solar cycle card, generalised: the same surface, the same
 * headline type and the same three-reading strip (a divided row on iOS,
 * chips on Android), so a module's hero reads as part of one family. Each
 * module supplies its own content: the one thing in that module worth
 * knowing at a glance, and three readings that support it.
 */
export default function ModuleHero({
  eyebrow,
  headline,
  headlineTone,
  detail,
  graphic,
  actions,
  onPress,
  stats,
}: Props) {
  const COLORS = useTheme();

  const toneColor = (tone?: HeroTone) => {
    switch (tone) {
      case 'good':
        return COLORS.SECONDARY_ACCENT;
      case 'fair':
        return COLORS.ACCENT;
      case 'poor':
        return COLORS.ERROR;
      case 'muted':
        return COLORS.MUTED;
      default:
        return COLORS.PRIMARY_DARK;
    }
  };

  const top = (
    <View style={styles.headlineRow}>
      <View style={styles.headline}>
        <SectionEyebrow inline>{eyebrow}</SectionEyebrow>
        <Text
          style={[styles.headlineText, { color: toneColor(headlineTone) }]}
          numberOfLines={2}
        >
          {headline}
        </Text>
        {detail ? (
          <Text style={[styles.detail, { color: COLORS.MUTED }]}>{detail}</Text>
        ) : null}
      </View>
      {graphic ? (
        <View accessibilityElementsHidden importantForAccessibility="no">
          {graphic}
        </View>
      ) : null}
    </View>
  );

  return (
    <View
      style={[
        styles.card,
        isAndroid
          ? { backgroundColor: COLORS.SURFACE_CONTAINER }
          : [
              styles.outlined,
              { backgroundColor: COLORS.SURFACE, borderColor: COLORS.BORDER },
            ],
      ]}
    >
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={[eyebrow, headline, detail]
            .filter(Boolean)
            .join('. ')}
          style={({ pressed }) => (pressed ? styles.pressed : null)}
        >
          {top}
        </Pressable>
      ) : (
        <View
          accessible
          accessibilityLabel={[eyebrow, headline, detail]
            .filter(Boolean)
            .join('. ')}
        >
          {top}
        </View>
      )}

      {actions ? <View style={styles.actions}>{actions}</View> : null}

      {stats.length === 0 ? null : isAndroid ? (
        // As on Home: chips in a strip that scrolls rather than wraps.
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {stats.map((stat) => (
            <Chip
              key={stat.label}
              label={`${stat.label}: ${stat.value}`}
              dotColor={stat.tone ? toneColor(stat.tone) : undefined}
              onPress={stat.onPress}
              accessibilityLabel={
                stat.accessibilityLabel ?? `${stat.label}: ${stat.value}`
              }
            />
          ))}
        </ScrollView>
      ) : (
        <>
          <View
            style={[styles.divider, { backgroundColor: COLORS.SEPARATOR }]}
          />
          <View style={styles.stats}>
            {stats.map((stat, index) => (
              <React.Fragment key={stat.label}>
                {index > 0 ? (
                  <View
                    style={[styles.rule, { backgroundColor: COLORS.SEPARATOR }]}
                  />
                ) : null}
                <Pressable
                  style={({ pressed }) => [
                    styles.stat,
                    pressed && stat.onPress ? styles.pressed : null,
                  ]}
                  onPress={stat.onPress}
                  disabled={!stat.onPress}
                  accessibilityRole={stat.onPress ? 'button' : undefined}
                  accessibilityLabel={
                    stat.accessibilityLabel ?? `${stat.label}: ${stat.value}`
                  }
                >
                  <Text style={[styles.statLabel, { color: COLORS.MUTED }]}>
                    {stat.label.toUpperCase()}
                  </Text>
                  <Text
                    style={[styles.statValue, { color: toneColor(stat.tone) }]}
                    numberOfLines={2}
                  >
                    {stat.value}
                  </Text>
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const hairline =
  StyleSheet.hairlineWidth < 0.5 ? 0.5 : StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    paddingTop: isAndroid ? 16 : 15,
    paddingHorizontal: isAndroid ? 18 : 17,
    paddingBottom: isAndroid ? 14 : 13,
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  outlined: {
    borderWidth: 1,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headline: {
    flex: 1,
  },
  headlineText: {
    fontSize: isAndroid ? 26 : 25,
    fontFamily: 'Bitter-Bold',
    letterSpacing: -0.5,
  },
  detail: {
    fontSize: isAndroid ? 14 : 13,
    fontWeight: isAndroid ? '400' : '500',
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  pressed: {
    opacity: 0.6,
  },
  divider: {
    height: hairline,
    // Full-bleed: cancels the card's horizontal padding.
    marginHorizontal: -17,
    marginTop: 13,
    marginBottom: 11,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  stat: {
    flex: 1,
    gap: 3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  rule: {
    width: hairline,
    alignSelf: 'stretch',
  },
  chipScroll: {
    marginHorizontal: -18,
    marginTop: 14,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 18,
  },
});
