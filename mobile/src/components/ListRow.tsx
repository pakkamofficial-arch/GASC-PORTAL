import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  badge?: React.ReactNode;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  style?: ViewStyle;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  meta,
  icon,
  iconColor = theme.colors.primary,
  iconBgColor = theme.colors.tint,
  badge,
  rightElement,
  onPress,
  showChevron = false,
  style,
}) => {
  const content = (
    <View style={[styles.container, style]}>
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: iconBgColor }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      ) : null}

      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      {badge ? <View style={styles.badgeWrap}>{badge}</View> : null}
      {rightElement}
      {showChevron ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.colors.textSecondary}
          style={styles.chevron}
        />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '500',
    color: theme.colors.text,
  },
  subtitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  meta: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  badgeWrap: {
    marginLeft: 8,
  },
  chevron: {
    marginLeft: 8,
  },
});
