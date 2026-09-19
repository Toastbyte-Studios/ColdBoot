/**
 * @format
 * Tests for NotesStore location capture
 */

import Geolocation, {
  type GeoPosition,
} from 'react-native-geolocation-service';
import { NotesStore } from '../src/stores/NotesStore';
import { requestForegroundLocationPermission } from '../src/utils/locationPermission';

jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

jest.mock('react-native-geolocation-service');

jest.mock('../src/utils/locationPermission', () => ({
  requestForegroundLocationPermission: jest.fn(),
}));

jest.mock('react-native-sqlite-storage', () => {
  const mockExecuteSql = jest.fn(() =>
    Promise.resolve([{ rows: { length: 0, item: () => null, raw: () => [] } }]),
  );

  return {
    openDatabase: jest.fn(() =>
      Promise.resolve({
        executeSql: mockExecuteSql,
        close: jest.fn(() => Promise.resolve()),
      }),
    ),
    enablePromise: jest.fn(),
    DEBUG: jest.fn(),
  };
});

describe('NotesStore location capture', () => {
  let store: NotesStore;
  const geo = Geolocation as jest.Mocked<typeof Geolocation>;
  const mockRequestForegroundLocationPermission =
    requestForegroundLocationPermission as jest.MockedFunction<
      typeof requestForegroundLocationPermission
    >;

  const mockPosition = (latitude: number, longitude: number) => {
    geo.getCurrentPosition.mockImplementationOnce(
      (success: (position: GeoPosition) => void) => {
        success({
          coords: {
            latitude,
            longitude,
            accuracy: 5,
            altitude: 0,
            altitudeAccuracy: 5,
            heading: 0,
            speed: 0,
          },
          timestamp: Date.now(),
        });
      },
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestForegroundLocationPermission.mockResolvedValue('granted');
    store = new NotesStore();
  });

  afterEach(() => {
    store.dispose();
  });

  it('createNote saves coordinates when location permission is granted', async () => {
    mockPosition(27.9506, -82.4572);

    await store.createNote({
      type: 'text',
      title: 'Test note',
      text: 'Coordinates included',
    });

    expect(store.notes).toHaveLength(1);
    expect(store.notes[0]).toMatchObject({
      latitude: 27.9506,
      longitude: -82.4572,
      type: 'text',
      title: 'Test note',
    });
  });

  it('createVoiceLog saves coordinates when location permission is granted', async () => {
    mockPosition(30.3322, -81.6557);

    await store.createVoiceLog({
      audioUri: 'file:///voice-log.m4a',
      duration: 12,
      transcription: 'Voice log text',
    });

    expect(store.notes).toHaveLength(1);
    expect(store.notes[0]).toMatchObject({
      latitude: 30.3322,
      longitude: -81.6557,
      category: 'Voice Logs',
      type: 'voice',
      audioUri: 'file:///voice-log.m4a',
      duration: 12,
    });
  });

  it('createNote still saves without coordinates when location permission is denied', async () => {
    mockRequestForegroundLocationPermission.mockResolvedValueOnce('denied');

    await store.createNote({
      type: 'text',
      title: 'Denied note',
      text: 'Saved without location',
    });

    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(store.notes).toHaveLength(1);
    expect(store.notes[0]).toMatchObject({
      type: 'text',
      title: 'Denied note',
    });
    expect(store.notes[0].latitude).toBeUndefined();
    expect(store.notes[0].longitude).toBeUndefined();
  });

  it('createVoiceLog still saves without coordinates when location permission is denied', async () => {
    mockRequestForegroundLocationPermission.mockResolvedValueOnce('denied');

    await store.createVoiceLog({
      audioUri: 'file:///voice-log-denied.m4a',
      duration: 8,
    });

    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(store.notes).toHaveLength(1);
    expect(store.notes[0]).toMatchObject({
      category: 'Voice Logs',
      type: 'voice',
      audioUri: 'file:///voice-log-denied.m4a',
      duration: 8,
    });
    expect(store.notes[0].latitude).toBeUndefined();
    expect(store.notes[0].longitude).toBeUndefined();
  });
});
