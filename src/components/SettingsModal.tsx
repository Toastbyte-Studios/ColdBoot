import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  View,
  ScrollView,
  Text as RNText,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import {
  OfflineMapService,
  type OfflineMapPack,
} from '../navigation/services/OfflineMapService';
import { formatBytes } from '../navigation/utils/formatBytes';
import {
  useChecklistStore,
  useDevToolsStore,
  useEmergencyPlanStore,
  useInventoryStore,
  useNotesStore,
  usePantryStore,
  useRepeaterBookStore,
  useSettingsStore,
  useTrackStore,
  useWaypointStore,
} from '../stores';
import {
  addBookmark,
  clearBookmarks,
  getBookmarks,
} from '../stores/BookmarksStore';
import {
  FontSize,
  MeasurementSystem,
  ThemeMode,
} from '../stores/SettingsStore';
import { RADIUS, SCREEN_GUTTER, SPACING } from '../theme';
import { withAlpha } from '../theme/colorUtils';
import {
  BackupData,
  BackupPreview,
  createBackupData,
  createBackupPreview,
  exportBackup,
  listBackupFiles,
  readBackupFile,
} from '../utils/backupService';
import AppButton from './AppButton';
import IconButton from './IconButton';
import SegmentedControl from './SegmentedControl';
import Touchable from './Touchable';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Opens the "Manage offline maps" surface. Supplied by the host (AppShell),
   * which owns that modal's visibility and navigation access.
   */
  onManageOfflineMaps?: () => void;
  /**
   * Opens Help, including the tutorial. The nav bar no longer carries a help
   * button — it was one of three icons competing for the header — so this is
   * now the way in.
   */
  onOpenHelp?: () => void;
}

/**
 * Settings, presented as a sheet.
 *
 * Was a centred 85%-wide box of flat sections; it is now a sheet of grouped
 * cards under uppercase eyebrows, matching the grouped lists the rest of the
 * app uses.
 *
 * Three rows from the design are deliberately absent: "Night vision tint",
 * "SOS hold duration" and "Reset all data". Each would be a control with
 * nothing behind it — there is no global red-shift, the SOS hold is a fixed
 * one second, and no reset action exists. A survival app is the wrong place to
 * show a switch that only pretends to do something. "Larger text" is likewise
 * kept as the existing three-way size control rather than demoted to a
 * boolean, which would have dropped the medium step.
 *
 * Note: Uses React Native's Text directly to avoid scaling issues in the
 * settings UI.
 */

/** Formats a Unix timestamp (ms) as a locale date-time string. */
function formatBackupDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function hasPersistedCommunicationPlan(
  plan: BackupData['data']['communicationPlan'],
) {
  return Boolean(plan && plan.updatedAt > 0);
}

function makeStyles(COLORS: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    primaryText: { color: COLORS.PRIMARY_DARK },
    mutedText: { color: COLORS.MUTED },
    sheetThemed: {
      backgroundColor: COLORS.SURFACE,
      borderTopColor: COLORS.BORDER,
    },
    groupThemed: {
      backgroundColor: COLORS.BACKGROUND,
      borderColor: COLORS.BORDER,
    },
    separatorThemed: { backgroundColor: COLORS.SEPARATOR },
    buttonDefault: {
      borderColor: COLORS.BORDER,
      backgroundColor: COLORS.SURFACE,
    },
    // Label on a BRAND-filled selection. In dark mode BRAND is pale, so the
    // theme foreground would be pale on pale.
    selectedText: { color: COLORS.PRIMARY_LIGHT },
    restorePanelThemed: {
      borderColor: COLORS.BORDER,
      backgroundColor: COLORS.SURFACE,
    },
    fileItemSelected: { backgroundColor: COLORS.BRAND },
    closeButton: { backgroundColor: withAlpha(COLORS.BRAND, 0.12) },
  });
}

