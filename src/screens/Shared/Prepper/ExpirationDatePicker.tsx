import React from 'react';
import { View } from 'react-native';
import { Text } from '../../../components/ScaledText';
import { useTheme } from '../../../hooks/useTheme';
import { inventoryFormStyles as styles } from '../../Inventory/inventoryFormStyles';
import { FormPickerButton } from './FormPickerButton';

const MONTHS = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
];

/** Menu value for "no month/year set". Menu ids are strings. */
const NONE = '';

const MONTH_OPTIONS = [
  { value: NONE, label: 'None' },
  ...MONTHS.map((m) => ({ value: String(m.value), label: m.label })),
];

interface ExpirationDatePickerProps {
  month: number | undefined;
  year: number | undefined;
  onMonthChange: (month: number | undefined) => void;
  onYearChange: (year: number | undefined) => void;
}

/**
 * Expiration date picker (month and year) for inventory forms.
 */
export function ExpirationDatePicker({
  month,
  year,
  onMonthChange,
  onYearChange,
}: ExpirationDatePickerProps): React.JSX.Element {
  const COLORS = useTheme();

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: NONE, label: 'None' },
    ...Array.from({ length: 2099 - currentYear + 1 }, (_, i) => {
      const y = String(currentYear + i);
      return { value: y, label: y };
    }),
  ];

  const monthLabel =
    MONTHS.find((m) => m.value === month)?.label ?? 'Select Month';

  return (
    <View style={styles.formGroup}>
      <Text style={[styles.label, { color: COLORS.PRIMARY_DARK }]}>
        Expiration Date (optional)
      </Text>
      <View style={styles.row}>
        <FormPickerButton
          title="Month"
          label={monthLabel}
          options={MONTH_OPTIONS}
          value={month ? String(month) : NONE}
          onSelect={(v) => onMonthChange(v === NONE ? undefined : Number(v))}
        />
        <FormPickerButton
          title="Year"
          label={year?.toString() || 'Select Year'}
          options={yearOptions}
          value={year ? String(year) : NONE}
          onSelect={(v) => onYearChange(v === NONE ? undefined : Number(v))}
        />
      </View>
    </View>
  );
}
