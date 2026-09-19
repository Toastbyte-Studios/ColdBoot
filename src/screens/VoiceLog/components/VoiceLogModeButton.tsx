import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Text } from '../../../components/ScaledText';
import Touchable from '../../../components/Touchable';
import { useTheme } from '../../../hooks/useTheme';
import { cardSurface } from '../../../theme/cardSurface';
import { ColorScheme } from '../../../theme/colors';

type VoiceLogModeButtonProps = {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  accessibilityLabel: string;
};

export default function VoiceLogModeButton({
  icon,
  title,
  subtitle,
  onPress,
  accessibilityLabel,
}: VoiceLogModeButtonProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <Touchable
      style={[styles.container, cardSurface(COLORS)]}
      rippleColor={COLORS.PRIMARY_DARK}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Icon name={icon} size={48} color={COLORS.BRAND} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Touchable>
  );
}

const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    container: {
      width: '100%',
      padding: 20,
      marginBottom: 16,
      alignItems: 'center',
      overflow: 'hidden',
    },
    icon: {
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: COLORS.PRIMARY_DARK,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: COLORS.PRIMARY_DARK,
      opacity: 0.7,
    },
  });
