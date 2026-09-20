import { observer } from 'mobx-react-lite';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import IconButton from '../../components/IconButton';
import { NoteSortSelector } from '../../components/NoteSortSelector';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import Touchable from '../../components/Touchable';
import { useTheme } from '../../hooks/useTheme';
import { useNotesStore, useSettingsStore } from '../../stores';
import { SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../theme';
import { ColorScheme } from '../../theme/colors';
import { sortNotes } from '../../utils/noteSorting';
import { formatDateTime } from '../../utils/timeFormat';
import { MAX_TITLE_LENGTH } from './constants';

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

/**
 * Displays the 20 most recently created notes with inline expand/collapse.
 *
 * @remarks
 * - Notes are sourced from the notes store (`core.recentNotesTop20`) and
 *   ordered by the user's note sort preference.
 * - Tapping a row toggles its expanded state; only one note is expanded at a
 *   time.
 * - Each row keeps its own delete action so this screen's behaviour matches the
 *   original non-StackScreen version.
 *
 * @returns The Recent Notes screen content.
 */
export default observer(function RecentNotesScreen() {
  const COLORS = useTheme();
  const core = useNotesStore();
  const settings = useSettingsStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedNotes = useMemo(
    () => sortNotes(core.recentNotesTop20, settings.noteSortOrder),
    [core.recentNotesTop20, settings.noteSortOrder],
  );

  return (
    <StackScreen
      title="Recent Notes"
      subtitle={`${sortedNotes.length} note${sortedNotes.length === 1 ? '' : 's'}`}
    >
      <View style={styles.sort}>
        <NoteSortSelector />
      </View>
      {sortedNotes.length === 0 ? (
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No notes yet.
        </Text>
      ) : (
        <View
          style={[
            styles.card,
            {
              backgroundColor: COLORS.PRIMARY_LIGHT,
              borderColor: COLORS.SECONDARY_ACCENT,
            },
          ]}
        >
          {sortedNotes.map((note, index) => (
            <Touchable
              key={note.id}
              accessibilityRole="button"
              accessibilityState={{ expanded: expandedId === note.id }}
              onPress={() =>
                setExpandedId((current) =>
                  current === note.id ? null : note.id,
                )
              }
            >
              <View
                style={[
                  styles.itemRow,
                  { borderBottomColor: COLORS.SECONDARY_ACCENT },
                  index === sortedNotes.length - 1 && styles.lastItemRow,
                ]}
              >
                <Text
                  style={[styles.itemTitle, { color: COLORS.PRIMARY_DARK }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {(note.title || '(Untitled)').slice(0, MAX_TITLE_LENGTH)}
                </Text>
                {expandedId === note.id ? (
                  <Text
                    style={[styles.itemBody, { color: COLORS.PRIMARY_DARK }]}
                  >
                    {note.text || ''}
                  </Text>
                ) : (
                  <Text
                    style={[styles.itemBody, { color: COLORS.PRIMARY_DARK }]}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    {note.text || ''}
                  </Text>
                )}
                {expandedId !== note.id && note.text ? (
                  <Text
                    style={[styles.moreHint, { color: COLORS.PRIMARY_DARK }]}
                  >
                    Show more…
                  </Text>
                ) : null}
                <View style={styles.actionsRow}>
                  <Text
                    style={[styles.itemMeta, { color: COLORS.PRIMARY_DARK }]}
                  >
                    {formatDateTime(new Date(note.createdAt))} • {note.category}
                  </Text>
                  <IconButton
                    name="trash-outline"
                    size={18}
                    color={COLORS.PRIMARY_DARK}
                    accessibilityLabel="Delete note"
                    style={styles.noteButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      Alert.alert(
                        'Delete Note',
                        'Are you sure you want to delete this note?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => core.deleteNote(note.id),
                          },
                        ],
                      );
                    }}
                  />
                </View>
              </View>
            </Touchable>
          ))}
        </View>
      )}
    </StackScreen>
  );
});

const styles = StyleSheet.create({
  sort: {
    // StackScreen's Android content is full-bleed; controls carry the gutter.
    paddingHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    marginBottom: SPACING.md,
  },
  helperText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
  card: {
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 12,
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
  },
  itemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  lastItemRow: {
    borderBottomWidth: 0,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 10,
  },
  itemMeta: {
    flex: 1,
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
    paddingHorizontal: 10,
  },
  itemBody: {
    fontSize: 14,
    marginTop: 6,
    paddingHorizontal: 20,
  },
  moreHint: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
    paddingHorizontal: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  noteButton: {
    paddingVertical: 6,
  },
});
