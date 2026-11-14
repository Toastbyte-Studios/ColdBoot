import { makeAutoObservable, runInAction } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import { SQLiteDatabase } from '../types/database-types';

/**
 * A single GPS point recorded as part of a track.
 */
export interface TrackPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: number; // Unix ms
}

/**
 * What the app keeps in memory for every saved trail: enough to list it.
 *
 * A trail's points are left in SQLite until something needs them. One trail
 * can be several thousand points, and loading them all at launch meant
 * parsing every trail ever recorded, and having MobX track each point, just
 * to show a list of names.
 */
export interface TrackSummary {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  durationSeconds: number;
  distanceMeters: number;
}

/**
 * A saved breadcrumb trail with its GPS points. Read one with
 * `TrackStore.getTrack`; the store's own list holds summaries.
 */
export interface Track extends TrackSummary {
  points: TrackPoint[]; // stored as a JSON blob in SQLite
}

/** `points` column → points. An unreadable column reads as an empty trail. */
function parsePoints(raw: unknown): TrackPoint[] {
  if (typeof raw !== 'string') {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TrackPoint[]) : [];
  } catch {
    return [];
  }
}

function summaryOf(track: TrackSummary): TrackSummary {
  return {
    id: track.id,
    name: track.name,
    createdAt: track.createdAt,
    durationSeconds: track.durationSeconds,
    distanceMeters: track.distanceMeters,
  };
}

/** Returns a default track name like "Track 2024-06-15 14:30". */
function defaultTrackName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Track ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * Store for managing recorded GPS tracks with SQLite persistence.
 * Tracks are saved to coldboot.db and persist across app restarts.
 */
export class TrackStore {
  tracks: TrackSummary[] = [];
  trackDb: SQLiteDatabase | null = null;
  /**
   * Points for trails that have no database row to be read back from: the
   * store runs without SQLite in tests and when the database fails to open.
   * Not observable; nothing renders from it.
   */
  private memoryPoints = new Map<string, TrackPoint[]>();

  constructor() {
    makeAutoObservable<TrackStore, 'memoryPoints'>(
      this,
      { memoryPoints: false },
      { autoBind: true },
    );
  }

  /**
   * Initialises the tracks table in the shared coldboot.db and loads saved tracks.
   * Accepts the same SQLiteDatabase instance opened by CoreStore so all data
   * lives in a single file.
   */
  async initDatabase(db: SQLiteDatabase): Promise<void> {
    this.trackDb = db;
    try {
      await this.createTable();
      await this.loadTracks();
    } catch (e) {
      console.warn('TrackStore: failed to init database', e);
    }
  }

  private async createTable(): Promise<void> {
    if (!this.trackDb) {
      return;
    }
    await this.trackDb.executeSql(
      'CREATE TABLE IF NOT EXISTS tracks (' +
        'id TEXT PRIMARY KEY, ' +
        'name TEXT NOT NULL, ' +
        'createdAt TEXT NOT NULL, ' +
        'durationSeconds REAL NOT NULL, ' +
        'distanceMeters REAL NOT NULL, ' +
        'points TEXT NOT NULL' +
        ')',
    );
  }

  private async loadTracks(): Promise<void> {
    if (!this.trackDb) {
      return;
    }
    const [results] = await this.trackDb.executeSql(
      'SELECT id, name, createdAt, durationSeconds, distanceMeters ' +
        'FROM tracks ORDER BY createdAt DESC',
    );
    const loaded: TrackSummary[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      loaded.push({
        id: row.id as string,
        name: row.name as string,
        createdAt: row.createdAt as string,
        durationSeconds: row.durationSeconds as number,
        distanceMeters: row.distanceMeters as number,
      });
    }
    runInAction(() => {
      this.tracks = loaded;
    });
  }

  /**
   * The points of one saved trail, read when the trail is opened on the map.
   * Empty when the trail is unknown or its stored points can't be read.
   */
  async getTrackPoints(id: string): Promise<TrackPoint[]> {
    if (!this.trackDb) {
      return this.memoryPoints.get(id) ?? [];
    }
    const [results] = await this.trackDb.executeSql(
      'SELECT points FROM tracks WHERE id = ?',
      [id],
    );
    return results.rows.length > 0
      ? parsePoints(results.rows.item(0).points)
      : [];
  }

