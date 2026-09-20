import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { JSX } from 'react';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';
import AppButton from '../../components/AppButton';
import { EntrySection } from '../../components/EntrySection';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import Touchable from '../../components/Touchable';
import { useTheme } from '../../hooks/useTheme';
import { Repeater } from '../../stores/RepeaterBookStore';
import { useRepeaterBookStore } from '../../stores/StoreContext';
import { SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../theme';
import { ColorScheme } from '../../theme/colors';

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

type RepeaterDetailRouteProp = RouteProp<
  { RepeaterDetail: { repeater: Repeater } },
  'RepeaterDetail'
>;

type DetailRow = { label: string; value: string };

/**
 * Displays full details for a single ham radio repeater from RepeaterBook.
 *
 * @returns {JSX.Element} The rendered repeater detail screen.
 */
export default function RepeaterDetailScreen(): JSX.Element {
  const COLORS = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RepeaterDetailRouteProp>();
  const store = useRepeaterBookStore();
  const { repeater } = route.params ?? {};

  if (!repeater) {
    return (
      <StackScreen title="Repeater not found">
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No repeater data available.
        </Text>
      </StackScreen>
    );
  }

  const isOnAir = repeater.operationalStatus === 'On-air';

  const rows: DetailRow[] = [
    { label: 'Frequency', value: `${repeater.frequency} MHz` },
    { label: 'Offset', value: repeater.offset || '—' },
    { label: 'PL / Tone', value: repeater.tone || '—' },
    { label: 'Mode', value: repeater.mode },
    { label: 'Use', value: repeater.use || '—' },
    { label: 'Status', value: repeater.operationalStatus || 'Unknown' },
    ...(repeater.emcomm
      ? [{ label: 'Emerg. Comms', value: repeater.emcomm }]
      : []),
    {
      label: 'Location',
      value: [repeater.city, repeater.state].filter(Boolean).join(', ') || '—',
    },
    { label: 'Distance', value: `${repeater.distance} miles` },
    {
      label: 'Coordinates',
      value:
        repeater.lat && repeater.lng
          ? `${repeater.lat.toFixed(4)}, ${repeater.lng.toFixed(4)}`
          : '—',
    },
    { label: 'Last Edited', value: repeater.lastEdited || '—' },
  ];

  return (
    <StackScreen
      title={`${repeater.frequency} MHz`}
      subtitle={`${repeater.callSign} · ${repeater.distance} miles away`}
    >
      <View style={styles.column}>
        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isOnAir
                ? COLORS.SUCCESS_LIGHT
                : COLORS.SURFACE_CONTAINER,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnAir ? COLORS.SUCCESS : COLORS.MUTED },
            ]}
          />
          <Text style={styles.statusText}>
            {repeater.operationalStatus || 'Status unknown'}
          </Text>
        </View>

        {/* Detail card */}
        <EntrySection title="Details">
          {rows.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.tableRow,
                i < rows.length - 1 && [
                  styles.divided,
                  {
                    borderBottomColor: isAndroid
                      ? COLORS.OUTLINE_VARIANT
                      : COLORS.SEPARATOR,
                  },
                ],
              ]}
            >
              <Text style={[styles.labelText, { color: COLORS.MUTED }]}>
                {row.label}
              </Text>
              <Text style={styles.valueText}>{row.value}</Text>
            </View>
          ))}
        </EntrySection>

        {/* Notes */}
        {repeater.notes ? (
          <EntrySection title="Notes">
            <Text style={styles.notesText}>{repeater.notes}</Text>
          </EntrySection>
        ) : null}

        {/* Custom repeater actions */}
        {repeater.isCustom && (
          <>
            <AppButton
              label="Edit Repeater"
              onPress={() =>
                navigation.navigate('AddCustomRepeater', { repeater })
              }
              accessibilityLabel="Edit this custom repeater"
              style={styles.actionButtonSpacing}
            />

            <AppButton
              label="Delete Repeater"
              onPress={() => {
                Alert.alert(
                  'Delete Repeater',
                  'Are you sure you want to delete this custom repeater?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await store.deleteCustomRepeater(repeater.id);
                          navigation.goBack();
                        } catch (error) {
                          console.error(
                            'Failed to delete custom repeater',
                            error,
                          );
                          Alert.alert(
                            'Error',
                            'Failed to delete this repeater. Please try again.',
                          );
                        }
                      },
                    },
                  ],
                );
              }}
              variant="destructive"
              icon="trash-outline"
              accessibilityLabel="Delete this custom repeater"
              style={styles.actionButtonSpacing}
            />
          </>
        )}

        {/* Data source disclaimer */}
        {!repeater.isCustom && (
          <Touchable
            style={styles.disclaimer}
            onPress={() => Linking.openURL('https://www.repeaterbook.com')}
            accessibilityRole="link"
            accessibilityLabel="Open RepeaterBook.com"
          >
            <Text
              style={[styles.disclaimerText, { color: COLORS.PRIMARY_DARK }]}
            >
              Data sourced from{' '}
              <Text style={styles.disclaimerLink}>RepeaterBook.com</Text>
            </Text>
          </Touchable>
        )}
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  column: {
    // StackScreen's Android content is full-bleed; cards carry the gutter.
    paddingHorizontal: isAndroid ? SCREEN_GUTTER : 0,
  },
  helperText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: isAndroid ? TEXT_GUTTER : 0,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: 999,
    marginBottom: SPACING.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  divided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelText: {
    fontSize: 13,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
  },
  actionButtonSpacing: {
    marginBottom: SPACING.md,
  },
  disclaimer: {
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 12,
  },
  disclaimerLink: {
    textDecorationLine: 'underline',
  },
});
