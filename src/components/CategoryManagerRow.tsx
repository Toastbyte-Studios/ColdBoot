import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import {
  ROW_MIN_HEIGHT,
  ROW_PADDING_HORIZONTAL,
  ROW_PADDING_VERTICAL,
} from '../theme';
import IconButton from './IconButton';
import { Text } from './ScaledText';

const isAndroid = Platform.OS === 'android';

type Props = {
  /** The category's name, shown as the row's title. */
  name: string;
  /** What the category holds, already pluralised — "3 items", "1 note". */
  count: string;
  onDelete: () => void;
  /** Draws the divider below this row. Pass `false` for the last row. */
  showSeparator?: boolean;
};

/**
 * One row in a "manage categories" list: a folder tile, the category's name
 * over its count, and a destructive trailing action.
 *
 * This is `ModuleRow`'s geometry — the same row height, padding, tile size and
 * separator inset — but it is not a `ModuleRow`: the row itself does not
 * navigate anywhere, and its trailing element is a button rather than a value
 * and a chevron. Pantry, Inventory and Notepad each grew their own copy of it;
 * keeping one here is what stops them drifting apart again.
 */
export default function CategoryManagerRow({
  name,
  count,
  onDelete,
  showSeparator = false,
}: Props) {
  const COLORS = useTheme();

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.info}>
          <View
            style={[
              styles.iconTile,
              {
                backgroundColor: isAndroid
                  ? COLORS.SECONDARY_CONTAINER
                  : COLORS.SURFACE_CONTAINER,
              },
            ]}
          >
            <Icon
              name="folder-outline"
              size={20}
              color={isAndroid ? COLORS.ON_SECONDARY_CONTAINER : COLORS.BRAND}
            />
          </View>
          <View style={styles.text}>
            <Text style={[styles.name, { color: COLORS.PRIMARY_DARK }]}>
              {name}
            </Text>
            <Text style={[styles.count, { color: COLORS.MUTED }]}>{count}</Text>
          </View>
        </View>
        <IconButton
          name="trash-outline"
          size={22}
          color={COLORS.ERROR}
          accessibilityLabel={`Delete ${name} category`}
          onPress={onDelete}
        />
      </View>
      {showSeparator ? (
        <View
          style={[
            styles.separator,
            {
              backgroundColor: isAndroid
                ? COLORS.OUTLINE_VARIANT
                : COLORS.SEPARATOR,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: ROW_PADDING_VERTICAL,
    paddingHorizontal: ROW_PADDING_HORIZONTAL,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: isAndroid ? 16 : 13,
  },
  iconTile: {
    width: isAndroid ? 40 : 34,
    height: isAndroid ? 40 : 34,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  count: {
    fontSize: 13,
  },
  separator: {
    height: isAndroid ? 1 : StyleSheet.hairlineWidth,
    marginLeft: isAndroid ? 72 : 61,
  },
});
