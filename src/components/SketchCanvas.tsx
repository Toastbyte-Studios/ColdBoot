import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View, PanResponder } from 'react-native';
import SignatureCanvas, {
  SignatureViewRef,
} from 'react-native-signature-canvas';
import { useTheme } from '../hooks/useTheme';
import { INK, PAPER } from '../theme/fixedSurfaces';

interface SketchCanvasProps {
  onSketchSave: (dataUri: string) => void;
  initialSketch?: string;
  onClear?: () => void;
  onBegin?: () => void;
}

export interface SketchCanvasHandle {
  readSignature: () => void;
  clearSignature: () => void;
  undo: () => void;
}

/**
 * SketchCanvas component provides a drawing surface for creating sketch notes.
 *
 * Features:
 * - Drawing with touch input
 * - Clear/undo functionality via exposed methods
 * - Saves sketch as base64 data URI
 * - Prevents gesture navigation during drawing
 *
 * @remarks
 * The pad and pen colours are deliberately fixed rather than themed. A sketch
 * is saved as a base64 PNG with whatever pen and background were active when
 * it was drawn, so a theme-aware canvas would produce two incompatible kinds
 * of sketch: every one drawn in light mode would replay onto a dark pad, and
 * vice versa. The surrounding border is chrome, so it follows the scheme.
 *
 * @param onSketchSave - Callback invoked with base64 data URI when sketch is saved
 * @param initialSketch - Optional base64 data URI to load an existing sketch
 * @param onClear - Optional callback when clear button is pressed
 * @param onBegin - Optional callback when user starts drawing
 * @returns A React element rendering the sketch canvas
 */
const SketchCanvas = forwardRef<SketchCanvasHandle, SketchCanvasProps>(
  ({ onSketchSave, initialSketch, onClear, onBegin }, forwardedRef) => {
    const COLORS = useTheme();
    const ref = useRef<SignatureViewRef | null>(null);

    useImperativeHandle(forwardedRef, () => ({
      readSignature: () => {
        ref.current?.readSignature();
      },
      clearSignature: () => {
        ref.current?.clearSignature();
        if (onClear) {
          onClear();
        }
      },
      undo: () => {
        ref.current?.undo();
      },
    }));

    const handleOK = (signature: string) => {
      onSketchSave(signature);
    };

    const handleBegin = () => {
      if (onBegin) {
        onBegin();
      }
    };

    // PanResponder to capture all touch events and prevent gesture navigation
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    ).current;

    // Web style for the canvas
    const webStyle = `.m-signature-pad {
    box-shadow: none;
    border: none;
    background-color: ${PAPER};
  }
  .m-signature-pad--body {
    border: none;
  }
  .m-signature-pad--footer {
    display: none;
  }
  body,html {
    width: 100%;
    height: 100%;
  }`;

    return (
      <View
        style={[styles.container, { borderColor: COLORS.SECONDARY_ACCENT }]}
        collapsable={false}
        {...panResponder.panHandlers}
      >
        <SignatureCanvas
          ref={ref}
          onOK={handleOK}
          onBegin={handleBegin}
          descriptionText=""
          webStyle={webStyle}
          backgroundColor={PAPER}
          penColor={INK}
          dataURL={initialSketch}
          webviewContainerStyle={styles.webviewContainer}
          scrollable={false}
        />
      </View>
    );
  },
);

SketchCanvas.displayName = 'SketchCanvas';

export default SketchCanvas;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAPER,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  webviewContainer: {
    flex: 1,
  },
});
