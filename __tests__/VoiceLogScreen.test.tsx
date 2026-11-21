import React from 'react';
import { Alert, Text as RNText } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import EmptyState from '../src/screens/VoiceLog/components/EmptyState';
import RecordingControls from '../src/screens/VoiceLog/components/RecordingControls';
import VoiceLogCard from '../src/screens/VoiceLog/components/VoiceLogCard';
import Waveform from '../src/screens/VoiceLog/components/Waveform';
import VoiceLogScreen from '../src/screens/VoiceLog/VoiceLogScreen';

type LeaveCallback = (event: { data: { action: { type: string } } }) => void;

/** The latest arguments Voice Log passed to usePreventRemove. */
let mockPrevent: { active: boolean; onLeave: LeaveCallback } | null = null;
const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockRenameNote = jest.fn();
const mockSettings = {
  voiceLogMaxSeconds: 12,
  setVoiceLogMaxSeconds: jest.fn(),
};
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
  waveform?: number[];
  latitude?: number;
  longitude?: number;
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
  pause: jest.Mock;
  getDuration: jest.Mock;
  getCurrentTime: jest.Mock;
  setCurrentTime: jest.Mock;
}[] = [];
/** What the next mock sound's getCurrentTime reports. */
let mockCurrentTime = 0;

