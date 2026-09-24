import React, { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SCREEN_GUTTER, SPACING } from '../theme';
import { withAlpha } from '../theme/colorUtils';
import AppButton from './AppButton';
import IconButton from './IconButton';
import Touchable from './Touchable';

const isAndroid = Platform.OS === 'android';

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
  onLaunchTutorial?: () => void;
}

type HelpSection = 'what' | 'how' | 'privacy' | 'terms' | 'contact';

interface HelpTopic {
  id: HelpSection;
  title: string;
  icon: string;
  content: string;
}

interface HelpGroup {
  label: string;
  topics: HelpTopic[];
}

interface TextPart {
  type: 'text' | 'url' | 'email';
  content: string;
}

/**
 * Help, presented as a sheet.
 *
 * Was a centred 85%-wide box with a heavy brand border, a filled accent header
 * and bordered accordion tiles. It now shares Settings' frame — a sheet with a
 * grabber, grouped cards under uppercase labels and hairline separators — so
 * the two surfaces a user reaches from the same row read as one family.
 *
 * Topics still expand one at a time, in place, inside their card.
 *
 * Note: Uses React Native's Text directly to avoid scaling issues in the help
 * UI.
 */

const ICON_BADGE_SIZE = 30;
/** Where a row's title starts; separators and expanded text line up here. */
const TITLE_INSET = SPACING.lg + ICON_BADGE_SIZE + SPACING.md;

/**
 * Matches a URL or an email address. The URL is lazy and stops before any
 * trailing sentence punctuation, so "visit https://x.y/terms." links to
 * "https://x.y/terms" rather than a path ending in a full stop.
 */
const LINK_PATTERN =
  /(https?:\/\/\S+?)(?=[.,;:!?)]*(?:\s|$))|([\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-zA-Z]{2,})/g;

/** Splits prose into plain runs and tappable URLs/emails, in order. */
function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let lastIndex = 0;

  Array.from(text.matchAll(LINK_PATTERN)).forEach((match) => {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, start) });
    }
    parts.push({ type: match[1] ? 'url' : 'email', content: match[0] });
    lastIndex = start + match[0].length;
  });

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
}

