import {
  addReading,
  BASE_SPL_OFFSET_DB,
  clampCalibration,
  createSoundSession,
  formatDuration,
  formatExposure,
  HISTORY_BUCKET_MS,
  HISTORY_WINDOW_MS,
  isClipping,
  levelBand,
  MAX_CALIBRATION_DB,
  nioshAllowedMs,
  nioshDosePercent,
  referenceFor,
  sessionLeqDbfs,
  SILENCE_DBFS,
  SoundSession,
  toSpl,
} from '../src/utils/soundLevel';

const HOUR = 60 * 60 * 1000;

/** Feeds a steady level every `stepMs` for `durationMs`. */
function steady(
  session: SoundSession,
  dbfs: number,
  from: number,
  durationMs: number,
  stepMs = 100,
): SoundSession {
  let next = session;
  for (let t = from; t <= from + durationMs; t += stepMs) {
    next = addReading(next, dbfs, t);
  }
  return next;
}

describe('addReading', () => {
  it('records the first reading as current, min and max', () => {
    const session = addReading(createSoundSession(0), -40, 1000);
    expect(session.currentDbfs).toBe(-40);
    expect(session.minDbfs).toBe(-40);
    expect(session.maxDbfs).toBe(-40);
    expect(session.measuredMs).toBe(0);
    expect(session.lastReadingAt).toBe(1000);
  });

  it('tracks min and max across readings', () => {
    let session = createSoundSession(0);
    session = addReading(session, -40, 100);
    session = addReading(session, -10, 200);
    session = addReading(session, -55, 300);
    expect(session.minDbfs).toBe(-55);
    expect(session.maxDbfs).toBe(-10);
  });

  it('smooths the displayed level toward new readings', () => {
    let session = addReading(createSoundSession(0), -60, 0);
    session = addReading(session, -20, 60);
    expect(session.currentDbfs).toBeGreaterThan(-60);
    expect(session.currentDbfs).toBeLessThan(-20);

    session = steady(session, -20, 100, 3000);
    expect(session.currentDbfs).toBeCloseTo(-20, 1);
  });

  it('treats missing or out-of-range readings as the recorder floor', () => {
    let session = createSoundSession(0);
    session = addReading(session, undefined, 0);
    expect(session.currentDbfs).toBe(SILENCE_DBFS);
    session = addReading(session, NaN, 100);
    expect(session.minDbfs).toBe(SILENCE_DBFS);
    session = addReading(session, 5, 200);
    expect(session.maxDbfs).toBe(0);
  });

  it('leaves long gaps out of the measured time', () => {
    let session = steady(createSoundSession(0), -30, 0, 1000);
    expect(session.measuredMs).toBe(1000);
    session = addReading(session, -30, 60_000);
    expect(session.measuredMs).toBe(1000);
  });

  it('keeps one history point per bucket, holding the loudest reading', () => {
    let session = createSoundSession(0);
    session = addReading(session, -40, 0);
    session = addReading(session, -15, 100);
    session = addReading(session, -30, 200);
    session = addReading(session, -50, HISTORY_BUCKET_MS);
    expect(session.history).toEqual([
      { at: 0, maxDbfs: -15 },
      { at: HISTORY_BUCKET_MS, maxDbfs: -50 },
    ]);
  });

  it('keeps only the last minute of history', () => {
    const session = steady(createSoundSession(0), -30, 0, 3 * 60_000, 250);
    const slots = HISTORY_WINDOW_MS / HISTORY_BUCKET_MS;
    expect(session.history).toHaveLength(slots);
    const last = session.history[session.history.length - 1];
    expect(last.at - session.history[0].at).toBe(
      (slots - 1) * HISTORY_BUCKET_MS,
    );
  });
});

