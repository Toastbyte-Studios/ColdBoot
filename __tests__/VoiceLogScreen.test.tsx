import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import EmptyState from '../src/screens/VoiceLog/components/EmptyState';
import LiveWaveform from '../src/screens/VoiceLog/components/LiveWaveform';
import RecordingControls from '../src/screens/VoiceLog/components/RecordingControls';
import VoiceLogCard from '../src/screens/VoiceLog/components/VoiceLogCard';
import VoiceLogScreen from '../src/screens/VoiceLog/VoiceLogScreen';

type LeaveCallback = (event: { data: { action: { type: string } } }) => void;

/** The latest arguments Voice Log passed to usePreventRemove. */
let mockPrevent: { active: boolean; onLeave: LeaveCallback } | null = null;
const mockDispatch = jest.fn();
const mockStartRecorder = jest.fn();
const mockStopRecorder = jest.fn();
const mockCreateVoiceLog = jest.fn();
const mockDeleteNote = jest.fn();
/** The record-back callback Voice Log gave the recorder. */
let mockOnRecord:
  | ((e: { currentPosition: number; currentMetering?: number }) => void)
  | undefined;
type MockNote = {
  id: string;
  category: string;
  createdAt: number;
  audioUri: string;
  title?: string;
  duration?: number;
};
const FIRST_LOG: MockNote = {
  id: 'log-1',
  category: 'Voice Logs',
  createdAt: 0,
  audioUri: 'log.m4a',
};
const mockNotes: MockNote[] = [];
const mockLoads: ((error?: Error) => void)[] = [];
const mockSounds: {
  play: jest.Mock;
  stop: jest.Mock;
  release: jest.Mock;
}[] = [];