/** Small uppercase label introducing a settings group. */
function GroupLabel({ children }: { children: string }) {
  const COLORS = useTheme();
  return (
    <RNText style={[styles.groupLabel, { color: COLORS.MUTED }]}>
      {children}
    </RNText>
  );
}

export const SettingsModal = observer(
  ({
    visible,
    onClose,
    onManageOfflineMaps,
    onOpenHelp,
  }: SettingsModalProps) => {
    const settingsStore = useSettingsStore();
    const devToolsStore = useDevToolsStore();
    const coreStore = useNotesStore();
    const checklistStore = useChecklistStore();
    const emergencyPlanStore = useEmergencyPlanStore();
    const inventoryStore = useInventoryStore();
    const pantryStore = usePantryStore();
    const repeaterBookStore = useRepeaterBookStore();
    const COLORS = useTheme();
    const insets = useSafeAreaInsets();
    const trackStore = useTrackStore();
    const t = useMemo(() => makeStyles(COLORS), [COLORS]);
    const waypointStore = useWaypointStore();

    // Backup UI state
    const [isExporting, setIsExporting] = useState(false);
    const [backupFiles, setBackupFiles] = useState<
      { name: string; path: string }[]
    >([]);
    const [showFileList, setShowFileList] = useState(false);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(
      null,
    );
    const [selectedBackup, setSelectedBackup] = useState<BackupData | null>(
      null,
    );
    const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(
      null,
    );
    const [isRestoring, setIsRestoring] = useState(false);
    const [offlinePacks, setOfflinePacks] = useState<OfflineMapPack[] | null>(
      null,
    );

    // Summarise downloaded maps for the row's value. A Modal has no navigation
    // focus event, so visibility is the equivalent trigger.
    useEffect(() => {
      if (!visible) return;
      let ignore = false;
      OfflineMapService.listPacks()
        .then((packs) => {
          if (!ignore) setOfflinePacks(packs);
        })
        .catch(() => {
          // Leave the row without a value rather than guessing at one.
          if (!ignore) setOfflinePacks(null);
        });
      return () => {
        ignore = true;
      };
    }, [visible]);

    const offlineSummary = useMemo(() => {
      if (!offlinePacks || offlinePacks.length === 0) return undefined;
      const bytes = offlinePacks.reduce(
        (sum, p) => sum + (p.status?.completedResourceSize ?? 0),
        0,
      );
      const areas = `${offlinePacks.length} area${
        offlinePacks.length === 1 ? '' : 's'
      }`;
      return `${areas} · ${formatBytes(bytes)}`;
    }, [offlinePacks]);

    const appVersion = useMemo(() => {
      try {
        return DeviceInfo.getVersion();
      } catch {
        return null;
      }
    }, []);

    const fontSizeOptions: { value: FontSize; label: string }[] = [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' },
    ];

    const themeModeOptions: { value: ThemeMode; label: string }[] = [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'system', label: 'System' },
    ];

    const measurementSystemOptions: {
      value: MeasurementSystem;
      label: string;
    }[] = [
      // Units are shown in a caption under the control; they do not fit in a
      // segment.
      { value: 'imperial', label: 'Imperial' },
      { value: 'metric', label: 'Metric' },
    ];

    const handleExport = useCallback(async () => {
      setIsExporting(true);
      try {
        const bookmarks = await getBookmarks();
        const backupData = createBackupData(
          coreStore.notes,
          coreStore.categories,
          checklistStore.checklists,
          checklistStore.checklistItems,
          inventoryStore.items,
          inventoryStore.categories,
          pantryStore.items,
          pantryStore.categories,
          bookmarks,
          {
            fontSize: settingsStore.fontSize,
            themeMode: settingsStore.themeMode,
            noteSortOrder: settingsStore.noteSortOrder,
            measurementSystem: settingsStore.measurementSystem,
          },
          waypointStore.waypoints,
          trackStore.tracks,
          emergencyPlanStore.contacts,
          emergencyPlanStore.rallyPoints,
          hasPersistedCommunicationPlan(emergencyPlanStore.communicationPlan)
            ? emergencyPlanStore.communicationPlan
            : null,
          repeaterBookStore.customRepeaters,
        );
        await exportBackup(backupData);
        await settingsStore.setLastBackupAt(Date.now());
      } catch (error) {
        Alert.alert(
          'Export Failed',
          'Could not export backup. Please try again.',
        );
        console.error('Export failed:', error);
      } finally {
        setIsExporting(false);
      }
    }, [
      checklistStore,
      coreStore,
      emergencyPlanStore,
      inventoryStore,
      pantryStore,
      repeaterBookStore,
      settingsStore,
      trackStore,
      waypointStore,
    ]);

    const handleOpenRestorePanel = useCallback(async () => {
      const files = await listBackupFiles();
      setBackupFiles(files);
      setShowFileList(true);
      setSelectedFilePath(null);
      setSelectedBackup(null);
      setBackupPreview(null);
    }, []);

    const handleSelectFile = useCallback(async (filePath: string) => {
      const data = await readBackupFile(filePath);
      if (!data) {
        Alert.alert(
          'Invalid File',
          'The selected file is not a valid Cold Boot backup.',
        );
        return;
      }
      setSelectedFilePath(filePath);
      setSelectedBackup(data);
      setBackupPreview(createBackupPreview(data));
    }, []);

    const handleRestore = useCallback(
      async (mode: 'replace' | 'merge') => {
        if (!selectedBackup) {
          return;
        }
        setIsRestoring(true);
        try {
          const { data } = selectedBackup;

          // Restore bookmarks
          if (mode === 'replace') {
            await clearBookmarks();
          }
          for (const bookmark of data.bookmarks) {
            await addBookmark(bookmark);
          }

          // Restore notes and categories
          await coreStore.importNotesData(
            data.noteCategories,
            data.notes,
            mode,
          );

          // Restore checklists
          await checklistStore.importChecklistsData(
            data.checklists,
            data.checklistItems,
            mode,
          );

          // Restore inventory
          await inventoryStore.importData(
            data.inventoryCategories,
            data.inventoryItems,
            mode,
          );

          // Restore pantry
          await pantryStore.importData(
            data.pantryCategories,
            data.pantryItems,
            mode,
          );

          await waypointStore.importData(data.waypoints, mode);
          await trackStore.importData(data.tracks, mode);
          await emergencyPlanStore.importData(
            data.emergencyContacts,
            data.rallyPoints,
            data.communicationPlan,
            mode,
          );
          await repeaterBookStore.importCustomRepeaters(
            data.customRepeaters,
            mode,
          );

          // Restore settings — only applied in replace mode, overwriting current preferences
          if (mode === 'replace' && data.settings) {
            if (data.settings.fontSize) {
              await settingsStore.setFontSize(data.settings.fontSize);
            }
            if (data.settings.themeMode) {
              await settingsStore.setThemeMode(data.settings.themeMode);
            }
            if (data.settings.noteSortOrder) {
              await settingsStore.setNoteSortOrder(data.settings.noteSortOrder);
            }
            if (data.settings.measurementSystem) {
              await settingsStore.setMeasurementSystem(
                data.settings.measurementSystem,
              );
            }
          }

          setShowFileList(false);
          setSelectedFilePath(null);
          setSelectedBackup(null);
          setBackupPreview(null);
          Alert.alert('Restore Complete', 'Your data has been restored.');
        } catch (error) {
          Alert.alert(
            'Restore Failed',
            'Could not restore backup. Please try again.',
          );
          console.error('Restore failed:', error);
        } finally {
          setIsRestoring(false);
        }
      },
      [
        selectedBackup,
        checklistStore,
        coreStore,
        emergencyPlanStore,
        inventoryStore,
        pantryStore,
        repeaterBookStore,
        settingsStore,
        trackStore,
        waypointStore,
      ],
    );

    const confirmRestore = useCallback(
      (mode: 'replace' | 'merge') => {
        const modeLabel =
          mode === 'replace'
            ? 'replace all existing data'
            : 'merge with existing data';
        Alert.alert('Confirm Restore', `This will ${modeLabel}. Continue?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => handleRestore(mode),
          },
        ]);
      },
      [handleRestore],
    );

    const handleManageOfflineMaps = useCallback(() => {
      // Close settings first so the two modals don't stack on top of each other.
      onClose();
      onManageOfflineMaps?.();
    }, [onClose, onManageOfflineMaps]);

    const handleOpenHelp = useCallback(() => {
      onClose();
      onOpenHelp?.();
    }, [onClose, onOpenHelp]);

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
            accessibilityLabel="Close settings modal"
            accessibilityRole="button"
            accessibilityHint="Tap to dismiss the settings"
          />
          <View
            style={[
              styles.sheet,
              t.sheetThemed,
              { marginTop: insets.top + 52 },
            ]}
          >
            <View
              style={[styles.grabber, { backgroundColor: COLORS.BORDER }]}
            />

            <View style={styles.header}>
              <RNText style={[styles.headerText, t.primaryText]}>
                Settings
              </RNText>
              <View style={[styles.closeButton, t.closeButton]}>
                <IconButton
                  name="close-outline"
                  size={14}
                  onPress={onClose}
                  accessibilityLabel="Close settings"
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
              {/* ── Appearance ─────────────────────────────────────────── */}
              <GroupLabel>APPEARANCE</GroupLabel>
              <View style={[styles.group, t.groupThemed]}>
                <View style={styles.stackedRow}>
                  <RNText style={[styles.rowTitle, t.primaryText]}>
                    Theme
                  </RNText>
                  <SegmentedControl
                    options={themeModeOptions}
                    value={settingsStore.themeMode}
                    onChange={(mode) => settingsStore.setThemeMode(mode)}
                    accessibilityLabel="Theme"
                  />
                </View>

                <View style={[styles.separator, t.separatorThemed]} />

                <View style={styles.stackedRow}>
                  <RNText style={[styles.rowTitle, t.primaryText]}>
                    Text size
                  </RNText>
                  <SegmentedControl
                    options={fontSizeOptions}
                    value={settingsStore.fontSize}
                    onChange={(size) => settingsStore.setFontSize(size)}
                    accessibilityLabel="Text size"
                  />
                </View>
              </View>

              {/* ── Offline data ───────────────────────────────────────── */}
              <GroupLabel>OFFLINE DATA</GroupLabel>
              <View style={[styles.group, t.groupThemed]}>
                <Touchable
                  style={styles.row}
                  onPress={handleManageOfflineMaps}
                  accessibilityRole="button"
                  accessibilityLabel={
                    offlineSummary
                      ? `Offline maps, ${offlineSummary}`
                      : 'Offline maps'
                  }
                >
                  <RNText style={[styles.rowTitle, t.primaryText]}>
                    Offline maps
                  </RNText>
                  {offlineSummary ? (
                    <RNText style={[styles.rowValue, t.mutedText]}>
                      {offlineSummary}
                    </RNText>
                  ) : null}
                  <IconButton
                    name="chevron-forward-outline"
                    size={16}
                    color={COLORS.CHEVRON}
                    onPress={(event) => {
                      event.stopPropagation();
                      handleManageOfflineMaps();
                    }}
                    accessibilityLabel="Manage offline maps"
                  />
                </Touchable>

                <View style={[styles.separator, t.separatorThemed]} />

                <View style={styles.toggleRow}>
                  <View style={styles.toggleLabel}>
                    <RNText style={[styles.rowTitle, t.primaryText]}>
                      High detail (z8–14)
                    </RNText>
                    <RNText style={[styles.rowSubtitle, t.mutedText]}>
                      New downloads include building detail. Uses ~2× storage.
                    </RNText>
                  </View>
                  <Switch
                    value={settingsStore.highDetailOffline}
                    onValueChange={(value) =>
                      settingsStore.setHighDetailOffline(value)
                    }
                    trackColor={{ true: COLORS.BRAND }}
                    accessibilityLabel="Toggle high detail for new offline downloads"
                  />
                </View>

                <View style={[styles.separator, t.separatorThemed]} />

                <View style={styles.stackedRow}>
                  <View style={styles.stackedHeading}>
                    <RNText style={[styles.rowTitle, t.primaryText]}>
                      Units
                    </RNText>
                    <RNText style={[styles.rowValue, t.mutedText]}>
                      {settingsStore.measurementSystem === 'imperial'
                        ? '°F, ft, mph'
                        : '°C, m, km/h'}
                    </RNText>
                  </View>
                  <SegmentedControl
                    options={measurementSystemOptions}
                    value={settingsStore.measurementSystem}
                    onChange={(system) =>
                      settingsStore.setMeasurementSystem(system)
                    }
                    accessibilityLabel="Measurement system"
                  />
                </View>
              </View>

              {/* ── Backup ─────────────────────────────────────────────── */}
              <GroupLabel>BACKUP &amp; RESTORE</GroupLabel>
              <View style={[styles.group, t.groupThemed, styles.groupPadded]}>
                <RNText style={[styles.rowSubtitle, t.mutedText]}>
                  {settingsStore.lastBackupAt
                    ? `Last backed up: ${formatBackupDate(settingsStore.lastBackupAt)}`
                    : 'No backup yet'}
                </RNText>

                <AppButton
                  label="Export Now"
                  icon="share-outline"
                  variant="tinted"
                  fullWidth
                  loading={isExporting}
                  onPress={handleExport}
                  accessibilityLabel="Export backup now"
                  style={styles.actionButton}
                />

                <AppButton
                  label="Restore from Backup"
                  icon="cloud-download-outline"
                  variant="tinted"
                  fullWidth
                  onPress={handleOpenRestorePanel}
                  accessibilityLabel="Restore from backup"
                  style={styles.actionButton}
                />

                {/* Restore panel — file list */}
                {showFileList && (
                  <View style={[styles.restorePanel, t.restorePanelThemed]}>
                    <View style={styles.restorePanelHeader}>
                      <RNText style={[styles.restorePanelTitle, t.primaryText]}>
                        Select a Backup File
                      </RNText>
                      <IconButton
                        name="close-circle-outline"
                        size={22}
                        onPress={() => {
                          setShowFileList(false);
                          setSelectedFilePath(null);
                          setSelectedBackup(null);
                          setBackupPreview(null);
                        }}
                        accessibilityLabel="Close restore panel"
                      />
                    </View>

                    {backupFiles.length === 0 ? (
                      <RNText style={[styles.noFilesText, t.mutedText]}>
                        No backup files found. Export a backup first, then save
                        it to your Documents folder to restore.
                      </RNText>
                    ) : (
                      backupFiles.map((file) => {
                        const selected = selectedFilePath === file.path;
                        return (
                          <Touchable
                            key={file.path}
                            style={[
                              styles.fileItem,
                              t.buttonDefault,
                              selected && t.fileItemSelected,
                            ]}
                            onPress={() => handleSelectFile(file.path)}
                            accessibilityLabel={`Select backup file ${file.name}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <RNText
                              style={[
                                styles.fileName,
                                t.primaryText,
                                selected && t.selectedText,
                              ]}
                            >
                              {file.name}
                            </RNText>
                          </Touchable>
                        );
                      })
                    )}

                    {/* Backup preview and restore options */}
                    {backupPreview && (
                      <View style={styles.previewContainer}>
                        <RNText style={[styles.previewTitle, t.primaryText]}>
                          Backup from {backupPreview.backupDate}
                        </RNText>
                        <RNText style={[styles.previewText, t.mutedText]}>
                          {backupPreview.pantryItemCount} pantry items,{' '}
                          {backupPreview.inventoryItemCount} inventory items,{' '}
                          {backupPreview.noteCount} notes,{' '}
                          {backupPreview.checklistCount} checklists,{' '}
                          {backupPreview.bookmarkCount} bookmarks,{' '}
                          {backupPreview.waypointCount} waypoints,{' '}
                          {backupPreview.trackCount} tracks,{' '}
                          {backupPreview.emergencyContactCount} emergency
                          contacts, {backupPreview.rallyPointCount} rally
                          points, {backupPreview.communicationPlanCount}{' '}
                          communication plans,{' '}
                          {backupPreview.customRepeaterCount} custom repeaters
                        </RNText>
                        <View style={styles.restoreButtons}>
                          <AppButton
                            label="Replace"
                            variant="tinted"
                            loading={isRestoring}
                            onPress={() => confirmRestore('replace')}
                            accessibilityLabel="Replace all data with backup"
                            style={styles.restoreButton}
                          />
                          <AppButton
                            label="Merge"
                            variant="tinted"
                            loading={isRestoring}
                            onPress={() => confirmRestore('merge')}
                            accessibilityLabel="Merge backup with existing data"
                            style={styles.restoreButton}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* ── Help ───────────────────────────────────────────────── */}
              {onOpenHelp ? (
                <>
                  <GroupLabel>HELP</GroupLabel>
                  <View
                    style={[styles.group, t.groupThemed, styles.groupPadded]}
                  >
                    <AppButton
                      label="Help & tutorial"
                      icon="help-circle-outline"
                      variant="tinted"
                      fullWidth
                      onPress={handleOpenHelp}
                      accessibilityLabel="Open help and tutorial"
                    />
                  </View>
                </>
              ) : null}

              {/* Developer Section — shown only in dev builds via __DEV__. */}
              {__DEV__ && (
                <>
                  <GroupLabel>DEVELOPER</GroupLabel>
                  <View style={[styles.group, t.groupThemed]}>
                    <View style={styles.toggleRow}>
                      <View style={styles.toggleLabel}>
                        <RNText style={[styles.rowTitle, t.primaryText]}>
                          Simulate offline
                        </RNText>
                        <RNText style={[styles.rowSubtitle, t.mutedText]}>
                          Blocks map tile requests to test offline behavior
                          without toggling airplane mode. Resets on app launch.
                        </RNText>
                      </View>
                      <Switch
                        value={devToolsStore.simulatedOffline}
                        onValueChange={(value) =>
                          devToolsStore.setSimulatedOffline(value)
                        }
                        trackColor={{ true: COLORS.BRAND }}
                        accessibilityLabel="Simulate offline mode (dev only)"
                      />
                    </View>
                  </View>
                </>
              )}

              {/* ── Attributions ───────────────────────────────────────── */}
              <GroupLabel>ATTRIBUTIONS</GroupLabel>
              <View style={[styles.group, t.groupThemed, styles.groupPadded]}>
                <RNText style={[styles.rowSubtitle, t.mutedText]}>
                  Knot diagrams sourced from Wikimedia Commons contributors,
                  licensed under CC BY-SA 3.0
                  (https://creativecommons.org/licenses/by-sa/3.0/) except where
                  noted as Public Domain.
                </RNText>
              </View>

              <RNText style={[styles.footer, { color: COLORS.CHEVRON }]}>
                {appVersion ? `ColdBoot ${appVersion} · ` : 'ColdBoot · '}
                Toastbyte Studios
              </RNText>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  },
);

const hairline =
  StyleSheet.hairlineWidth < 0.5 ? 0.5 : StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
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
  groupPadded: {
    padding: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
  },
  stackedRow: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  stackedHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
  },
  toggleLabel: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 15.5,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  separator: {
    height: hairline,
    marginLeft: SPACING.lg,
  },
  actionButton: {
    marginTop: SPACING.md,
  },
  restorePanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  restorePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  restorePanelTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  noFilesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  fileItem: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '500',
  },
  previewContainer: {
    marginTop: SPACING.md,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  previewText: {
    fontSize: 13,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  restoreButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  restoreButton: {
    flex: 1,
  },
  footer: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
