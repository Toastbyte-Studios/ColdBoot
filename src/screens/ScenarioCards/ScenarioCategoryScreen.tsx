import {
  NavigationProp,
  ParamListBase,
  useRoute,
  useNavigation,
  RouteProp,
} from '@react-navigation/native';
import React, { JSX, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { TEXT_GUTTER } from '../../theme';
import { ColorScheme } from '../../theme/colors';
import { ScenarioCardType } from '../../types/data-type';

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

type ScenarioCategoryRouteProp = RouteProp<
  {
    ScenarioCategory: {
      title: string;
      data: ScenarioCardType[];
      disclaimer?: string;
    };
  },
  'ScenarioCategory'
>;

/**
 * Displays a list of scenario cards filtered by category.
 *
 * This screen retrieves the `title` and `data` from the navigation route parameters,
 * filters the entries to only those matching the selected category, and lists them as rows in a grouped list.
 * If no entries are found for the category, a helper message is shown.
 *
 * @returns {JSX.Element} The rendered scenario category screen component.
 *
 * @remarks
 * - Navigates to the 'ScenarioDetail' screen when a row is pressed, passing the selected scenario as a parameter.
 * - Expects `route.params` to contain `title` (category name) and `data` (ScenarioCardType[]).
 */
export default function ScenarioCategoryScreen(): JSX.Element {
  const route = useRoute<ScenarioCategoryRouteProp>();
  const COLORS = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { title, data, disclaimer } = route.params;

  const entries = useMemo(() => {
    return data.filter((e: ScenarioCardType) => e.category === title);
  }, [title, data]);

  const sorted = entries
    .slice()
    .sort((a: ScenarioCardType, b: ScenarioCardType) =>
      a.title.localeCompare(b.title),
    );

  return (
    <StackScreen
      title={title}
      subtitle={`${sorted.length} scenario${sorted.length === 1 ? '' : 's'}`}
      note={disclaimer}
    >
      {sorted.length === 0 ? (
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No scenarios found.
        </Text>
      ) : (
        <GroupContainer>
          {sorted.map((item: ScenarioCardType, index: number) => (
            <ModuleRow
              key={item.id}
              title={item.title}
              icon="document-text-outline"
              variant="tool"
              showSeparator={index < sorted.length - 1}
              onPress={() =>
                navigation.navigate('ScenarioDetail', { scenario: item })
              }
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
