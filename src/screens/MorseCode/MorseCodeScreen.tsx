import React from 'react';
import StackScreen from '../../components/StackScreen';
import ToolList from '../../components/ToolList';
import { ToolType } from '../../types/common-types';

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
 * A menu: the shared stack frame over the module's tools as grouped rows.
 * `scrollable={false}` because `StackScreen` already scrolls, and two nested
 * scroll views would fight each other.
 *
 * @returns A React element containing the Morse Code screen UI.
 */
export default function MorseCodeScreen() {
  return (
    <StackScreen title="Morse Code" subtitle="4 tools">
      <ToolList tools={morseCodeTools} scrollable={false} />
    </StackScreen>
  );
}
