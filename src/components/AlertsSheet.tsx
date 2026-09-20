import { observer } from 'mobx-react-lite';
import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAllNotifications } from '../hooks/useAllNotifications';
import { useTheme } from '../hooks/useTheme';
import { AppNotification } from '../stores/NotificationsStore';
import { useNotificationsStore } from '../stores/StoreContext';
import { RADIUS, SCREEN_GUTTER, SPACING } from '../theme';
import AppButton from './AppButton';
import IconButton from './IconButton';
import { Text } from './ScaledText';
import Touchable from './Touchable';

const isAndroid = Platform.OS === 'android';

/**
 * Which tonal container each notification source takes on Android.
 *
 * Material puts the colour in the fill rather than in an edge stripe, which
 * means the source has to map to a role rather than to an arbitrary tint: the
 * amber container for anything solar or celestial, the blue one for weather,
 * and a neutral surface for stock, which is a reminder rather than a signal.
 */
function useToneFor(notification: AppNotification): {
  fill: string;
  ink: string;
  glyph: string;
} {
  const COLORS = useTheme();

  switch (notification.type) {
    case 'solar':
    case 'astronomy':
      return {
        fill: COLORS.ACCENT_CONTAINER,
        ink: COLORS.PRIMARY_DARK,
        glyph: COLORS.ON_ACCENT_CONTAINER,
      };
    case 'weather':
      return {
        fill: COLORS.SURFACE_CONTAINER,
        ink: COLORS.PRIMARY_DARK,
        glyph: COLORS.ON_SECONDARY_CONTAINER,
      };
    case 'pantry':
      return {
        fill: COLORS.SURFACE,
        ink: COLORS.PRIMARY_DARK,
        glyph: COLORS.MUTED,
      };
  }
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * The alerts sheet, opened from the Alerts shortcut.
 *
 * Each notification is a card whose colour names its source, so a glance
 * separates a solar countdown from a pantry warning without reading either.
 * iOS puts that colour in a 3px left edge; Android puts it in the fill, which
 * is where Material keeps it — an accent stripe is not an Android pattern.
 *
 * Dismissal is a button rather than the designed swipe: the shell already runs
 * a horizontal `PanResponder` for back/forward navigation, and a horizontal
 * card swipe inside it would be two gestures competing for the same drag. The
 * handoff flags that conflict; a button sidesteps it and is reachable by
 * assistive tech, which a swipe is not.
 */
const AlertsSheet = observer(({ visible, onClose }: Props) => {
  const COLORS = useTheme();
  const insets = useSafeAreaInsets();
  const notificationsStore = useNotificationsStore();
  const allNotifications = useAllNotifications();

  const visibleNotifications = allNotifications.filter(
    (n) => !notificationsStore.isHidden(n.key),
  );
  const dismissibleNotifications = visibleNotifications.filter(
    (n) => n.dismissible,
  );

  const clearAll = () => {
    notificationsStore.hideNotifications(
      dismissibleNotifications.map((notification) => notification.key),
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close alerts"
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isAndroid
                ? COLORS.SURFACE_CONTAINER
                : COLORS.SURFACE,
              borderTopColor: COLORS.BORDER,
              paddingBottom: insets.bottom + SPACING.lg,
            },
          ]}
        >
          <View
            style={[
              styles.grabber,
              {
                backgroundColor: isAndroid ? COLORS.MUTED : COLORS.BORDER,
              },
            ]}
          />

          <View style={styles.header}>
            <Text style={[styles.title, { color: COLORS.PRIMARY_DARK }]}>
              Alerts
            </Text>
            {dismissibleNotifications.length > 0 ? (
              isAndroid ? (
                /* Material makes this a real outlined button rather than iOS's
                   bare text link: a destructive-ish bulk action gets a target,
                   not a word. */
                <AppButton
                  label="Clear all"
                  variant="outlined"
                  size="small"
                  onPress={clearAll}
                  accessibilityLabel="Clear all alerts"
                  style={styles.clearAllButton}
                />
              ) : (
                <Touchable
                  onPress={clearAll}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all alerts"
                >
                  <Text style={[styles.clearAll, { color: COLORS.BRAND }]}>
                    Clear all
                  </Text>
                </Touchable>
              )
            ) : null}
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {visibleNotifications.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={44}
                  color={COLORS.SECONDARY_ACCENT}
                />
                <Text style={[styles.emptyText, { color: COLORS.MUTED }]}>
                  Nothing needs your attention
                </Text>
              </View>
            ) : (
              visibleNotifications.map((notification) => (
                <NotificationCard
                  key={notification.key}
                  notification={notification}
                  onDismiss={() =>
                    notificationsStore.hideNotification(notification.key)
                  }
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

/**
 * One notification, as a card.
 *
 * The source's colour lands in the fill on Android and in a left edge on iOS;
 * everything else — the glyph, the message, the dismiss target — is shared,
 * because nothing about it differs by platform.
 */
function NotificationCard({
  notification,
  onDismiss,
}: {
  notification: AppNotification;
  onDismiss: () => void;
}) {
  const COLORS = useTheme();
  const tone = useToneFor(notification);

  return (
    <View
      style={[
        styles.card,
        isAndroid
          ? { backgroundColor: tone.fill }
          : [
              styles.cardEdged,
              {
                backgroundColor: COLORS.BACKGROUND,
                borderColor: COLORS.BORDER,
                borderLeftColor: notification.iconColor,
              },
            ],
      ]}
    >
      <Ionicons
        name={notification.icon}
        size={isAndroid ? 22 : 21}
        color={isAndroid ? tone.glyph : notification.iconColor}
      />
      <Text
        style={[
          styles.message,
          { color: isAndroid ? tone.ink : COLORS.PRIMARY_DARK },
        ]}
      >
        {notification.message}
      </Text>
      {notification.dismissible ? (
        <IconButton
          name="close-outline"
          size={20}
          color={isAndroid ? tone.glyph : undefined}
          onPress={onDismiss}
          accessibilityLabel={`Dismiss: ${notification.message}`}
        />
      ) : null}
    </View>
  );
}

export default AlertsSheet;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(29,31,32,0.28)',
  },
  sheet: {
    maxHeight: '78%',
    minHeight: isAndroid ? 160 : undefined,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    // Material sheets are flat: the tonal fill separates them from the
    // scrim, so an edge on top would be one boundary too many.
    borderTopWidth: isAndroid ? 0 : StyleSheet.hairlineWidth,
    paddingHorizontal: SCREEN_GUTTER,
  },
  grabber: {
    width: isAndroid ? 32 : 40,
    height: isAndroid ? 4 : 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Bitter-Bold',
    letterSpacing: isAndroid ? 0 : -0.4,
  },
  clearAll: {
    fontSize: 15.5,
    fontWeight: '400',
  },
  clearAllButton: {
    // M3 small button metrics put this at 36dp; the design asks for 40.
    minHeight: 40,
    borderRadius: 20,
  },
  list: {
    gap: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isAndroid ? 14 : SPACING.md,
    borderRadius: isAndroid ? RADIUS.card : 14,
    paddingVertical: isAndroid ? 14 : 13,
    paddingHorizontal: isAndroid ? SCREEN_GUTTER : 15,
  },
  cardEdged: {
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  message: {
    flex: 1,
    fontSize: isAndroid ? 16 : 15,
    fontWeight: '500',
    lineHeight: isAndroid ? 22 : 20,
  },
  empty: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: 15,
  },
});
