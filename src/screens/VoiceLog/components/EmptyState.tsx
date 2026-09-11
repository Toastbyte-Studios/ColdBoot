import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Text } from '../../../components/ScaledText';
import { useTheme } from '../../../hooks/useTheme';
import { ColorScheme } from '../../../theme/colors';

type EmptyStateProps = {
  icon: string;
  title: string;
  subtitle: string;
};

export default function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const COLORS = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <Icon
        name={icon}
        size={64}
        color={COLORS.PRIMARY_DARK}
        style={styles.icon}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const makeStyles = (COLORS: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    icon: {
      opacity: 0.5,
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: COLORS.PRIMARY_DARK,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: COLORS.PRIMARY_DARK,
      opacity: 0.7,
      textAlign: 'center',
    },
  });
