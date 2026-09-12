import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import * as SunCalc from 'suncalc';
import MoonPhaseGlyph from '../../components/MoonPhaseGlyph';
import { Text } from '../../components/ScaledText';
import ScreenBody from '../../components/ScreenBody';
import SectionHeader from '../../components/SectionHeader';
import { useFooterClearance } from '../../hooks/useFooterClearance';
import { useTheme } from '../../hooks/useTheme';
import { FOOTER_HEIGHT } from '../../theme';
import { getLunarPhaseName } from '../../utils/lunarPhase';

interface MoonPhase {
  date: Date;
  phaseName: string;
  fraction: number;
  phaseValue: number;
}

// Constants
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// Helper functions for moon phase calculations
const isFullMoon = (phase: number): boolean => {
  return phase >= 0.47 && phase <= 0.53;
};

const isFirstQuarter = (phase: number): boolean => {
  return phase >= 0.22 && phase <= 0.28;
};

const isLastQuarter = (phase: number): boolean => {
  return phase >= 0.72 && phase <= 0.78;
};

const isNewMoon = (phase: number): boolean => {
  return phase < 0.03 || phase > 0.97;
};

// suncalc phase values for the four named phases, used by the key-phase cards
const PHASE_NEW = 0;
const PHASE_FIRST_QUARTER = 0.25;
const PHASE_FULL = 0.5;
const PHASE_LAST_QUARTER = 0.75;

// Formatting functions
const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  return date.toLocaleDateString(undefined, options);
};

const formatDateTime = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  };
  return date.toLocaleString(undefined, options);
};

/**
 * LunarCyclesScreen
 *
 * Displays lunar cycle information for the next 30 days including:
 * - Current moon phase
 * - Next full moon
 * - Next first quarter (half moon)
 * - Next last quarter (half moon)
 * - Next new moon
 * - Daily moon phases over the next 30 days
 *
 * Uses the suncalc library for lunar phase calculations.
 *
 * @returns A React element containing the Lunar Cycles screen UI.
 */

