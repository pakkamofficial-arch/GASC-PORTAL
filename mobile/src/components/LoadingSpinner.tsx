import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  Modal,
} from 'react-native';
import { theme } from '../theme';

export interface LoadingSpinnerProps {
  /**
   * Optional status message below the circular spinner
   */
  message?: string;
  /**
   * Spinner size ('small' | 'large'), defaults to 'large'
   */
  size?: 'small' | 'large';
  /**
   * Optional custom container style
   */
  style?: ViewStyle;
  /**
   * If true, renders as a centered modal overlay preventing interactions
   */
  fullScreen?: boolean;
  /**
   * Custom spinner color, defaults to institutional green #16A34A
   */
  color?: string;
  /**
   * Optional test ID
   */
  testID?: string;
}

export const SPINNER_GREEN = '#16A34A';

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'large',
  style,
  fullScreen = false,
  color = SPINNER_GREEN,
  testID = 'loading-spinner',
}) => {
  const content = (
    <View style={[styles.container, style]} testID={testID} accessibilityRole="progressbar">
      <View style={styles.spinnerWrapper}>
        <ActivityIndicator size={size} color={color} />
      </View>
      {message ? (
        <Text style={styles.messageText} numberOfLines={2}>
          {message}
        </Text>
      ) : null}
    </View>
  );

  if (fullScreen) {
    return (
      <Modal transparent animationType="fade" visible statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.dialogCard}>
            <ActivityIndicator size={size} color={color} />
            {message ? (
              <Text style={styles.dialogMessage} numberOfLines={3}>
                {message}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerWrapper: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: '#EBF7EE',
  },
  messageText: {
    marginTop: 12,
    fontFamily: theme.typography.families.primaryMedium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 26,
    paddingHorizontal: 32,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  dialogMessage: {
    marginTop: 14,
    fontFamily: theme.typography.families.primarySemiBold,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
