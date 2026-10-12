import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonCard } from './SkeletonCard';
import { SkeletonText } from './SkeletonText';

export interface AttendanceSkeletonProps {
  count?: number;
  scrollable?: boolean;
}

export const AttendanceSkeleton: React.FC<AttendanceSkeletonProps> = ({ count = 4, scrollable = false }) => {
  const items = Array.from({ length: count }, (_, i) => i + 1);

  const contentNode = (
    <View style={scrollable ? undefined : styles.content}>
      {/* Attendance History Records */}
      {items.map((item) => (
        <SkeletonCard key={item} style={styles.recordCard}>
          <View style={styles.recordHeader}>
            <View style={{ flex: 1 }}>
              <Skeleton width="65%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="45%" height={12} borderRadius={3} />
            </View>
            <Skeleton width={70} height={22} borderRadius={11} />
          </View>
          <View style={styles.recordFooter}>
            <Skeleton width="30%" height={11} borderRadius={3} />
            <Skeleton width="25%" height={11} borderRadius={3} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notice Card */}
        <SkeletonCard style={styles.noticeCard}>
          <Skeleton width="40%" height={14} borderRadius={3} style={{ marginBottom: 8 }} />
          <SkeletonText lines={2} lineHeight={12} spacing={6} lastLineWidth="80%" />
        </SkeletonCard>

        {/* Aggregate Standing Card */}
        <SkeletonCard style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Skeleton width={80} height={80} borderRadius={40} style={styles.percentCircle} />
            <View style={styles.summaryStats}>
              <Skeleton width="70%" height={14} borderRadius={3} style={{ marginBottom: 8 }} />
              <Skeleton width="60%" height={13} borderRadius={3} style={{ marginBottom: 8 }} />
              <Skeleton width="85%" height={22} borderRadius={11} />
            </View>
          </View>
        </SkeletonCard>

        {contentNode}
      </ScrollView>
    );
  }

  return contentNode;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  noticeCard: {
    padding: 14,
    marginBottom: 12,
  },
  summaryCard: {
    padding: 18,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentCircle: {
    marginRight: 16,
  },
  summaryStats: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  recordCard: {
    padding: 14,
    marginBottom: 10,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});
