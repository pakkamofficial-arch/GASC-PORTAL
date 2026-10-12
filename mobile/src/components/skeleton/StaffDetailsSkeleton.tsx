import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { theme } from '../../theme';

export const StaffDetailsSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Skeleton width={64} height={64} borderRadius={32} />
        <View style={styles.headerInfo}>
          <Skeleton width="70%" height={20} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton width="45%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
          <Skeleton width="55%" height={12} borderRadius={4} />
        </View>
      </View>

      <View style={styles.cardSection}>
        <Skeleton width="35%" height={16} borderRadius={4} style={{ marginBottom: 14 }} />
        <Skeleton width="90%" height={14} borderRadius={4} style={{ marginBottom: 10 }} />
        <Skeleton width="75%" height={14} borderRadius={4} style={{ marginBottom: 10 }} />
        <Skeleton width="80%" height={14} borderRadius={4} />
      </View>

      <View style={styles.cardSection}>
        <Skeleton width="40%" height={16} borderRadius={4} style={{ marginBottom: 14 }} />
        <Skeleton width="100%" height={36} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={36} borderRadius={6} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  cardSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 16,
  },
});
