import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Text } from '../../components/ScaledText';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import SectionSubHeader from '../../components/SectionSubHeader';
import { useFooterClearance } from '../../hooks/useFooterClearance';
import { useTheme } from '../../hooks/useTheme';
import { FOOTER_HEIGHT } from '../../theme';
import { GROUND_TO_AIR_SIGNALS } from './data';
import { createStyles } from './styles';

/**
 * GroundToAirSignalsScreen component
 *
 * Displays a fully offline reference guide to internationally recognised
 * ground-to-air distress symbols. Each entry shows the symbol, its meaning,
 * recommended minimum construction size, and suggested materials.
 *
 * Based on ICAO Annex 12 and standard Search & Rescue conventions.
 *
 * @returns A React element rendering the Ground-to-Air Signals reference screen.
 */
export default function GroundToAirSignalsScreen() {
  const COLORS = useTheme();
  const footerClearance = useFooterClearance();
  const dynamicStyles = createStyles(COLORS);

  return (
    <ScreenBody>
      <SectionHeader>Ground-to-Air Signals</SectionHeader>
      <View style={[styles.container, { paddingBottom: footerClearance }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={dynamicStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionSubHeader>
            Lay these symbols on open ground using rocks, logs, or any
            high-contrast material. Minimum 3 m per character. Best viewed from
            aircraft at altitude — choose a clearing with maximum sky
            visibility.
          </SectionSubHeader>

          {GROUND_TO_AIR_SIGNALS.map((signal) => (
            <View key={signal.symbol} style={dynamicStyles.signalCard}>
              <View style={dynamicStyles.signalHeader}>
                <Text style={dynamicStyles.signalSymbol}>{signal.symbol}</Text>
                <Text style={dynamicStyles.signalMeaning}>
                  {signal.meaning}
                </Text>
              </View>
              <View style={dynamicStyles.sizeRow}>
                <Icon
                  name="resize-outline"
                  size={14}
                  color={COLORS.PRIMARY_DARK}
                  style={dynamicStyles.resizeIcon}
                />
                <Text style={dynamicStyles.sizeText}>
                  <Text style={dynamicStyles.signalDetailLabel}>
                    Min size:{' '}
                  </Text>
                  {signal.minSize}
                </Text>
              </View>
              <Text style={dynamicStyles.signalDetail}>
                <Text style={dynamicStyles.signalDetailLabel}>Materials: </Text>
                {signal.materials}
              </Text>
            </View>
          ))}

          <View style={dynamicStyles.separator} />
          <SectionSubHeader>
            Tip: Pair ground signals with audio signals (whistle, Morse code)
            and movement at regular intervals to increase detectability.
          </SectionSubHeader>
        </ScrollView>
      </View>
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
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
});
