import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import DecibelMeterScreen from '../src/screens/DecibelMeter/DecibelMeterScreen';
import {
  addReading,
  BASE_SPL_OFFSET_DB,
  createSoundSession,
  MeterReadings,
  SoundSession,
} from '../src/utils/soundLevel';

const mockSignaling = {
  decibelMeterActive: false,
  soundSession: null as SoundSession | null,
  startDecibelMeter: jest.fn(() => Promise.resolve()),
  stopDecibelMeter: jest.fn(() => Promise.resolve()),
  resetSoundSession: jest.fn(),
};
const mockSettings = {
  soundMeterCalibration: 0,
  setSoundMeterCalibration: jest.fn(() => Promise.resolve()),
};
let mockStackProps: Record<string, unknown> = {};

jest.mock('../src/stores/StoreContext', () => ({
  useSignalingStore: () => mockSignaling,
  useSettingsStore: () => mockSettings,
}));
jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));
jest.mock('../src/hooks/useRippleColor', () => ({
  useRippleColor: () => 'rgba(0,0,0,0.1)',
}));
jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../src/components/StackScreen', () => {
  const { View: MockView } = require('react-native');
  return (props: { children: React.ReactNode; trailing?: React.ReactNode }) => {
    mockStackProps = props;
    return (
      <MockView>
        {props.trailing}
        {props.children}
      </MockView>
    );
  };
});

/** A session that has been at `spl` dB (uncalibrated) for ten seconds. */
function sessionAt(
  spl: number,
  readings: MeterReadings = 'power',
): SoundSession {
  const dbfs = spl - BASE_SPL_OFFSET_DB;
  let session = createSoundSession(0, readings);
  for (let t = 0; t <= 10_000; t += 100) {
    session = addReading(session, dbfs, t);
  }
  return session;
}

async function render() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<DecibelMeterScreen />);
  });
  return tree;
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => [node.props.children].flat().join(''));

const pressByLabel = async (
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string,
) => {
  const target = tree.root.find(
    (node) =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  );
  await ReactTestRenderer.act(async () => {
    target.props.onPress();
  });
};

describe('DecibelMeterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignaling.decibelMeterActive = false;
    mockSignaling.soundSession = null;
    mockSettings.soundMeterCalibration = 0;
  });

  it('invites a first measurement when there is no session', async () => {
    const tree = await render();
    const shown = texts(tree);

    expect(shown).toContain('—');
    expect(shown).toContain('Start the meter to measure the sound around you.');
    expect(shown).not.toContain('MIN');
    expect(mockStackProps.subtitle).toBeUndefined();
    expect(mockStackProps.trailing).toBeUndefined();
  });

  it('starts the meter from the store', async () => {
    const tree = await render();
    await pressByLabel(tree, 'Start the decibel meter');
    expect(mockSignaling.startDecibelMeter).toHaveBeenCalledTimes(1);
  });

  it('shows the live level, its context and the session stats', async () => {
    mockSignaling.decibelMeterActive = true;
    mockSignaling.soundSession = sessionAt(62);
    const tree = await render();
    const shown = texts(tree);

    expect(shown).toContain('62');
    expect(shown).toContain('About as loud as: normal conversation');
    expect(shown).toEqual(expect.arrayContaining(['MIN', 'AVG', 'MAX']));
    expect(shown).toContain('0:10');
    expect(shown).toContain('Quiet enough to listen all day.');
    expect(mockStackProps.subtitle).toBe('62 dB');
  });

  it("shows the session's noise dose", async () => {
    mockSignaling.decibelMeterActive = true;
    mockSignaling.soundSession = sessionAt(95);
    const tree = await render();

    expect(texts(tree)).toContain(
      "Noise dose this session: under 1% of a day's safe limit.",
    );
  });

  it('leaves out the average and dose when readings are peaks', async () => {
    mockSignaling.decibelMeterActive = true;
    mockSignaling.soundSession = sessionAt(95, 'peak');
    const tree = await render();
    const shown = texts(tree);

    expect(shown).toEqual(expect.arrayContaining(['MIN', 'MAX', 'TIME']));
    expect(shown).not.toContain('AVG');
    expect(shown).toContain(
      "Noise dose isn't available on Android, where the microphone reports only the loudest moment of each reading, not the average.",
    );
  });

  it('gives NIOSH exposure advice for loud levels', async () => {
    mockSignaling.decibelMeterActive = true;
    mockSignaling.soundSession = sessionAt(95);
    const tree = await render();

    expect(texts(tree)).toContain(
      'At this level, hearing protection is advised after 47 min a day.',
    );
  });

  it('applies the calibration to every figure', async () => {
    mockSignaling.decibelMeterActive = true;
    mockSignaling.soundSession = sessionAt(62);
    mockSettings.soundMeterCalibration = 5;
    const tree = await render();
    const shown = texts(tree);

    expect(shown).toContain('67');
    expect(shown).toContain('+5 dB');
    expect(shown).not.toContain('62');
  });

  it('nudges and resets the calibration', async () => {
    mockSettings.soundMeterCalibration = 2;
    const tree = await render();

    await pressByLabel(tree, 'Raise readings by 1 dB');
    expect(mockSettings.setSoundMeterCalibration).toHaveBeenLastCalledWith(3);
    await pressByLabel(tree, 'Lower readings by 1 dB');
    expect(mockSettings.setSoundMeterCalibration).toHaveBeenLastCalledWith(1);
    await pressByLabel(tree, 'Reset calibration');
    expect(mockSettings.setSoundMeterCalibration).toHaveBeenLastCalledWith(0);
  });

  it('keeps the results after stopping, with a reset', async () => {
    mockSignaling.soundSession = sessionAt(70);
    const tree = await render();

    expect(texts(tree)).toContain('MAX');
    await pressByLabel(tree, 'Reset readings');
    expect(mockSignaling.resetSoundSession).toHaveBeenCalledTimes(1);
  });
});
