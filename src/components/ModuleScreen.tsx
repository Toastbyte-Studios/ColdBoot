import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFooterClearance } from '../hooks/useFooterClearance';
import { useTheme } from '../hooks/useTheme';
import { SCREEN_GUTTER, SCREEN_INSET, TEXT_GUTTER } from '../theme';
import { ToolType } from '../types/common-types';
import ActiveToolCard from './ActiveToolCard';
import IconButton from './IconButton';
import ScreenBody from './ScreenBody';
import SectionEyebrow from './SectionEyebrow';
import SectionHeader from './SectionHeader';
import ToolList from './ToolList';

const isAndroid = Platform.OS === 'android';

type Props = {
  /** Module name, e.g. "Core". */
  title: string;
  /** Ionicons glyph for the module, shown beside the title. */
  icon: string;
  tools: ToolType[];
  /** Right-aligned row values keyed by tool id. */
  values?: Record<string, string>;
  /** Extra actions for the title row, e.g. Reference's bookmarks button. */
  trailing?: React.ReactNode;
};

/**
 * The shared layout for every module screen.
 *
 * Comms, Core, Earth, Navigation, Prepper and Reference differ only in their
 * title, glyph and tool array, so they share one screen rather than six
 * near-identical files that drift apart.
 *
 * The subtitle is derived from the tool array rather than written per module:
 * a hand-written "Six tools" goes stale the moment a tool is added, and the
 * dev-only Map Spike entry already makes Navigation's count vary by build.
 *
 * Back is a chevron on iOS and an arrow on Android — the two platforms draw
 * the same idea with different glyphs, and using either one on the other is an
 * immediate tell. The glyph is all that differs: with `AppShell` wrapping the
 * navigator rather than sitting inside it, neither platform has a real
 * navigation bar to put a back item in, so the control lives in the headline
 * row on both. See finding 1 in docs/NATIVE_REDESIGN.md.
 */
export default function ModuleScreen({
  title,
  icon,
  tools,
  values,
  trailing,
}: Props) {
  const COLORS = useTheme();
  const footerClearance = useFooterClearance();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const subtitle = `${tools.length} tool${tools.length === 1 ? '' : 's'} · all offline`;

  return (
    <ScreenBody>
      <ScrollView
        style={[styles.scroll, isAndroid && styles.bleed]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: footerClearance },
        ]}
      >
        <SectionHeader
          containerStyle={isAndroid ? styles.headline : undefined}
          leading={
            navigation.canGoBack() ? (
              <IconButton
                name={isAndroid ? 'arrow-back' : 'chevron-back-outline'}
                size={isAndroid ? 24 : 20}
                color={isAndroid ? COLORS.PRIMARY_DARK : COLORS.BRAND}
                onPress={() => navigation.goBack()}
                accessibilityLabel="Go back"
              />
            ) : undefined
          }
          title={title}
          subtitle={subtitle}
          trailing={
            <View style={styles.trailing}>
              {trailing}
              <Ionicons name={icon} size={30} color={COLORS.BRAND} />
            </View>
          }
        />

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
  },
  headline: {
    paddingHorizontal: TEXT_GUTTER,
    paddingTop: 4,
    paddingBottom: 18,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
