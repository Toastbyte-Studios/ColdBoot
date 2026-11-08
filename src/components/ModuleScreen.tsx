import React from 'react';
import { useScreenHeader } from '../navigation/ScreenHeaderContext';
import { ToolType } from '../types/common-types';
import ActiveToolCard from './ActiveToolCard';
import PinnedHeaderScreen from './PinnedHeaderScreen';
import ScreenToolbar from './ScreenToolbar';
import SectionEyebrow from './SectionEyebrow';
import ToolList from './ToolList';

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
 *
 * The toolbar, hero, running-tool card and the "Tools" label stay put; only
 * the tool list scrolls.
 */
export default function ModuleScreen({
  title,
  tools,
  values,
  trailing,
  hero,
}: Props) {
  useScreenHeader({ title });

  return (
    <PinnedHeaderScreen
      header={
        <>
          <ScreenToolbar trailing={trailing} />
          {hero}
          <ActiveToolCard />
          <SectionEyebrow>Tools</SectionEyebrow>
        </>
      }
    >
      <ToolList tools={tools} values={values} scrollable={false} />
    </PinnedHeaderScreen>
  );
}
