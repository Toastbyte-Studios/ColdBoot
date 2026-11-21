import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import ModuleHero from '../../components/ModuleHero';
import { usePantryStore } from '../../stores';
import { calorieText, calorieTotal, pantryHeroState } from './pantryHero';

/**
 * The Pantry's hero: the item to use first (expired food first, then what
 * expires soonest), opening the expiration tracker. Below: how many items
 * have expired, how many are due within 30 days, and the calories on hand
 * from items whose label facts are known.
 */
const PantryHero = observer(() => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const pantry = usePantryStore();
  // Expiry is measured against today, which MobX can't observe: re-render
  // when the screen comes back into view.
  const [, setFocusedAt] = useState(0);
  useEffect(
    () => navigation.addListener('focus', () => setFocusedAt(Date.now())),
    [navigation],
  );

  const state = pantryHeroState(pantry.items, (item) =>
    pantry.getExpirationDaysRemaining(item),
  );
  const calories = calorieTotal(pantry.items);
  const openTracker = () => navigation.navigate('PantryExpirationTracker');
  const hasItems = pantry.items.length > 0;

  return (
    <ModuleHero
      eyebrow={state.eyebrow}
      headline={state.headline}
      headlineTone={state.tone}
      detail={state.detail}
      onPress={hasItems ? openTracker : undefined}
      stats={[
        {
          label: 'Expired',
          value: state.expired > 0 ? String(state.expired) : 'None',
          tone: state.expired > 0 ? 'poor' : 'muted',
          onPress: openTracker,
          accessibilityLabel: `Expired: ${state.expired === 0 ? 'none' : state.expired}`,
        },
        {
          label: 'Due in 30 days',
          value: state.expiringSoon > 0 ? String(state.expiringSoon) : 'None',
          tone: state.expiringSoon > 0 ? 'fair' : 'muted',
          onPress: openTracker,
          accessibilityLabel: `Due within 30 days: ${state.expiringSoon === 0 ? 'none' : state.expiringSoon}`,
        },
        {
          label: 'Calories',
          value: calories ? calorieText(calories) : 'Unknown',
          tone: calories ? undefined : 'muted',
          onPress: hasItems
            ? () => navigation.navigate('PantryAllItems')
            : undefined,
          accessibilityLabel: calories
            ? `Calories on hand: ${calorieText(calories)}${calories.partial ? ', from the items with label facts' : ''}`
            : 'Calories on hand: unknown. Add calories per serving to items',
        },
      ]}
    />
  );
});

export default PantryHero;
