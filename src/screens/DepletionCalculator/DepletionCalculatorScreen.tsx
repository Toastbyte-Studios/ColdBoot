import { observer } from 'mobx-react-lite';
import React, { JSX, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppButton from '../../components/AppButton';
import IconButton from '../../components/IconButton';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useInventoryStore, usePantryStore } from '../../stores/StoreContext';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import { calculate, readinessLabel } from './depletionCalculatorUtils';

const isAndroid = Platform.OS === 'android';

/**
 * DepletionCalculatorScreen
 *
 * Estimates how long a household's pantry and inventory will last given a
 * configurable number of people. All math is approximate and for entertainment
 * purposes only.
 */
export default observer(function DepletionCalculatorScreen(): JSX.Element {
  const COLORS = useTheme();
  const pantryStore = usePantryStore();
  const inventoryStore = useInventoryStore();

  const [peopleInput, setPeopleInput] = useState('1');
  const [hasCalculated, setHasCalculated] = useState(false);

  const people = Math.max(1, parseInt(peopleInput, 10) || 1);
  const hasItems =
    pantryStore.items.length > 0 || inventoryStore.items.length > 0;

  // Derive result inline so MobX observer always keeps it fresh after Calculate is pressed
  const calculated = hasCalculated
    ? calculate(pantryStore.items, inventoryStore.items, people)
    : null;

  function handleCalculate() {
    setHasCalculated(true);
  }

  function formatDays(days: number): string {
    if (days < 1) return 'Less than 1 day';
    const rounded = Math.round(days);
    if (rounded === 1) return '1 day';
    if (rounded < 7) return `${rounded} days`;
    const weeks = Math.floor(rounded / 7);
    const rem = rounded % 7;
    const weekStr = weeks === 1 ? '1 week' : `${weeks} weeks`;
    if (rem === 0) return weekStr;
    return `${weekStr}, ${rem} day${rem > 1 ? 's' : ''}`;
  }

  return (
    <StackScreen
      title="Depletion Calculator"
      note="Estimates are rough and for entertainment only. Actual consumption depends on diet, activity level, and item types."
      keyboardShouldPersistTaps="handled"
    >
      <SectionEyebrow>Household size</SectionEyebrow>
      <View style={[styles.card, cardSurface(COLORS)]}>
        <Text style={styles.cardSubtitle}>
          How many people are you planning for?
        </Text>
        <View style={styles.stepper}>
          <IconButton
            name="remove-outline"
            size={22}
            onPress={() => setPeopleInput(String(Math.max(1, people - 1)))}
            accessibilityLabel="Decrease people count"
          />
          <TextInput
            style={[styles.stepInput, { color: COLORS.PRIMARY_DARK }]}
            value={peopleInput}
            onChangeText={setPeopleInput}
            keyboardType="number-pad"
            maxLength={3}
            accessibilityLabel="Number of people"
          />
          <IconButton
            name="add-outline"
            size={22}
            onPress={() => setPeopleInput(String(people + 1))}
            accessibilityLabel="Increase people count"
          />
        </View>
      </View>

      <SectionEyebrow style={styles.eyebrow}>Current stock</SectionEyebrow>
      <View style={[styles.card, cardSurface(COLORS)]}>
        <View style={styles.statRow}>
          <Ionicons name="nutrition-outline" size={18} color={COLORS.BRAND} />
          <Text style={styles.statLabel}>
            Pantry items: {pantryStore.items.length}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Ionicons name="cube-outline" size={18} color={COLORS.BRAND} />
          <Text style={styles.statLabel}>
            Inventory items: {inventoryStore.items.length}
          </Text>
        </View>
        {!hasItems && (
          <Text style={[styles.emptyNote, { color: COLORS.MUTED }]}>
            Add items to your Pantry and Inventory to get an estimate.
          </Text>
        )}
      </View>

      <View style={styles.actionRow}>
        <AppButton
          label="Calculate"
          onPress={handleCalculate}
          disabled={!hasItems}
          icon="calculator-outline"
          fullWidth
          accessibilityLabel="Calculate depletion estimate"
        />
      </View>

      {calculated !== null && (
        <>
          <SectionEyebrow style={styles.eyebrow}>Estimate</SectionEyebrow>
          <View style={[styles.card, cardSurface(COLORS)]}>
            {(() => {
              const { label, icon } = readinessLabel(calculated.totalDays);
              return (
                <View style={styles.badgeRow}>
                  <Ionicons name={icon} size={20} color={COLORS.ACCENT} />
                  <Text style={[styles.badgeText, { color: COLORS.ACCENT }]}>
                    {label}
                  </Text>
                </View>
              );
            })()}

            <View
              style={[styles.divider, { backgroundColor: COLORS.SEPARATOR }]}
            />

            <View style={styles.resultRow}>
              <Text style={styles.resultKey}>Food supply (pantry)</Text>
              <Text style={styles.resultVal}>
                {formatDays(calculated.pantryDays)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultKey}>Gear &amp; supply bonus</Text>
              <Text style={styles.resultVal}>
                +{formatDays(calculated.inventoryBonus)}
              </Text>
            </View>

            <View
              style={[styles.divider, { backgroundColor: COLORS.SEPARATOR }]}
            />

            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, styles.totalKey]}>
                Total estimated runway
              </Text>
              <Text
                style={[
                  styles.resultVal,
                  styles.totalVal,
                  { color: COLORS.ACCENT },
                ]}
              >
                {formatDays(calculated.totalDays)}
              </Text>
            </View>

            <Text style={[styles.forPeople, { color: COLORS.MUTED }]}>
              For {people} {people === 1 ? 'person' : 'people'}, based on{' '}
              {calculated.itemCount} tracked items
            </Text>
          </View>
        </>
      )}
    </StackScreen>
  );
});

const styles = StyleSheet.create({
  // StackScreen's Android content is full-bleed; cards carry the gutter.
  card: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  eyebrow: {
    marginTop: SPACING.lg,
  },
  cardSubtitle: {
    fontSize: 13,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.xs,
  },
  stepInput: {
    width: 60,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statLabel: {
    fontSize: 14,
  },
  emptyNote: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  actionRow: {
    marginTop: SPACING.lg,
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultKey: {
    fontSize: 14,
    flexShrink: 1,
  },
  resultVal: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 0,
    marginLeft: SPACING.sm,
  },
  totalKey: {
    fontWeight: '600',
  },
  totalVal: {
    fontWeight: '700',
    fontSize: 16,
  },
  forPeople: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});
