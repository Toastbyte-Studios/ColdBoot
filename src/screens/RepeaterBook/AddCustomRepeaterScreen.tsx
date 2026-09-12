import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import React, { JSX, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Text } from '../../components/ScaledText';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import SelectMenu from '../../components/SelectMenu';
import { useFooterClearance } from '../../hooks/useFooterClearance';
import { useTheme } from '../../hooks/useTheme';
import { Repeater } from '../../stores/RepeaterBookStore';
import { useRepeaterBookStore } from '../../stores/StoreContext';
import { FOOTER_HEIGHT } from '../../theme';
import { ColorScheme } from '../../theme/colors';
import { FormButtonRow, FormInput, FormTextArea } from '../Shared/Prepper';

type AddCustomRepeaterRouteProp = RouteProp<
  { AddCustomRepeater: { repeater?: Repeater } },
  'AddCustomRepeater'
>;

const MODES = ['FM', 'DMR', 'D-STAR', 'Fusion', 'P-25', 'NXDN', 'M17', 'TETRA'];
const STATUSES = ['On-air', 'Off-air', 'Unknown'];

const MODE_OPTIONS = MODES.map((m) => ({ value: m, label: m }));
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s }));

/**
 * Screen for adding or editing a user-created custom repeater entry.
 *
 * When a `repeater` param is provided the form is pre-populated for editing.
 *
 * @returns {JSX.Element} The rendered form screen.
 */
