import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import EmergencyPlanHero from '../src/screens/EmergencyPlan/EmergencyPlanHero';
import {
  hasCommsPlan,
  namesText,
  planHeroState,
  updatedText,
} from '../src/screens/EmergencyPlan/planHero';
import type { CommunicationPlan } from '../src/stores/EmergencyPlanStore';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 21, 9, 0).getTime();

const EMPTY_PLAN: CommunicationPlan = {
  whoCallsWhom: '',
  ifPhonesDown: '',
  outOfAreaContact: '',
  checkInSchedule: '',
  updatedAt: 0,
};
const WRITTEN_PLAN: CommunicationPlan = {
  ...EMPTY_PLAN,
  outOfAreaContact: 'Aunt Jo',
  updatedAt: NOW - 3 * DAY,
};

const mockNavigate = jest.fn();
const mockAddListener = jest.fn(() => () => {});
const mockStore = {
  contacts: [] as { name: string; updatedAt: number }[],
  rallyPoints: [] as { name: string; updatedAt: number }[],
  communicationPlan: EMPTY_PLAN,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    addListener: mockAddListener,
  }),
}));
jest.mock('../src/stores', () => ({
  useEmergencyPlanStore: () => mockStore,
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

describe('planHero', () => {
  const contact = { name: 'Mom', updatedAt: NOW - 10 * DAY };
  const rally = { name: 'Oak Park', updatedAt: NOW - 20 * DAY };

  it('asks to start an empty plan, beginning with contacts', () => {
    const state = planHeroState({
      contacts: [],
      rallyPoints: [],
      communicationPlan: EMPTY_PLAN,
      now: NOW,
    });
    expect(state.headline).toBe('Start your plan');
    expect(state.next).toBe('EmergencyContacts');
    expect(state.parts).toEqual([false, false, false]);
  });

  it('names the next missing part, in order', () => {
    expect(
      planHeroState({
        contacts: [contact],
        rallyPoints: [],
        communicationPlan: WRITTEN_PLAN,
        now: NOW,
      }),
    ).toMatchObject({
      headline: 'Add a rally point',
      tone: 'fair',
      detail: '2 of 3 parts done',
      next: 'RallyPoints',
    });
    expect(
      planHeroState({
        contacts: [contact],
        rallyPoints: [rally],
        communicationPlan: EMPTY_PLAN,
        now: NOW,
      }).headline,
    ).toBe('Write a comms plan');
  });

  it('says a full plan is ready, from its newest change', () => {
    expect(
      planHeroState({
        contacts: [contact],
        rallyPoints: [rally],
        communicationPlan: WRITTEN_PLAN,
        now: NOW,
      }),
    ).toMatchObject({
      headline: 'Plan ready',
      tone: 'good',
      detail: 'Last updated 3 days ago',
      next: null,
    });
  });

  it('flags a full plan for review after six months', () => {
    const old = NOW - 200 * DAY;
    const state = planHeroState({
      contacts: [{ name: 'Mom', updatedAt: old }],
      rallyPoints: [{ name: 'Oak Park', updatedAt: old }],
      communicationPlan: { ...WRITTEN_PLAN, updatedAt: old },
      now: NOW,
    });
    expect(state.headline).toBe('Time to review');
    expect(state.detail).toContain('6 months ago');
  });

  it('only counts a comms plan with something written in it', () => {
    expect(hasCommsPlan(EMPTY_PLAN)).toBe(false);
    expect(hasCommsPlan({ ...EMPTY_PLAN, updatedAt: NOW })).toBe(false);
    expect(hasCommsPlan(WRITTEN_PLAN)).toBe(true);
  });

  it('formats names and times', () => {
    expect(namesText([])).toBeNull();
    expect(namesText([{ name: 'A' }, { name: 'B' }])).toBe('A, B');
    expect(namesText([{ name: 'A' }, { name: 'B' }, { name: 'C' }])).toBe(
      'A +2',
    );
    expect(updatedText(NOW, NOW)).toBe('today');
    expect(updatedText(NOW - DAY, NOW)).toBe('yesterday');
  });
});

describe('EmergencyPlanHero', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  const render = async () => {
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<EmergencyPlanHero />);
    });
  };

  beforeEach(() => {
    mockNavigate.mockClear();
    mockStore.contacts = [];
    mockStore.rallyPoints = [];
    mockStore.communicationPlan = EMPTY_PLAN;
  });

  afterEach(() => ReactTestRenderer.act(() => tree.unmount()));

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

  it('opens the next part to fill in from the headline', async () => {
    mockStore.contacts = [{ name: 'Mom', updatedAt: NOW }];
    await render();
    expect(texts()).toEqual(
      expect.arrayContaining(['Add a rally point', 'Mom', 'None yet']),
    );
    pressable(
      'Your plan. Add a rally point. 1 of 3 parts done',
    ).props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('RallyPoints');
  });

  it('shows the out-of-area contact and opens the comms plan', async () => {
    mockStore.communicationPlan = WRITTEN_PLAN;
    await render();
    pressable('Out-of-area contact: Aunt Jo').props.onPress();
    expect(mockNavigate).toHaveBeenCalledWith('CommunicationPlan');
  });
});
