import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface BadgeProps {
  label: string;
  type?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary' | 'danger';
  size?: 'sm' | 'md' | 'small' | 'medium';
}

export const Badge: React.FC<BadgeProps> = ({ label, type, variant, size = 'sm' }) => {
  const isSmall = size === 'sm' || size === 'small';
  let resolvedType = type || (variant === 'danger' ? 'error' : variant);

  if (!resolvedType) {
    const upper = label.toUpperCase();
    if (['PRESENT', 'APPROVED', 'PAID', 'ISSUED', 'ACTIVE', 'SUCCESS', 'PASS'].includes(upper)) {
      resolvedType = 'success';
    } else if (['PENDING', 'PARTIAL', 'LATE', 'DRAFT', 'SUBMITTED', 'OD', 'WARNING'].includes(upper)) {
      resolvedType = 'warning';
    } else if (['ABSENT', 'REJECTED', 'FAILED', 'SUSPENDED', 'ERROR', 'RA', 'REVOKED'].includes(upper)) {
      resolvedType = 'error';
    } else if (['INFO', 'SYSTEM', 'UG', 'PG', 'ADMIN', 'FACULTY', 'STUDENT'].includes(upper)) {
      resolvedType = 'info';
    } else {
      resolvedType = 'neutral';
    }
  }

  let bgColor = theme.colors.badgeNeutralBg;
  let textColor = theme.colors.textSecondary;
  let borderColor = theme.colors.border;

  if (resolvedType === 'success') {
    bgColor = theme.colors.successBg;
    textColor = theme.colors.success;
    borderColor = '#C8E6C9';
  } else if (resolvedType === 'warning') {
    bgColor = theme.colors.warningBg;
    textColor = theme.colors.warning;
    borderColor = '#FFE082';
  } else if (resolvedType === 'error') {
    bgColor = theme.colors.errorBg;
    textColor = theme.colors.error;
    borderColor = '#FFCDD2';
  } else if (resolvedType === 'info') {
    bgColor = theme.colors.infoBg;
    textColor = theme.colors.info;
    borderColor = '#BBDEFB';
  } else if (resolvedType === 'primary') {
    bgColor = theme.colors.tint;
    textColor = theme.colors.primary;
    borderColor = theme.colors.border;
  }

  const isMd = size === 'md' || size === 'medium';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          borderColor,
          paddingHorizontal: isMd ? 10 : 8,
          paddingVertical: isMd ? 4 : 2,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: isMd ? theme.typography.sizes.sm : theme.typography.sizes.xs,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: theme.typography.fonts.semibold,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
