import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import AppButton from '../../../../components/AppButton';
import Touchable from '../../../../components/Touchable';
import { useTheme } from '../../../../hooks/useTheme';

type AddMode = 'location' | 'manual';

interface AddWaypointFormProps {
  hasLocation: boolean;
  onAddFromLocation: (name: string) => void;
  onAddManual: (name: string, latitude: number, longitude: number) => void;
  onCancel: () => void;
}

export default function AddWaypointForm({
  hasLocation,
  onAddFromLocation,
  onAddManual,
  onCancel,
}: AddWaypointFormProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [mode, setMode] = useState<AddMode>('location');
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a name.');
      return;
    }
    if (mode === 'location') {
      if (!hasLocation) {
        setError('GPS location not available yet.');
        return;
      }
      onAddFromLocation(trimmedName);
    } else {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        setError('Latitude must be between -90 and 90.');
        return;
      }
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        setError('Longitude must be between -180 and 180.');
        return;
      }
      onAddManual(trimmedName, latNum, lngNum);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Add Waypoint</Text>

      {/* Mode toggle. See docs/NATIVE_REDESIGN.md — this is a segmented
          control, and wants to be a real one. */}
      <View style={styles.modeRow}>
        <Touchable
          style={[styles.modeBtn, mode === 'location' && styles.modeBtnActive]}
          onPress={() => setMode('location')}
          accessibilityLabel="Add from current location"
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'location' }}
        >
          <Text
            style={[
              styles.modeBtnText,
              mode === 'location' && styles.modeBtnTextActive,
            ]}
          >
            Current Location
          </Text>
        </Touchable>
        <Touchable
          style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
          onPress={() => setMode('manual')}
          accessibilityLabel="Enter coordinates manually"
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'manual' }}
        >
          <Text
            style={[
              styles.modeBtnText,
              mode === 'manual' && styles.modeBtnTextActive,
            ]}
          >
            Manual Entry
          </Text>
        </Touchable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor={COLORS.SECONDARY_ACCENT}
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(null);
        }}
        accessibilityLabel="Waypoint name"
      />

      {mode === 'manual' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Latitude (e.g. 37.7749)"
            placeholderTextColor={COLORS.SECONDARY_ACCENT}
            value={lat}
            onChangeText={(t) => {
              setLat(t);
              setError(null);
            }}
            keyboardType="decimal-pad"
            accessibilityLabel="Latitude"
          />
          <TextInput
            style={styles.input}
            placeholder="Longitude (e.g. -122.4194)"
            placeholderTextColor={COLORS.SECONDARY_ACCENT}
            value={lng}
            onChangeText={(t) => {
              setLng(t);
              setError(null);
            }}
            keyboardType="decimal-pad"
            accessibilityLabel="Longitude"
          />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.formActions}>
        <AppButton
          label="Cancel"
          onPress={onCancel}
          variant="tinted"
          accessibilityLabel="Cancel adding waypoint"
          style={styles.actionBtnFlex}
        />
        <AppButton
          label="Save"
          onPress={handleSubmit}
          accessibilityLabel="Save waypoint"
          style={styles.actionBtnFlex}
        />
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    form: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    formTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.PRIMARY_DARK,
      marginBottom: 12,
    },
    modeRow: {
      flexDirection: 'row',
      marginBottom: 12,
      gap: 8,
    },
    modeBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.SECONDARY_ACCENT,
      alignItems: 'center',
    },
    modeBtnActive: {
      backgroundColor: colors.SECONDARY_ACCENT,
    },
    modeBtnText: {
      fontSize: 13,
      color: colors.SECONDARY_ACCENT,
    },
    modeBtnTextActive: {
      color: colors.PRIMARY_LIGHT,
      fontWeight: '600',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.SECONDARY_ACCENT,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 10,
      fontSize: 14,
      color: colors.PRIMARY_DARK,
      backgroundColor: colors.BACKGROUND,
    },
    error: {
      color: colors.ERROR,
      fontSize: 13,
      marginBottom: 8,
    },
    formActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    actionBtnFlex: {
      flex: 1,
    },
  });
}