  /** A saved trail with its points, or null when there is no such trail. */
  async getTrack(id: string): Promise<Track | null> {
    const summary = this.tracks.find((track) => track.id === id);
    if (!summary) {
      return null;
    }
    return { ...summaryOf(summary), points: await this.getTrackPoints(id) };
  }

  /** Every saved trail with its points, for a backup. Newest first. */
  async getAllTracks(): Promise<Track[]> {
    if (!this.trackDb) {
      return this.tracks.map((track) => ({
        ...summaryOf(track),
        points: this.memoryPoints.get(track.id) ?? [],
      }));
    }
    const [results] = await this.trackDb.executeSql(
      'SELECT id, name, createdAt, durationSeconds, distanceMeters, points ' +
        'FROM tracks ORDER BY createdAt DESC',
    );
    const all: Track[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      all.push({
        id: row.id as string,
        name: row.name as string,
        createdAt: row.createdAt as string,
        durationSeconds: row.durationSeconds as number,
        distanceMeters: row.distanceMeters as number,
        points: parsePoints(row.points),
      });
    }
    return all;
  }

  /**
   * Persists a completed recording to SQLite and adds it to the in-memory list.
   * If name is empty a default date-based name is used.
   */
  async saveTrack(
    name: string,
    durationSeconds: number,
    distanceMeters: number,
    points: TrackPoint[],
  ): Promise<Track> {
    const track: Track = {
      id: uuidv4(),
      name: name.trim() || defaultTrackName(),
      createdAt: new Date().toISOString(),
      durationSeconds,
      distanceMeters,
      points,
    };
    if (this.trackDb) {
      await this.trackDb.executeSql(
        'INSERT INTO tracks (id, name, createdAt, durationSeconds, distanceMeters, points) ' +
          'VALUES (?, ?, ?, ?, ?, ?)',
        [
          track.id,
          track.name,
          track.createdAt,
          track.durationSeconds,
          track.distanceMeters,
          JSON.stringify(track.points),
        ],
      );
    } else {
      this.memoryPoints.set(track.id, points);
    }
    runInAction(() => {
      this.tracks.unshift(summaryOf(track));
    });
    return track;
  }

  /**
   * Replaces or merges a list of tracks imported from a backup.
   * In replace mode all existing tracks are removed first.
   * In merge mode only tracks whose IDs do not already exist are inserted.
   */
  async importData(tracks: Track[], mode: 'replace' | 'merge'): Promise<void> {
    if (this.trackDb) {
      try {
        await this.trackDb.executeSql('BEGIN TRANSACTION');
        if (mode === 'replace') {
          await this.trackDb.executeSql('DELETE FROM tracks');
        }
        const sql =
          mode === 'replace'
            ? 'INSERT OR REPLACE INTO tracks (id, name, createdAt, durationSeconds, distanceMeters, points) VALUES (?, ?, ?, ?, ?, ?)'
            : 'INSERT OR IGNORE INTO tracks (id, name, createdAt, durationSeconds, distanceMeters, points) VALUES (?, ?, ?, ?, ?, ?)';
        for (const t of tracks) {
          await this.trackDb.executeSql(sql, [
            t.id,
            t.name,
            t.createdAt,
            t.durationSeconds,
            t.distanceMeters,
            JSON.stringify(t.points),
          ]);
        }
        await this.trackDb.executeSql('COMMIT');
      } catch (error) {
        await this.trackDb.executeSql('ROLLBACK');
        throw error;
      }
    }
    const existingIds = new Set(this.tracks.map((t) => t.id));
    const incoming =
      mode === 'replace'
        ? tracks
        : tracks.filter((t) => !existingIds.has(t.id));
    if (!this.trackDb) {
      if (mode === 'replace') {
        this.memoryPoints.clear();
      }
      for (const track of incoming) {
        this.memoryPoints.set(track.id, track.points);
      }
    }
    runInAction(() => {
      const kept = mode === 'replace' ? [] : this.tracks;
      this.tracks = [...incoming.map(summaryOf), ...kept].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
    });
  }

  /**
   * Deletes a track by ID from both memory and SQLite.
   */
  async deleteTrack(id: string): Promise<void> {
    if (this.trackDb) {
      await this.trackDb.executeSql('DELETE FROM tracks WHERE id = ?', [id]);
    }
    this.memoryPoints.delete(id);
    runInAction(() => {
      this.tracks = this.tracks.filter((t) => t.id !== id);
    });
  }

  dispose(): void {
    this.trackDb = null;
  }
}
