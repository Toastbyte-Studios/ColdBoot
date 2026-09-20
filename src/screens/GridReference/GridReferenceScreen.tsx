import Clipboard from '@react-native-clipboard/clipboard';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import AppButton from '../../components/AppButton';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import SegmentedControl from '../../components/SegmentedControl';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import {
  ddToMgrs,
  ddToDms,
  dmsToDd,
  mgrsToDD,
  parseDdString,
} from '../../utils/gridReference';

const isAndroid = Platform.OS === 'android';

type InputFormat = 'DD' | 'DMS' | 'MGRS';

const FORMAT_LABELS: Record<InputFormat, string> = {
  DD: 'Decimal Degrees',
  DMS: 'Deg Min Sec',
  MGRS: 'MGRS',
};

const FORMAT_OPTIONS = (Object.keys(FORMAT_LABELS) as InputFormat[]).map(
  (fmt) => ({ value: fmt, label: fmt }),
);

const FORMAT_PLACEHOLDERS: Record<InputFormat, string> = {
  DD: 'e.g. 36.1716, -115.1391',
  DMS: 'e.g. 36° 10\' 17.76" N, 115° 8\' 20.76" W',
  MGRS: 'e.g. 11S PA 67363 04586',
};

interface ConversionResults {
  dd: string;
  dms: string;
  mgrs: string;
}

function formatDD(lat: number, lng: number): string {
  return (
    `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ` +
    `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`
  );
}

function convertFromDD(ddStr: string): ConversionResults {
  const { lat, lng } = parseDdString(ddStr);
  return {
    dd: formatDD(lat, lng),
    dms: ddToDms(lat, lng).formatted,
    mgrs: ddToMgrs(lat, lng),
  };
}

function convertFromDMS(dmsStr: string): ConversionResults {
  const { lat, lng } = dmsToDd(dmsStr);
  return {
    dd: formatDD(lat, lng),
    dms: ddToDms(lat, lng).formatted,
    mgrs: ddToMgrs(lat, lng),
  };
}

function convertFromMGRS(mgrsStr: string): ConversionResults {
  const { lat, lng } = mgrsToDD(mgrsStr);
  return {
    dd: formatDD(lat, lng),
    dms: ddToDms(lat, lng).formatted,
    mgrs: ddToMgrs(lat, lng),
  };
}

/**
 * GridReferenceScreen
 *
 * Converts between Decimal Degrees (DD), Degrees Minutes Seconds (DMS),
 * and MGRS coordinate formats. Fully offline — pure math, no network calls.
 *
 * @returns A React element rendering the Grid Reference Converter UI.
 */
export default function GridReferenceScreen() {
  const COLORS = useTheme();

  const [inputFormat, setInputFormat] = useState<InputFormat>('DD');
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<ConversionResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending copy-indicator timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleConvert = (text: string, format: InputFormat) => {
    setInputText(text);
    setError(null);
    setResults(null);

    if (!text.trim()) return;

    try {
      let res: ConversionResults;
      if (format === 'DD') res = convertFromDD(text);
      else if (format === 'DMS') res = convertFromDMS(text);
      else res = convertFromMGRS(text);
      setResults(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid input';
      setError(msg);
    }
  };

  const handleFormatChange = (fmt: InputFormat) => {
    setInputFormat(fmt);
    setInputText('');
    setResults(null);
    setError(null);
  };

  const handleCopy = (key: string, value: string) => {
    Clipboard.setString(value);
    setCopiedKey(key);
    if (copyTimeoutRef.current !== null) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedKey(null);
      copyTimeoutRef.current = null;
    }, 1500);
  };

  const outputFormats: InputFormat[] = ['DD', 'DMS', 'MGRS'];

  return (
    <StackScreen
      title="Grid Reference"
      note="Converts a coordinate between decimal degrees, degrees-minutes-seconds and MGRS. All offline."
      keyboardShouldPersistTaps="handled"
    >
      {/* Format Selector */}
      <View style={styles.section}>
        <SectionEyebrow>Input Format</SectionEyebrow>
        <View style={styles.control}>
          <SegmentedControl
            options={FORMAT_OPTIONS}
            value={inputFormat}
            onChange={handleFormatChange}
            accessibilityLabel="Input format"
          />
        </View>
      </View>

      {/* Input Field */}
      <View style={styles.section}>
        <SectionEyebrow>{FORMAT_LABELS[inputFormat]}</SectionEyebrow>
        <TextInput
          style={[
            styles.input,
            cardSurface(COLORS),
            {
              color: COLORS.PRIMARY_DARK,
              // cardSurface draws no outline on Android, so an error state
              // has to bring its own.
              ...(error ? { borderWidth: 1, borderColor: COLORS.ERROR } : null),
            },
          ]}
          placeholder={FORMAT_PLACEHOLDERS[inputFormat]}
          placeholderTextColor={COLORS.MUTED}
          value={inputText}
          onChangeText={(text) => handleConvert(text, inputFormat)}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel={`${FORMAT_LABELS[inputFormat]} coordinate input`}
        />
        {error && (
          <Text
            style={[styles.errorText, { color: COLORS.ERROR }]}
            accessibilityRole="alert"
          >
            {error}
          </Text>
        )}
      </View>

      {/* Output Rows */}
      {results && (
        <View style={styles.section}>
          <SectionEyebrow>Converted Output</SectionEyebrow>
          {outputFormats.map((fmt) => {
            const value = results[fmt.toLowerCase() as keyof ConversionResults];
            const isCopied = copiedKey === fmt;
            return (
              <View key={fmt} style={[styles.outputRow, cardSurface(COLORS)]}>
                <View style={styles.outputLabelContainer}>
                  <Text style={[styles.outputLabel, { color: COLORS.MUTED }]}>
                    {FORMAT_LABELS[fmt]}
                  </Text>
                  <Text
                    style={[styles.outputValue, { color: COLORS.PRIMARY_DARK }]}
                    selectable
                  >
                    {value}
                  </Text>
                </View>
                <AppButton
                  label={isCopied ? 'Copied' : 'Copy'}
                  icon={isCopied ? 'checkmark-outline' : 'copy-outline'}
                  variant="tinted"
                  size="small"
                  onPress={() => handleCopy(fmt, value)}
                  accessibilityLabel={
                    isCopied
                      ? `${FORMAT_LABELS[fmt]} result copied`
                      : `Copy ${FORMAT_LABELS[fmt]} result`
                  }
                />
              </View>
            );
          })}
        </View>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  // StackScreen's Android content is full-bleed. The eyebrow brings its own
  // text gutter, so the gutter goes on the controls below it.
  section: {
    marginBottom: SPACING.lg,
  },
  control: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
  },
  input: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 15,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  errorText: {
    fontSize: 13,
    marginTop: SPACING.xs + 2,
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
  },
  outputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  outputLabelContainer: {
    flex: 1,
    paddingRight: 8,
  },
  outputLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  outputValue: {
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
});
