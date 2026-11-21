import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import ModuleHero from '../../components/ModuleHero';
import { useTheme } from '../../hooks/useTheme';
import { ChecklistHeroState } from './checklistProgress';
import type { Checklist } from '../../stores/ChecklistStore';

const BAR_WIDTH = 64;
const BAR_HEIGHT = 7;

function ProgressBar({
  fraction,
  fill,
  track,
}: {
  fraction: number;
  fill: string;
  track: string;
}) {
  return (
    <View
      style={[styles.track, { backgroundColor: track }]}
      testID="checklist-hero-bar"
    >
      <View
        style={[
          styles.fill,
          {
            width: Math.round(BAR_WIDTH * Math.min(1, Math.max(0, fraction))),
            backgroundColor: fill,
          },
        ]}
      />
    </View>
  );
}

type Props = {
  state: ChecklistHeroState;
};

/**
 * The Checklists hero: the list to finish next (the unfinished one closest
 * to done) with a progress bar, opening that list. Below: how many lists
 * are done, how many items are ticked across them, and the next item to
 * tick on the lead list.
 *
 * The screen works out the progress once (it also labels each row), so the
 * hero takes the state rather than reading the store itself.
 */
const ChecklistHero = observer(({ state }: Props) => {
  const COLORS = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const open = (checklist: Checklist) =>
    navigation.navigate('ChecklistEntry', { checklist });
  const focus = state.focus;
  const allDone =
    state.listsWithItems > 0 && state.listsDone === state.listsWithItems;

  return (
    <ModuleHero
      eyebrow={focus ? 'Finish next' : 'Checklists'}
      headline={state.headline}
      headlineTone={state.tone}
      detail={state.detail}
      graphic={
        state.listsWithItems > 0 ? (
          <ProgressBar
            fraction={state.fraction}
            fill={allDone ? COLORS.SECONDARY_ACCENT : COLORS.BRAND}
            track={COLORS.BORDER}
          />
        ) : null
      }
      onPress={focus ? () => open(focus.checklist) : undefined}
      stats={[
        {
          label: 'Lists done',
          value:
            state.listsWithItems === 0
              ? '—'
              : `${state.listsDone} of ${state.listsWithItems}`,
          tone: allDone ? 'good' : state.listsWithItems ? undefined : 'muted',
        },
        {
          label: 'Items done',
          value: state.total === 0 ? '—' : `${state.done} of ${state.total}`,
          tone: state.total ? undefined : 'muted',
        },
        focus?.next
          ? {
              label: 'Next item',
              value: focus.next.text,
              onPress: () => open(focus.checklist),
              accessibilityLabel: `Next item on ${focus.checklist.name}: ${focus.next.text}`,
            }
          : {
              label: 'Next item',
              value: allDone ? 'Nothing left' : '—',
              tone: 'muted',
            },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  track: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
  },
});

export default ChecklistHero;
