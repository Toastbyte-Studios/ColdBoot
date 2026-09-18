import {
  NavigationProp,
  ParamListBase,
  useRoute,
  useNavigation,
  RouteProp,
} from '@react-navigation/native';
import React, { JSX, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import GroupContainer from '../../../components/GroupContainer';
import ModuleRow from '../../../components/ModuleRow';
import { Text } from '../../../components/ScaledText';
import StackScreen from '../../../components/StackScreen';
import { useTheme } from '../../../hooks/useTheme';
import { TEXT_GUTTER } from '../../../theme';
import { ColorScheme } from '../../../theme/colors';
import ReferenceEntryType from '../../../types/data-type';

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

type CategoryScreenRouteProp = RouteProp<
  {
    Category: {
      title: string;
      data: ReferenceEntryType[];
      disclaimer?: string;
    };
  },
  'Category'
>;

/**
 * Displays a list of reference entries filtered by category.
 *
 * Retrieves `title` and `data` from the navigation route parameters, keeps
 * only the entries whose `category` matches the title, and lists them
 * alphabetically as rows in one grouped list — the same component the module
 * screens use for tools. If no entries match, a helper message is shown.
 *
 * @returns {JSX.Element} The rendered category screen component.
 *
 * @remarks
 * - Navigates to the 'Entry' screen when a row is pressed, passing the selected entry as a parameter.
 * - Expects `route.params` to contain `title` (category name) and `data` (ReferenceEntryType[]).
 */
export default function CategoryScreen(): JSX.Element {
  const COLORS = useTheme();
  const route = useRoute<CategoryScreenRouteProp>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { title, data, disclaimer } = route.params || {};

  const entries = useMemo(() => {
    return (data ?? [])
      .filter((e: ReferenceEntryType) => e.category === title)
      .sort((a: ReferenceEntryType, b: ReferenceEntryType) =>
        a.title.localeCompare(b.title),
      );
  }, [title, data]);

  const subtitle = `${entries.length} topic${entries.length === 1 ? '' : 's'}`;

  return (
    <StackScreen title={title} subtitle={subtitle} note={disclaimer}>
      {entries.length === 0 ? (
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No topics found.
        </Text>
      ) : (
        <GroupContainer>
          {entries.map((item: ReferenceEntryType, index: number) => (
            <ModuleRow
              key={item.id}
              title={item.title}
              icon="document-text-outline"
              variant="tool"
              showSeparator={index < entries.length - 1}
              onPress={() => navigation.navigate('Entry', { entry: item })}
            />
          ))}
        </GroupContainer>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  helperText: {
    fontSize: 16,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
});
