import { TransformRequestManager } from '@maplibre/maplibre-react-native';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

/** Requests to OpenFreeMap: tiles, style, sprites and fonts. */
const OPENFREEMAP_REQUESTS = '^https://tiles\\.openfreemap\\.org/';

/** Header id, so registering again replaces rather than duplicates it. */
const USER_AGENT_HEADER_ID = 'coldboot-user-agent';

/**
 * Identifies ColdBoot to OpenFreeMap, e.g.
 * `ColdBoot/1.2.0 (ios; +https://toastbyte.studio; support@toastbyte.studio)`.
 * Same contact details as the RepeaterBook client's User-Agent.
 */
export function mapUserAgent(): string {
  return `ColdBoot/${DeviceInfo.getVersion()} (${Platform.OS}; +https://toastbyte.studio; support@toastbyte.studio)`;
}

/**
 * Sends ColdBoot's own User-Agent with every OpenFreeMap request, in every
 * build. OpenFreeMap asks offline downloads to carry a unique User-Agent
 * (https://openfreemap.org/quick_start/, "Mobile Apps"), so it can tell
 * apps apart.
 *
 * It replaces MapLibre's default rather than adding a second one: iOS sets it
 * with `setValue:forHTTPHeaderField:` and Android with OkHttp's `header()`.
 * Offline downloads go through the same network stack as the live map.
 */
export function identifyMapRequests(): void {
  TransformRequestManager.addHeader({
    id: USER_AGENT_HEADER_ID,
    name: 'User-Agent',
    value: mapUserAgent(),
    match: OPENFREEMAP_REQUESTS,
  });
}