const AddCustomRepeaterScreen = observer((): JSX.Element => {
  const COLORS = useTheme();
  const footerClearance = useFooterClearance();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const navigation = useNavigation();
  const route = useRoute<AddCustomRepeaterRouteProp>();
  const store = useRepeaterBookStore();

  const existing: Repeater | undefined = route.params?.repeater;
  const isEditing = Boolean(existing);

  const [frequency, setFrequency] = useState(existing?.frequency ?? '');
  const [offset, setOffset] = useState(existing?.offset ?? '');
  const [tone, setTone] = useState(existing?.tone ?? '');
  const [mode, setMode] = useState(existing?.mode ?? 'FM');
  const [city, setCity] = useState(existing?.city ?? '');
  const [callSign, setCallSign] = useState(existing?.callSign ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [emcomm, setEmcomm] = useState(existing?.emcomm ?? '');
  const [isEmcomm, setIsEmcomm] = useState(Boolean(existing?.emcomm));
  const [operationalStatus, setOperationalStatus] = useState(
    existing?.operationalStatus ?? 'On-air',
  );

  const isValid =
    frequency.trim() !== '' &&
    offset.trim() !== '' &&
    tone.trim() !== '' &&
    city.trim() !== '';

  const handleSave = async () => {
    if (!isValid) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    try {
      const data = {
        frequency: frequency.trim(),
        offset: offset.trim(),
        tone: tone.trim(),
        mode,
        city: city.trim(),
        callSign: callSign.trim(),
        notes: notes.trim(),
        operationalStatus,
        emcomm: isEmcomm ? emcomm.trim() || 'Yes' : '',
      };

      if (isEditing && existing) {
        await store.updateCustomRepeater(existing.id, data);
      } else {
        await store.addCustomRepeater(data);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save repeater. Please try again.');
    }
  };

  return (
    <ScreenBody>
      <SectionHeader>
        {isEditing ? 'Edit Repeater' : 'Add Repeater'}
      </SectionHeader>

      <View style={[styles.container, { paddingBottom: footerClearance }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Required fields header */}
          <Text style={[styles.sectionLabel, { color: COLORS.PRIMARY_DARK }]}>
            Required
          </Text>

          <FormInput
            label="Frequency (MHz) *"
            placeholder="e.g. 146.520"
            value={frequency}
            onChangeText={setFrequency}
            keyboardType="decimal-pad"
            accessibilityLabel="Frequency"
          />

          <FormInput
            label="Offset *"
            placeholder="e.g. -0.600 or +0.600"
            value={offset}
            onChangeText={setOffset}
            keyboardType="default"
            accessibilityLabel="Offset"
          />

          <FormInput
            label="PL / Tone *"
            placeholder="e.g. 100.0 or DCS023"
            value={tone}
            onChangeText={setTone}
            accessibilityLabel="PL Tone"
          />

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: COLORS.PRIMARY_DARK }]}>
              Mode *
            </Text>
            <SelectMenu
              title="Mode"
              options={MODE_OPTIONS}
              value={mode}
              onSelect={setMode}
              accessibilityLabel={`Mode: ${mode}`}
            >
              <View style={styles.pickerField}>
                <Text
                  style={[styles.pickerText, { color: COLORS.PRIMARY_DARK }]}
                >
                  {mode}
                </Text>
                <Ionicons
                  name="chevron-down-outline"
                  size={16}
                  color={COLORS.PRIMARY_DARK}
                />
              </View>
            </SelectMenu>
          </View>

          <FormInput
            label="City / Location *"
            placeholder="e.g. Tampa"
            value={city}
            onChangeText={setCity}
            accessibilityLabel="City or location"
          />

          {/* Optional fields header */}
          <Text
            style={[
              styles.sectionLabel,
              styles.sectionLabelOptional,
              { color: COLORS.PRIMARY_DARK },
            ]}
          >
            Optional
          </Text>

          <FormInput
            label="Call Sign"
            placeholder="e.g. W4TST"
            value={callSign}
            onChangeText={setCallSign}
            autoCapitalize="characters"
            accessibilityLabel="Call sign"
          />

          {/* Emergency Comms toggle */}
          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelGroup}>
                <View style={styles.labelRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color={COLORS.ERROR}
                  />
                  <Text
                    style={[
                      styles.label,
                      styles.labelInline,
                      { color: COLORS.PRIMARY_DARK },
                    ]}
                  >
                    Emergency Comms
                  </Text>
                </View>
                <Text
                  style={[
                    styles.switchSubLabel,
                    { color: COLORS.PRIMARY_DARK },
                  ]}
                >
                  Mark as ARES / RACES / SKYWARN / etc.
                </Text>
              </View>
              <Switch
                value={isEmcomm}
                onValueChange={(v) => {
                  setIsEmcomm(v);
                  if (!v) setEmcomm('');
                }}
                trackColor={{ false: COLORS.BRAND, true: COLORS.ERROR }}
                thumbColor={COLORS.PRIMARY_LIGHT}
                accessibilityLabel="Mark as emergency communications repeater"
                accessibilityRole="switch"
              />
            </View>
            {isEmcomm && (
              <FormInput
                label="Group / Affiliation (optional)"
                placeholder="e.g. ARES, SKYWARN"
                value={emcomm}
                onChangeText={setEmcomm}
                containerStyle={styles.emcommInput}
                accessibilityLabel="Emergency communications group or affiliation"
              />
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: COLORS.PRIMARY_DARK }]}>
              Operational Status
            </Text>
            <SelectMenu
              title="Operational Status"
              options={STATUS_OPTIONS}
              value={operationalStatus}
              onSelect={setOperationalStatus}
              accessibilityLabel={`Operational status: ${operationalStatus}`}
            >
              <View style={styles.pickerField}>
                <Text
                  style={[styles.pickerText, { color: COLORS.PRIMARY_DARK }]}
                >
                  {operationalStatus}
                </Text>
                <Ionicons
                  name="chevron-down-outline"
                  size={16}
                  color={COLORS.PRIMARY_DARK}
                />
              </View>
            </SelectMenu>
          </View>

          <FormTextArea
            label="Notes"
            placeholder="Additional notes..."
            value={notes}
            onChangeText={setNotes}
            accessibilityLabel="Notes"
          />

          <FormButtonRow
            onCancel={() => navigation.goBack()}
            onSave={handleSave}
            saveDisabled={!isValid}
            saveLabel={isEditing ? 'Save Changes' : 'Add Repeater'}
          />
        </ScrollView>
      </View>
    </ScreenBody>
  );
});

export default AddCustomRepeaterScreen;

// Re-export route param type for AppNavigator
export type AddCustomRepeaterScreenParams = { repeater: Repeater } | undefined;

const createStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
      paddingBottom: FOOTER_HEIGHT,
    },
    scrollView: {
      flex: 1,
      width: '100%',
    },
    scrollContent: {
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 24,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 12,
      marginTop: 4,
    },
    sectionLabelOptional: {
      marginTop: 16,
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    labelInline: {
      marginBottom: 0,
    },
    // The menu trigger. A plain View, not a Touchable: SelectMenu owns the tap.
    pickerField: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: COLORS.PRIMARY_LIGHT,
      borderColor: COLORS.SECONDARY_ACCENT,
    },
    pickerText: {
      fontSize: 16,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    switchLabelGroup: {
      flex: 1,
      marginRight: 12,
    },
    switchSubLabel: {
      fontSize: 12,
      opacity: 0.6,
      marginTop: 2,
    },
    emcommInput: {
      marginBottom: 0,
    },
  });
