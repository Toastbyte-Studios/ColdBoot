import { observer } from 'mobx-react-lite';
import React from 'react';
import { useCoreStore } from '../../../stores/StoreContext';
import { connectionSummary } from '../deviceStatusFormatters';
import StatusRow from './StatusRow';
import StatusSection from './StatusSection';

/**
 * Connectivity: whether the device can reach the internet, over what, and
 * (where the platform reports it) the carrier and Wi-Fi signal. Offline is the
 * normal case for this app, so the offline state says so rather than reading
 * as a fault.
 */
const ConnectivitySection = observer(() => {
  const core = useCoreStore();
  const summary = connectionSummary(core.netInfo);
  const rows: { label: string; value: string }[] = [
    { label: 'Connection', value: summary.connection },
  ];
  if (summary.carrier) rows.push({ label: 'Carrier', value: summary.carrier });
  if (summary.signal != null) {
    rows.push({ label: 'Wi-Fi signal', value: `${summary.signal}%` });
  }
  if (summary.metered) rows.push({ label: 'Data', value: 'Metered' });

  return (
    <StatusSection title="Connectivity">
      <StatusRow
        label="Network"
        value={summary.status}
        tone={summary.tone}
        detail={
          summary.status === 'Offline'
            ? 'Every ColdBoot tool works without a connection'
            : undefined
        }
      />
      {rows.map((row, index) => (
        <StatusRow
          key={row.label}
          label={row.label}
          value={row.value}
          isLast={index === rows.length - 1}
        />
      ))}
    </StatusSection>
  );
});

export default ConnectivitySection;
