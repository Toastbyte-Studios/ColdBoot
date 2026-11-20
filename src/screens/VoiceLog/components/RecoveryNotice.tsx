import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import AppButton from '../../../components/AppButton';
import InfoBlock from '../../../components/InfoBlock';
import { Text } from '../../../components/ScaledText';
import { useTheme } from '../../../hooks/useTheme';
import { SPACING } from '../../../theme';
import { ColorScheme } from '../../../theme/colors';
import { formatClock, formatDateTime } from '../../../utils/timeFormat';
import type { Recovery } from '../useRecordingRecovery';

type Props = {
  recovery: Recovery;
  /** Saving is in progress. */
  busy: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onDismiss: () => void;
};

/**
 * Shown above the recorder when the last recording was cut off by the app
 * closing: either offering it back, or saying it couldn't be recovered.
 */
export default function RecoveryNotice({
  recovery,
  busy,
  onSave,
  onDiscard,
  onDismiss,
}: Props) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const when = formatDateTime(new Date(recovery.startedAt));

  if (recovery.kind === 'lost') {
    return (
      <InfoBlock
        inline
        tone="caution"
        title="Recording lost"
        style={styles.block}
      >
        <View>
          <Text style={styles.body}>
            The recording from {when} was cut off when the app closed and
            couldn't be recovered.
          </Text>
          <View style={styles.actions}>
            <AppButton label="OK" size="small" onPress={onDismiss} />
          </View>
        </View>
      </InfoBlock>
    );
  }

  return (
    <InfoBlock
      inline
      tone="caution"
      title="Unsaved recording"
      style={styles.block}
    >
      <View>
        <Text style={styles.body}>
          A {formatClock(recovery.durationSec)} recording from {when} wasn't
          saved when the app closed.
        </Text>
        <View style={styles.actions}>
          <AppButton
            label="Discard"
            size="small"
            variant="plain"
            onPress={onDiscard}
            disabled={busy}
          />
          <AppButton
            label={busy ? 'Saving…' : 'Save it'}
            size="small"
            tint={COLORS.SECONDARY_ACCENT}
            onPress={onSave}
            disabled={busy}
          />
        </View>
      </View>
    </InfoBlock>
  );
}

const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    block: {
      marginTop: SPACING.md,
    },
    body: {
      fontSize: 14,
      color: COLORS.PRIMARY_DARK,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: SPACING.sm,
      marginTop: SPACING.sm,
    },
  });
