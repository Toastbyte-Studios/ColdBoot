import { TransformRequestManager } from '@maplibre/maplibre-react-native';
import { Platform } from 'react-native';
import {
  identifyMapRequests,
  mapUserAgent,
} from '../src/navigation/services/mapRequestIdentity';

describe('map request identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('names ColdBoot, its version and platform, and a contact', () => {
    // The shared device-info mock reports version 1.0.0.
    expect(mapUserAgent()).toBe(
      `ColdBoot/1.0.0 (${Platform.OS}; +https://toastbyte.studio; support@toastbyte.studio)`,
    );
  });

  it('sends it as the User-Agent on OpenFreeMap requests', () => {
    identifyMapRequests();

    expect(TransformRequestManager.addHeader).toHaveBeenCalledWith({
      id: 'coldboot-user-agent',
      name: 'User-Agent',
      value: mapUserAgent(),
      match: expect.any(String),
    });
  });

  it('matches OpenFreeMap requests only', () => {
    identifyMapRequests();
    const { match } = (TransformRequestManager.addHeader as jest.Mock).mock
      .calls[0][0];
    const pattern = new RegExp(match);

    expect(pattern.test('https://tiles.openfreemap.org/planet/1/2/3.pbf')).toBe(
      true,
    );
    expect(pattern.test('https://tiles.openfreemap.org/styles/liberty')).toBe(
      true,
    );
    expect(pattern.test('https://www.repeaterbook.com/api/export.php')).toBe(
      false,
    );
    expect(
      pattern.test('https://evil.example/?u=https://tiles.openfreemap.org/'),
    ).toBe(false);
  });

  it('registers under one id, so it replaces rather than stacks', () => {
    identifyMapRequests();
    identifyMapRequests();

    const ids = (TransformRequestManager.addHeader as jest.Mock).mock.calls.map(
      ([options]) => options.id,
    );
    expect(new Set(ids)).toEqual(new Set(['coldboot-user-agent']));
  });

  it('is registered as soon as the app loads, in every build', () => {
    let addHeader: jest.Mock | undefined;
    jest.isolateModules(() => {
      jest.doMock('../src/navigation/AppNavigator', () => () => null);
      jest.doMock('../src/stores', () => ({
        StoreProvider: ({ children }: { children: unknown }) => children,
      }));
      jest.doMock('../src/components/ErrorBoundary', () => ({
        __esModule: true,
        default: ({ children }: { children: unknown }) => children,
      }));
      // The isolated registry has its own copy of the MapLibre mock; read
      // the one App sees. Loading App is enough: nothing is rendered.
      // (It's wired in by moduleNameMapper, so a plain require finds it.)
      addHeader = require('@maplibre/maplibre-react-native')
        .TransformRequestManager.addHeader;
      jest.requireActual('../App');
    });

    expect(addHeader).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'User-Agent' }),
    );
  });
});
