import { observer } from 'mobx-react-lite';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { useNotificationsStore } from '../stores/StoreContext';
import { RADIUS, SCREEN_GUTTER, SPACING } from '../theme';
import { useAllNotifications } from './Footer/useAllNotifications';
import IconButton from './IconButton';
import { Text } from './ScaledText';
import Touchable from './Touchable';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * The alerts sheet, opened from the Alerts tab.
 *
 * Each notification is a card with a coloured left edge naming its source, so
 * a glance separates a solar countdown from a pantry warning without reading
 * either.
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

  const clearAll = () => {
    visibleNotifications.forEach((n) =>
      notificationsStore.hideNotification(n.key),
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
              backgroundColor: COLORS.SURFACE,
              borderTopColor: COLORS.BORDER,
              paddingBottom: insets.bottom + SPACING.lg,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: COLORS.BORDER }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: COLORS.PRIMARY_DARK }]}>
              Alerts
            </Text>
            {visibleNotifications.length > 0 ? (
              <Touchable
                onPress={clearAll}
                accessibilityRole="button"
                accessibilityLabel="Clear all alerts"
              >
                <Text style={[styles.clearAll, { color: COLORS.BRAND }]}>
                  Clear all
                </Text>
              </Touchable>
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
                <View
                  key={notification.key}
                  style={[
                    styles.card,
                    {
                      backgroundColor: COLORS.BACKGROUND,
                      borderColor: COLORS.BORDER,
                      borderLeftColor: notification.iconColor,
                    },
                  ]}
                >
                  <Ionicons
                    name={notification.icon}
                    size={21}
                    color={notification.iconColor}
                  />
                  <Text
                    style={[styles.message, { color: COLORS.PRIMARY_DARK }]}
                  >
                    {notification.message}
                  </Text>
                  <IconButton
                    name="close-outline"
                    size={20}
                    onPress={() =>
                      notificationsStore.hideNotification(notification.key)
                    }
                    accessibilityLabel={`Dismiss: ${notification.message}`}
                  />
                </View>
              ))
            )}

            <View style={styles.alwaysOn}>
              <View
                style={[styles.rule, { backgroundColor: COLORS.SEPARATOR }]}
              />
              <Text style={[styles.alwaysOnLabel, { color: COLORS.MUTED }]}>
                ALWAYS ON
              </Text>
              <View
                style={[styles.rule, { backgroundColor: COLORS.SEPARATOR }]}
              />
            </View>
            <Text style={[styles.explainer, { color: COLORS.MUTED }]}>
              Sunrise and sunset alerts cannot be turned off — they are the
              app's one guaranteed signal. Everything else here is dismissible.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

export default AlertsSheet;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(29,31,32,0.28)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SCREEN_GUTTER,
  },
  grabber: {
    width: 40,
    height: 5,
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
    letterSpacing: -0.4,
  },
  clearAll: {
    fontSize: 15.5,
    fontWeight: '400',
  },
  list: {
    gap: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: 15,
  },
  alwaysOn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  alwaysOnLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  explainer: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: SPACING.sm,
  },
});
