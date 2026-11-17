import React, { useCallback, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import {
  Camera,
  isScannedCode,
  ScannedObject,
  ScannedObjectType,
  useCameraPermission,
  useObjectOutput,
} from 'react-native-vision-camera';
import AppButton from '../../../components/AppButton';
import InfoBlock from '../../../components/InfoBlock';
import { SPACING } from '../../../theme';

/**
 * Retail product codes. iOS reports a UPC-A as an EAN-13 with a leading
 * zero, so `ean-13` covers both; `utils/barcode` evens out the spelling.
 * Module-level so the output isn't rebuilt on every render.
 */
const RETAIL_CODE_TYPES: ScannedObjectType[] = ['ean-13', 'ean-8', 'upc-e'];

type Props = {
  /** False while the screen is covered or the app is in the background. */
  isActive: boolean;
  /** Every decoded code in a camera report; called often while one is in view. */
  onCodes: (values: string[]) => void;
};

/**
 * The camera part of the Pantry scan screen: asks for camera access, then
 * shows the live preview and reports the codes it reads.
 *
 * Uses the platform's own code reader (AVFoundation on iOS) through
 * VisionCamera's object output, so it needs no network and no extra
 * machine-learning library. That output is iOS-only in VisionCamera 5:
 * render this only on iOS. Android will need the ML Kit barcode plugin.
 */
export function PantryScanCamera({ isActive, onCodes }: Props) {
  const { status, requestPermission } = useCameraPermission();
  const [error, setError] = useState<string | null>(null);

  if (status === 'not-determined') {
    return (
      <View style={styles.message} testID="scan-permission-request">
        <InfoBlock inline title="Camera access">
          ColdBoot reads barcodes with the camera, on this phone. Nothing is
          recorded or sent anywhere.
        </InfoBlock>
        <AppButton
          label="Allow camera"
          icon="camera-outline"
          onPress={() => {
            requestPermission().catch(() => undefined);
          }}
        />
      </View>
    );
  }

  if (status !== 'authorized') {
    return (
      <View style={styles.message} testID="scan-permission-denied">
        <InfoBlock inline tone="caution" title="Camera is off for ColdBoot">
          Turn on Camera for ColdBoot in Settings to scan barcodes. You can
          still add items by hand.
        </InfoBlock>
        <AppButton
          label="Open Settings"
          variant="tinted"
          icon="settings-outline"
          onPress={() => {
            Linking.openSettings().catch(() => undefined);
          }}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.message} testID="scan-camera-error">
        <InfoBlock inline tone="caution" title="The camera stopped">
          {error}
        </InfoBlock>
        <AppButton
          label="Try again"
          variant="tinted"
          icon="refresh-outline"
          onPress={() => setError(null)}
        />
      </View>
    );
  }

  return (
    <LiveCamera
      isActive={isActive}
      onCodes={onCodes}
      onError={(cameraError) => setError(cameraError.message)}
    />
  );
}

/**
 * The preview and code reader. A separate component so the object output is
 * only created once camera access is granted.
 */
function LiveCamera({
  isActive,
  onCodes,
  onError,
}: Props & { onError: (error: Error) => void }) {
  const handleObjects = useCallback(
    (objects: ScannedObject[]) => {
      const values: string[] = [];
      for (const object of objects) {
        if (isScannedCode(object) && object.value) {
          values.push(object.value);
        }
      }
      if (values.length > 0) onCodes(values);
    },
    [onCodes],
  );

  const output = useObjectOutput({
    types: RETAIL_CODE_TYPES,
    onObjectsScanned: handleObjects,
  });

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device="back"
      isActive={isActive}
      outputs={[output]}
      onError={onError}
      enableNativeTapToFocusGesture
    />
  );
}

const styles = StyleSheet.create({
  message: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
});
