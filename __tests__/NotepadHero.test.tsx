import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import NotepadHero from '../src/screens/Notepad/NotepadHero';
import {
  latestNote,
  noteCounts,
  noteHeadline,
  whenText,
} from '../src/screens/Notepad/notepadHero';
import type { Note } from '../src/stores/NotesStore';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 21, 9, 0);

const note = (id: string, extra: Partial<Note> = {}): Note =>
  ({
    id,
    createdAt: NOW.getTime() - DAY * 10,
    category: 'General',
    type: 'text',
    photoUris: [],
    ...extra,
  }) as Note;

const mockNavigate = jest.fn();
const mockNotes = { notes: [] as Note[] };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    addListener: jest.fn(() => () => {}),
  }),
}));
jest.mock('../src/stores', () => ({
  useNotesStore: () => mockNotes,
}));
jest.mock('../src/utils/timeFormat', () => ({
  formatTime: (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  formatDateTime: (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`,
}));
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

describe('notepadHero', () => {
  it('finds the newest note, skipping voice logs', () => {
    const notes = [
      note('old', { createdAt: 1 }),
      note('new', { createdAt: 3 }),
      note('voice', { createdAt: 5, category: 'Voice Logs' }),
    ];
    expect(latestNote(notes)?.id).toBe('new');
    expect(latestNote([])).toBeNull();
  });

  it('names a note by title, first line, or kind', () => {
    expect(noteHeadline(note('a', { title: ' Water source ' }))).toBe(
      'Water source',
    );
    expect(noteHeadline(note('b', { text: '\n  Creek at mile 4\nmore' }))).toBe(
      'Creek at mile 4',
    );
    expect(noteHeadline(note('c', { type: 'sketch' }))).toBe('Untitled sketch');
    expect(noteHeadline(note('d', { title: 'x'.repeat(80) }))).toHaveLength(60);
  });

  it('says today and yesterday in words', () => {
    expect(whenText(new Date(2026, 10, 21, 7, 5).getTime(), NOW)).toBe(
      'Today, 07:05',
    );
    expect(whenText(new Date(2026, 10, 20, 22, 0).getTime(), NOW)).toBe(
      'Yesterday, 22:00',
    );
    expect(whenText(new Date(2026, 10, 2, 8, 0).getTime(), NOW)).toBe('11/2');
  });

  it('counts bookmarks, the last week, and voice logs apart', () => {
    expect(
      noteCounts(
        [
          note('a', { bookmarked: true }),
          note('b', { createdAt: NOW.getTime() - DAY }),
          note('c', { category: 'Voice Logs', createdAt: NOW.getTime() }),
        ],
        NOW.getTime(),
      ),
    ).toEqual({ bookmarked: 1, thisWeek: 1, voiceLogs: 1 });
  });
});

describe('NotepadHero', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  const render = async () => {
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<NotepadHero />);
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    mockNavigate.mockClear();
  });

  afterEach(() => {
    ReactTestRenderer.act(() => tree.unmount());
    jest.useRealTimers();
  });

  const pressable = (label: string) =>
    tree.root.find(
      (node) =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === 'function',
    );

  it('opens the latest note', async () => {
    const latest = note('n', {
      title: 'Trailhead',
      category: 'Personal',
      createdAt: new Date(2026, 10, 21, 8, 30).getTime(),
    });
    mockNotes.notes = [latest];
    await render();
    pressable(
      'Latest note. Trailhead. Today, 08:30 · Personal',
    ).props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('NoteEntry', { note: latest });
  });

  it('offers a first note when there are none', async () => {
    mockNotes.notes = [];
    await render();
    const button = tree.root.find(
      (node) => node.props.label === 'New note' && node.props.onPress,
    );
    button.props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('NewNote');
  });

  it('opens voice logs from their count', async () => {
    mockNotes.notes = [note('v', { category: 'Voice Logs' })];
    await render();
    pressable('Voice logs: 1').props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('VoiceLog');
  });
});
