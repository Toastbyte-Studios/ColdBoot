import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import RecordingControls from '../src/screens/VoiceLog/components/RecordingControls';
import VoiceLogCard from '../src/screens/VoiceLog/components/VoiceLogCard';
import VoiceLogScreen from '../src/screens/VoiceLog/VoiceLogScreen';

/** The latest arguments Voice Log passed to usePreventRemove. */
let mockPrevent: { active: boolean; onBack: () => void } | null = null;
const mockStartRecorder = jest.fn();
const mockStopRecorder = jest.fn();
const mockCreateVoiceLog = jest.fn();
const mockNotes = [
  {
    id: 'log-1',
    category: 'Voice Logs',
    createdAt: 0,
    audioUri: 'log.m4a',
  },
];
const mockLoads: ((error?: Error) => void)[] = [];
const mockSounds: {
  play: jest.Mock;
  stop: jest.Mock;
  release: jest.Mock;
}[] = [];

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
jest.mock('react-native-sound', () =>
  jest.fn((_uri: string, _base: string, onLoad: (error?: Error) => void) => {
    const sound = {
      play: jest.fn(),
      stop: jest.fn(),
      release: jest.fn(),
    };
    mockLoads.push(onLoad);
    mockSounds.push(sound);
    return sound;
  }),
);
jest.mock('../src/stores', () => ({
  useNotesStore: () => ({
    notes: mockNotes,
    deleteNote: jest.fn(),
    createVoiceLog: mockCreateVoiceLog,
  }),
}));
jest.mock('../src/components/StackScreen', () => {
  const { Text, View } = require('react-native');
  return ({ title, children }: { title: string; children: React.ReactNode }) => (
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
    mockLoads.length = 0;
    mockSounds.length = 0;
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

  it('cancels a pending load when leaving via navigation Back', async () => {
      await openRow('View voice logs');
      ReactTestRenderer.act(() =>
        tree.root.findByType(VoiceLogCard).props.onPlay(),
      );
      expect(mockSounds).toHaveLength(1);
      await ReactTestRenderer.act(async () => {
        mockPrevent?.onBack();
      });
      expect(title()).toBe('Voice Logs');
      await openRow('View voice logs');
      ReactTestRenderer.act(() => mockLoads[0]());
      expect(mockSounds[0].play).not.toHaveBeenCalled();
      expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
      expect(tree.root.findByType(VoiceLogCard).props.isPlaying).toBe(false);
  });

  it('does not let canceled loads or stop callbacks affect newer playback', async () => {
    await openRow('View voice logs');
    ReactTestRenderer.act(() => {
      tree.root.findByType(VoiceLogCard).props.onPlay();
      tree.root.findByType(VoiceLogCard).props.onPlay();
      tree.root.findByType(VoiceLogCard).props.onPlay();
    });
    ReactTestRenderer.act(() => {
      mockLoads[0](new Error('canceled'));
      mockLoads[1]();
    });
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
    expect(mockSounds[1].play).toHaveBeenCalledTimes(1);

    ReactTestRenderer.act(() => {
      tree.root.findByType(VoiceLogCard).props.onPlay();
      tree.root.findByType(VoiceLogCard).props.onPlay();
      mockLoads[2]();
    });
    const finishStop = mockSounds[1].stop.mock.calls[0][0];
    const finishPlay = mockSounds[1].play.mock.calls[0][0];
    ReactTestRenderer.act(() => {
      finishPlay(false);
      finishStop();
    });
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockSounds[1].release).toHaveBeenCalledTimes(1);
    expect(mockSounds[2].release).not.toHaveBeenCalled();
    expect(tree.root.findByType(VoiceLogCard).props.isPlaying).toBe(true);
  });

  it('stops active playback on Back and releases it after stopping', async () => {
    await openRow('View voice logs');
    ReactTestRenderer.act(() => {
      tree.root.findByType(VoiceLogCard).props.onPlay();
      mockLoads[0]();
      mockPrevent?.onBack();
    });
    expect(mockSounds[0].stop).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () => {
      mockSounds[0].stop.mock.calls[0][0]();
    });
    expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
    expect(title()).toBe('Voice Logs');
  });

  it('clears the playing state after normal playback', async () => {
    await openRow('View voice logs');
    ReactTestRenderer.act(() => {
      tree.root.findByType(VoiceLogCard).props.onPlay();
      mockLoads[0]();
    });
    expect(tree.root.findByType(VoiceLogCard).props.isPlaying).toBe(true);
    ReactTestRenderer.act(() => mockSounds[0].play.mock.calls[0][0](true));
    expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
    expect(tree.root.findByType(VoiceLogCard).props.isPlaying).toBe(false);
  });

  it('releases a pending load after unmount without playing it', async () => {
    await openRow('View voice logs');
    ReactTestRenderer.act(() =>
      tree.root.findByType(VoiceLogCard).props.onPlay(),
    );
    ReactTestRenderer.act(() => tree.unmount());
    ReactTestRenderer.act(() => mockLoads[0]());
    expect(mockSounds[0].play).not.toHaveBeenCalled();
    expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
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
