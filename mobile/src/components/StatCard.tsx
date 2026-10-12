import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Card } from './Card';

interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  title,
  value,
  subtitle,
  icon,
  color = theme.colors.primary,
  style,
}) => {
  const resolvedLabel = label || title || '';

  return (
    <Card style={[styles.card, style]} variant="default">
      <View style={styles.topRow}>
        <Text style={styles.label} numberOfLines={1}>
          {resolvedLabel}
        </Text>
        {icon ? (
          <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={16} color={color} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    marginHorizontal: 4,
    marginVertical: 4,
    minWidth: 140,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  value: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.metric,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 3,
  },
});
