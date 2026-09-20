import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { RADIUS, SCREEN_GUTTER, SPACING } from '../theme';
import { ToolWithModule, ALL_TOOLS } from '../utils/tools';
import GroupContainer from './GroupContainer';
import IconButton from './IconButton';
import ModuleRow from './ModuleRow';
import { Text } from './ScaledText';
import SectionEyebrow from './SectionEyebrow';

type Props = {
  visible: boolean;
  slot: 0 | 1 | 2 | null;
  shortcuts: string[];
  onClose: () => void;
  onSelect: (toolId: string) => void;
};

export default function ShortcutPicker({
  visible,
  slot,
  shortcuts,
  onClose,
  onSelect,
}: Props) {
  const COLORS = useTheme();
  const insets = useSafeAreaInsets();

  const groupedTools = useMemo(() => {
    return ALL_TOOLS.reduce<Record<ToolWithModule['module'], ToolWithModule[]>>(
      (groups, tool) => {
        groups[tool.module].push(tool);
        return groups;
      },
      {
        Core: [],
        Navigation: [],
        Reference: [],
        Comms: [],
        Prepper: [],
        Earth: [],
      },
    );
  }, []);

  if (!visible || slot === null) {
    return null;
  }

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
          accessibilityLabel="Close shortcut picker"
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
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: COLORS.PRIMARY_DARK }]}>
                Shortcut {slot + 1}
              </Text>
              <Text style={[styles.subtitle, { color: COLORS.MUTED }]}>
                Picking a tool already in another slot swaps them.
              </Text>
            </View>
            <IconButton
              name="close-outline"
              size={22}
              onPress={onClose}
              accessibilityLabel="Close shortcut picker"
            />
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + SPACING.sm },
            ]}
          >
            {Object.entries(groupedTools).map(([module, tools]) => (
              <View key={module} style={styles.section}>
                <SectionEyebrow inline>{module}</SectionEyebrow>
                <GroupContainer>
                  {tools.map((tool, index) => {
                    const assignedSlot = shortcuts.indexOf(tool.id);
                    const value =
                      assignedSlot === slot
                        ? 'Current'
                        : assignedSlot >= 0
                          ? `Slot ${assignedSlot + 1}`
                          : undefined;

                    return (
                      <ModuleRow
                        key={tool.id}
                        title={tool.name}
                        icon={tool.icon}
                        variant="tool"
                        value={value}
                        showSeparator={index < tools.length - 1}
                        onPress={() => onSelect(tool.id)}
                      />
                    );
                  })}
                </GroupContainer>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const hairline =
  StyleSheet.hairlineWidth < 0.5 ? 0.5 : StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(29, 31, 32, 0.28)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    borderTopWidth: hairline,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: SCREEN_GUTTER,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Bitter-Bold',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    paddingHorizontal: SCREEN_GUTTER,
  },
  section: {
    marginBottom: SPACING.md,
  },
});
