import React from 'react';
import { StyleSheet, View } from 'react-native';
import SectionEyebrow from '../../components/SectionEyebrow';
import { FormInput } from '../Shared/Prepper';
import type { PantryDetailsDraft } from './pantryDetailsDraft';

type Props = {
  draft: PantryDetailsDraft;
  /**
   * One field changed. Takes the key rather than a whole new draft so the
   * screen can apply it with a functional update: two changes in the same
   * render (autofill, a fast typist) must not overwrite each other.
   */
  onChangeField: (key: keyof PantryDetailsDraft, value: string) => void;
};

/**
 * The optional label facts on the pantry form: brand, barcode, serving size
 * and calories. "Unit" is one of whatever `quantity` counts (one can, one
 * bag). Calories per serving and servings per unit are what a
 * calorie-based supply estimate needs; the barcode lets a later scan find
 * the item again.
 */
export function PantryDetailsFields({ draft, onChangeField }: Props) {
  const set =
    (key: keyof PantryDetailsDraft) =>
    (value: string): void =>
      onChangeField(key, value);

  return (
    <View testID="pantry-details-fields">
      <SectionEyebrow inline>Label details (optional)</SectionEyebrow>

      <FormInput
        label="Brand"
        placeholder="e.g. Store brand"
        value={draft.brand}
        onChangeText={set('brand')}
        accessibilityLabel="Brand"
      />

      <FormInput
        label="Barcode"
        placeholder="UPC or EAN number"
        value={draft.barcode}
        onChangeText={set('barcode')}
        keyboardType="number-pad"
        accessibilityLabel="Barcode"
      />

      <FormInput
        label="Serving size"
        placeholder="e.g. 1/2 cup (130 g)"
        value={draft.servingSize}
        onChangeText={set('servingSize')}
        accessibilityLabel="Serving size"
      />

      <View style={styles.row}>
        <FormInput
          label="Calories / serving"
          placeholder="e.g. 110"
          value={draft.caloriesPerServing}
          onChangeText={set('caloriesPerServing')}
          keyboardType="decimal-pad"
          accessibilityLabel="Calories per serving"
          containerStyle={styles.half}
        />
        <FormInput
          label="Servings / unit"
          placeholder="e.g. 3.5"
          value={draft.servingsPerUnit}
          onChangeText={set('servingsPerUnit')}
          keyboardType="decimal-pad"
          accessibilityLabel="Servings per unit"
          containerStyle={styles.half}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
});
