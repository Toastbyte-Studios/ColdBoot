import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import AppButton from '../../components/AppButton';
import ModuleHero from '../../components/ModuleHero';
import { useLocalDate } from '../../hooks/useLocalDate';
import { useNotesStore } from '../../stores';
import { latestNote, noteCounts, noteHeadline, whenText } from './latestNote';

const countText = (count: number) => (count === 0 ? 'None' : String(count));

/**
 * Notepad's hero: the last note written, so picking up where you left off
 * is one tap. Below: bookmarked notes, notes from the last seven days, and
 * voice logs, each opening its list. With no notes yet, it offers a first
 * one instead.
 */
const NotepadHero = observer(() => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const notesStore = useNotesStore();
  // "Today" and "this week" move with the clock, not with the store: re-read
  // it at midnight, on returning to the app, and when the screen regains
  // focus.
  const localDate = useLocalDate();
  const [focusedAt, setFocusedAt] = useState(0);
  useEffect(
    () => navigation.addListener('focus', () => setFocusedAt(Date.now())),
    [navigation],
  );
  const now = new Date(Math.max(localDate.getTime(), focusedAt));

  const latest = latestNote(notesStore.notes);
  const counts = noteCounts(notesStore.notes, now.getTime());

  return (
    <ModuleHero
      eyebrow={latest ? 'Latest note' : 'Notepad'}
      headline={latest ? noteHeadline(latest) : 'Write it down'}
      detail={
        latest
          ? `${whenText(latest.createdAt, now)} · ${latest.category}`
          : 'What you saw, where, and when, while it is fresh.'
      }
      onPress={
        latest
          ? () => navigation.navigate('NoteEntry', { note: latest })
          : undefined
      }
      actions={
        latest ? undefined : (
          <AppButton
            label="New note"
            icon="create-outline"
            variant="filled"
            onPress={() => navigation.navigate('NewNote')}
          />
        )
      }
      stats={[
        {
          label: 'Bookmarked',
          value: countText(counts.bookmarked),
          tone: counts.bookmarked ? undefined : 'muted',
          onPress: () => navigation.navigate('BookmarkedNotes'),
        },
        {
          label: 'This week',
          value: countText(counts.thisWeek),
          tone: counts.thisWeek ? undefined : 'muted',
          onPress: () => navigation.navigate('RecentNotes'),
          accessibilityLabel: `Notes in the last seven days: ${countText(counts.thisWeek)}`,
        },
        {
          label: 'Voice logs',
          value: countText(counts.voiceLogs),
          tone: counts.voiceLogs ? undefined : 'muted',
          onPress: () => navigation.navigate('VoiceLog'),
        },
      ]}
    />
  );
});

export default NotepadHero;