// Keep Privacy in step with what the app actually does. It lists every
// permission in ios/ColdBoot/Info.plist and every outside service the app
// calls: OpenFreeMap (map tiles), OpenStreetMap Nominatim (place names),
// Open-Meteo (Seasonal Outlook, rounded to about 11 km in
// weatherOutlookService) and RepeaterBook (by US state only). Adding a
// permission or a network call means updating that section too.
//
// The privacy and terms URLs point at /coldboot/ pages that must be live
// before release, or these links will 404.
function buildHelpGroups(): HelpGroup[] {
  return [
    {
      label: 'ABOUT',
      topics: [
        {
          id: 'what',
          title: 'What is ColdBoot',
          icon: 'information-circle-outline',
          content: [
            'ColdBoot is an offline-first preparedness toolkit. A cold boot starts from nothing — no network, no account, no prior state — and that is how the app is built to work.',
            "There's no sign-up, and everything you create stays on your device. Nearly every tool works with no signal at all. The few features that go online, like maps and the seasonal outlook, keep a copy of what they download so it's still there when you're off the grid.",
          ].join('\n\n'),
        },
        {
          id: 'how',
          title: 'How to use',
          icon: 'compass-outline',
          // Screen-to-screen swiping is iOS only: on Android the edge drag
          // belongs to the system back gesture (see AppShell).
          content: `Pick a module on the home screen — Core, Navigation, Reference, Comms, Prepper or Earth — then tap a tool to open it. Tap the ColdBoot logo to return home, or use the search button in the header to find any tool or reference. ${
            isAndroid
              ? "Use your phone's back gesture or button to return to the previous screen."
              : 'Swipe left or right to navigate between screens.'
          }\n\nThe shortcut bar at the bottom keeps three of your most-used tools and Alerts one tap away. Change which tools it shows in Settings, where you'll also find offline maps, backup and restore, and this help.`,
        },
      ],
    },
    {
      label: 'LEGAL',
      topics: [
        {
          id: 'privacy',
          title: 'Privacy Policy',
          icon: 'shield-checkmark-outline',
          content: [
            'ColdBoot has no accounts, ads, analytics or tracking. Toastbyte Studios does not collect, receive or sell your personal data.',
            'Your notes, checklists, inventory, plans, voice logs, GPS trails and settings are stored only on this device. Backups are files you export and keep; we never see them.',
            'The app asks for a permission only when a feature needs it: location for the map, GPS trails and location-based tools (in the background only while a trail is recording), camera for the flashlight and note photos, photo library for attaching photos to notes, microphone for Voice Log and the Decibel Meter, contacts for adding emergency contacts, and motion sensors for the barometer. You can change these at any time in your device settings.',
            'A few features contact free public services when you use them, and send only what they need:',
            '• Maps and offline map downloads: OpenFreeMap receives the map areas you view or download.\n• Place names: OpenStreetMap Nominatim receives the coordinates being named.\n• Seasonal Outlook: Open-Meteo receives your approximate location, rounded to about 11 km.\n• Nearby repeaters: RepeaterBook receives only your US state.',
            'Like any website, these services also see your IP address, and they handle requests under their own privacy policies.',
            'Questions? Email info@toastbyte.studio. Full policy: https://toastbyte.studio/coldboot/privacy.',
          ].join('\n\n'),
        },
        {
          id: 'terms',
          title: 'Terms of Use',
          icon: 'document-text-outline',
          content: [
            'By using ColdBoot you agree to these terms.',
            'ColdBoot is a reference and planning aid. It is not a substitute for professional medical care, emergency services, or proper navigation and safety training. In an emergency, contact local emergency services first.',
            'Readings from your device, such as GPS position, compass heading, barometric pressure and sound level, depend on its hardware and can be wrong. Data from outside services, such as maps, seasonal outlooks and repeater listings, can be incomplete or out of date. Check anything critical against another source and use your own judgment.',
            'You are responsible for using ColdBoot lawfully. Transmitting on many radio frequencies, including amateur repeaters, requires a license.',
            'ColdBoot is provided as is, without warranties of any kind. To the fullest extent permitted by law, Toastbyte Studios, LLC is not liable for any loss or harm arising from your use of, or reliance on, the app.',
            'Map data © OpenStreetMap contributors. Full terms: https://toastbyte.studio/coldboot/terms.',
          ].join('\n\n'),
        },
      ],
    },
    {
      label: 'SUPPORT',
      topics: [
        {
          id: 'contact',
          title: 'Contact',
          icon: 'mail-outline',
          content: [
            'Questions, feedback, bug reports and feature ideas are all welcome:',
            'info@toastbyte.studio',
            'For a bug, it helps to include your device model and the app version shown at the bottom of Settings.',
          ].join('\n\n'),
        },
      ],
    },
  ];
}

function makeStyles(COLORS: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    primaryText: { color: COLORS.PRIMARY_DARK },
    mutedText: { color: COLORS.MUTED },
    linkText: { color: COLORS.BRAND },
    sheetThemed: {
      backgroundColor: isAndroid ? COLORS.SURFACE_CONTAINER : COLORS.SURFACE,
      borderTopColor: COLORS.BORDER,
    },
    grabber: {
      backgroundColor: isAndroid ? COLORS.MUTED : COLORS.BORDER,
    },
    groupThemed: {
      backgroundColor: COLORS.BACKGROUND,
      borderColor: COLORS.BORDER,
    },
    separatorThemed: { backgroundColor: COLORS.SEPARATOR },
    iconBadge: { backgroundColor: withAlpha(COLORS.BRAND, 0.12) },
    closeButton: { backgroundColor: withAlpha(COLORS.BRAND, 0.12) },
  });
}

