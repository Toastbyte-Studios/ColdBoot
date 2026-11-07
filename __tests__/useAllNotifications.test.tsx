import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { useAllNotifications } from '../src/hooks/useAllNotifications';
import { AppNotification } from '../src/stores/NotificationsStore';

const mockCore = { batteryTemperatureC: null as number | null };

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));
jest.mock('../src/stores/StoreContext', () => ({
  useCoreStore: () => mockCore,
  useSettingsStore: () => ({ measurementSystem: 'metric' }),
  useNotificationsStore: () => ({ isHidden: () => false }),
  useSolarCycleNotificationStore: () => ({
    upcomingNotifications: [],
    allSolarEventsComplete: () => false,
  }),
  useWeatherOutlookStore: () => ({ getCurrentMonthSummary: () => null }),
  usePantryStore: () => ({ getExpirationAlerts: () => [] }),
  useAstronomyEventStore: () => ({ getNextAstronomyEvent: () => null }),
}));

let result: AppNotification[] = [];
function Probe() {
  result = useAllNotifications();
  return null;
}

async function collect() {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<Probe />);
  });
  return result;
}

describe('frozen battery alert', () => {
  it('warns first, in the error role, at or below freezing', async () => {
    mockCore.batteryTemperatureC = -3;
    const [first] = await collect();

    expect(first).toMatchObject({
      type: 'device',
      icon: 'thermometer-outline',
      dismissible: true,
      message:
        "Battery is below freezing (−3 °C). Don't charge it until it warms up.",
    });
    expect(first.key).toMatch(/^battery-freezing-/);
  });

  it('stays quiet above freezing and where there is no reading (iOS)', async () => {
    mockCore.batteryTemperatureC = 4;
    expect((await collect()).some((n) => n.type === 'device')).toBe(false);

    mockCore.batteryTemperatureC = null;
    expect((await collect()).some((n) => n.type === 'device')).toBe(false);
  });
});
