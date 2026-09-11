import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import IconButton from '../../../../components/IconButton';
import { useTheme } from '../../../../hooks/useTheme';

type Props = {
  onPress: () => void;
  permissionGranted: boolean;
};

/**
 * On-map button that opens the offline download confirmation flow.
 * Rendered inside MapPanel alongside the existing waypoints/record/locate buttons.
 * Disabled (with tooltip) when location permission is not granted.
 */
export default function DownloadAreaButton({
  onPress,
  permissionGranted,
}: Props) {
  const COLORS = useTheme();

  return (
    <IconButton
      name="download-outline"
      size={22}
      color={COLORS.PRIMARY_LIGHT}
      onPress={() => {
        if (!permissionGranted) {
          Alert.alert(
            'Permission Required',
            'Location permission is required to download an offline map.',
          );
          return;
        }

        onPress();
      }}
      accessibilityLabel={
        permissionGranted
          ? 'Download your area'
          : 'Download your area unavailable — shows location requirement'
      }
      accessibilityHint={
        permissionGranted
          ? 'Downloads an offline map centred on your current location'
          : 'Shows a message explaining that location permission is required before downloading an offline map'
      }
      style={[
        styles.button,
        { backgroundColor: COLORS.SECONDARY_ACCENT },
        !permissionGranted && styles.buttonDisabled,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