export const HelpModal = ({
  visible,
  onClose,
  onLaunchTutorial,
}: HelpModalProps) => {
  const COLORS = useTheme();
  const insets = useSafeAreaInsets();
  const t = useMemo(() => makeStyles(COLORS), [COLORS]);
  const groups = useMemo(() => buildHelpGroups(), []);
  const [expandedSection, setExpandedSection] = useState<HelpSection | null>(
    null,
  );

  const handleSectionPress = useCallback((sectionId: HelpSection) => {
    setExpandedSection((current) => (current === sectionId ? null : sectionId));
  }, []);

  const renderLinkableText = (text: string) =>
    splitLinks(text).map((part, index) => {
      if (part.type === 'text') {
        return <RNText key={index}>{part.content}</RNText>;
      }
      const href =
        part.type === 'email' ? `mailto:${part.content}` : part.content;
      return (
        <RNText
          key={index}
          style={[styles.link, t.linkText]}
          onPress={() => Linking.openURL(href)}
          accessibilityRole="link"
        >
          {part.content}
        </RNText>
      );
    });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close help modal"
          accessibilityRole="button"
          accessibilityHint="Tap to dismiss the help"
        />
        <View
          style={[styles.sheet, t.sheetThemed, { marginTop: insets.top + 52 }]}
        >
          <View style={[styles.grabber, t.grabber]} />

          <View style={styles.header}>
            <RNText style={[styles.headerText, t.primaryText]}>Help</RNText>
            <View style={[styles.closeButton, t.closeButton]}>
              <IconButton
                name="close-outline"
                size={14}
                onPress={onClose}
                accessibilityLabel="Close help"
              />
            </View>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={[
              styles.contentContainer,
              { paddingBottom: insets.bottom + SPACING.xl },
            ]}
          >
            {groups.map((group) => (
              <React.Fragment key={group.label}>
                <RNText style={[styles.groupLabel, t.mutedText]}>
                  {group.label}
                </RNText>
                <View style={[styles.group, t.groupThemed]}>
                  {group.topics.map((topic, index) => {
                    const expanded = expandedSection === topic.id;
                    const showTutorialAction =
                      topic.id === 'how' && !!onLaunchTutorial;

                    return (
                      <React.Fragment key={topic.id}>
                        {index > 0 ? (
                          <View style={[styles.separator, t.separatorThemed]} />
                        ) : null}
                        <Touchable
                          style={styles.row}
                          onPress={() => handleSectionPress(topic.id)}
                          accessibilityRole="button"
                          accessibilityState={{ expanded }}
                          accessibilityLabel={`${topic.title} ${
                            expanded ? 'expanded' : 'collapsed'
                          }`}
                          accessibilityHint={`Tap to ${
                            expanded ? 'collapse' : 'expand'
                          } ${topic.title}`}
                        >
                          <View style={[styles.iconBadge, t.iconBadge]}>
                            <Ionicons
                              name={topic.icon}
                              size={17}
                              color={COLORS.BRAND}
                            />
                          </View>
                          <RNText style={[styles.rowTitle, t.primaryText]}>
                            {topic.title}
                          </RNText>
                          <Ionicons
                            name={
                              expanded
                                ? 'chevron-up-outline'
                                : 'chevron-down-outline'
                            }
                            size={16}
                            color={COLORS.CHEVRON}
                          />
                        </Touchable>
                        {expanded ? (
                          <View style={styles.rowBody}>
                            <RNText style={[styles.bodyText, t.primaryText]}>
                              {renderLinkableText(topic.content)}
                            </RNText>
                            {showTutorialAction ? (
                              <AppButton
                                label="Replay Tutorial"
                                icon="play-outline"
                                variant="tinted"
                                onPress={() => onLaunchTutorial?.()}
                                accessibilityLabel="Replay tutorial now"
                                style={styles.tutorialActionButton}
                              />
                            ) : null}
                          </View>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </View>
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const hairline =
  StyleSheet.hairlineWidth < 0.5 ? 0.5 : StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    // Same scrim as Settings, so the two sheets dim the app identically.
    backgroundColor: 'rgba(29, 31, 32, 0.28)',
    justifyContent: 'flex-end',
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    borderTopWidth: hairline,
    overflow: 'hidden',
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SCREEN_GUTTER,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerText: {
    fontSize: 24,
    fontFamily: 'Bitter-Bold',
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SCREEN_GUTTER,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.99,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  group: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 52,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  iconBadge: {
    width: ICON_BADGE_SIZE,
    height: ICON_BADGE_SIZE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '500',
  },
  rowBody: {
    paddingLeft: TITLE_INSET,
    paddingRight: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
  },
  link: {
    textDecorationLine: 'underline',
  },
  separator: {
    height: hairline,
    marginLeft: TITLE_INSET,
  },
  tutorialActionButton: {
    marginTop: SPACING.md,
    alignSelf: 'flex-start',
  },
});
