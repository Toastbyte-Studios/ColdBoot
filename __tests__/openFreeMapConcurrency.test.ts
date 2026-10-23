/**
 * OpenFreeMap allows offline downloads at most 4 parallel requests
 * (https://openfreemap.org/quick_start/, "Mobile Apps"). MapLibre Native
 * keeps up to 20 in flight, so the app caps them natively:
 *
 * - Android: patches/@maplibre+maplibre-react-native+<version>.patch sets
 *   MapLibre React Native's OkHttp dispatcher to 4 requests per host.
 * - iOS: ios/ColdBoot/MapRequestThrottle.swift runs at most 4 OpenFreeMap
 *   requests at once, installed by AppDelegate before React Native starts.
 *
 * Neither is visible to JavaScript, so these checks read the sources. The
 * Android one guards an upgrade in particular: patch-package only warns when
 * a patch's version no longer matches, and the cap would quietly go back to 20.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8');

describe('OpenFreeMap parallel request cap', () => {
  it('caps Android at 4 requests per host in the installed MapLibre', () => {
    const module = read(
      'node_modules/@maplibre/maplibre-react-native/android/src/main/java',
      'org/maplibre/reactnative/modules/MLRNTransformRequestModule.kt',
    );

    expect(module).toMatch(/dispatcher\.maxRequestsPerHost = 4\b/);
    expect(module).not.toMatch(/dispatcher\.maxRequestsPerHost = 20\b/);
  });

  it('caps iOS at 4 concurrent OpenFreeMap requests', () => {
    const throttle = read('ios/ColdBoot/MapRequestThrottle.swift');

    expect(throttle).toMatch(/static let maxConcurrentRequests = 4\b/);
    expect(throttle).toContain('"tiles.openfreemap.org"');
  });

  it('declares no iOS property URLProtocol already has', () => {
    const throttle = read('ios/ColdBoot/MapRequestThrottle.swift');

    // URLProtocol defines these; redeclaring one is a compile error
    // ("Cannot override with a stored property 'task'").
    for (const inherited of ['task', 'request', 'client', 'cachedResponse']) {
      expect(throttle).not.toMatch(
        new RegExp(String.raw`\b(?:var|let)\s+${inherited}\s*:`),
      );
    }
  });

  it('installs the iOS throttle before React Native starts', () => {
    const appDelegate = read('ios/ColdBoot/AppDelegate.swift');
    const install = appDelegate.indexOf('MapRequestThrottle.install()');
    const start = appDelegate.indexOf('factory.startReactNative(');

    expect(install).toBeGreaterThan(-1);
    expect(start).toBeGreaterThan(install);
  });

  it('builds the iOS throttle into the app target', () => {
    const project = read('ios/ColdBoot.xcodeproj/project.pbxproj');

    expect(project).toContain('MapRequestThrottle.swift in Sources');
  });
});
