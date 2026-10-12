import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonAvatar } from './SkeletonAvatar';
import { SkeletonCard } from './SkeletonCard';
import { SkeletonText } from './SkeletonText';

export const DashboardSkeleton: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile Banner Card */}
      <SkeletonCard style={styles.profileCard}>
        <View style={styles.profileRow}>
          <SkeletonAvatar size={50} style={styles.profileAvatar} />
          <View style={styles.profileTextWrap}>
            <Skeleton width="65%" height={18} borderRadius={4} style={{ marginBottom: 8 }} />
            <Skeleton width="85%" height={13} borderRadius={3} style={{ marginBottom: 6 }} />
            <Skeleton width="45%" height={12} borderRadius={3} />
          </View>
        </View>
      </SkeletonCard>

      {/* 3 Academic Stat Cards */}
      <View style={styles.statsRow}>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="70%" height={11} borderRadius={3} style={{ marginBottom: 8 }} />
          <Skeleton width="50%" height={22} borderRadius={4} style={{ marginBottom: 6 }} />
          <Skeleton width="80%" height={10} borderRadius={3} />
        </SkeletonCard>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="70%" height={11} borderRadius={3} style={{ marginBottom: 8 }} />
          <Skeleton width="50%" height={22} borderRadius={4} style={{ marginBottom: 6 }} />
          <Skeleton width="80%" height={10} borderRadius={3} />
        </SkeletonCard>
        <SkeletonCard style={styles.statCard}>
          <Skeleton width="70%" height={11} borderRadius={3} style={{ marginBottom: 8 }} />
          <Skeleton width="50%" height={22} borderRadius={4} style={{ marginBottom: 6 }} />
          <Skeleton width="80%" height={10} borderRadius={3} />
        </SkeletonCard>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Skeleton width="45%" height={16} borderRadius={4} />
        <Skeleton width="25%" height={12} borderRadius={3} style={{ marginTop: 4 }} />
      </View>

      {/* Action Tiles Grid */}
      <View style={styles.gridRow}>
        <SkeletonCard style={styles.gridTile}>
          <Skeleton width={36} height={36} borderRadius={8} style={{ marginBottom: 10 }} />
          <Skeleton width="70%" height={13} borderRadius={3} style={{ marginBottom: 4 }} />
          <Skeleton width="50%" height={10} borderRadius={3} />
        </SkeletonCard>
        <SkeletonCard style={styles.gridTile}>
          <Skeleton width={36} height={36} borderRadius={8} style={{ marginBottom: 10 }} />
          <Skeleton width="70%" height={13} borderRadius={3} style={{ marginBottom: 4 }} />
          <Skeleton width="50%" height={10} borderRadius={3} />
        </SkeletonCard>
      </View>
      <View style={styles.gridRow}>
        <SkeletonCard style={styles.gridTile}>
          <Skeleton width={36} height={36} borderRadius={8} style={{ marginBottom: 10 }} />
          <Skeleton width="70%" height={13} borderRadius={3} style={{ marginBottom: 4 }} />
          <Skeleton width="50%" height={10} borderRadius={3} />
        </SkeletonCard>
        <SkeletonCard style={styles.gridTile}>
          <Skeleton width={36} height={36} borderRadius={8} style={{ marginBottom: 10 }} />
          <Skeleton width="70%" height={13} borderRadius={3} style={{ marginBottom: 4 }} />
          <Skeleton width="50%" height={10} borderRadius={3} />
        </SkeletonCard>
      </View>

      {/* Schedule / Summary Card */}
      <SkeletonCard style={styles.scheduleCard}>
        <Skeleton width="40%" height={15} borderRadius={4} style={{ marginBottom: 14 }} />
        <View style={styles.scheduleRow}>
          <Skeleton width="20%" height={13} borderRadius={3} />
          <Skeleton width="70%" height={13} borderRadius={3} />
        </View>
        <View style={styles.scheduleRow}>
          <Skeleton width="20%" height={13} borderRadius={3} />
          <Skeleton width="70%" height={13} borderRadius={3} />
        </View>
      </SkeletonCard>
    </ScrollView>
  );
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
  profileCard: {
    padding: 16,
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    marginRight: 14,
  },
  profileTextWrap: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    alignItems: 'flex-start',
  },
  sectionHeader: {
    marginVertical: 12,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridTile: {
    flex: 1,
    marginHorizontal: 4,
    padding: 14,
    minHeight: 100,
  },
  scheduleCard: {
    marginTop: 12,
    padding: 16,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
});