jest.mock('@react-navigation/native', () => ({
  usePreventRemove: (active: boolean, onLeave: LeaveCallback) => {
    mockPrevent = { active, onLeave };
  },
  useNavigation: () => ({ dispatch: mockDispatch }),
}));
jest.mock('react-native-nitro-sound', () => ({
  useSoundRecorder: (options: { onRecord?: typeof mockOnRecord }) => {
    mockOnRecord = options.onRecord;
    return {
      startRecorder: mockStartRecorder,
      stopRecorder: mockStopRecorder,
    };
  },
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
    deleteNote: mockDeleteNote,
    createVoiceLog: mockCreateVoiceLog,
  }),
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
jest.mock('../src/components/SectionEyebrow', () => {
  const { Text } = require('react-native');
  return ({ children }: { children: string }) => <Text>{children}</Text>;
});

const POP = { type: 'POP' };

describe('Voice Log screen', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  const render = async () => {
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<VoiceLogScreen />);
    });
  };

  beforeEach(async () => {
    mockPrevent = null;
    mockNotes.splice(0, mockNotes.length, { ...FIRST_LOG });
    mockLoads.length = 0;
    mockSounds.length = 0;
    mockDispatch.mockReset();
    mockDeleteNote.mockReset();
    mockStartRecorder.mockReset().mockResolvedValue('recording.m4a');
    mockStopRecorder.mockReset().mockResolvedValue('recording.m4a');
    mockCreateVoiceLog.mockReset().mockResolvedValue({ id: 'log-new' });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render();
  });

  afterEach(() => {
    ReactTestRenderer.act(() => tree.unmount());
    jest.restoreAllMocks();
  });

  const title = () =>
    tree.root.findByProps({ testID: 'screen-title' }).props.children;
  const controls = () => tree.root.findByType(RecordingControls);
  const card = () => tree.root.findByType(VoiceLogCard);
  const leave = () => mockPrevent?.onLeave({ data: { action: POP } });

  const startRecording = async () => {
    await ReactTestRenderer.act(async () =>
      controls().props.onStartRecording(),
    );
  };

  describe('layout', () => {
    it('shows the recorder and the saved logs on one screen', () => {
      expect(title()).toBe('Voice Logs');
      expect(controls().props.status).toBe('idle');
      expect(tree.root.findAllByType(VoiceLogCard)).toHaveLength(1);
      expect(mockPrevent?.active).toBe(false);
    });

    it('shows an empty state with no logs', async () => {
      ReactTestRenderer.act(() => tree.unmount());
      mockNotes.length = 0;
      await render();
      expect(tree.root.findAllByType(VoiceLogCard)).toHaveLength(0);
      expect(tree.root.findByType(EmptyState).props.title).toBe(
        'No voice logs yet',
      );
    });

    it('lists only voice logs', async () => {
      ReactTestRenderer.act(() => tree.unmount());
      mockNotes.push({ ...FIRST_LOG, id: 'note', category: 'General' });
      await render();
      expect(tree.root.findAllByType(VoiceLogCard)).toHaveLength(1);
    });
  });

  describe('playback', () => {
    it('stops a pending load when tapped again, and releases it on load', () => {
      ReactTestRenderer.act(() => card().props.onPlay());
      expect(card().props.isPlaying).toBe(true);
      ReactTestRenderer.act(() => card().props.onPlay());
      expect(card().props.isPlaying).toBe(false);
      ReactTestRenderer.act(() => mockLoads[0]());
      expect(mockSounds[0].play).not.toHaveBeenCalled();
      expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
    });

    it('does not let canceled loads or stop callbacks affect newer playback', () => {
      ReactTestRenderer.act(() => {
        card().props.onPlay();
        card().props.onPlay();
        card().props.onPlay();
      });
      ReactTestRenderer.act(() => {
        mockLoads[0](new Error('canceled'));
        mockLoads[1]();
      });
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
      expect(mockSounds[1].play).toHaveBeenCalledTimes(1);

      ReactTestRenderer.act(() => {
        card().props.onPlay();
        card().props.onPlay();
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
      expect(card().props.isPlaying).toBe(true);
    });

    it('clears the playing state after normal playback', () => {
      ReactTestRenderer.act(() => {
        card().props.onPlay();
        mockLoads[0]();
      });
      expect(card().props.isPlaying).toBe(true);
      ReactTestRenderer.act(() => mockSounds[0].play.mock.calls[0][0](true));
      expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
      expect(card().props.isPlaying).toBe(false);
    });

    it('reports a file that will not load', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      ReactTestRenderer.act(() => {
        card().props.onPlay();
        mockLoads[0](new Error('missing'));
      });
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to load audio file.',
      );
      expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
      expect(card().props.isPlaying).toBe(false);
    });

    it('releases a pending load after unmount without playing it', () => {
      ReactTestRenderer.act(() => card().props.onPlay());
      ReactTestRenderer.act(() => tree.unmount());
      ReactTestRenderer.act(() => mockLoads[0]());
      expect(mockSounds[0].play).not.toHaveBeenCalled();
      expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
      tree = ReactTestRenderer.create(<></>);
    });

    it('stops playback when recording starts', async () => {
      ReactTestRenderer.act(() => {
        card().props.onPlay();
        mockLoads[0]();
      });
      await startRecording();
      expect(mockSounds[0].stop).toHaveBeenCalledTimes(1);
      expect(card().props.isPlaying).toBe(false);
    });
  });

  describe('deleting', () => {
    const confirmDelete = () => {
      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
      ReactTestRenderer.act(() =>
        buttons.find((b: { text: string }) => b.text === 'Delete').onPress(),
      );
    };

    it('asks first, then deletes', () => {
      ReactTestRenderer.act(() => card().props.onDelete());
      expect(mockDeleteNote).not.toHaveBeenCalled();
      confirmDelete();
      expect(mockDeleteNote).toHaveBeenCalledWith('log-1');
    });

    it('stops the log if it is playing', () => {
      ReactTestRenderer.act(() => {
        card().props.onPlay();
        mockLoads[0]();
        card().props.onDelete();
      });
      confirmDelete();
      expect(mockSounds[0].stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('saving', () => {
    it('shows a spinner from the stop tap until the log is written', async () => {
      let finishSave!: (note: { id: string }) => void;
      mockCreateVoiceLog.mockReturnValue(
        new Promise((resolve) => {
          finishSave = resolve;
        }),
      );
      await startRecording();
      expect(controls().props.status).toBe('recording');

      // Not awaited: the stop resolves only once the save does.
      await ReactTestRenderer.act(async () => {
        controls().props.onStopRecording();
      });
      expect(controls().props.status).toBe('saving');
      expect(controls().props.disabled).toBe(true);
      ReactTestRenderer.act(() => card().props.onPlay());
      expect(mockSounds).toHaveLength(0);
      expect(
        tree.root.findAllByProps({ testID: 'voice-log-busy' }),
      ).not.toHaveLength(0);

      await ReactTestRenderer.act(async () => finishSave({ id: 'log-1' }));
      expect(controls().props.status).toBe('idle');
      ReactTestRenderer.act(() => card().props.onPlay());
      expect(mockSounds).toHaveLength(1);
      expect(
        tree.root.findAllByProps({ testID: 'voice-log-busy' }),
      ).toHaveLength(0);
    });

    it('marks the new log in the list, with no alert', async () => {
      mockNotes.unshift({
        id: 'log-new',
        category: 'Voice Logs',
        createdAt: 1,
        audioUri: 'file:///new.m4a',
        title: 'Voice Log – 10:42',
        duration: 4,
      });
      await startRecording();
      await ReactTestRenderer.act(async () =>
        controls().props.onStopRecording(),
      );

      expect(title()).toBe('Voice Logs');
      expect(Alert.alert).not.toHaveBeenCalled();
      const cards = tree.root.findAllByType(VoiceLogCard);
      expect(cards[0].props).toMatchObject({
        title: 'Voice Log – 10:42',
        isNew: true,
      });
      expect(cards[1].props.isNew).toBe(false);
    });

    it('copies the recording to Documents before saving', async () => {
      await startRecording();
      await ReactTestRenderer.act(async () =>
        controls().props.onStopRecording(),
      );
      expect(mockCreateVoiceLog).toHaveBeenCalledWith(
        expect.objectContaining({
          audioUri: expect.stringMatching(
            /^file:\/\/\/tmp\/documents\/voice-log_.+\.m4a$/,
          ),
        }),
      );
    });

    it('saves the recorded length in whole seconds', async () => {
      await startRecording();
      ReactTestRenderer.act(() =>
        mockOnRecord?.({ currentPosition: 4600, currentMetering: -30 }),
      );
      await ReactTestRenderer.act(async () =>
        controls().props.onStopRecording(),
      );
      expect(mockCreateVoiceLog).toHaveBeenCalledWith(
        expect.objectContaining({ duration: 5 }),
      );
    });

    it('reports a failed save and is ready to record again', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCreateVoiceLog.mockRejectedValue(new Error('save failed'));
      await startRecording();
      await ReactTestRenderer.act(async () =>
        controls().props.onStopRecording(),
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to save voice log. Please try again.',
      );
      expect(controls().props.status).toBe('idle');
      await startRecording();
      expect(mockStartRecorder).toHaveBeenCalledTimes(2);
    });
  });

  describe('leaving', () => {
    it('only holds the screen while the recorder is busy', async () => {
      expect(mockPrevent?.active).toBe(false);
      await startRecording();
      expect(mockPrevent?.active).toBe(true);
    });

    it('saves a recording, then leaves, and ignores repeated Back', async () => {
      let finishStop!: (path: string) => void;
      let finishSave!: (note: { id: string }) => void;
      mockStopRecorder.mockReturnValue(
        new Promise<string>((resolve) => {
          finishStop = resolve;
        }),
      );
      mockCreateVoiceLog.mockReturnValue(
        new Promise((resolve) => {
          finishSave = resolve;
        }),
      );
      await startRecording();

      ReactTestRenderer.act(() => {
        leave();
        leave();
      });
      await ReactTestRenderer.act(async () => {});
      expect(mockStopRecorder).toHaveBeenCalledTimes(1);
      expect(controls().props.disabled).toBe(true);

      await ReactTestRenderer.act(async () => finishStop('recording.m4a'));
      // Still saving: not gone yet, and recording can't restart.
      expect(mockDispatch).not.toHaveBeenCalled();
      ReactTestRenderer.act(() => controls().props.onStartRecording());
      expect(mockStartRecorder).toHaveBeenCalledTimes(1);

      await ReactTestRenderer.act(async () => finishSave({ id: 'log-new' }));
      expect(mockCreateVoiceLog).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(POP);
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('waits for a pending start before stopping', async () => {
      let finishStart!: (path: string) => void;
      mockStartRecorder.mockReturnValue(
        new Promise<string>((resolve) => {
          finishStart = resolve;
        }),
      );
      ReactTestRenderer.act(() => controls().props.onStartRecording());
      expect(controls().props.status).toBe('starting');
      ReactTestRenderer.act(() => card().props.onPlay());
      expect(mockSounds).toHaveLength(0);
      ReactTestRenderer.act(() => leave());
      expect(mockStopRecorder).not.toHaveBeenCalled();

      await ReactTestRenderer.act(async () => finishStart('recording.m4a'));
      expect(mockStopRecorder).toHaveBeenCalledTimes(1);
      expect(mockCreateVoiceLog).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(POP);
    });

    it('still leaves after a failed save, once it has been reported', async () => {
      let failSave!: (error: Error) => void;
      mockCreateVoiceLog.mockReturnValue(
        new Promise((_, reject) => {
          failSave = reject;
        }),
      );
      jest.spyOn(console, 'error').mockImplementation(() => {});
      await startRecording();
      await ReactTestRenderer.act(async () => {
        controls().props.onStopRecording();
      });
      ReactTestRenderer.act(() => leave());
      expect(mockStopRecorder).toHaveBeenCalledTimes(1);
      expect(mockDispatch).not.toHaveBeenCalled();

      await ReactTestRenderer.act(async () => failSave(new Error('failed')));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to save voice log. Please try again.',
      );
      expect(mockDispatch).toHaveBeenCalledWith(POP);
    });

    it('does not start playback while recording', async () => {
      await startRecording();
      ReactTestRenderer.act(() => card().props.onPlay());
      expect(mockSounds).toHaveLength(0);
      await ReactTestRenderer.act(async () => leave());
      expect(mockSounds).toHaveLength(0);
    });
  });

  describe('waveform', () => {
    it('fills as the recording runs, and resets after saving', async () => {
      await startRecording();
      ReactTestRenderer.act(() => {
        mockOnRecord?.({ currentPosition: 100, currentMetering: -30 });
        mockOnRecord?.({ currentPosition: 300, currentMetering: -60 });
      });
      expect(controls().props.elapsedMs).toBe(300);
      const samples = tree.root.findByType(LiveWaveform).props.samples;
      expect(samples).toHaveLength(2);
      expect(samples[0]).toBeGreaterThan(samples[1]);

      await ReactTestRenderer.act(async () =>
        controls().props.onStopRecording(),
      );
      expect(controls().props.elapsedMs).toBe(0);
      expect(tree.root.findByType(LiveWaveform).props.samples).toHaveLength(0);
    });

    it('stops by itself at 12 seconds', async () => {
      await startRecording();
      await ReactTestRenderer.act(async () =>
        mockOnRecord?.({ currentPosition: 12000, currentMetering: -30 }),
      );
      expect(mockStopRecorder).toHaveBeenCalledTimes(1);
      expect(mockCreateVoiceLog).toHaveBeenCalledWith(
        expect.objectContaining({ duration: 12 }),
      );
    });

    it('ignores readings when not recording', () => {
      ReactTestRenderer.act(() =>
        mockOnRecord?.({ currentPosition: 500, currentMetering: -30 }),
      );
      expect(controls().props.elapsedMs).toBe(0);
      expect(tree.root.findByType(LiveWaveform).props.samples).toHaveLength(0);
    });
  });
});