describe('sessionLeqDbfs', () => {
  it('is null until there is time to average over', () => {
    expect(sessionLeqDbfs(createSoundSession(0))).toBeNull();
    expect(
      sessionLeqDbfs(addReading(createSoundSession(0), -30, 0)),
    ).toBeNull();
  });

  it('equals a steady level', () => {
    const session = steady(createSoundSession(0), -30, 0, 10_000);
    expect(sessionLeqDbfs(session)).toBeCloseTo(-30, 5);
  });

  it('weights loud moments by energy, not as a plain mean of decibels', () => {
    let session = steady(createSoundSession(0), -60, 0, 5000);
    session = steady(session, -20, 5100, 4900);
    const leq = sessionLeqDbfs(session) ?? NaN;
    // A plain mean would be about -40; half the time at -20 dominates.
    expect(leq).toBeGreaterThan(-24);
    expect(leq).toBeLessThan(-20);
  });
});

describe('toSpl and calibration', () => {
  it('adds the base offset and the calibration', () => {
    expect(toSpl(-40, 0)).toBe(-40 + BASE_SPL_OFFSET_DB);
    expect(toSpl(-40, 3)).toBe(-40 + BASE_SPL_OFFSET_DB + 3);
  });

  it('keeps calibration to whole dB within range', () => {
    expect(clampCalibration(2.6)).toBe(3);
    expect(clampCalibration(99)).toBe(MAX_CALIBRATION_DB);
    expect(clampCalibration(-99)).toBe(-MAX_CALIBRATION_DB);
    expect(clampCalibration(NaN)).toBe(0);
  });

  it('flags readings at the top of the microphone range', () => {
    expect(isClipping(-0.5)).toBe(true);
    expect(isClipping(-6)).toBe(false);
  });
});

describe('NIOSH exposure', () => {
  it('allows 8 hours at 85 dB and halves every 3 dB', () => {
    expect(nioshAllowedMs(85)).toBe(8 * HOUR);
    expect(nioshAllowedMs(88)).toBeCloseTo(4 * HOUR, 0);
    expect(nioshAllowedMs(100)).toBeCloseTo(15 * 60 * 1000, 0);
  });

  it('sets no limit below 85 dB', () => {
    expect(nioshAllowedMs(84.9)).toBe(Infinity);
  });

  it('gives a 100% dose for 8 hours at 85 dB', () => {
    const dbfs = 85 - BASE_SPL_OFFSET_DB;
    let session = addReading(createSoundSession(0), dbfs, 0);
    // One reading a second keeps the test quick; gaps up to 1 s count.
    session = steady(session, dbfs, 1000, 8 * HOUR - 1000, 1000);
    expect(nioshDosePercent(session, 0)).toBeCloseTo(100, 0);
  });

  it('doubles the dose for each 3 dB of calibration', () => {
    const session = steady(createSoundSession(0), -15, 0, 60_000);
    const base = nioshDosePercent(session, 0);
    expect(nioshDosePercent(session, 3)).toBeCloseTo(base * 1.995, 3);
  });

  it('is zero with nothing measured', () => {
    expect(nioshDosePercent(createSoundSession(0), 0)).toBe(0);
  });
});

describe('formatting', () => {
  it('formats exposure times, rounding down', () => {
    expect(formatExposure(8 * HOUR)).toBe('8 h');
    expect(formatExposure(4.5 * HOUR)).toBe('4 h 30 min');
    expect(formatExposure(nioshAllowedMs(95))).toBe('47 min');
    expect(formatExposure(28_900)).toBe('28 s');
  });

  it('formats session length', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(75_000)).toBe('1:15');
    expect(formatDuration(HOUR + 61_000)).toBe('1:01:01');
  });
});

describe('references and bands', () => {
  it('matches the loudest everyday sound at or under the level', () => {
    expect(referenceFor(20)).toBeNull();
    expect(referenceFor(64)?.label).toBe('Normal conversation');
    expect(referenceFor(85)?.label).toBe('City traffic, lawnmower');
  });

  it('bands levels by hearing risk', () => {
    expect(levelBand(50)).toBe('quiet');
    expect(levelBand(75)).toBe('moderate');
    expect(levelBand(85)).toBe('loud');
    expect(levelBand(125)).toBe('harmful');
  });
});
