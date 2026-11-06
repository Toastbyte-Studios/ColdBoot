import { observer } from 'mobx-react-lite';
import React from 'react';
import { useCoreStore, useSettingsStore } from '../../../stores/StoreContext';
import { ddToMgrs } from '../../../utils/gridReference';
import { formatDateTime } from '../../../utils/timeFormat';
import {
  accuracyTone,
  fixAgeTone,
  formatAge,
  formatCoordinates,
  formatMeters,
} from '../deviceStatusFormatters';
import { useNow } from '../useNow';
import StatusRow from './StatusRow';
import StatusSection from './StatusSection';

/**
 * Where the device thinks it is, and how far to trust that: the last fix's
 * coordinates (decimal and MGRS), its accuracy as a quality band, altitude,
 * and how long ago it was taken.
 */
const LocationSection = observer(() => {
  const core = useCoreStore();
  const settings = useSettingsStore();
  const now = useNow();
  const fix = core.lastFix;
  const system = settings.measurementSystem;

  if (!fix) {
    return (
      <StatusSection title="Location">
        <StatusRow
          label="GPS"
          value={core.locationError ? 'Unavailable' : 'Waiting for fix'}
          detail={core.locationError ?? undefined}
          tone={core.locationError ? 'poor' : 'neutral'}
          isLast
        />
      </StatusSection>
    );
  }

  const { latitude, longitude, accuracy, altitude } = fix.coords;
  const quality = accuracyTone(accuracy);
  const mgrs = safeMgrs(latitude, longitude);

  return (
    <StatusSection title="Location">
      <StatusRow
        label="Last fix"
        value={formatAge(fix.timestamp, now)}
        detail={formatDateTime(new Date(fix.timestamp))}
        tone={fixAgeTone(fix.timestamp, now, core.gpsIntervalMs)}
      />
      <StatusRow
        label="Accuracy"
        value={
          Number.isFinite(accuracy)
            ? `±${formatMeters(accuracy, system)}`
            : 'Unknown'
        }
        detail={quality.label}
        tone={quality.tone}
      />
      <StatusRow
        label="Coordinates"
        value={formatCoordinates(latitude, longitude)}
      />
      {mgrs ? (
        <StatusRow
          label="MGRS"
          value={mgrs}
          accessibilityValue={mgrs.split('').join(' ')}
        />
      ) : null}
      <StatusRow
        label="Altitude"
        value={
          altitude != null && Number.isFinite(altitude)
            ? formatMeters(altitude, system)
            : 'Not available'
        }
        detail={altitude != null ? 'GPS, above sea level' : undefined}
        isLast
      />
    </StatusSection>
  );
});

/** MGRS is undefined near the poles; drop the row rather than show an error. */
function safeMgrs(latitude: number, longitude: number): string | null {
  try {
    return ddToMgrs(latitude, longitude);
  } catch {
    return null;
  }
}

export default LocationSection;
