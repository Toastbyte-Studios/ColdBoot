/**
 * @format
 */

import React from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import NewChecklistScreen from '../src/screens/Checklist/NewChecklistScreen';

const mockCreateChecklist = jest.fn();
const mockReplace = jest.fn();
const mockAppButton = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

jest.mock('../src/stores', () => ({
  useChecklistStore: () => ({
    createChecklist: mockCreateChecklist,
  }),
}));

jest.mock('../src/components/StackScreen', () => {
  const { View: MockView, Text: MockText } = require('react-native');
  return ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <MockView>
      <MockText>{title}</MockText>
      {children}
    </MockView>
  );
});

jest.mock('../src/screens/Shared/Prepper', () => {
  const { TextInput: MockTextInput } = require('react-native');
  return {
    FormInput: (props: React.ComponentProps<typeof TextInput>) => (
      <MockTextInput {...props} />
    ),
  };
});

jest.mock('../src/components/AppButton', () => {
  const { Text: MockText } = require('react-native');
  return ({
    label,
    onPress,
    disabled,
    loading,
  }: {
    label: string;
    onPress: () => void;
    disabled: boolean;
    loading?: boolean;
  }) => (
    <>
      {mockAppButton({ label, onPress, disabled, loading })}
      <MockText>{label}</MockText>
    </>
  );
});

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

function renderScreen() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<NewChecklistScreen />);
  });
  return tree;
}

describe('NewChecklistScreen', () => {
  beforeEach(() => {
    mockCreateChecklist.mockReset();
    mockReplace.mockReset();
    mockAppButton.mockReset();
  });

  it('disables create until name has non-whitespace content', () => {
    const tree = renderScreen();
    const input = tree.root.findByType(TextInput);
    expect(mockAppButton).toHaveBeenLastCalledWith(
      expect.objectContaining({ disabled: true }),
    );

    ReactTestRenderer.act(() => {
      input.props.onChangeText('  Winter car kit  ');
    });

    expect(mockAppButton).toHaveBeenLastCalledWith(
      expect.objectContaining({ disabled: false }),
    );
  });

  it('shows inline duplicate-name error from the store', async () => {
    mockCreateChecklist.mockRejectedValueOnce(
      new Error('A checklist named "bug-out BAG" already exists'),
    );
    const tree = renderScreen();
    const input = tree.root.findByType(TextInput);

    ReactTestRenderer.act(() => {
      input.props.onChangeText('  bug-out BAG  ');
    });

    await ReactTestRenderer.act(async () => {
      const buttonProps = mockAppButton.mock.calls.at(-1)?.[0];
      buttonProps?.onPress();
    });

    const textNodes = tree.root.findAllByType(require('react-native').Text);
    expect(textNodes.map((node) => node.props.children)).toContain(
      'A checklist named "bug-out BAG" already exists',
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
