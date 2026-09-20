import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import constellationImages from '../../assets/constellationImages';
import { Text } from '../../components/ScaledText';
import SectionEyebrow from '../../components/SectionEyebrow';
import StackScreen from '../../components/StackScreen';
import { useTheme } from '../../hooks/useTheme';
import { useCoreStore } from '../../stores/StoreContext';
import { SCREEN_GUTTER, SPACING } from '../../theme';
import { cardSurface } from '../../theme/cardSurface';
import {
  ConstellationGuide,
  NavigationalStar,
  getCurrentSeason,
  getConstellationGuides,
  getHemisphere,
  getNavigationInstructions,
  getStarsForHemisphere,
} from '../../utils/starNavigation';

const isAndroid = Platform.OS === 'android';

/**
 * StarMapScreen
 *
 * Offline Star Map & Celestial Navigation reference tool. Displays:
 * - Step-by-step instructions for finding north or south using stars
 * - Key navigational stars with their navigation significance
 * - Constellation guides relevant to the observer's hemisphere and current month
 *
 * Works entirely offline using the embedded star catalog. Uses the device
 * location from CoreStore to determine hemisphere and tailor the guide.
 *
 * @returns A React element containing the Star Map screen UI.
 */
function StarMapScreen() {
  const COLORS = useTheme();
  const core = useCoreStore();
  const [hemisphere, setHemisphere] = useState<'northern' | 'southern'>(
    'northern',
  );

  const now = new Date();
  const month = now.getUTCMonth() + 1;

  useEffect(() => {
    if (core.lastFix) {
      setHemisphere(getHemisphere(core.lastFix.coords.latitude));
    }
  }, [core.lastFix]);

  const season = getCurrentSeason(now, hemisphere);
  const instructions = useMemo(
    () => getNavigationInstructions(hemisphere, month),
    [hemisphere, month],
  );
  const stars = useMemo(() => getStarsForHemisphere(hemisphere), [hemisphere]);
  const constellations = useMemo(
    () => getConstellationGuides(hemisphere, month),
    [hemisphere, month],
  );

  const renderStepCard = (step: string, index: number) => (
    <View key={index} style={[styles.stepCard, cardSurface(COLORS)]}>
      <Text style={[styles.stepText, { color: COLORS.PRIMARY_DARK }]}>
        {step}
      </Text>
    </View>
  );

  const renderStarCard = (star: NavigationalStar, index: number) => (
    <View key={index} style={[styles.starCard, cardSurface(COLORS)]}>
      <View style={styles.starCardHeader}>
        <Ionicons
          name="star-outline"
          size={28}
          color={COLORS.ACCENT}
          style={styles.starIcon}
        />
        <View style={styles.starCardTitles}>
          <Text style={[styles.starName, { color: COLORS.PRIMARY_DARK }]}>
            {star.name}
          </Text>
          <Text
            style={[styles.starConstellation, { color: COLORS.PRIMARY_DARK }]}
          >
            {star.constellation}
          </Text>
        </View>
      </View>
      <Text style={[styles.starSignificance, { color: COLORS.PRIMARY_DARK }]}>
        {star.significance}
      </Text>
    </View>
  );

  const renderConstellationCard = (
    guide: ConstellationGuide,
    index: number,
  ) => {
    const SvgDiagram = constellationImages[guide.imageKey];
    return (
      <View key={index} style={[styles.constellationCard, cardSurface(COLORS)]}>
        <Text
          style={[styles.constellationName, { color: COLORS.PRIMARY_DARK }]}
        >
          {guide.name}
        </Text>
        {SvgDiagram && (
          <View style={styles.diagramContainer}>
            <SvgDiagram width="100%" height={180} />
          </View>
        )}
        <Text style={[styles.guideLabel, { color: COLORS.PRIMARY_DARK }]}>
          How to find it
        </Text>
        <Text style={[styles.guideText, { color: COLORS.PRIMARY_DARK }]}>
          {guide.howToFind}
        </Text>
        <Text style={[styles.guideLabel, { color: COLORS.PRIMARY_DARK }]}>
          Navigation use
        </Text>
        <Text style={[styles.guideText, { color: COLORS.PRIMARY_DARK }]}>
          {guide.navigationUse}
        </Text>
      </View>
    );
  };

  return (
    <StackScreen
      title="Star Map"
      subtitle={`${
        hemisphere === 'northern' ? 'Northern' : 'Southern'
      } hemisphere · ${season}`}
    >
      {/* Context banner */}
      <View style={[styles.contextBanner, cardSurface(COLORS)]}>
        <View style={styles.contextRow}>
          <Ionicons
            name="earth-outline"
            size={18}
            color={COLORS.PRIMARY_DARK}
          />
          <Text style={[styles.contextText, { color: COLORS.PRIMARY_DARK }]}>
            {hemisphere === 'northern'
              ? 'Northern Hemisphere'
              : 'Southern Hemisphere'}
            {'  '}·{'  '}
            {season}
          </Text>
        </View>
        {!core.lastFix && (
          <Text style={[styles.contextNote, { color: COLORS.PRIMARY_DARK }]}>
            Enable location for hemisphere-specific guidance
          </Text>
        )}
      </View>

      {/* Navigation instructions */}
      <View style={styles.section}>
        <SectionEyebrow>
          {hemisphere === 'northern'
            ? 'Finding north with Polaris'
            : 'Finding south with the Southern Cross'}
        </SectionEyebrow>
        {instructions.map((step, i) => renderStepCard(step, i))}
      </View>

      {/* Navigational stars */}
      <View style={styles.section}>
        <SectionEyebrow>Key Navigational Stars</SectionEyebrow>
        {stars.map((star, i) => renderStarCard(star, i))}
      </View>

      {/* Constellation guides */}
      {constellations.length > 0 && (
        <View style={styles.section}>
          <SectionEyebrow>Constellations Visible Now</SectionEyebrow>
          {constellations.map((guide, i) => renderConstellationCard(guide, i))}
        </View>
      )}
    </StackScreen>
  );
}

export default observer(StarMapScreen);

const styles = StyleSheet.create({
  // StackScreen's Android content is full-bleed. The eyebrow brings its own
  // text gutter and each card brings the screen gutter, so the section itself
  // only spaces the groups apart.
  section: {
    marginTop: SPACING.lg,
  },
  contextBanner: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    padding: SPACING.md,
    overflow: 'hidden',
    alignItems: 'center',
    marginTop: 8,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextText: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  contextNote: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
    textAlign: 'center',
  },
  stepCard: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    padding: 14,
    marginTop: 8,
    overflow: 'hidden',
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
  },
  starCard: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    padding: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  starCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starIcon: {
    marginRight: 12,
  },
  starCardTitles: {
    flex: 1,
  },
  starName: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  starConstellation: {
    fontSize: 13,
    opacity: 0.75,
    marginTop: 2,
  },
  starSignificance: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.9,
  },
  constellationCard: {
    marginHorizontal: isAndroid ? SCREEN_GUTTER : 0,
    padding: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  diagramContainer: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  constellationName: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  guideLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.8,
    textTransform: 'uppercase',
  },
  guideText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