jest.mock('@react-navigation/native', () => ({
  usePreventRemove: (active: boolean, onLeave: LeaveCallback) => {
    mockPrevent = { active, onLeave };
  },
  useNavigation: () => ({ dispatch: mockDispatch, navigate: mockNavigate }),
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
      pause: jest.fn(),
      getDuration: jest.fn(() => 8),
      getCurrentTime: jest.fn((cb: (seconds: number) => void) =>
        cb(mockCurrentTime),
      ),
      setCurrentTime: jest.fn(),
    };
    mockLoads.push(onLoad);
    mockSounds.push(sound);
    return sound;
  }),
);
jest.mock('../src/stores', () => ({
  useSettingsStore: () => mockSettings,
  useNotesStore: () => ({
    notes: mockNotes,
    deleteNote: mockDeleteNote,
    renameNote: mockRenameNote,
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
    mockCurrentTime = 0;
    mockDispatch.mockReset();
    mockSettings.voiceLogMaxSeconds = 12;
    mockSettings.setVoiceLogMaxSeconds.mockReset();
    mockNavigate.mockReset();
    mockRenameNote.mockReset().mockResolvedValue(undefined);
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
  const playState = () => card().props.playback?.state;
  const liveWaveform = () =>
    tree.root.findByType(RecordingControls).findByType(Waveform);
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
    it('cancels a log still loading when tapped again, and releases it', () => {
      ReactTestRenderer.act(() => card().props.onPlay());
      expect(playState()).toBe('loading');
      ReactTestRenderer.act(() => card().props.onPlay());
      expect(playState()).toBeUndefined();
      ReactTestRenderer.act(() => mockLoads[0]());
      expect(mockSounds[0].play).not.toHaveBeenCalled();
      expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
    });

    it('pauses and resumes the open log', () => {
      ReactTestRenderer.act(() => {
        card().props.onPlay();
        mockLoads[0]();
      });
      expect(playState()).toBe('playing');
      expect(card().props.playback.durationSec).toBe(8);

      ReactTestRenderer.act(() => card().props.onPlay());
      expect(playState()).toBe('paused');
      expect(mockSounds[0].pause).toHaveBeenCalledTimes(1);
      expect(mockSounds[0].stop).not.toHaveBeenCalled();

      ReactTestRenderer.act(() => card().props.onPlay());
      expect(playState()).toBe('playing');
      expect(mockSounds[0].play).toHaveBeenCalledTimes(2);
      expect(mockSounds).toHaveLength(1);
    });

    it('moves the playhead while playing, not while paused', () => {
      jest.useFakeTimers();
      try {
        ReactTestRenderer.act(() => {
          card().props.onPlay();
          mockLoads[0]();
        });
        mockCurrentTime = 3.2;
        ReactTestRenderer.act(() => jest.advanceTimersByTime(150));
        expect(card().props.playback.positionSec).toBe(3.2);

        ReactTestRenderer.act(() => card().props.onPlay());
        mockCurrentTime = 5;
        ReactTestRenderer.act(() => jest.advanceTimersByTime(500));
        expect(card().props.playback.positionSec).toBe(3.2);
      } finally {
        jest.useRealTimers();
      }
    });

    it('seeks within the open log', () => {
      ReactTestRenderer.act(() => {
        card().props.onPlay();
        mockLoads[0]();
      });
      ReactTestRenderer.act(() => card().props.onSeek(0.5));
      expect(mockSounds[0].setCurrentTime).toHaveBeenCalledWith(4);
      expect(card().props.playback).toMatchObject({
        state: 'playing',
        positionSec: 4,
      });
    });

    it('seeking a closed log starts it from there', () => {
      ReactTestRenderer.act(() => card().props.onSeek(0.25));
      expect(playState()).toBe('loading');
      ReactTestRenderer.act(() => mockLoads[0]());
      expect(mockSounds[0].setCurrentTime).toHaveBeenCalledWith(2);
      expect(mockSounds[0].play).toHaveBeenCalledTimes(1);
      expect(card().props.playback.positionSec).toBe(2);
    });

    it('switches to another log, releasing the first', async () => {
      ReactTestRenderer.act(() => tree.unmount());
      mockNotes.push({ ...FIRST_LOG, id: 'log-2', audioUri: 'two.m4a' });
      await render();
      const [first, second] = tree.root.findAllByType(VoiceLogCard);
      ReactTestRenderer.act(() => {
        first.props.onPlay();
        mockLoads[0]();
      });
      ReactTestRenderer.act(() => second.props.onPlay());
      ReactTestRenderer.act(() => mockSounds[0].stop.mock.calls[0][0]());
      expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
      const cards = tree.root.findAllByType(VoiceLogCard);
      expect(cards[0].props.playback).toBeUndefined();
      expect(cards[1].props.playback?.state).toBe('loading');
    });

    it('does not let a canceled load affect newer playback', () => {
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
    });

    it('ignores a late finish from a log it has switched away from', async () => {
      ReactTestRenderer.act(() => tree.unmount());
      mockNotes.push({ ...FIRST_LOG, id: 'log-2', audioUri: 'two.m4a' });
      await render();
      const cards = () => tree.root.findAllByType(VoiceLogCard);
      ReactTestRenderer.act(() => {
        cards()[0].props.onPlay();
        mockLoads[0]();
      });
      ReactTestRenderer.act(() => {
        cards()[1].props.onPlay();
        mockLoads[1]();
      });
      const finishStop = mockSounds[0].stop.mock.calls[0][0];
      const finishPlay = mockSounds[0].play.mock.calls[0][0];
      ReactTestRenderer.act(() => {
        finishPlay(false);
        finishStop();
      });
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
      expect(mockSounds[1].release).not.toHaveBeenCalled();
      expect(cards()[1].props.playback?.state).toBe('playing');
    });

    it('closes the log when it finishes', () => {
      ReactTestRenderer.act(() => {
        card().props.onPlay();
        mockLoads[0]();
      });
      ReactTestRenderer.act(() => mockSounds[0].play.mock.calls[0][0](true));
      expect(mockSounds[0].release).toHaveBeenCalledTimes(1);
      expect(card().props.playback).toBeUndefined();
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
      expect(card().props.playback).toBeUndefined();
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
      expect(card().props.playback).toBeUndefined();
    });
  });

  describe('card', () => {
    const findText = (text: string) =>
      card()
        .findAllByType(RNText)
        .filter((node) => [node.props.children].flat().join('') === text);

    it('shows the length when closed, and position / length when open', async () => {
      ReactTestRenderer.act(() => tree.unmount());
      mockNotes.splice(0, 1, { ...FIRST_LOG, duration: 8 });
      await render();
      expect(findText('0:08')).not.toHaveLength(0);
      ReactTestRenderer.act(() => {
        card().props.onPlay();
        mockLoads[0]();
      });
      expect(findText('0:00 / 0:08')).not.toHaveLength(0);
    });

    it('seeks where the strip is tapped', () => {
      // An older log without a waveform has no strip until it is open.
      ReactTestRenderer.act(() => {
        card().props.onPlay();
        mockLoads[0]();
      });
      const strip = card().findByProps({ testID: 'voice-log-seek' });
      ReactTestRenderer.act(() =>
        strip.props.onLayout({ nativeEvent: { layout: { width: 200 } } }),
      );
      ReactTestRenderer.act(() =>
        card()
          .findByProps({ testID: 'voice-log-seek' })
          .props.onPress({ nativeEvent: { locationX: 150 } }),
      );
      expect(mockSounds[0].setCurrentTime).toHaveBeenCalledWith(6);
    });

    it('lets a screen reader step through the log', () => {
      ReactTestRenderer.act(() => {
        card().props.onPlay();
        mockLoads[0]();
      });
      const strip = () => card().findByProps({ testID: 'voice-log-seek' });
      expect(strip().props.accessibilityRole).toBe('adjustable');
      ReactTestRenderer.act(() =>
        strip().props.onAccessibilityAction({
          nativeEvent: { actionName: 'increment' },
        }),
      );
      expect(mockSounds[0].setCurrentTime).toHaveBeenLastCalledWith(2);
    });
  });

  describe('more menu', () => {
    const menuActions = () =>
      card()
        .findByProps({ testID: 'voice-log-more' })
        .parent!.props.actions.map((a: { id: string }) => a.id);
    const choose = (id: string) =>
      ReactTestRenderer.act(() =>
        card()
          .findByProps({ testID: 'voice-log-more' })
          .parent!.props.onPressAction({ nativeEvent: { event: id } }),
      );
    const nameInput = () =>
      card().findByProps({ accessibilityLabel: 'Voice log name' });
    const press = async (label: string) => {
      const button = card().find(
        (n) => n.props.label === label && typeof n.props.onPress === 'function',
      );
      await ReactTestRenderer.act(async () => button.props.onPress());
    };

    const withLocation = async () => {
      ReactTestRenderer.act(() => tree.unmount());
      mockNotes.splice(0, 1, {
        ...FIRST_LOG,
        latitude: 34.0522,
        longitude: -118.2437,
      });
      await render();
    };

    it('offers rename and delete, and the map only with a location', async () => {
      expect(menuActions()).toEqual(['rename', 'delete']);
      expect(
        card().findAllByProps({ testID: 'voice-log-location' }),
      ).toHaveLength(0);
      await withLocation();
      expect(menuActions()).toEqual(['rename', 'map', 'delete']);
    });

    it('shows where it was recorded, and opens the Map there', async () => {
      await withLocation();
      const location = card().findByProps({ testID: 'voice-log-location' });
      expect(location.props.accessibilityLabel).toBe(
        'Recorded at 34.05220° N, 118.24370° W',
      );
      ReactTestRenderer.act(() => location.props.onPress());
      expect(mockNavigate).toHaveBeenCalledWith('MapScreen', {
        center: { latitude: 34.0522, longitude: -118.2437 },
        radiusMiles: 0.25,
      });
      choose('map');
      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });

    it('renames in place, trimming the name', async () => {
      choose('rename');
      expect(nameInput().props.value).toBe('Voice Log');
      ReactTestRenderer.act(() =>
        nameInput().props.onChangeText('  Creek crossing  '),
      );
      await press('Save');
      expect(mockRenameNote).toHaveBeenCalledWith('log-1', 'Creek crossing');
      expect(
        card().findAllByProps({ accessibilityLabel: 'Voice log name' }),
      ).toHaveLength(0);
    });

    it('keeps the old name when the new one is empty, or on cancel', async () => {
      choose('rename');
      ReactTestRenderer.act(() => nameInput().props.onChangeText('   '));
      await press('Save');
      choose('rename');
      ReactTestRenderer.act(() => nameInput().props.onChangeText('Other'));
      await press('Cancel');
      expect(mockRenameNote).not.toHaveBeenCalled();
    });

    it('reports a failed rename and stays editing', async () => {
      mockRenameNote.mockRejectedValue(new Error('db'));
      choose('rename');
      ReactTestRenderer.act(() => nameInput().props.onChangeText('New'));
      await press('Save');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Rename Failed',
        'Could not rename this voice log. Please try again.',
      );
      expect(nameInput().props.value).toBe('New');
    });

    it('deletes from the menu, after asking', () => {
      choose('delete');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Voice Log',
        expect.any(String),
        expect.any(Array),
      );
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
      expect(
        tree.root.findAllByProps({ testID: 'voice-log-busy' }),
      ).not.toHaveLength(0);

      await ReactTestRenderer.act(async () => finishSave({ id: 'log-1' }));
      expect(controls().props.status).toBe('idle');
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

    it('saves the waveform with the log, and the card draws it', async () => {
      await startRecording();
      ReactTestRenderer.act(() => {
        mockOnRecord?.({ currentPosition: 100, currentMetering: -30 });
        mockOnRecord?.({ currentPosition: 300, currentMetering: -60 });
      });
      await ReactTestRenderer.act(async () =>
        controls().props.onStopRecording(),
      );
      const saved = mockCreateVoiceLog.mock.calls[0][0].waveform;
      expect(saved).toHaveLength(2);

      ReactTestRenderer.act(() => tree.unmount());
      mockNotes.splice(0, mockNotes.length, {
        ...FIRST_LOG,
        waveform: [10, 60],
      } as MockNote);
      await render();
      expect(card().findByType(Waveform).props.samples).toEqual([10, 60]);
    });

    it('draws no waveform for an older log without one', () => {
      expect(card().findAllByType(Waveform)).toHaveLength(0);
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

    it('stops playback when leaving mid-recording', async () => {
      await startRecording();
      ReactTestRenderer.act(() => {
        card().props.onPlay();
        mockLoads[0]();
      });
      await ReactTestRenderer.act(async () => leave());
      expect(mockSounds[0].stop).toHaveBeenCalledTimes(1);
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
      const samples = liveWaveform().props.samples;
      expect(samples).toHaveLength(2);
      expect(samples[0]).toBeGreaterThan(samples[1]);

      await ReactTestRenderer.act(async () =>
        controls().props.onStopRecording(),
      );
      expect(controls().props.elapsedMs).toBe(0);
      expect(liveWaveform().props.samples).toHaveLength(0);
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

    it('stops at the chosen length, with 60 bars whatever the length', async () => {
      ReactTestRenderer.act(() => tree.unmount());
      mockSettings.voiceLogMaxSeconds = 60;
      await render();
      expect(controls().props.maxDurationMs).toBe(60000);
      expect(controls().props.waveformSlots).toBe(60);
      await startRecording();
      ReactTestRenderer.act(() => {
        // One bar per second at a 60 s limit.
        mockOnRecord?.({ currentPosition: 900, currentMetering: -30 });
        mockOnRecord?.({ currentPosition: 1100, currentMetering: -30 });
      });
      expect(liveWaveform().props.samples).toHaveLength(2);
      await ReactTestRenderer.act(async () =>
        mockOnRecord?.({ currentPosition: 12000, currentMetering: -30 }),
      );
      expect(mockStopRecorder).not.toHaveBeenCalled();
      await ReactTestRenderer.act(async () =>
        mockOnRecord?.({ currentPosition: 60000, currentMetering: -30 }),
      );
      expect(mockStopRecorder).toHaveBeenCalledTimes(1);
    });

    it('offers the lengths while idle, and saves the choice', async () => {
      const length = () =>
        tree.root.findByProps({ testID: 'voice-log-length' }).parent!;
      expect(
        length().props.actions.map(
          (a: { id: string; state: string }) => `${a.id}:${a.state}`,
        ),
      ).toEqual(['12:on', '30:off', '60:off', '120:off', '300:off']);
      ReactTestRenderer.act(() =>
        length().props.onPressAction({ nativeEvent: { event: '120' } }),
      );
      expect(mockSettings.setVoiceLogMaxSeconds).toHaveBeenCalledWith(120);

      await startRecording();
      expect(
        tree.root.findAllByProps({ testID: 'voice-log-length' }),
      ).toHaveLength(0);
    });

    it('ignores readings when not recording', () => {
      ReactTestRenderer.act(() =>
        mockOnRecord?.({ currentPosition: 500, currentMetering: -30 }),
      );
      expect(controls().props.elapsedMs).toBe(0);
      expect(liveWaveform().props.samples).toHaveLength(0);
    });
  });
});
