import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp, useRoute } from '@react-navigation/native';
import React, { JSX, useCallback, useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import AppButton from '../../components/AppButton';
import { EntrySection } from '../../components/EntrySection';
import IconButton from '../../components/IconButton';
import { Text } from '../../components/ScaledText';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { RADIUS, SCREEN_GUTTER, SPACING, TEXT_GUTTER } from '../../theme';
import { ColorScheme } from '../../theme/colors';

const isAndroid = Platform.OS === 'android';

/** Muted text on the bare screen ground — see `MUTED_ON_GROUND`. */
const groundInk = (colors: ColorScheme) =>
  isAndroid ? colors.MUTED : colors.MUTED_ON_GROUND;

type Channel = {
  name: string;
  frequency: string;
  mode: string;
  notes?: string;
};

type FrequencyData = {
  id: string;
  title: string;
  requiresLicense: boolean;
  licenseInfo: string;
  description: string;
  channels: Channel[];
};

type RadioFrequencyDetailScreenRouteProp = RouteProp<
  { RadioFrequencyDetail: { frequencyData: FrequencyData } },
  'RadioFrequencyDetail'
>;

/**
 * Displays detailed information about a specific radio frequency type.
 *
 * Shows a list of national channels/frequencies in an easy-to-read table format,
 * includes licensing information and disclaimers, and is fully dark mode compliant.
 *
 * @component
 * @returns {JSX.Element} The rendered radio frequency detail screen.
 */
export default function RadioFrequencyDetailScreen(): JSX.Element {
  const route = useRoute<RadioFrequencyDetailScreenRouteProp>();
  const COLORS = useTheme();
  const { frequencyData } = route.params || {};
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);

  const disclaimerKey = frequencyData?.requiresLicense
    ? `@radiofrequency/${frequencyData.id}_disclaimer_dismissed`
    : null;

  useEffect(() => {
    if (!disclaimerKey) return;

    let isMounted = true;

    AsyncStorage.getItem(disclaimerKey)
      .then((value) => {
        if (!isMounted) {
          return;
        }
        if (value !== 'true') {
          setDisclaimerVisible(true);
        }
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setDisclaimerVisible(true);
      });

    return () => {
      isMounted = false;
    };
  }, [disclaimerKey]);

  const handleDismissDisclaimer = useCallback(() => {
    if (disclaimerKey) {
      AsyncStorage.setItem(disclaimerKey, 'true').catch(() => {});
    }
    setDisclaimerVisible(false);
  }, [disclaimerKey]);

  if (!frequencyData) {
    return (
      <StackScreen title="Frequency not found">
        <Text style={[styles.helperText, { color: groundInk(COLORS) }]}>
          No data available for this frequency type.
        </Text>
      </StackScreen>
    );
  }

  return (
    <StackScreen
      title={frequencyData.title}
      subtitle={`${frequencyData.channels.length} channels · ${
        frequencyData.requiresLicense ? 'Licence required' : 'Licence-free'
      }`}
      trailing={
        <IconButton
          name="information-circle-outline"
          size={22}
          color={frequencyData.requiresLicense ? COLORS.ERROR : COLORS.SUCCESS}
          onPress={() => setDisclaimerVisible(true)}
          accessibilityLabel="View license information"
        />
      }
    >
      <View style={styles.column}>
        {/* Description */}
        <EntrySection title="About">
          <Text style={styles.cardBody}>{frequencyData.description}</Text>
        </EntrySection>

        {/* Frequency Table */}
        <EntrySection title="National frequencies">
          {/* Table Header */}
          <View
            style={[
              styles.tableHeader,
              {
                borderBottomColor: isAndroid
                  ? COLORS.OUTLINE_VARIANT
                  : COLORS.SEPARATOR,
              },
            ]}
          >
            <View style={styles.tableCell}>
              <Text style={[styles.headerText, { color: COLORS.MUTED }]}>
                Channel
              </Text>
            </View>
            <View style={styles.tableCell}>
              <Text style={[styles.headerText, { color: COLORS.MUTED }]}>
                Frequency
              </Text>
            </View>
            <View style={styles.tableCell}>
              <Text style={[styles.headerText, { color: COLORS.MUTED }]}>
                Mode
              </Text>
            </View>
          </View>

          {/* Table Rows */}
          {frequencyData.channels.map((channel, index) => (
            <View
              key={index}
              style={[
                index < frequencyData.channels.length - 1 && [
                  styles.divided,
                  {
                    borderBottomColor: isAndroid
                      ? COLORS.OUTLINE_VARIANT
                      : COLORS.SEPARATOR,
                  },
                ],
              ]}
            >
              <View style={styles.tableRow}>
                <View style={styles.tableCell}>
                  <Text style={styles.cellText}>{channel.name}</Text>
                </View>
                <View style={styles.tableCell}>
                  <Text style={[styles.cellText, styles.frequencyText]}>
                    {channel.frequency}
                  </Text>
                </View>
                <View style={styles.tableCell}>
                  <Text style={styles.cellText}>{channel.mode}</Text>
                </View>
              </View>
              {channel.notes && (
                <Text style={[styles.notesText, { color: COLORS.MUTED }]}>
                  {channel.notes}
                </Text>
              )}
            </View>
          ))}
        </EntrySection>
      </View>

      {/* License disclaimer modal */}
      <Modal
        visible={disclaimerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: COLORS.SURFACE,
                borderColor: COLORS.BORDER,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: COLORS.PRIMARY_DARK }]}>
              {frequencyData.title} License Information
            </Text>
            <View
              style={[
                styles.licenseCard,
                {
                  backgroundColor: frequencyData.requiresLicense
                    ? COLORS.ERROR_LIGHT
                    : COLORS.SUCCESS_LIGHT,
                  borderColor: frequencyData.requiresLicense
                    ? COLORS.ERROR
                    : COLORS.SUCCESS,
                },
              ]}
            >
              <Text
                style={[styles.licenseText, { color: COLORS.PRIMARY_DARK }]}
              >
                {frequencyData.licenseInfo}
              </Text>
            </View>
            <AppButton
              label="Understood"
              onPress={handleDismissDisclaimer}
              accessibilityLabel="Dismiss license information"
              style={styles.modalDismissButton}
            />
          </View>
        </View>
      </Modal>
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
  cardBody: {
    fontSize: 16,
    lineHeight: 23,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: SPACING.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
  },
  divided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableCell: {
    flex: 1,
    paddingRight: SPACING.xs,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 14,
  },
  frequencyText: {
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  notesText: {
    fontSize: 12,
    lineHeight: 17,
    paddingBottom: SPACING.sm,
  },
  licenseCard: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  licenseText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: SPACING.lg,
  },
  modalSheet: {
    width: '100%',
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  modalDismissButton: {
    marginTop: SPACING.xs,
  },
});
