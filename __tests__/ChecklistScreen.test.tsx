/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ChecklistScreen from '../src/screens/Checklist/ChecklistScreen';
import { ChecklistStore } from '../src/stores/ChecklistStore';

const mockNavigate = jest.fn();
let mockChecklistStore: ChecklistStore;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../src/stores', () => ({
  useChecklistStore: () => mockChecklistStore,
}));

jest.mock('../src/components/StackScreen', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

jest.mock('../src/components/GroupContainer', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

jest.mock('../src/components/IconButton', () => 'IconButton');

jest.mock('../src/components/SectionEyebrow', () => 'SectionEyebrow');

// The hero's rendering has its own test (ChecklistHero.test.tsx); here it
// only exposes the state the screen hands it.
jest.mock('../src/screens/Checklist/ChecklistHero', () => {
  const { Text: MockText } = require('react-native');
  return ({ state }: { state: { headline: string } }) => (
    <MockText testID="checklist-hero-headline">{state.headline}</MockText>
  );
});

jest.mock('../src/components/ModuleRow', () => {
  const { Text: MockText } = require('react-native');
  return ({ title, value }: { title: string; value?: string }) => (
    <>
      <MockText testID="checklist-row-title">{title}</MockText>
      <MockText testID="checklist-row-value">{value ?? ''}</MockText>
    </>
  );
});

function getTexts(tree: ReactTestRenderer.ReactTestRenderer, testID: string) {
  return tree.root
    .findAll(
      (node) => node.props.testID === testID && typeof node.type !== 'string',
    )
    .map((node) => node.props.children);
}

function getChecklistTitles(tree: ReactTestRenderer.ReactTestRenderer) {
  return Array.from(
    new Set(
      tree.root
        .findAll((node) => node.props.testID === 'checklist-row-title')
        .map((node) => node.props.children),
    ),
  );
}

describe('ChecklistScreen', () => {
  beforeEach(() => {
    mockChecklistStore = new ChecklistStore();
    mockNavigate.mockReset();
  });

  it('updates the sorted checklist rows after in-place checklist creation', async () => {
    await ReactTestRenderer.act(async () => {
      await mockChecklistStore.createChecklist('Zulu');
    });

    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<ChecklistScreen />);
    });
    expect(getChecklistTitles(tree)).toEqual(['Zulu']);

    await ReactTestRenderer.act(async () => {
      await mockChecklistStore.createChecklist('Alpha');
    });

    expect(getChecklistTitles(tree)).toEqual(['Alpha', 'Zulu']);
  });

  it('keeps the hero and row progress live as items are ticked', async () => {
    await ReactTestRenderer.act(async () => {
      await mockChecklistStore.createChecklist('Bag');
      await mockChecklistStore.createChecklist('Car');
    });
    const [bag, car] = mockChecklistStore.checklists;
    await ReactTestRenderer.act(async () => {
      await mockChecklistStore.addChecklistItem(bag.id, 'Water');
      await mockChecklistStore.addChecklistItem(bag.id, 'Knife');
      await mockChecklistStore.addChecklistItem(car.id, 'Jumper cables');
    });

    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<ChecklistScreen />);
    });
    expect(getTexts(tree, 'checklist-row-value')).toEqual(['0/2', '0/1']);
    expect(getTexts(tree, 'checklist-hero-headline')).toEqual(['Bag']);

    // Ticking the car's only item finishes it; the bag becomes the lead.
    const cables = mockChecklistStore.checklistItems.find(
      (item) => item.text === 'Jumper cables',
    )!;
    await ReactTestRenderer.act(async () => {
      await mockChecklistStore.toggleChecklistItem(cables.id);
    });
    expect(getTexts(tree, 'checklist-row-value')).toEqual(['0/2', 'Done']);
    expect(getTexts(tree, 'checklist-hero-headline')).toEqual(['Bag']);

    // Ticking one bag item keeps the bag in the lead, now part done.
    const water = mockChecklistStore.checklistItems.find(
      (item) => item.text === 'Water',
    )!;
    await ReactTestRenderer.act(async () => {
      await mockChecklistStore.toggleChecklistItem(water.id);
    });
    expect(getTexts(tree, 'checklist-row-value')).toEqual(['1/2', 'Done']);

    const knife = mockChecklistStore.checklistItems.find(
      (item) => item.text === 'Knife',
    )!;
    await ReactTestRenderer.act(async () => {
      await mockChecklistStore.toggleChecklistItem(knife.id);
    });
    expect(getTexts(tree, 'checklist-hero-headline')).toEqual([
      'All lists done',
    ]);
  });
});
