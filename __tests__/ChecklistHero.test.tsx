import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ChecklistHero from '../src/screens/Checklist/ChecklistHero';
import {
  checklistHeroState,
  checklistProgress,
  progressText,
} from '../src/screens/Checklist/checklistProgress';
import type { Checklist, ChecklistItem } from '../src/stores/ChecklistStore';

const list = (id: string, name: string): Checklist => ({
  id,
  name,
  createdAt: 0,
  isDefault: false,
});

const items = (
  checklistId: string,
  done: number,
  total: number,
): ChecklistItem[] =>
  Array.from({ length: total }, (_, index) => ({
    id: `${checklistId}-${index}`,
    checklistId,
    text: `Item ${index + 1}`,
    checked: index < done,
    order: index,
  }));

const progressFor = (lists: Checklist[], all: ChecklistItem[]) =>
  checklistProgress(lists, (id) => all.filter((i) => i.checklistId === id));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
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

describe('checklistProgress', () => {
  const bag = list('bag', 'Bug-out bag');
  const aid = list('aid', 'First-aid kit');
  const car = list('car', 'Car kit');

  it('leads with the unfinished list closest to done', () => {
    const progress = progressFor(
      [aid, bag, car],
      [...items('aid', 2, 10), ...items('bag', 15, 20), ...items('car', 4, 4)],
    );
    const state = checklistHeroState(progress);
    expect(state).toMatchObject({
      headline: 'Bug-out bag',
      tone: 'fair',
      detail: '15 of 20 done',
      listsDone: 1,
      listsWithItems: 3,
      done: 21,
      total: 34,
    });
    expect(state.focus?.next?.text).toBe('Item 16');
    expect(state.fraction).toBeCloseTo(0.75);
  });

  it('ignores empty lists, and says when everything is done', () => {
    const state = checklistHeroState(
      progressFor([aid, bag], items('bag', 3, 3)),
    );
    expect(state).toMatchObject({
      headline: 'All lists done',
      tone: 'good',
      listsDone: 1,
      listsWithItems: 1,
    });
  });

  it('prompts when no list has items', () => {
    expect(checklistHeroState(progressFor([aid], [])).headline).toBe(
      'Add items',
    );
    expect(checklistHeroState([]).headline).toBe('Make a checklist');
  });

  it('labels rows with their progress', () => {
    const [empty, partial, done] = progressFor(
      [aid, bag, car],
      [...items('bag', 1, 4), ...items('car', 2, 2)],
    );
    expect(progressText(empty)).toBeUndefined();
    expect(progressText(partial)).toBe('1/4');
    expect(progressText(done)).toBe('Done');
  });
});

describe('ChecklistHero', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  const bag = list('bag', 'Bug-out bag');

  beforeEach(async () => {
    mockNavigate.mockClear();
    const state = checklistHeroState(progressFor([bag], items('bag', 1, 4)));
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<ChecklistHero state={state} />);
    });
  });

  afterEach(() => ReactTestRenderer.act(() => tree.unmount()));

  const pressable = (label: string) =>
    tree.root.find(
      (node) =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === 'function',
    );

  it('opens the lead list from the headline and from the next item', () => {
    pressable('Finish next. Bug-out bag. 1 of 4 done').props.onPress();
    pressable('Next item on Bug-out bag: Item 2').props.onPress();
    expect(mockNavigate).toHaveBeenNthCalledWith(1, 'ChecklistEntry', {
      checklist: bag,
    });
    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it('draws the progress bar at the lead list’s fraction', () => {
    const bar = tree.root.findByProps({ testID: 'checklist-hero-bar' });
    const fill = bar.findAllByType(require('react-native').View)[1];
    expect(fill.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 16 })]),
    );
  });
});
