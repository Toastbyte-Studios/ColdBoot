/**
 * @format
 * Tests for TrackStore functionality
 */

jest.mock('react-native-sqlite-storage', () => {
  // Return null to force in-memory storage mode
  return null;
});

// Silence the expected "SQLite not available" warning in tests
jest.spyOn(console, 'warn').mockImplementation(() => {});

import { TrackStore, TrackPoint } from '../src/stores/TrackStore';
import { SQLiteDatabase } from '../src/types/database-types';

const samplePoints: TrackPoint[] = [
  { latitude: 37.0, longitude: -122.0, altitude: 10, timestamp: 1000 },
  { latitude: 37.001, longitude: -122.001, altitude: 11, timestamp: 6000 },
  { latitude: 37.002, longitude: -122.002, altitude: 12, timestamp: 11000 },
];

describe('TrackStore', () => {
  let store: TrackStore;

  beforeEach(() => {
    store = new TrackStore();
  });

  afterEach(() => {
    store.dispose();
  });

  describe('Initial state', () => {
    it('should initialize with empty tracks list', () => {
      expect(store.tracks).toEqual([]);
    });
  });

  describe('Saving tracks', () => {
    it('should save a track and add it to the list', async () => {
      const track = await store.saveTrack(
        'Morning Run',
        120,
        500,
        samplePoints,
      );
      expect(track.name).toBe('Morning Run');
      expect(track.durationSeconds).toBe(120);
      expect(track.distanceMeters).toBe(500);
      expect(track.points).toEqual(samplePoints);
      expect(track.id).toBeTruthy();
      expect(track.createdAt).toBeTruthy();
      expect(store.tracks).toHaveLength(1);
      // The list holds a summary; the points are read on demand.
      const { points, ...summary } = track;
      expect(store.tracks[0]).toEqual(summary);
      expect(store.tracks[0]).not.toHaveProperty('points');
      expect(await store.getTrackPoints(track.id)).toEqual(points);
    });

    it('should trim whitespace from track name', async () => {
      const track = await store.saveTrack(
        '  Trail Run  ',
        60,
        200,
        samplePoints,
      );
      expect(track.name).toBe('Trail Run');
    });

    it('should use a default name when name is empty', async () => {
      const track = await store.saveTrack('', 60, 200, samplePoints);
      expect(track.name).toMatch(/^Track \d{4}-\d{2}-\d{2}/);
    });

    it('should use a default name when name is whitespace only', async () => {
      const track = await store.saveTrack('   ', 60, 200, samplePoints);
      expect(track.name).toMatch(/^Track /);
    });

    it('should assign unique IDs to each track', async () => {
      const t1 = await store.saveTrack('Alpha', 60, 200, samplePoints);
      const t2 = await store.saveTrack('Bravo', 120, 400, samplePoints);
      expect(t1.id).not.toBe(t2.id);
    });

    it('should prepend new tracks so the most recent is first', async () => {
      await store.saveTrack('Older', 60, 100, samplePoints);
      await store.saveTrack('Newer', 120, 200, samplePoints);
      expect(store.tracks[0].name).toBe('Newer');
      expect(store.tracks[1].name).toBe('Older');
    });
  });

  describe('Deleting tracks', () => {
    it('should delete a track by ID', async () => {
      const track = await store.saveTrack('Test', 60, 200, samplePoints);
      await store.deleteTrack(track.id);
      expect(store.tracks).toHaveLength(0);
    });

    it('should only delete the specified track', async () => {
      const t1 = await store.saveTrack('Alpha', 60, 100, samplePoints);
      const t2 = await store.saveTrack('Bravo', 120, 200, samplePoints);
      await store.deleteTrack(t1.id);
      expect(store.tracks).toHaveLength(1);
      expect(store.tracks[0].id).toBe(t2.id);
    });

    it('should not throw when deleting a non-existent ID', async () => {
      await expect(store.deleteTrack('nonexistent-id')).resolves.not.toThrow();
    });
  });

  describe('Database initialisation without SQLite', () => {
    it('should initialise without error when no db is provided', async () => {
      await expect(
        store.initDatabase(null as unknown as SQLiteDatabase),
      ).resolves.not.toThrow();
    });

    it('should operate in in-memory mode after failed db init', async () => {
      await store.initDatabase(null as unknown as SQLiteDatabase);
      const track = await store.saveTrack('Test', 30, 100, samplePoints);
      expect(track.name).toBe('Test');
      expect(store.tracks).toHaveLength(1);
    });
  });

  describe('Points on demand', () => {
    it('reads one track with its points, or null for an unknown id', async () => {
      const saved = await store.saveTrack('Loop', 60, 100, samplePoints);

      expect(await store.getTrack(saved.id)).toEqual(saved);
      expect(await store.getTrack('missing')).toBeNull();
      expect(await store.getTrackPoints('missing')).toEqual([]);
    });

    it('returns every track with its points for a backup', async () => {
      const first = await store.saveTrack('First', 60, 100, samplePoints);
      const second = await store.saveTrack('Second', 30, 50, []);

      const all = await store.getAllTracks();

      expect(all).toHaveLength(2);
      expect(all.find((t) => t.id === first.id)?.points).toEqual(samplePoints);
      expect(all.find((t) => t.id === second.id)?.points).toEqual([]);
    });

    it('keeps imported points readable and drops them with the track', async () => {
      const track = {
        id: 'imported',
        name: 'Imported',
        createdAt: '2026-11-14T00:00:00.000Z',
        durationSeconds: 60,
        distanceMeters: 100,
        points: samplePoints,
      };
      await store.importData([track], 'merge');

      expect(store.tracks[0]).not.toHaveProperty('points');
      expect(await store.getTrackPoints('imported')).toEqual(samplePoints);

      await store.deleteTrack('imported');
      expect(await store.getTrackPoints('imported')).toEqual([]);
    });

    describe('with a database', () => {
      type Row = Record<string, unknown>;

      /** A stand-in for SQLite that records the SQL it is asked to run. */
      function database(rows: Row[]) {
        const statements: string[] = [];
        const db: SQLiteDatabase = {
          executeSql: jest.fn(async (sql: string, params?: unknown[]) => {
            statements.push(sql);
            let matched: Row[] = [];
            if (sql.startsWith('SELECT')) {
              matched = sql.includes('WHERE id = ?')
                ? rows.filter((row) => row.id === params?.[0])
                : rows;
            }
            return [
              {
                rows: {
                  length: matched.length,
                  item: (index: number) => matched[index],
                },
              },
            ];
          }),
        };
        return { db, statements };
      }

      const row = (id: string, points: unknown): Row => ({
        id,
        name: `Track ${id}`,
        createdAt: '2026-11-14T00:00:00.000Z',
        durationSeconds: 60,
        distanceMeters: 100,
        points,
      });

      it('does not read the points column when loading the list', async () => {
        const { db, statements } = database([
          row('a', JSON.stringify(samplePoints)),
        ]);

        await store.initDatabase(db);

        const listQuery = statements.find((sql) => sql.startsWith('SELECT'));
        expect(listQuery).toBeDefined();
        expect(listQuery).not.toContain('points');
        expect(store.tracks.map((t) => t.id)).toEqual(['a']);
        expect(store.tracks[0]).not.toHaveProperty('points');
      });

      it('reads the points of the one track that is opened', async () => {
        const { db, statements } = database([
          row('a', JSON.stringify(samplePoints)),
          row('b', '[]'),
        ]);
        await store.initDatabase(db);
        statements.length = 0;

        expect(await store.getTrackPoints('a')).toEqual(samplePoints);
        expect(statements).toEqual(['SELECT points FROM tracks WHERE id = ?']);
      });

      it('reads unreadable points as an empty trail', async () => {
        const { db } = database([
          row('cut-short', '[{"latitude":37.0,"longi'),
          row('not-a-list', '{"latitude":1}'),
          row('not-text', null),
        ]);
        await store.initDatabase(db);

        expect(store.tracks).toHaveLength(3);
        for (const id of ['cut-short', 'not-a-list', 'not-text']) {
          expect(await store.getTrackPoints(id)).toEqual([]);
        }
        expect((await store.getAllTracks()).map((t) => t.points)).toEqual([
          [],
          [],
          [],
        ]);
      });
    });
  });
});
