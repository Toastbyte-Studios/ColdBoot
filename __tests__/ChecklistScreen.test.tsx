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

jest.mock('../src/components/ModuleRow', () => {
  const { Text: MockText } = require('react-native');
  return ({ title }: { title: string }) => (
    <MockText testID="checklist-row-title">{title}</MockText>
  );
});

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
});
