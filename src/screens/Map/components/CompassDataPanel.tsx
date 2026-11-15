import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text as ScaledText } from '../../../components/ScaledText';
import { useTheme } from '../../../hooks/useTheme';

type Props = {
  heading: number;
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
  } | null;
};

export default function CompassDataPanel({ heading, coords }: Props) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const rows = [
    { label: 'Heading', value: `${heading}°` },
    {
      label: 'Latitude',
      value: coords
        ? `${Math.abs(coords.latitude).toFixed(4)}° ${coords.latitude >= 0 ? 'N' : 'S'}`
        : '--',
    },
    {
      label: 'Longitude',
      value: coords
        ? `${Math.abs(coords.longitude).toFixed(4)}° ${coords.longitude >= 0 ? 'E' : 'W'}`
        : '--',
    },
    {
      label: 'Elevation',
      value:
        coords?.altitude != null
          ? `${Math.round(coords.altitude * 3.28084)} ft`
          : '--',
    },
  ];

  return (
    <ScrollView
      style={styles.dataPanel}
      contentContainerStyle={styles.dataPanelContent}
      showsVerticalScrollIndicator={false}
    >
      {rows.map(({ label, value }) => (
        <View key={label} style={styles.dataRow}>
          <ScaledText style={styles.dataLabel}>{label}</ScaledText>
          <ScaledText style={styles.dataValue}>{value}</ScaledText>
        </View>
      ))}
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    dataPanel: {
      flex: 1,
      alignSelf: 'stretch',
    },
    dataPanelContent: {
      justifyContent: 'center',
      flexGrow: 1,
      paddingVertical: 8,
      gap: 4,
    },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 2,
    },
    dataLabel: {
      fontSize: 11,
      color: colors.PRIMARY_DARK,
      opacity: 0.6,
      flexShrink: 0,
      marginRight: 4,
    },
    dataValue: {
      fontSize: 11,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
      color: colors.PRIMARY_DARK,
      textAlign: 'right',
      flexShrink: 1,
    },
  });
}
