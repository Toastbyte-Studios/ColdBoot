/**
 * Sound level maths for the decibel meter.
 *
 * The recorder reports levels in dBFS: decibels relative to the loudest
 * signal the microphone can capture (0 dBFS). A sound level meter shows dB
 * SPL: sound pressure relative to the threshold of hearing. The two differ by
 * a fixed offset that depends on the phone's microphone and gain, so the
 * meter adds a typical offset plus the user's calibration.
 *
 * Everything the store keeps is in dBFS, so changing the calibration moves
 * every figure (current, min, average, max, history, noise dose) at once
 * without having to re-measure.
 *
 * Levels are unweighted, not A-weighted like a proper sound level meter, and
 * the exposure guidance below is written for dBA. Treat both as estimates.
 */

/**
 * Typical dBFS → dB SPL offset for a phone's built-in microphone with
 * automatic gain off (iOS measurement mode, Android's voice-recognition
 * source). Phones vary by several dB either way; the calibration setting
 * corrects for a particular phone.
 */
export const BASE_SPL_OFFSET_DB = 100;

/** How far the calibration can move readings, either way. */
export const MAX_CALIBRATION_DB = 20;

/**
 * At or above this many dBFS the microphone is at the top of its range, so
 * the real level may be higher than the reading. Shown as "≥".
 */
export const CLIPPING_DBFS = -1;

/** The recorder's floor: what it reports for silence or no input. */
export const SILENCE_DBFS = -160;

/** Width of one point in the history graph. */
export const HISTORY_BUCKET_MS = 500;

/** How much history the graph keeps. */
export const HISTORY_WINDOW_MS = 60_000;

const HISTORY_BUCKETS = HISTORY_WINDOW_MS / HISTORY_BUCKET_MS;

/**
 * Longest gap between two readings that still counts as measured time. Past
 * this (the app was in the background, the recorder stalled) the gap is
 * left out of the average and the noise dose rather than guessed at.
 */
const MAX_READING_GAP_MS = 1_000;

/** Time constant for the displayed level, between "fast" and "slow". */
const DISPLAY_TIME_CONSTANT_MS = 250;

/** NIOSH: 85 dBA for 8 hours is a 100% daily dose; every 3 dB halves it. */
export const NIOSH_LIMIT_DB = 85;
const NIOSH_LIMIT_MS = 8 * 60 * 60 * 1000;
const NIOSH_EXCHANGE_RATE_DB = 3;

export type HistoryPoint = {
  /** Start of the bucket, in ms since the epoch. */
  at: number;
  /** Loudest reading in the bucket, in dBFS. */
  maxDbfs: number;
};

/**
 * One run of the meter, in dBFS. Immutable: `addReading` returns a new
 * session, so the store can hold it as a plain observable value.
 */
export type SoundSession = {
  startedAt: number;
  /** When the last reading arrived, or null before the first. */
  lastReadingAt: number | null;
  /** The displayed level, smoothed. Null before the first reading. */
  currentDbfs: number | null;
  minDbfs: number | null;
  maxDbfs: number | null;
  /** Time covered by readings, gaps excluded. */
  measuredMs: number;
  /**
   * Σ Δt·10^(L/10): the sound energy over the session. The average (Leq) and
   * the noise dose both come from it.
   */
  energy: number;
  /** Oldest first, at most `HISTORY_WINDOW_MS` of it. */
  history: HistoryPoint[];
};

export function createSoundSession(now: number): SoundSession {
  return {
    startedAt: now,
    lastReadingAt: null,
    currentDbfs: null,
    minDbfs: null,
    maxDbfs: null,
    measuredMs: 0,
    energy: 0,
    history: [],
  };
}

/** Clamps a raw reading to the recorder's range; anything unusable is silence. */
function sanitizeDbfs(dbfs: number | undefined | null): number {
  if (dbfs == null || !isFinite(dbfs)) {
    return SILENCE_DBFS;
  }
  return Math.max(SILENCE_DBFS, Math.min(0, dbfs));
}

/**
 * Adds one recorder reading to a session.
 *
 * @param session - The session so far.
 * @param rawDbfs - `currentMetering` from the recorder.
 * @param now - When the reading arrived, in ms since the epoch.
 */
export function addReading(
  session: SoundSession,
  rawDbfs: number | undefined | null,
  now: number,
): SoundSession {
  const dbfs = sanitizeDbfs(rawDbfs);
  const gap = session.lastReadingAt === null ? 0 : now - session.lastReadingAt;
  const dt = gap > 0 && gap <= MAX_READING_GAP_MS ? gap : 0;

  // Exponential smoothing with a fixed time constant, so the number is
  // readable at any update rate. After a gap, jump straight to the reading.
  const currentDbfs =
    session.currentDbfs === null || dt === 0
      ? dbfs
      : session.currentDbfs +
        (dbfs - session.currentDbfs) *
          (1 - Math.exp(-dt / DISPLAY_TIME_CONSTANT_MS));

  const bucketAt = now - (now % HISTORY_BUCKET_MS);
  const last = session.history[session.history.length - 1];
  let history: HistoryPoint[];
  if (last && last.at === bucketAt) {
    history = [
      ...session.history.slice(0, -1),
      { at: bucketAt, maxDbfs: Math.max(last.maxDbfs, dbfs) },
    ];
  } else {
    history = [...session.history, { at: bucketAt, maxDbfs: dbfs }];
  }
  const oldestKept = bucketAt - (HISTORY_BUCKETS - 1) * HISTORY_BUCKET_MS;
  history = history.filter((point) => point.at >= oldestKept);

  return {
    ...session,
    lastReadingAt: now,
    currentDbfs,
    minDbfs: session.minDbfs === null ? dbfs : Math.min(session.minDbfs, dbfs),
    maxDbfs: session.maxDbfs === null ? dbfs : Math.max(session.maxDbfs, dbfs),
    measuredMs: session.measuredMs + dt,
    energy: session.energy + dt * Math.pow(10, dbfs / 10),
    history,
  };
}

