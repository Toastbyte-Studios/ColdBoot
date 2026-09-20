import { useNavigation } from '@react-navigation/native';
import React from 'react';
import GroupContainer from '../../components/GroupContainer';
import ModuleRow from '../../components/ModuleRow';
import StackScreen from '../../components/StackScreen';

export type TrainerLevel = 'easy' | 'medium' | 'hard';

const LEVELS: {
  level: TrainerLevel;
  title: string;
  subtitle: string;
  icon: string;
}[] = [
  {
    level: 'easy',
    title: 'Easy',
    subtitle: 'Single character recognition',
    icon: 'ellipse-outline',
  },
  {
    level: 'medium',
    title: 'Medium',
    subtitle: 'Word recognition',
    icon: 'text-outline',
  },
  {
    level: 'hard',
    title: 'Hard',
    subtitle: 'Sentence recognition',
    icon: 'documents-outline',
  },
];

/**
 * Morse Code Trainer main screen.
 *
 * A menu of the three difficulty levels — single character, word, sentence.
 * The levels were three filled buttons in three different colours, which read
 * as a traffic light rather than as a list of the same kind of thing; they
 * are now rows, and each one's difficulty is said in words.
 */
export default function MorseTrainerScreen() {
  const navigation = useNavigation();

  const handleLevelSelect = (level: TrainerLevel) => {
    // @ts-expect-error - Navigation params typing not fully defined
    navigation.navigate('MorseTrainerLevel', { level });
  };

  return (
    <StackScreen
      title="Morse Trainer"
      note="Practice your morse code recognition. Pick a difficulty to begin."
    >
      <GroupContainer>
        {LEVELS.map((item, index) => (
          <ModuleRow
            key={item.level}
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            variant="tool"
            showSeparator={index < LEVELS.length - 1}
            onPress={() => handleLevelSelect(item.level)}
          />
        ))}
      </GroupContainer>
    </StackScreen>
  );
}
