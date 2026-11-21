import { formatDateTime, formatTime } from '../../utils/timeFormat';
import type { Note } from '../../stores/NotesStore';

const DAY_MS = 24 * 60 * 60 * 1000;
const VOICE_LOGS = 'Voice Logs';
const MAX_HEADLINE = 60;

/** Notepad's own notes: voice logs live on their own screen. */
const isNotepadNote = (note: Note) => note.category !== VOICE_LOGS;

/** The most recently written note, or null. */
export function latestNote(notes: Note[]): Note | null {
  let latest: Note | null = null;
  for (const note of notes) {
    if (!isNotepadNote(note)) continue;
    if (!latest || note.createdAt > latest.createdAt) latest = note;
  }
  return latest;
}

/**
 * What to call a note: its title, else its first line, else what kind of
 * note it is.
 */
export function noteHeadline(note: Note): string {
  const firstLine = (note.text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  const name =
    note.title?.trim() ||
    firstLine ||
    (note.type === 'sketch' ? 'Untitled sketch' : 'Untitled note');
  return name.length > MAX_HEADLINE
    ? `${name.slice(0, MAX_HEADLINE - 1).trimEnd()}…`
    : name;
}

/** "Today, 9:41 AM", "Yesterday, 18:05", else the full date and time. */
export function whenText(createdAt: number, now: Date): string {
  const date = new Date(createdAt);
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  // From the calendar, not 24 hours back: days are 23 or 25 hours long at
  // daylight-saving changes.
  const startOfYesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  ).getTime();
  if (createdAt >= startOfToday) return `Today, ${formatTime(date)}`;
  if (createdAt >= startOfYesterday) {
    return `Yesterday, ${formatTime(date)}`;
  }
  return formatDateTime(date);
}

export type NoteCounts = {
  bookmarked: number;
  thisWeek: number;
  voiceLogs: number;
};

/** The hero's three readings. "This week" is the last seven days. */
export function noteCounts(notes: Note[], now: number): NoteCounts {
  const weekAgo = now - 7 * DAY_MS;
  let bookmarked = 0;
  let thisWeek = 0;
  let voiceLogs = 0;
  for (const note of notes) {
    if (!isNotepadNote(note)) {
      voiceLogs += 1;
      continue;
    }
    if (note.bookmarked) bookmarked += 1;
    if (note.createdAt >= weekAgo) thisWeek += 1;
  }
  return { bookmarked, thisWeek, voiceLogs };
}
