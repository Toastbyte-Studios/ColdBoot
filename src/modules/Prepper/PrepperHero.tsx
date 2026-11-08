import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import ModuleHero from '../../components/ModuleHero';
import { useReadinessItems } from '../../screens/DeviceStatus/useReadinessItems';
import { usePantryStore } from '../../stores/StoreContext';
import { expiryCounts, expiryHeadline } from './prepperHero';
import type { PantryItem } from '../../stores/PantryStore';

/**
 * Prepper's hero: what in the pantry runs out first. Below: how much has
 * already expired, how much expires within 30 days, and where the emergency
 * plan stands (the same check as Device Status' readiness).
 *
 * Days of supply would make a stronger headline, but the Depletion
 * Calculator keeps household size to itself and calls its own maths
 * approximate; it can move up here once household size is saved.
 */
const PrepperHero = observer(() => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const pantry = usePantryStore();
  const [now, setNow] = useState(() => new Date());
  const plan = useReadinessItems().find((item) => item.id === 'plan');

  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
    }, []),
  );

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleMidnightRefresh = () => {
      const current = new Date();
      const midnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      );
      timeout = setTimeout(() => {
        setNow(new Date());
        scheduleMidnightRefresh();
      }, midnight.getTime() - current.getTime());
    };
    scheduleMidnightRefresh();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });

    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, []);

  const daysRemaining = (item: PantryItem) =>
    pantry.getExpirationDaysRemaining(item);
  const headline = expiryHeadline(
    pantry.itemsSortedByExpiration(),
    daysRemaining,
    now,
  );
  const counts = expiryCounts(pantry.items, daysRemaining, now);

  return (
    <ModuleHero
      eyebrow="Next to expire"
      headline={headline.headline}
      headlineTone={headline.tone}
      detail={headline.detail}
      onPress={() => navigation.navigate('PantryExpirationTracker')}
      stats={[
        {
          label: 'Expired',
          value: String(counts.expired),
          tone: counts.expired > 0 ? 'poor' : 'good',
          onPress: () => navigation.navigate('PantryExpirationTracker'),
        },
        {
          label: 'Within 30 days',
          value: String(counts.soon),
          tone: counts.soon > 0 ? 'fair' : undefined,
          onPress: () => navigation.navigate('PantryExpirationTracker'),
        },
        {
          label: 'Plan',
          value:
            plan?.status === 'ready'
              ? 'Complete'
              : (plan?.detail ?? 'Not started'),
          tone:
            plan?.status === 'ready'
              ? 'good'
              : plan?.status === 'missing'
                ? 'poor'
                : 'fair',
          onPress: () => navigation.navigate('EmergencyPlan'),
        },
      ]}
    />
  );
});

export default PrepperHero;
