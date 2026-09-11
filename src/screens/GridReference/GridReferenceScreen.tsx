import Clipboard from '@react-native-clipboard/clipboard';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import AppButton from '../../components/AppButton';
import { Text } from '../../components/ScaledText';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import SegmentedControl from '../../components/SegmentedControl';
import { useTheme } from '../../hooks/useTheme';
import { FOOTER_HEIGHT } from '../../theme';
import {
  ddToMgrs,
  ddToDms,
  dmsToDd,
  mgrsToDD,
  parseDdString,
} from '../../utils/gridReference';

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
    <ScreenBody>
      <SectionHeader>Grid Reference</SectionHeader>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Format Selector */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: COLORS.PRIMARY_DARK }]}>
            Input Format
          </Text>
          <SegmentedControl
            options={FORMAT_OPTIONS}
            value={inputFormat}
            onChange={handleFormatChange}
            accessibilityLabel="Input format"
          />
        </View>

        {/* Input Field */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: COLORS.PRIMARY_DARK }]}>
            {FORMAT_LABELS[inputFormat]}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: error ? COLORS.ERROR : COLORS.SECONDARY_ACCENT,
                color: COLORS.PRIMARY_DARK,
                backgroundColor: COLORS.PRIMARY_LIGHT,
              },
            ]}
            placeholder={FORMAT_PLACEHOLDERS[inputFormat]}
            placeholderTextColor={COLORS.SECONDARY_ACCENT}
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
            <Text style={[styles.label, { color: COLORS.PRIMARY_DARK }]}>
              Converted Output
            </Text>
            {outputFormats.map((fmt) => {
              const value =
                results[fmt.toLowerCase() as keyof ConversionResults];
              const isCopied = copiedKey === fmt;
              return (
                <View
                  key={fmt}
                  style={[
                    styles.outputRow,
                    { borderColor: COLORS.SECONDARY_ACCENT },
                  ]}
                >
                  <View style={styles.outputLabelContainer}>
                    <Text
                      style={[
                        styles.outputLabel,
                        { color: COLORS.PRIMARY_DARK },
                      ]}
                    >
                      {FORMAT_LABELS[fmt]}
                    </Text>
                    <Text
                      style={[
                        styles.outputValue,
                        { color: COLORS.PRIMARY_DARK },
                      ]}
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
      </ScrollView>
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    paddingBottom: FOOTER_HEIGHT,
  },
  contentContainer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  section: {
    width: '90%',
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'monospace',
  },
  errorText: {
    fontSize: 13,
    marginTop: 6,
  },
  outputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  outputLabelContainer: {
    flex: 1,
    paddingRight: 8,
  },
  outputLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    opacity: 0.7,
    marginBottom: 2,
  },
  outputValue: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
});