function LunarCyclesScreen() {
  const COLORS = useTheme();
  const footerClearance = useFooterClearance();
  const [currentPhase, setCurrentPhase] = useState<MoonPhase | null>(null);
  const [nextFullMoon, setNextFullMoon] = useState<MoonPhase | null>(null);
  const [nextFirstQuarter, setNextFirstQuarter] = useState<MoonPhase | null>(
    null,
  );
  const [nextLastQuarter, setNextLastQuarter] = useState<MoonPhase | null>(
    null,
  );
  const [nextNewMoon, setNextNewMoon] = useState<MoonPhase | null>(null);
  const [dailyPhases, setDailyPhases] = useState<MoonPhase[]>([]);

  useEffect(() => {
    const now = new Date();
    const calculateMoonPhases = () => {
      const phases: MoonPhase[] = [];
      let foundFullMoon = false;
      let foundFirstQuarter = false;
      let foundLastQuarter = false;
      let foundNewMoon = false;

      // Calculate current phase
      const currentIllum = SunCalc.getMoonIllumination(now);
      const currentPhaseName = getLunarPhaseName(currentIllum.phase);
      setCurrentPhase({
        date: now,
        phaseName: currentPhaseName,
        fraction: currentIllum.fraction,
        phaseValue: currentIllum.phase,
      });

      // Calculate phases for the next 30 days
      for (let i = 0; i <= 30; i++) {
        const date = new Date(now.getTime() + i * MILLISECONDS_PER_DAY);
        const illum = SunCalc.getMoonIllumination(date);
        const phaseName = getLunarPhaseName(illum.phase);

        const moonPhase: MoonPhase = {
          date,
          phaseName,
          fraction: illum.fraction,
          phaseValue: illum.phase,
        };

        phases.push(moonPhase);

        // Find next key moon phases
        if (!foundFullMoon && isFullMoon(illum.phase)) {
          setNextFullMoon(moonPhase);
          foundFullMoon = true;
        }
        if (!foundFirstQuarter && isFirstQuarter(illum.phase)) {
          setNextFirstQuarter(moonPhase);
          foundFirstQuarter = true;
        }
        if (!foundLastQuarter && isLastQuarter(illum.phase)) {
          setNextLastQuarter(moonPhase);
          foundLastQuarter = true;
        }
        if (!foundNewMoon && i > 0 && isNewMoon(illum.phase)) {
          setNextNewMoon(moonPhase);
          foundNewMoon = true;
        }
      }

      setDailyPhases(phases);
    };

    calculateMoonPhases();
  }, []);

  const renderKeyPhaseCard = (
    label: string,
    phase: MoonPhase | null,
    phaseValue: number,
  ) => (
    <View
      style={[styles.keyCard, { borderColor: COLORS.SECONDARY_ACCENT }]}
      key={label}
    >
      <LinearGradient
        colors={COLORS.BRAND_GRADIENT}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardBackground}
      />
      <View style={styles.keyCardContent}>
        <View style={styles.keyCardGlyph}>
          <MoonPhaseGlyph phase={phaseValue} size={40} />
        </View>
        <View style={styles.keyCardText}>
          <Text style={[styles.keyLabel, { color: COLORS.PRIMARY_DARK }]}>
            {label}
          </Text>
          {phase && (
            <>
              <Text style={[styles.keyDate, { color: COLORS.PRIMARY_DARK }]}>
                {formatDate(phase.date)}
              </Text>
              <Text
                style={[styles.keyIllumination, { color: COLORS.PRIMARY_DARK }]}
              >
                {(phase.fraction * 100).toFixed(0)}% illuminated
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );

  const renderDailyPhaseCard = (phase: MoonPhase, index: number) => (
    <View
      style={[styles.dailyCard, { borderColor: COLORS.SECONDARY_ACCENT }]}
      key={index}
    >
      <LinearGradient
        colors={COLORS.BRAND_GRADIENT}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardBackground}
      />
      <View style={styles.dailyCardContent}>
        <View style={styles.dailyGlyph}>
          <MoonPhaseGlyph phase={phase.phaseValue} size={28} />
        </View>
        <View style={styles.dailyCardText}>
          <Text style={[styles.dailyDate, { color: COLORS.PRIMARY_DARK }]}>
            {formatDateTime(phase.date)}
          </Text>
          <Text style={[styles.dailyPhase, { color: COLORS.PRIMARY_DARK }]}>
            {phase.phaseName}
          </Text>
          <Text
            style={[styles.dailyIllumination, { color: COLORS.PRIMARY_DARK }]}
          >
            {(phase.fraction * 100).toFixed(0)}% illuminated
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenBody>
      <SectionHeader>Lunar Cycles</SectionHeader>

      <View style={[styles.container, { paddingBottom: footerClearance }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Current Phase */}
          {currentPhase && (
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: COLORS.PRIMARY_DARK }]}
              >
                Current Moon Phase
              </Text>
              <View
                style={[
                  styles.currentCard,
                  { borderColor: COLORS.SECONDARY_ACCENT },
                ]}
              >
                <LinearGradient
                  colors={COLORS.BRAND_GRADIENT}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cardBackground}
                />
                <View style={styles.currentGlyph}>
                  <MoonPhaseGlyph phase={currentPhase.phaseValue} size={64} />
                </View>
                <Text
                  style={[styles.currentPhase, { color: COLORS.PRIMARY_DARK }]}
                >
                  {currentPhase.phaseName}
                </Text>
                <Text
                  style={[
                    styles.currentIllumination,
                    { color: COLORS.PRIMARY_DARK },
                  ]}
                >
                  {(currentPhase.fraction * 100).toFixed(0)}% illuminated
                </Text>
              </View>
            </View>
          )}

          {/* Key Phases */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.PRIMARY_DARK }]}>
              Upcoming Key Phases
            </Text>
            {nextNewMoon &&
              renderKeyPhaseCard('Next New Moon', nextNewMoon, PHASE_NEW)}
            {nextFirstQuarter &&
              renderKeyPhaseCard(
                'Next First Quarter',
                nextFirstQuarter,
                PHASE_FIRST_QUARTER,
              )}
            {nextFullMoon &&
              renderKeyPhaseCard('Next Full Moon', nextFullMoon, PHASE_FULL)}
            {nextLastQuarter &&
              renderKeyPhaseCard(
                'Next Last Quarter',
                nextLastQuarter,
                PHASE_LAST_QUARTER,
              )}
          </View>

          {/* Daily Phases */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.PRIMARY_DARK }]}>
              Next 30 Days
            </Text>
            {dailyPhases.map((phase, index) =>
              renderDailyPhaseCard(phase, index),
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenBody>
  );
}

export default LunarCyclesScreen;

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
  scrollContent: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  section: {
    width: '90%',
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  currentCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 24,
    overflow: 'hidden',
    alignItems: 'center',
  },
  currentGlyph: {
    marginBottom: 12,
  },
  currentPhase: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  currentIllumination: {
    fontSize: 16,
    opacity: 0.8,
  },
  keyCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  keyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyCardGlyph: {
    marginRight: 16,
  },
  keyCardText: {
    flex: 1,
  },
  keyLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  keyDate: {
    fontSize: 14,
    marginBottom: 2,
  },
  keyIllumination: {
    fontSize: 12,
    opacity: 0.7,
  },
  dailyCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  dailyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyGlyph: {
    marginRight: 12,
  },
  dailyCardText: {
    flex: 1,
  },
  dailyDate: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  dailyPhase: {
    fontSize: 12,
    marginBottom: 2,
  },
  dailyIllumination: {
    fontSize: 11,
    opacity: 0.7,
  },
  cardBackground: {
    ...StyleSheet.absoluteFill,
  },
});
