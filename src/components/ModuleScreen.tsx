import React from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useFooterClearance } from '../hooks/useFooterClearance';
import { useScreenHeader } from '../navigation/ScreenHeaderContext';
import { SCREEN_GUTTER, SCREEN_INSET, SPACING } from '../theme';
import { ToolType } from '../types/common-types';
import ActiveToolCard from './ActiveToolCard';
import ScreenBody from './ScreenBody';
import ScreenToolbar from './ScreenToolbar';
import SectionEyebrow from './SectionEyebrow';
import ToolList from './ToolList';

const isAndroid = Platform.OS === 'android';

type Props = {
  /** Module name, e.g. "Core". Shown in the app bar. */
  title: string;
  tools: ToolType[];
  /** Right-aligned row values keyed by tool id. */
  values?: Record<string, string>;
  /** Screen actions, e.g. Reference's bookmarks button. */
  trailing?: React.ReactNode;
  /** The module's hero card (see ModuleHero), shown above the tools. */
  hero?: React.ReactNode;
};

/**
 * The shared layout for every module screen.
 *
 * Comms, Core, Earth, Navigation, Prepper and Reference differ only in their
 * title and tool array, so they share one screen rather than six
 * near-identical files that drift apart.
 *
 * The module's name and the back control live in the app bar (see
 * `ScreenHeaderContext`), so the screen opens straight onto its tools. There
 * is no subtitle: a tool count told the user nothing they couldn't see.
 */
export default function ModuleScreen({
  title,
  tools,
  values,
  trailing,
  hero,
}: Props) {
  const footerClearance = useFooterClearance();
  useScreenHeader({ title });

  return (
    <ScreenBody>
      <ScrollView
        style={[styles.scroll, isAndroid && styles.bleed]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerClearance },
        ]}
      >
        <ScreenToolbar trailing={trailing} />

        {hero}

        <ActiveToolCard />

        <SectionEyebrow>Tools</SectionEyebrow>
        <ToolList tools={tools} values={values} scrollable={false} />
      </ScrollView>
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  bleed: {
    // See HomeScreen: `width: 'auto'` is what turns the negative margins into
    // extra width rather than a sideways shift.
    width: 'auto',
    marginHorizontal: -SCREEN_INSET,
  },
  content: {
    paddingHorizontal: isAndroid ? 0 : SCREEN_GUTTER,
    paddingTop: SPACING.sm,
  },
});
