import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React, { JSX, useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useFooterClearance } from '../hooks/useFooterClearance';
import { ToolType } from '../types/common-types';
import GroupContainer from './GroupContainer';
import ModuleRow from './ModuleRow';

type ToolListProps = {
  tools: ToolType[];
  /**
   * Right-aligned values keyed by tool id, for tools whose store already knows
   * the number — notes held, battery remaining. Tools without an entry simply
   * show no value; nothing here invents one.
   */
  values?: Record<string, string>;
  /** Subtitles keyed by tool id. */
  subtitles?: Record<string, string>;
  /**
   * Wraps the group in its own `ScrollView`. Screens that already scroll (the
   * module screens) pass `false` so the lists do not nest.
   * @default true
   */
  scrollable?: boolean;
};

/**
 * Renders tools as rows in one grouped list.
 *
 * Previously a stack of free-floating gradient cards, each with its own
 * border and drop shadow. They are now rows inside a single bordered
 * container — the iOS grouped-list convention — which is what removes the
 * "developer art" read without changing what the list contains.
 *
 * Sorting stays alphabetical, as before.
 */
export default function ToolList({
  tools,
  values,
  subtitles,
  scrollable = true,
}: ToolListProps): JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const footerClearance = useFooterClearance();

  const sortedTools = useMemo(
    () => [...tools].sort((a, b) => a.name.localeCompare(b.name)),
    [tools],
  );

  const group = (
    <GroupContainer>
      {sortedTools.map((tool, index) => (
        <ModuleRow
          key={tool.id}
          title={tool.name}
          icon={tool.icon}
          variant="tool"
          value={values?.[tool.id]}
          subtitle={subtitles?.[tool.id]}
          showSeparator={index < sortedTools.length - 1}
          onPress={() =>
            tool.screen === 'ComingSoon'
              ? navigation.navigate('ComingSoon', {
                  title: tool.name,
                  icon: tool.icon,
                })
              : navigation.navigate(tool.screen)
          }
        />
      ))}
    </GroupContainer>
  );

  if (!scrollable) {
    return group;
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: footerClearance },
      ]}
    >
      {group}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  scrollContent: {
    width: '100%',
    paddingTop: 4,
  },
});
