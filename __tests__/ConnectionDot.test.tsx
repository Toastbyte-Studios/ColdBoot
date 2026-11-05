import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import ConnectionDot, {
  connectionState,
} from '../src/components/ConnectionDot';
import { LIGHT_COLORS } from '../src/theme/colors';

const mockCore: { netInfo: { isConnected: boolean | null } | null } = {
  netInfo: null,
};

jest.mock('../src/stores/StoreContext', () => ({
  useCoreStore: () => mockCore,
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

async function renderDot() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ConnectionDot />);
  });
  const dot = tree.root.findByProps({ testID: 'connection-dot' });
  return {
    label: dot.props.accessibilityLabel as string,
    color: StyleSheet.flatten(dot.props.style).backgroundColor,
  };
}

describe('connectionState', () => {
  it('maps NetInfo isConnected to a dot state', () => {
    expect(connectionState(true)).toBe('online');
    expect(connectionState(false)).toBe('offline');
    expect(connectionState(null)).toBe('unknown');
    expect(connectionState(undefined)).toBe('unknown');
  });
});

describe('ConnectionDot', () => {
  it('is green when connected', async () => {
    mockCore.netInfo = { isConnected: true };
    expect(await renderDot()).toEqual({
      label: 'Connected',
      color: LIGHT_COLORS.SUCCESS,
    });
  });

  it('is red when not connected', async () => {
    mockCore.netInfo = { isConnected: false };
    expect(await renderDot()).toEqual({
      label: 'Not connected',
      color: LIGHT_COLORS.ERROR,
    });
  });

  it('is grey before NetInfo reports', async () => {
    mockCore.netInfo = null;
    expect(await renderDot()).toEqual({
      label: 'Connection status unknown',
      color: LIGHT_COLORS.MUTED,
    });
  });
});
