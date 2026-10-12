import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode | keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  accessibilityLabel,
}) => {
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';

  let bgColor = theme.colors.primary;
  let textColor = theme.colors.textWhite;
  let borderColor = 'transparent';

  if (isOutline) {
    bgColor = 'transparent';
    textColor = theme.colors.primary;
    borderColor = theme.colors.primary;
  } else if (isSecondary) {
    bgColor = theme.colors.secondary;
    textColor = theme.colors.textWhite;
  } else if (isDanger) {
    bgColor = theme.colors.error;
    textColor = theme.colors.textWhite;
  } else if (isGhost) {
    bgColor = 'transparent';
    textColor = theme.colors.primary;
    borderColor = 'transparent';
  }

  if (disabled) {
    bgColor = '#E0E6E0';
    textColor = '#889488';
    borderColor = 'transparent';
  }

  const isSm = size === 'sm' || size === 'small';
  const isLg = size === 'lg' || size === 'large';
  const height = isSm ? 36 : isLg ? 52 : 46;
  const paddingH = isSm ? 12 : isLg ? 20 : 16;
  const fontSize = isSm ? 13 : isLg ? 16 : 14;

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return <Ionicons name={icon as any} size={isSm ? 15 : 18} color={textColor} />;
    }
    return icon;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        styles.button,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: isOutline ? 1.5 : 0,
          height,
          paddingHorizontal: paddingH,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' ? (
            <View style={styles.leftIcon}>{renderIcon()}</View>
          ) : null}
          <Text
            style={[
              styles.text,
              { color: textColor, fontSize },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' ? (
            <View style={styles.rightIcon}>{renderIcon()}</View>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  text: {
    fontFamily: theme.typography.fonts.semibold,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
