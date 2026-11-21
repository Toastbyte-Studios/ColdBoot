import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import ModuleHero from '../../components/ModuleHero';
import { useLocalDate } from '../../hooks/useLocalDate';
import { useTheme } from '../../hooks/useTheme';
import { useEmergencyPlanStore } from '../../stores';
import { namesText, planHeroState } from './planHero';

/** Three segments, one per part of the plan, filled when it is done. */
function PlanParts({
  parts,
  done,
  empty,
}: {
  parts: boolean[];
  done: string;
  empty: string;
}) {
  return (
    <View style={styles.parts} testID="plan-hero-parts">
      {parts.map((isDone, index) => (
        <View
          key={index}
          style={[styles.part, { backgroundColor: isDone ? done : empty }]}
        />
      ))}
    </View>
  );
}

/**
 * The Emergency Planner's hero: how far along the plan is and the one thing
 * to add next, or that it's ready (and when it was last touched). Below:
 * who's in it, where to meet, and the out-of-area contact, each opening the
 * part it comes from.
 */
const EmergencyPlanHero = observer(() => {
  const COLORS = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const store = useEmergencyPlanStore();
  // "Updated today" must turn into "yesterday" at midnight, even with the
  // screen left open.
  const now = useLocalDate().getTime();

  const state = planHeroState({
    contacts: store.contacts,
    rallyPoints: store.rallyPoints,
    communicationPlan: store.communicationPlan,
    now,
  });
  const contacts = namesText(store.contacts);
  const rally = namesText(store.rallyPoints);
  const outOfArea = store.communicationPlan.outOfAreaContact.trim();
  const next = state.next;

  return (
    <ModuleHero
      eyebrow="Your plan"
      headline={state.headline}
      headlineTone={state.tone}
      detail={state.detail}
      graphic={
        <PlanParts
          parts={state.parts}
          done={state.tone === 'good' ? COLORS.SECONDARY_ACCENT : COLORS.BRAND}
          empty={COLORS.BORDER}
        />
      }
      onPress={next ? () => navigation.navigate(next) : undefined}
      stats={[
        {
          label: 'Contacts',
          value: contacts ?? 'None yet',
          tone: contacts ? undefined : 'muted',
          onPress: () => navigation.navigate('EmergencyContacts'),
        },
        {
          label: 'Meet at',
          value: rally ?? 'None yet',
          tone: rally ? undefined : 'muted',
          onPress: () => navigation.navigate('RallyPoints'),
        },
        {
          label: 'Out of area',
          value: outOfArea || 'Not set',
          tone: outOfArea ? undefined : 'muted',
          onPress: () => navigation.navigate('CommunicationPlan'),
          accessibilityLabel: `Out-of-area contact: ${outOfArea || 'not set'}`,
        },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  parts: {
    flexDirection: 'row',
    gap: 4,
  },
  part: {
    width: 16,
    height: 7,
    borderRadius: 3.5,
  },
});

export default EmergencyPlanHero;
