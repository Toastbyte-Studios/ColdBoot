import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MorseHero from '../src/screens/MorseCode/MorseHero';
import {
  characterOfTheDay,
  KOCH_ORDER,
  morseSound,
  morseSpoken,
} from '../src/screens/MorseCode/morseHero';

const mockNavigate = jest.fn();
const mockAddListener = jest.fn(() => () => {});
const mockSignaling = {
  isMorseTransmitting: false,
  transmitMorseMessage: jest.fn(),
  stopMorseTransmission: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    addListener: mockAddListener,
  }),
}));
jest.mock('../src/stores/StoreContext', () => ({
  useSignalingStore: () => mockSignaling,
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

describe('morseHero', () => {
  it('says a pattern the way operators learn it', () => {
    expect(morseSound('-.-')).toBe('dah-di-dah');
    expect(morseSound('...')).toBe('di-di-dit');
    expect(morseSound('.')).toBe('dit');
    expect(morseSound('-')).toBe('dah');
  });

  it('spells a pattern out for a screen reader', () => {
    expect(morseSpoken('.-')).toBe('dot dash');
  });

  it('keeps one character all day, in local time', () => {
    const morning = characterOfTheDay(new Date(2026, 10, 21, 0, 5));
    const night = characterOfTheDay(new Date(2026, 10, 21, 23, 55));
    const tomorrow = characterOfTheDay(new Date(2026, 10, 22, 0, 5));
    expect(night.char).toBe(morning.char);
    expect(tomorrow.char).not.toBe(morning.char);
  });

  it('works through every letter and digit once per cycle', () => {
    expect(new Set(KOCH_ORDER).size).toBe(36);
    const seen = new Set<string>();
    for (let day = 0; day < KOCH_ORDER.length; day++) {
      const { char, morse } = characterOfTheDay(new Date(2026, 0, 1 + day));
      expect(morse).toMatch(/^[.-]+$/);
      seen.add(char);
    }
    expect(seen.size).toBe(36);
  });
});

describe('MorseHero', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  const render = async () => {
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<MorseHero />);
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 21, 9, 0));
    mockNavigate.mockClear();
    mockSignaling.isMorseTransmitting = false;
    mockSignaling.transmitMorseMessage.mockClear();
    mockSignaling.stopMorseTransmission.mockClear();
  });

  afterEach(() => {
    ReactTestRenderer.act(() => tree.unmount());
    jest.useRealTimers();
  });

  const texts = () =>
    tree.root
      .findAll((node) => typeof node.props.children === 'string')
      .map((node) => node.props.children as string);

  const pressable = (label: string) =>
    tree.root.find(
      (node) =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === 'function',
    );

  it("shows today's character, its sound and its pattern", async () => {
    await render();
    const today = characterOfTheDay(new Date(2026, 10, 21));
    expect(texts()).toEqual(
      expect.arrayContaining([
        today.char,
        `${today.sound}. Learn it as a sound, not a count.`,
      ]),
    );
    const pattern = tree.root.findByProps({ testID: 'morse-hero-pattern' });
    expect(pattern.props.children).toHaveLength(today.morse.length);
  });

  it("sends today's character with the light and a tone", async () => {
    await render();
    const today = characterOfTheDay(new Date(2026, 10, 21));
    pressable(
      `Send ${today.char} with the light and a tone: ${morseSpoken(today.morse)}`,
    ).props.onPress();
    expect(mockSignaling.transmitMorseMessage).toHaveBeenCalledWith(
      today.morse,
      true,
    );
  });

  it('turns Play into Stop while sending', async () => {
    mockSignaling.isMorseTransmitting = true;
    await render();
    pressable('Stop sending').props.onPress();
    expect(mockSignaling.stopMorseTransmission).toHaveBeenCalled();
    expect(mockSignaling.transmitMorseMessage).not.toHaveBeenCalled();
  });

  it('opens the trainer', async () => {
    await render();
    pressable('Open the Morse trainer').props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('MorseTrainer');
  });

  it('re-checks the day when the screen regains focus', async () => {
    await render();
    expect(mockAddListener).toHaveBeenCalledWith('focus', expect.any(Function));
  });
});
