/**
 * @format
 */

import React from 'react';
import { KeyboardAvoidingView, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import EditPantryItemScreen from '../src/screens/Pantry/EditPantryItemScreen';

const mockGoBack = jest.fn();
const mockDeleteItem = jest.fn();
const mockUpdateItem = jest.fn();
const mockStackScreen = jest.fn();

let mockItem:
  | {
      id: string;
      name: string;
      category: string;
      quantity: number;
      unit?: string;
      notes?: string;
      barcode?: string;
      caloriesPerServing?: number;
      servingsPerUnit?: number;
    }
  | undefined = {
  id: 'beans',
  name: 'Beans',
  category: 'Canned Goods',
  quantity: 4,
  unit: 'cans',
  notes: 'Rotate soon',
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockItem ? { item: mockItem } : {},
  }),
}));

jest.mock('../src/stores', () => ({
  usePantryStore: () => ({
    deleteItem: mockDeleteItem,
    updateItem: mockUpdateItem,
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
    FormButtonRow: ({ onSave }: { onSave: () => void }) => (
      <MockText testID="save-button" onPress={onSave}>
        Buttons
      </MockText>
    ),
    DeleteButton: () => <MockText>Delete</MockText>,
  };
});

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

describe('EditPantryItemScreen', () => {
  beforeEach(() => {
    mockGoBack.mockReset();
    mockDeleteItem.mockReset();
    mockUpdateItem.mockReset();
    mockStackScreen.mockReset();
    mockItem = {
      id: 'beans',
      name: 'Beans',
      category: 'Canned Goods',
      quantity: 4,
      unit: 'cans',
      notes: 'Rotate soon',
    };
  });

  it('uses StackScreen with the item category subtitle and form wrapper', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<EditPantryItemScreen />);
    });

    expect(mockStackScreen).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: 'Edit Item',
        subtitle: 'Canned Goods',
        keyboardShouldPersistTaps: 'handled',
      }),
    );
    expect(tree.root.findByType(KeyboardAvoidingView).props.testID).toBe(
      'pantry-item-form-keyboard',
    );
    expect(
      tree.root.findByProps({ testID: 'pantry-item-form-card' }),
    ).toBeTruthy();
  });

  it('shows the not-found state when the pantry item is missing', () => {
    mockItem = undefined;

    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<EditPantryItemScreen />);
    });

    const texts = tree.root.findAllByType(require('react-native').Text);
    expect(texts.map((node) => node.props.children)).toContain(
      'Item not found',
    );
    expect(() => tree.root.findByType(KeyboardAvoidingView)).toThrow();
  });

  it('prefills label details and saves changes to them', async () => {
    mockItem = {
      ...mockItem!,
      barcode: '0036000291452',
      caloriesPerServing: 110,
      servingsPerUnit: 3.5,
    };
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});

    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<EditPantryItemScreen />);
    });
    const field = (label: string) =>
      tree.root.findByProps({ accessibilityLabel: label });

    expect(field('Barcode').props.value).toBe('0036000291452');
    expect(field('Calories per serving').props.value).toBe('110');
    expect(field('Servings per unit').props.value).toBe('3.5');
    expect(field('Brand').props.value).toBe('');

    ReactTestRenderer.act(() => {
      field('Brand').props.onChangeText('Store brand');
      field('Calories per serving').props.onChangeText('');
    });
    await ReactTestRenderer.act(async () => {
      await tree.root.findByProps({ testID: 'save-button' }).props.onPress();
    });

    expect(mockUpdateItem).toHaveBeenCalledWith(
      'beans',
      expect.objectContaining({
        brand: 'Store brand',
        barcode: '0036000291452',
        caloriesPerServing: undefined,
        servingsPerUnit: 3.5,
      }),
    );
    alertSpy.mockRestore();
  });
});
