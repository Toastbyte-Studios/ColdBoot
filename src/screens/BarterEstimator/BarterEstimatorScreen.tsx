import { observer } from 'mobx-react-lite';
import React, { JSX } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useInventoryStore, usePantryStore } from '../../stores/StoreContext';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import {
  BarterSummary,
  CategoryScore,
  SCARCITY_THRESHOLD,
  StockStatus,
  SURPLUS_THRESHOLD,
  computeBarter,
} from './barterEstimatorUtils';

const isAndroid = Platform.OS === 'android';

const STATUS_ICON: Record<StockStatus, string> = {
  surplus: 'trending-up-outline',
  balanced: 'remove-outline',
  scarce: 'trending-down-outline',
};

const READINESS_LABEL: Record<BarterSummary['overallReadiness'], string> = {
  poor: 'Poor — nothing to offer',
  fair: 'Fair — limited trade power',
  good: 'Good — a few bargaining chips',
  excellent: 'Excellent — strong barter position',
};

const READINESS_ICON: Record<BarterSummary['overallReadiness'], string> = {
  poor: 'warning-outline',
  fair: 'alert-circle-outline',
  good: 'checkmark-circle-outline',
  excellent: 'star-outline',
};

function CategoryRow({
  item,
  styles,
  COLORS,
}: {
  item: CategoryScore;
  styles: ReturnType<typeof makeStyles>;
  COLORS: ReturnType<typeof useTheme>;
}) {
  const iconColor =
    item.status === 'surplus'
      ? COLORS.SUCCESS
      : item.status === 'scarce'
        ? COLORS.ERROR
        : COLORS.BRAND;

  return (
    <View style={styles.row}>
      <Ionicons
        name={STATUS_ICON[item.status]}
        size={18}
        color={iconColor}
        style={styles.rowIcon}
      />
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowMeta}>
          {item.source === 'pantry' ? 'Pantry' : (item.category ?? 'Inventory')}{' '}
          · {item.itemCount} item{item.itemCount !== 1 ? 's' : ''}, qty{' '}
          {Math.round(item.totalQuantity)}
        </Text>
      </View>
      <Text style={[styles.rowStatus, { color: iconColor }]}>
        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
      </Text>
    </View>
  );
}

/**
 * BarterEstimatorScreen
 *
 * Analyzes the user's pantry and inventory to suggest what they have in
 * surplus (good to trade) and what they're short on (should seek in trade).
 * All values are estimates for entertainment purposes only.
 */
export default observer(function BarterEstimatorScreen(): JSX.Element {
  const COLORS = useTheme();
  const pantryStore = usePantryStore();
  const inventoryStore = useInventoryStore();

  // Computed directly during render — MobX observer tracks all accessed
  // observables (items, categories, quantities) and re-renders on any change.
  const summary = computeBarter(
    pantryStore.items,
    pantryStore.categories,
    inventoryStore.items,
    inventoryStore.categories,
  );

  const hasItems =
    pantryStore.items.length > 0 || inventoryStore.items.length > 0;

  const styles = makeStyles(COLORS);

  const rowProps = { styles, COLORS };

  return (
    <StackScreen
      title="Barter Estimator"
      note="Trade values are rough estimates for entertainment only. Real barter depends on local scarcity, relationships, and circumstances."
    >
      {!hasItems ? (
        <View style={[styles.emptyCard, cardSurface(COLORS)]}>
          <Ionicons
            name="cube-outline"
            size={36}
            color={COLORS.BRAND}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyText}>
            Add items to your Pantry and Inventory to see your barter profile.
          </Text>
        </View>
      ) : (
        <>
          <SectionEyebrow>Barter position</SectionEyebrow>
          <View style={[styles.card, cardSurface(COLORS)]}>
            <View style={styles.badgeRow}>
              <Ionicons
                name={READINESS_ICON[summary.overallReadiness]}
                size={20}
                color={COLORS.ACCENT}
              />
              <Text style={styles.badgeText}>
                {READINESS_LABEL[summary.overallReadiness]}
              </Text>
            </View>
          </View>

          {summary.offerItems.length > 0 && (
            <>
              <SectionEyebrow style={styles.eyebrow}>
                You can offer
              </SectionEyebrow>
              <View style={[styles.card, cardSurface(COLORS)]}>
                <Text style={styles.cardSubtitle}>
                  You have surplus in these categories — good trade chips.
                </Text>
                {summary.offerItems.map((item) => (
                  <CategoryRow
                    key={`${item.source}-${item.name}-${item.category ?? ''}`}
                    item={item}
                    {...rowProps}
                  />
                ))}
              </View>
            </>
          )}

          {summary.wantItems.length > 0 && (
            <>
              <SectionEyebrow style={styles.eyebrow}>
                You should seek
              </SectionEyebrow>
              <View style={[styles.card, cardSurface(COLORS)]}>
                <Text style={styles.cardSubtitle}>
                  These categories are thin — prioritize acquiring them.
                </Text>
                {summary.wantItems.map((item) => (
                  <CategoryRow
                    key={`${item.source}-${item.name}-${item.category ?? ''}`}
                    item={item}
                    {...rowProps}
                  />
                ))}
              </View>
            </>
          )}

          <SectionEyebrow style={styles.eyebrow}>Full breakdown</SectionEyebrow>
          <View style={[styles.card, cardSurface(COLORS)]}>
            <Text style={styles.cardSubtitle}>
              All categories ranked by barter value.
            </Text>
            {summary.categories
              .slice()
              .sort((a, b) => b.rawScore - a.rawScore)
              .map((item) => (
                <CategoryRow
                  key={`${item.source}-${item.name}-${item.category ?? ''}`}
                  item={item}
                  {...rowProps}
                />
              ))}
          </View>

          <SectionEyebrow style={styles.eyebrow}>
            How scores work
          </SectionEyebrow>
          <Text style={styles.infoText}>
            Each item category earns a weighted score based on post-crisis
            desirability. Dry goods and canned goods score high; frozen items
            score low since freezers fail quickly without power. Categories
            above {Math.round(SURPLUS_THRESHOLD * 100)}% of your total score are
            surplus; categories below {Math.round(SCARCITY_THRESHOLD * 100)}%
            are scarce.
          </Text>
        </>
      )}
    </StackScreen>
  );
});

function makeStyles(COLORS: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    // StackScreen's Android content is full-bleed; cards carry the gutter.
    card: {
      marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
      padding: SPACING.md,
      gap: SPACING.sm,
    },
    eyebrow: {
      marginTop: SPACING.lg,
    },
    emptyCard: {
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
      padding: SPACING.xl,
    },
    emptyIcon: { marginBottom: SPACING.sm },
    emptyText: {
      fontSize: 14,
      color: COLORS.MUTED,
      textAlign: 'center',
      lineHeight: 20,
    },
    cardSubtitle: {
      fontSize: 13,
      color: COLORS.MUTED,
      lineHeight: 18,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    badgeText: {
      fontSize: 15,
      fontWeight: '600',
      color: COLORS.ACCENT,
    },
    infoText: {
      fontSize: 12,
      color: isAndroid ? COLORS.MUTED : COLORS.MUTED_ON_GROUND,
      lineHeight: 18,
      paddingHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    },
    // Row styles (shared for CategoryRow components)
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.SEPARATOR,
    },
    rowIcon: { marginRight: SPACING.sm },
    rowMain: { flex: 1 },
    rowName: {
      fontSize: 14,
      fontWeight: '500',
    },
    rowMeta: {
      fontSize: 12,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    rowStatus: { fontSize: 13, fontWeight: '600' },
  });
}
