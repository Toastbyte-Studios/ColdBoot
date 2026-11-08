import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import RecordingControls from '../src/screens/VoiceLog/components/RecordingControls';
import VoiceLogScreen from '../src/screens/VoiceLog/VoiceLogScreen';

/** The latest arguments Voice Log passed to usePreventRemove. */
let mockPrevent: { active: boolean; onBack: () => void } | null = null;
const mockStartRecorder = jest.fn();
const mockStopRecorder = jest.fn();
const mockCreateVoiceLog = jest.fn();

jest.mock('@react-navigation/native', () => ({
  usePreventRemove: (active: boolean, onBack: () => void) => {
    mockPrevent = { active, onBack };
  },
}));
jest.mock('react-native-nitro-sound', () => ({
  useSoundRecorder: () => ({
    startRecorder: mockStartRecorder,
    stopRecorder: mockStopRecorder,
  }),
}));
jest.mock('react-native-sound', () => jest.fn());
jest.mock('../src/stores', () => ({
  useNotesStore: () => ({
    notes: [],
    deleteNote: jest.fn(),
    createVoiceLog: mockCreateVoiceLog,
  }),
}));
jest.mock('../src/components/StackScreen', () => {
  const { Text, View } = require('react-native');
  return ({
    title,
    children,
    onBack,
  }: {
    title: string;
    children: React.ReactNode;
    onBack?: () => void;
  }) => (
    <View>
      <Text testID="screen-title" onPress={onBack}>
        {title}
      </Text>
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
    mockStartRecorder.mockReset().mockResolvedValue('recording.m4a');
    mockStopRecorder.mockReset().mockResolvedValue('recording.m4a');
    mockCreateVoiceLog.mockReset().mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<VoiceLogScreen />);
    });
  });

  afterEach(() => {
    ReactTestRenderer.act(() => tree.unmount());
    jest.restoreAllMocks();
  });

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

  it('waits for stop and save before returning and ignores repeated Back', async () => {
    let finishStop!: (path: string) => void;
    let finishSave!: () => void;
    mockStopRecorder.mockReturnValue(
      new Promise<string>((resolve) => {
        finishStop = resolve;
      }),
    );
    mockCreateVoiceLog.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSave = resolve;
      }),
    );
    await openRow('Record voice log');
    await ReactTestRenderer.act(async () => {
      tree.root.findByType(RecordingControls).props.onStartRecording();
    });

    ReactTestRenderer.act(() => {
      mockPrevent?.onBack();
      mockPrevent?.onBack();
      tree.root.findByProps({ testID: 'screen-title' }).props.onPress();
    });
    await ReactTestRenderer.act(async () => {});
    expect(title()).toBe('Record Voice Log');
    expect(mockStopRecorder).toHaveBeenCalledTimes(1);
    expect(tree.root.findByType(RecordingControls).props.disabled).toBe(true);

    await ReactTestRenderer.act(async () => finishStop('recording.m4a'));
    expect(title()).toBe('Record Voice Log');
    ReactTestRenderer.act(() =>
      tree.root.findByType(RecordingControls).props.onStartRecording(),
    );
    expect(mockStartRecorder).toHaveBeenCalledTimes(1);
    expect(mockCreateVoiceLog).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => finishSave());
    expect(title()).toBe('Voice Logs');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Saved',
      'Voice log saved successfully',
    );
    await openRow('Record voice log');
    await ReactTestRenderer.act(async () => {
      tree.root.findByType(RecordingControls).props.onStartRecording();
    });
    expect(mockStartRecorder).toHaveBeenCalledTimes(2);
    expect(title()).toBe('Record Voice Log');
  });

  it('waits for a pending start before stopping on Back', async () => {
    let finishStart!: (path: string) => void;
    mockStartRecorder.mockReturnValue(
      new Promise<string>((resolve) => {
        finishStart = resolve;
      }),
    );
    await openRow('Record voice log');
    ReactTestRenderer.act(() => {
      tree.root.findByType(RecordingControls).props.onStartRecording();
      mockPrevent?.onBack();
    });
    expect(title()).toBe('Record Voice Log');
    expect(mockStopRecorder).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => finishStart('recording.m4a'));
    expect(mockStopRecorder).toHaveBeenCalledTimes(1);
    expect(mockCreateVoiceLog).toHaveBeenCalledWith(
      expect.objectContaining({ audioUri: 'recording.m4a' }),
    );
    expect(title()).toBe('Voice Logs');
  });

  it('waits for an existing stop when Back is pressed during a failed save', async () => {
    let failSave!: (error: Error) => void;
    mockCreateVoiceLog.mockReturnValue(
      new Promise<void>((_, reject) => {
        failSave = reject;
      }),
    );
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await openRow('Record voice log');
    await ReactTestRenderer.act(async () => {
      tree.root.findByType(RecordingControls).props.onStartRecording();
    });
    await ReactTestRenderer.act(async () => {
      tree.root.findByType(RecordingControls).props.onStopRecording();
    });
    ReactTestRenderer.act(() => {
      mockPrevent?.onBack();
      mockPrevent?.onBack();
    });
    expect(title()).toBe('Record Voice Log');
    expect(mockStopRecorder).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => failSave(new Error('save failed')));
    expect(title()).toBe('Voice Logs');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Failed to save voice log. Please try again.',
    );
    await openRow('Record voice log');
    await ReactTestRenderer.act(async () => {
      tree.root.findByType(RecordingControls).props.onStartRecording();
    });
    expect(mockStartRecorder).toHaveBeenCalledTimes(2);
  });
});
