import React, { JSX, useRef, useState } from 'react';
import {
  FlatList,
  FlatListProps,
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SvgProps } from 'react-native-svg';
import { getKnotImage } from '../assets/referenceImages';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SPACING } from '../theme';
import { INK, PAPER } from '../theme/fixedSurfaces';

interface KnotStepCarouselProps {
  images: string[];
}

const isAndroid = Platform.OS === 'android';

/**
 * First-frame estimate of the carousel's width, used only until `onLayout`
 * reports the real one. Screen width minus the iOS content inset (screen
 * inset + gutter, each side) is right for the common case, so the first
 * frame rarely has to re-lay out.
 */
const ESTIMATED_HORIZONTAL_INSET = 52;

/** The iOS card outline. Material cards are flat (see SolarCycleCard). */
const OUTLINE_WIDTH = isAndroid ? 0 : 1;

const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };

/**
 * KnotStepCarousel renders a horizontally swipeable carousel of knot diagrams.
 *
 * Each page shows one image — either a high-quality static WebP sourced from
 * Wikimedia Commons (preferred) or a fallback SVG component. Step indicator
 * dots below the carousel show the current position.
 *
 * If a key has no corresponding image in the asset registry, that entry is
 * skipped gracefully. If no images resolve, the carousel renders nothing.
 *
 * @remarks
 * The card background is deliberately fixed to `PAPER` rather than following
 * the colour scheme: the diagrams are dark line art on transparency and would
 * vanish on a dark card. The border is chrome and follows the scheme. The
 * indicator dots sit on the paper, so they use the fixed `INK`: the dark
 * scheme's pale BRAND is under 2:1 against PAPER and the inactive dots
 * disappeared.
 *
 * Slides are sized from the carousel's own measured width rather than from the
 * screen width, so the component fits whatever column it is placed in. It used
 * to subtract a fixed 28pt from the screen width, which only matched one
 * screen's padding and overflowed anywhere else.
 *
 * @param images - Array of referenceImages keys.
 * @returns {JSX.Element | null} The rendered carousel, or null if no images resolve.
 */
export default function KnotStepCarousel({
  images,
}: KnotStepCarouselProps): JSX.Element | null {
  const COLORS = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const itemWidth =
    measuredWidth ?? Math.max(0, screenWidth - ESTIMATED_HORIZONTAL_INSET);

  const handleLayout = (event: LayoutChangeEvent) => {
    // onLayout reports the outer width; slides live inside the outline.
    const width = Math.round(
      event.nativeEvent.layout.width - OUTLINE_WIDTH * 2,
    );
    if (width > 0 && width !== measuredWidth) {
      setMeasuredWidth(width);
    }
  };
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<string>>(null);

  const onViewableItemsChanged = useRef<
    NonNullable<FlatListProps<string>['onViewableItemsChanged']>
  >(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  // Filter to only keys that have a matching image (WebP or SVG)
  const resolvedKeys = images.filter((key) => !!getKnotImage(key));
  const total = resolvedKeys.length;

  if (total === 0) return null;

  const renderItem = ({ item, index }: { item: string; index: number }) => {
    const source = getKnotImage(item);
    if (!source) return null;

    if (source.type === 'static') {
      return (
        <View style={[styles.slide, { width: itemWidth }]}>
          <Image
            source={source.value as ImageSourcePropType}
            style={[styles.staticImage, { width: itemWidth - 24 }]}
            resizeMode="contain"
            accessibilityLabel={`Knot diagram, image ${index + 1} of ${total}`}
          />
        </View>
      );
    }

    // SVG fallback
    const SvgComponent = source.value as React.FC<SvgProps>;
    return (
      <View style={[styles.slide, { width: itemWidth }]}>
        <SvgComponent
          width="100%"
          height={200}
          accessibilityLabel={`Knot diagram, image ${index + 1} of ${total}`}
        />
      </View>
    );
  };

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.container,
        { borderWidth: OUTLINE_WIDTH, borderColor: COLORS.BORDER },
      ]}
    >
      <FlatList
        ref={flatListRef}
        data={resolvedKeys}
        keyExtractor={(item) => item}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_data, index) => ({
          length: itemWidth,
          offset: itemWidth * index,
          index,
        })}
        style={{ width: itemWidth }}
        accessibilityLabel="Knot diagram carousel"
      />
      {total > 1 && (
        <View style={styles.dotsRow} accessibilityLabel="Image indicators">
          {resolvedKeys.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                { backgroundColor: INK },
                idx === activeIndex && styles.dotActive,
              ]}
              accessibilityLabel={`Image ${idx + 1}${idx === activeIndex ? ', current' : ''}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: PAPER,
    alignItems: 'center',
    overflow: 'hidden',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticImage: {
    height: 220,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    opacity: 0.35,
  },
  dotActive: {
    opacity: 1,
    width: 9,
    height: 9,
  },
});
