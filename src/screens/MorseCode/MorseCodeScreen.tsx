import React from 'react';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import ToolList from '../../components/ToolList';
import { ToolType } from '../../types/common-types';
import MorseHero from './MorseHero';

const morseCodeTools: ToolType[] = [
  {
    name: 'Alpha to Morse',
    screen: 'AlphaToMorse',
    icon: 'text-outline',
    id: 'morse_alpha_to_morse',
  },
  {
    name: 'Morse to Alpha',
    screen: 'MorseToAlpha',
    icon: 'swap-horizontal-outline',
    id: 'morse_morse_to_alpha',
  },
  {
    name: 'Trainer',
    screen: 'MorseTrainer',
    icon: 'school-outline',
    id: 'morse_trainer',
  },
  {
    name: 'Cheat Sheet',
    screen: 'MorseCodeCheatSheet',
    icon: 'document-text-outline',
    id: 'morse_cheat_sheet',
  },
];

/**
 * Renders the Morse Code screen.
 *
 * Today's character (see `MorseHero`) over the screen's tools as grouped
 * rows, laid out like a module screen: hero, then a "Tools" label, then the
 * list.
 * `scrollable={false}` because `StackScreen` already scrolls, and two nested
 * scroll views would fight each other.
 *
 * @returns A React element containing the Morse Code screen UI.
 */
export default function MorseCodeScreen() {
  return (
    <StackScreen title="Morse Code">
      <MorseHero />
      <SectionEyebrow>Tools</SectionEyebrow>
      <ToolList tools={morseCodeTools} scrollable={false} />
    </StackScreen>
  );
}
