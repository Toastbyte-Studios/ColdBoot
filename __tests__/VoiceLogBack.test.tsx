import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import VoiceLogScreen from '../src/screens/VoiceLog/VoiceLogScreen';

/** The latest arguments Voice Log passed to usePreventRemove. */
let mockPrevent: { active: boolean; onBack: () => void } | null = null;

jest.mock('@react-navigation/native', () => ({
  usePreventRemove: (active: boolean, onBack: () => void) => {
    mockPrevent = { active, onBack };
  },
}));
jest.mock('react-native-nitro-sound', () => ({
  useSoundRecorder: () => ({
    startRecorder: jest.fn(),
    stopRecorder: jest.fn(async () => undefined),
  }),
}));
jest.mock('react-native-sound', () => jest.fn());
jest.mock('../src/stores', () => ({
  useNotesStore: () => ({ notes: [], deleteNote: jest.fn() }),
}));
jest.mock('../src/components/StackScreen', () => {
  const { Text, View } = require('react-native');
  return ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View>
      <Text testID="screen-title">{title}</Text>
      {children}
    </View>
  );
});
jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));
jest.mock('../src/hooks/useRippleColor', () => ({
  useRippleColor: () => 'rgba(0,0,0,0.1)',
}));
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

describe('Voice Log back', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  beforeEach(async () => {
    mockPrevent = null;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<VoiceLogScreen />);
    });
  });

  afterEach(() => ReactTestRenderer.act(() => tree.unmount()));

  const title = () =>
    tree.root.findByProps({ testID: 'screen-title' }).props.children;

  const openRow = async (rowTitle: string) => {
    const row = tree.root.find(
      (node) =>
        node.props.title === rowTitle &&
        typeof node.props.onPress === 'function',
    );
    await ReactTestRenderer.act(async () => row.props.onPress());
  };

  it('lets back leave the tool from its menu', () => {
    expect(title()).toBe('Voice Logs');
    expect(mockPrevent?.active).toBe(false);
  });

  it.each([
    ['View voice logs', 'Saved Voice Logs'],
    ['Record voice log', 'Record Voice Log'],
  ])('returns from "%s" to the menu', async (row, stepTitle) => {
    await openRow(row);
    expect(title()).toBe(stepTitle);
    expect(mockPrevent?.active).toBe(true);

    await ReactTestRenderer.act(async () => mockPrevent?.onBack());
    expect(title()).toBe('Voice Logs');
    expect(mockPrevent?.active).toBe(false);
  });
});
