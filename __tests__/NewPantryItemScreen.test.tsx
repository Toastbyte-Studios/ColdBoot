/**
 * @format
 */

import React from 'react';
import { Alert, KeyboardAvoidingView, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import NewPantryItemScreen from '../src/screens/Pantry/NewPantryItemScreen';

const mockGoBack = jest.fn();
const mockCreateItem = jest.fn();
const mockStackScreen = jest.fn();

let mockRouteParams: {
  category: string;
  barcode?: string;
  quantity?: number;
} = { category: 'Dry Goods' };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('../src/stores', () => ({
  usePantryStore: () => ({
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
      quantity,
      onQuantityChange,
      onUnitChange,
    }: {
      quantity: string;
      onQuantityChange: (value: string) => void;
      onUnitChange: (value: string) => void;
    }) => (
      <>
        <MockTextInput
          testID="quantity-input"
          onChangeText={onQuantityChange}
          value={quantity}
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

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

describe('NewPantryItemScreen', () => {
  beforeEach(() => {
    mockRouteParams = { category: 'Dry Goods' };
    mockGoBack.mockReset();
    mockCreateItem.mockReset();
    mockStackScreen.mockReset();
  });

  it('uses StackScreen with the category subtitle and handled taps', () => {
    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<NewPantryItemScreen />);
    });

    expect(mockStackScreen).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: 'Add Pantry Item',
        subtitle: 'Dry Goods',
        keyboardShouldPersistTaps: 'handled',
      }),
    );
  });

  it('keeps the save action disabled until the item name has content', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<NewPantryItemScreen />);
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
      tree = ReactTestRenderer.create(<NewPantryItemScreen />);
    });

    expect(tree.root.findByType(KeyboardAvoidingView).props.testID).toBe(
      'pantry-item-form-keyboard',
    );
    expect(
      tree.root.findByProps({ testID: 'pantry-item-form-card' }),
    ).toBeTruthy();
  });

  describe('label details', () => {
    let alertSpy: jest.SpyInstance;

    beforeEach(() => {
      alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
      alertSpy.mockRestore();
    });

    function render() {
      let tree!: ReactTestRenderer.ReactTestRenderer;
      ReactTestRenderer.act(() => {
        tree = ReactTestRenderer.create(<NewPantryItemScreen />);
      });
      const type = (label: string, value: string) =>
        ReactTestRenderer.act(() => {
          tree.root
            .findByProps({ accessibilityLabel: label })
            .props.onChangeText(value);
        });
      const save = () =>
        ReactTestRenderer.act(async () => {
          await tree.root.findByProps({ testID: 'save-state' }).props.onPress();
        });
      return { tree, type, save };
    }

    it('shows the label detail fields', () => {
      const { tree } = render();
      expect(
        tree.root.findByProps({ testID: 'pantry-details-fields' }),
      ).toBeTruthy();
    });

    it('passes label details to the store', async () => {
      const { type, save } = render();
      type('Item name', 'Black Beans');
      type('Brand', 'Store brand');
      type('Barcode', '036000291452');
      type('Serving size', '1/2 cup');
      type('Calories per serving', '110');
      type('Servings per unit', '3,5');
      await save();

      expect(mockCreateItem).toHaveBeenCalledWith(
        'Black Beans',
        'Dry Goods',
        1,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          brand: 'Store brand',
          barcode: '036000291452',
          servingSize: '1/2 cup',
          caloriesPerServing: 110,
          servingsPerUnit: 3.5,
        },
      );
    });

    it('does not save when calories are not a number', async () => {
      const { type, save } = render();
      type('Item name', 'Black Beans');
      type('Calories per serving', 'lots');
      await save();

      expect(mockCreateItem).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'Error',
        'Calories per serving must be a number',
      );
    });
  });

  it('fills in the barcode and count from the scan screen', async () => {
    mockRouteParams = {
      category: 'Dry Goods',
      barcode: '4006381333931',
      quantity: 3,
    };
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<NewPantryItemScreen />);
    });

    expect(
      tree.root.findByProps({ accessibilityLabel: 'Barcode' }).props.value,
    ).toBe('4006381333931');
    expect(
      tree.root.findByProps({ testID: 'quantity-input' }).props.value,
    ).toBe('3');

    ReactTestRenderer.act(() => {
      tree.root
        .findByProps({ accessibilityLabel: 'Item name' })
        .props.onChangeText('Muesli');
    });
    await ReactTestRenderer.act(async () => {
      await tree.root.findByProps({ testID: 'save-state' }).props.onPress();
    });

    expect(mockCreateItem).toHaveBeenCalledWith(
      'Muesli',
      'Dry Goods',
      3,
      undefined,
      undefined,
      undefined,
      undefined,
      expect.objectContaining({ barcode: '4006381333931' }),
    );
    alertSpy.mockRestore();
  });
});
