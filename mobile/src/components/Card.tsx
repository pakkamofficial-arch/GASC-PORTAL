import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  elevated?: boolean; // backwards compatibility
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  elevated = false,
  noPadding = false,
}) => {
  const isElevated = variant === 'elevated' || elevated;
  const isFlat = variant === 'flat';
  const isOutlined = variant === 'outlined';

  return (
    <View
      style={[
        styles.card,
        isElevated ? theme.shadows.card : isFlat ? theme.shadows.none : theme.shadows.subtle,
        isOutlined && styles.outlined,
        noPadding && { padding: 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.base,
    marginVertical: 4,
  },
  outlined: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
