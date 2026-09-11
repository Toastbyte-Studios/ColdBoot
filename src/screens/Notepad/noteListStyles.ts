import { StyleSheet } from 'react-native';
import { ColorScheme } from '../../theme/colors';

/**
 * Builds the shared React Native styles for the Notepad note list UI.
 *
 * @remarks
 * Provides a consistent set of style rules used by note list rows, including
 * title/meta/body text, an expanded-body variant, a "more" hint, and an actions
 * row with a trash button.
 *
 * This is a factory rather than a module-scope stylesheet so the rows follow
 * the colour scheme: callers pass the result of `useTheme()` and memoise it,
 * e.g. `useMemo(() => makeNoteListSharedStyles(COLORS), [COLORS])`.
 *
 * @property value - Base text style for generic values (size 16, padded).
 * @property itemRow - Container style for a single note row with vertical padding and bottom divider.
 * @property itemTitle - Note title text style (semibold, horizontally padded).
 * @property itemMeta - Metadata text style (smaller, slightly transparent, spaced from title).
 * @property itemBody - Note body preview text style (medium size with wider horizontal padding).
 * @property itemBodyExpanded - Expanded note body style that displays the full content without height constraints.
 * @property moreHint - Subtle hint text indicating additional content (smaller, more transparent).
 * @property actionsRow - Horizontal row for action controls spaced apart.
 * @property noteButton - Hit area padding for a trash/delete action button.
 */
export const makeNoteListSharedStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    value: {
      fontSize: 16,
      color: COLORS.PRIMARY_DARK,
      padding: 10,
    },
    itemRow: {
      paddingVertical: 8,
      borderBottomColor: COLORS.SECONDARY_ACCENT,
      borderBottomWidth: 1,
      borderRadius: 12,
    },
    itemTitle: {
      fontSize: 16,
      color: COLORS.PRIMARY_DARK,
      fontWeight: '600',
      paddingHorizontal: 10,
    },
    itemMeta: {
      fontSize: 12,
      color: COLORS.PRIMARY_DARK,
      opacity: 0.8,
      marginTop: 2,
      paddingHorizontal: 10,
    },
    itemBody: {
      fontSize: 14,
      color: COLORS.PRIMARY_DARK,
      marginTop: 6,
      paddingHorizontal: 20,
    },
    itemBodyExpanded: {
      fontSize: 14,
      color: COLORS.PRIMARY_DARK,
      marginTop: 6,
      paddingHorizontal: 20,
    },
    moreHint: {
      fontSize: 12,
      color: COLORS.PRIMARY_DARK,
      opacity: 0.7,
      marginTop: 4,
      paddingHorizontal: 10,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    noteButton: {
      paddingVertical: 6,
    },
  });
