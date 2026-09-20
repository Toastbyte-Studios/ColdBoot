/**
 * @format
 */

import React from 'react';
import { KeyboardAvoidingView, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import NewInventoryItemScreen from '../src/screens/Inventory/NewInventoryItemScreen';

const mockGoBack = jest.fn();
const mockCreateItem = jest.fn();
const mockStackScreen = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: { category: 'Dry Goods' },
  }),
}));

jest.mock('../src/stores', () => ({
  useInventoryStore: () => ({
    categories: ['Dry Goods'],
    createItem: mockCreateItem,
  }),
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

jest.mock('../src/components/StackScreen', () => {
  const { View: MockView, Text: MockText } = require('react-native');
  return (props: {
    title: string;
    subtitle?: string;
    keyboardShouldPersistTaps?: string;
    children: React.ReactNode;
  }) => {
    mockStackScreen(props);
    return (
      <MockView>
        <MockText>{props.title}</MockText>
        {props.subtitle ? <MockText>{props.subtitle}</MockText> : null}
        {props.children}
      </MockView>
    );
  };
});

jest.mock('../src/screens/Shared/Prepper', () => {
  const { TextInput: MockTextInput, Text: MockText } = require('react-native');
  return {
    FormInput: (props: React.ComponentProps<typeof TextInput>) => (
      <MockTextInput {...props} />
    ),
    FormTextArea: (props: React.ComponentProps<typeof TextInput>) => (
      <MockTextInput {...props} />
    ),
    QuantityUnitRow: ({
      onQuantityChange,
      onUnitChange,
    }: {
      onQuantityChange: (value: string) => void;
      onUnitChange: (value: string) => void;
    }) => (
      <>
        <MockTextInput
          testID="quantity-input"
          onChangeText={onQuantityChange}
          value="1"
        />
        <MockTextInput testID="unit-input" onChangeText={onUnitChange} />
      </>
    ),
    ExpirationDatePicker: () => <MockText>Expiration</MockText>,
    FormButtonRow: ({
      onSave,
      saveDisabled,
    }: {
      onSave: () => void;
      saveDisabled?: boolean;
    }) => (
      <MockText testID="save-state" onPress={onSave}>
        {saveDisabled ? 'disabled' : 'enabled'}
      </MockText>
    ),
  };
});

describe('NewInventoryItemScreen', () => {
  beforeEach(() => {
    mockGoBack.mockReset();
    mockCreateItem.mockReset();
    mockStackScreen.mockReset();
  });

  it('uses StackScreen with the category subtitle and handled taps', () => {
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<NewInventoryItemScreen />);
    });

    expect(mockStackScreen).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: 'Add Inventory Item',
        subtitle: 'Dry Goods',
        keyboardShouldPersistTaps: 'handled',
      }),
    );
  });

  it('keeps the save action disabled until the item name has content', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<NewInventoryItemScreen />);
    });

    const [nameInput] = tree.root.findAllByType(TextInput);
    const saveState = () => tree.root.findByProps({ testID: 'save-state' });

    expect(saveState().props.children).toBe('disabled');

    ReactTestRenderer.act(() => {
      nameInput.props.onChangeText('Rice');
    });

    expect(saveState().props.children).toBe('enabled');
  });

  it('renders the keyboard-avoiding form card wrapper', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<NewInventoryItemScreen />);
    });

    expect(tree.root.findByType(KeyboardAvoidingView).props.testID).toBe(
      'inventory-item-form-keyboard',
    );
    expect(
      tree.root.findByProps({ testID: 'inventory-item-form-card' }),
    ).toBeTruthy();
  });
});