/**
 * The session's equivalent continuous level (Leq), in dBFS: the steady level
 * with the same total energy. This is what "average" means for sound; a plain
 * mean of decibels would understate loud moments. Null until there's at least
 * one interval to average over.
 */
export function sessionLeqDbfs(session: SoundSession): number | null {
  if (session.measuredMs <= 0 || session.energy <= 0) {
    return null;
  }
  return 10 * Math.log10(session.energy / session.measuredMs);
}

/** Converts a dBFS reading to estimated dB SPL with the user's calibration. */
export function toSpl(dbfs: number, calibrationDb: number): number {
  return dbfs + BASE_SPL_OFFSET_DB + clampCalibration(calibrationDb);
}

export function clampCalibration(calibrationDb: number): number {
  if (!isFinite(calibrationDb)) {
    return 0;
  }
  return Math.max(
    -MAX_CALIBRATION_DB,
    Math.min(MAX_CALIBRATION_DB, Math.round(calibrationDb)),
  );
}

/** Whether a dBFS reading is at the top of the microphone's range. */
export function isClipping(dbfs: number): boolean {
  return dbfs >= CLIPPING_DBFS;
}

/**
 * How long a day someone can be exposed to a level before reaching the NIOSH
 * limit, in ms. Infinity below 85 dB, where NIOSH sets no daily limit.
 */
export function nioshAllowedMs(splDb: number): number {
  if (splDb < NIOSH_LIMIT_DB) {
    return Infinity;
  }
  return (
    NIOSH_LIMIT_MS /
    Math.pow(2, (splDb - NIOSH_LIMIT_DB) / NIOSH_EXCHANGE_RATE_DB)
  );
}

/**
 * The session's noise dose as a percentage of the NIOSH daily limit (85 dB
 * for 8 hours, 3 dB exchange rate). 100% is a full day's allowance.
 *
 * With a 3 dB exchange rate the dose is just the session's energy against
 * the limit's energy, so it comes straight from Leq and the time measured.
 */
export function nioshDosePercent(
  session: SoundSession,
  calibrationDb: number,
): number {
  const leq = sessionLeqDbfs(session);
  if (leq === null) {
    return 0;
  }
  const leqSpl = toSpl(leq, calibrationDb);
  return (
    100 *
    (session.measuredMs / NIOSH_LIMIT_MS) *
    Math.pow(10, (leqSpl - NIOSH_LIMIT_DB) / 10)
  );
}

/**
 * Formats a duration for exposure guidance: "8 h", "47 min", "28 s".
 * Rounds down, so it never overstates how long is safe.
 */
export function formatExposure(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds} s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Formats a session's length as m:ss or h:mm:ss. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export type SoundReference = {
  db: number;
  label: string;
};

/**
 * Everyday sounds and their typical levels, from the CDC's "What noises cause
 * hearing loss?" table. Used to put a reading in context.
 */
export const SOUND_REFERENCES: readonly SoundReference[] = [
  { db: 30, label: 'Soft whisper' },
  { db: 40, label: 'Refrigerator hum' },
  { db: 60, label: 'Normal conversation' },
  { db: 70, label: 'Washing machine' },
  { db: 85, label: 'City traffic, lawnmower' },
  { db: 95, label: 'Motorcycle' },
  { db: 100, label: 'Car horn, subway train' },
  { db: 110, label: 'Rock concert, shouting in the ear' },
  { db: 120, label: 'Siren up close' },
  { db: 140, label: 'Fireworks, gunshot' },
];

/**
 * The everyday sound a level is closest to, or null below the quietest one.
 * Picks the loudest reference at or under the level, so it never makes a
 * sound seem quieter than its reading.
 */
export function referenceFor(splDb: number): SoundReference | null {
  let match: SoundReference | null = null;
  for (const reference of SOUND_REFERENCES) {
    if (reference.db <= splDb) {
      match = reference;
    }
  }
  return match;
}

export type LevelBand = 'quiet' | 'moderate' | 'loud' | 'harmful';

/**
 * How worrying a level is: quiet under 70 dB (NIDCD: unlikely to harm even
 * after long exposure), moderate to 85, loud from 85 (NIOSH's limit), harmful
 * from 120 (immediate harm).
 */
export function levelBand(splDb: number): LevelBand {
  if (splDb >= 120) {
    return 'harmful';
  }
  if (splDb >= NIOSH_LIMIT_DB) {
    return 'loud';
  }
  if (splDb >= 70) {
    return 'moderate';
  }
  return 'quiet';
}
